/** Renderer UI — timer logic lives in the main process via window.pomodoro. */
(function () {
  const api = window.pomodoro;
  const $ = (id) => document.getElementById(id);

  const { settings: loadedSettings, hadStoredDark, isFirstLaunch } = PomoStorage.loadSettings();
  let settings = loadedSettings;
  window.pomoAppSettings = settings;

  let history = PomoStorage.loadHistory();
  let uiState = {
    phase: 'work',
    running: false,
    remaining: settings.work * 60,
    total: settings.work * 60,
    pomodorosToday: PomoStorage.countWorkSessions(history),
    duckMessage: 'Ready to focus?',
    runningMessage: null,
  };

  const timerDisplay = $('timerDisplay');
  const phaseLabel = $('phaseLabel');
  const progressFill = $('progressFill');
  const btnToggle = $('btnToggle');
  const btnReset = $('btnReset');
  const btnSkip = $('btnSkip');
  const btnSound = $('btnSound');
  const btnNotif = $('btnNotif');
  const btnFloat = $('btnFloat');
  const btnDark = $('btnDark');
  const btnSettings = $('btnSettings');
  const btnCloseSettings = $('btnCloseSettings');
  const btnHistory = $('btnHistory');
  const btnCloseHistory = $('btnCloseHistory');
  const btnClearHistory = $('btnClearHistory');
  const settingsPanel = $('settingsPanel');
  const historyPanel = $('historyPanel');
  const historyList = $('historyList');
  const duck = document.querySelector('.duck');
  const duckBubble = $('duckBubble');
  const sessionCount = $('sessionCount');
  const streakDots = $('streakDots');
  const btnQuit = $('btnQuit');

  function getPhaseLabel(phase) {
    return phase === 'work' ? 'Work' : phase === 'short' ? 'Short Break' : 'Long Break';
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function pickRunningMessage(phase) {
    const messages =
      phase === 'work'
        ? ['Focus!', 'You got this', 'Keep going', 'Almost there']
        : ['Relax...', 'Breathe', 'Stretch a bit', 'Nice work!'];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  function setDuckMessage(msg) {
    uiState.duckMessage = msg;
  }

  function updateDuck() {
    duck.classList.remove('waddle', 'nap');
    if (uiState.running) {
      duck.classList.add(uiState.phase === 'work' ? 'waddle' : 'nap');
      if (!uiState.runningMessage) {
        uiState.runningMessage = pickRunningMessage(uiState.phase);
      }
      duckBubble.textContent = uiState.runningMessage;
    } else {
      uiState.runningMessage = null;
      duckBubble.textContent = uiState.duckMessage || 'Ready to focus?';
    }
  }

  function renderStreakDots() {
    streakDots.innerHTML = '';
    const n = settings.pomosBeforeLong;
    const filled = uiState.pomodorosToday % n;
    for (let i = 0; i < n; i++) {
      const dot = document.createElement('span');
      dot.className = 'streak-dot' + (i < filled ? '' : ' empty');
      streakDots.appendChild(dot);
    }
  }

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No sessions yet today.</div>';
      return;
    }
    historyList.innerHTML = history
      .map((h) => {
        const time = new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `<div class="history-item"><span>${h.phase} (${h.duration}m)</span><span class="history-time">${time}</span></div>`;
      })
      .join('');
  }

  function applyState(state) {
    const phaseChanged = uiState.phase !== state.phase;
    uiState.phase = state.phase;
    uiState.running = state.running;
    uiState.remaining = state.remaining;
    uiState.total = state.total;
    uiState.pomodorosToday = state.pomodorosToday;
    if (phaseChanged) uiState.runningMessage = null;

    timerDisplay.textContent = formatTime(uiState.remaining);
    phaseLabel.textContent = getPhaseLabel(uiState.phase);
    timerDisplay.classList.toggle('running', uiState.running);
    const progress = uiState.total > 0 ? ((uiState.total - uiState.remaining) / uiState.total) * 100 : 0;
    progressFill.style.width = `${progress}%`;
    const progressBar = progressFill.parentElement;
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(Math.round(progress)));
    btnToggle.textContent = uiState.running ? 'Pause' : 'Start';
    sessionCount.textContent = uiState.pomodorosToday;
    renderStreakDots();
    updateDuck();
  }

  function notify(title, body) {
    if (!settings.notifications) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, silent: true });
    }
  }

  function requestNotificationPermission() {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  async function saveSettings() {
    PomoStorage.saveSettings(settings);
    window.pomoAppSettings = settings;
    return api.syncSettings({
      work: settings.work,
      short: settings.short,
      long: settings.long,
      pomosBeforeLong: settings.pomosBeforeLong,
    });
  }

  async function applySettingsFromInputs() {
    settings.work = parseInt($('workMin').value, 10) || 25;
    settings.short = parseInt($('shortMin').value, 10) || 5;
    settings.long = parseInt($('longMin').value, 10) || 15;
    settings.pomosBeforeLong = parseInt($('pomosBeforeLong').value, 10) || 4;
    settings.volume = parseInt($('volumeSlider').value, 10);
    const state = await saveSettings();
    if (state) applyState(state);
    renderStreakDots();
  }

  function loadSettingsUI() {
    $('workMin').value = settings.work;
    $('shortMin').value = settings.short;
    $('longMin').value = settings.long;
    $('pomosBeforeLong').value = settings.pomosBeforeLong;
    $('volumeSlider').value = settings.volume;
    syncPressed(btnSound, settings.sound);
    btnSound.classList.toggle('muted', !settings.sound);
    syncPressed(btnNotif, settings.notifications);
    syncPressed(btnDark, settings.dark);
    document.body.classList.toggle('dark', settings.dark);
  }

  function syncPressed(btn, on) {
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function setupToggleButton(btn, key, opts = {}) {
    syncPressed(btn, settings[key]);
    if (opts.mutedClass) btn.classList.toggle('muted', !settings[key]);
    btn.addEventListener('click', () => {
      settings[key] = !settings[key];
      syncPressed(btn, settings[key]);
      if (opts.mutedClass) btn.classList.toggle('muted', !settings[key]);
      saveSettings();
      if (opts.onToggle) opts.onToggle(settings[key]);
    });
  }

  // ── Events ──
  btnToggle.addEventListener('click', async () => {
    await PomoAudio.resume();
    requestNotificationPermission();
    setDuckMessage(null);
    const state = await api.toggle();
    if (state.running) {
      uiState.duckMessage = null;
    } else {
      setDuckMessage('Paused');
    }
    applyState(state);
  });

  btnReset.addEventListener('click', async () => {
    setDuckMessage('Reset');
    applyState(await api.reset());
  });

  btnSkip.addEventListener('click', async () => {
    setDuckMessage('Skipped');
    applyState(await api.skip());
  });

  setupToggleButton(btnSound, 'sound', {
    mutedClass: true,
    onToggle: (on) => {
      if (on) PomoAudio.beep(660, 0.1);
    },
  });

  setupToggleButton(btnNotif, 'notifications', {
    onToggle: (on) => {
      if (on) requestNotificationPermission();
    },
  });

  setupToggleButton(btnDark, 'dark', {
    onToggle: (on) => document.body.classList.toggle('dark', on),
  });

  btnFloat.addEventListener('click', async () => {
    const isFloating = await api.toggleFloat();
    syncPressed(btnFloat, isFloating);
  });

  btnSettings.addEventListener('click', () => {
    settingsPanel.classList.remove('panel-hidden');
    historyPanel.classList.add('panel-hidden');
  });

  btnCloseSettings.addEventListener('click', () => {
    settingsPanel.classList.add('panel-hidden');
    applySettingsFromInputs();
  });

  btnHistory.addEventListener('click', () => {
    historyPanel.classList.remove('panel-hidden');
    settingsPanel.classList.add('panel-hidden');
    renderHistory();
  });

  btnCloseHistory.addEventListener('click', () => {
    historyPanel.classList.add('panel-hidden');
  });

  btnQuit.addEventListener('click', () => api.quit());

  btnClearHistory.addEventListener('click', async () => {
    if (!confirm("Clear today's session history and pomodoro count?")) return;
    history = [];
    PomoStorage.saveHistory(history);
    const state = await api.setPomodorosToday(0);
    applyState(state);
    renderHistory();
  });

  ['workMin', 'shortMin', 'longMin', 'pomosBeforeLong', 'volumeSlider'].forEach((id) => {
    $(id).addEventListener('change', applySettingsFromInputs);
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        btnToggle.click();
        break;
      case 'r':
      case 'R':
        btnReset.click();
        break;
      case 's':
      case 'S':
        btnSkip.click();
        break;
    }
  });

  api.onUpdate((state) => {
    // Preserve sticky duck messages when pausing via global shortcut
    if (!state.running && uiState.running) {
      setDuckMessage('Paused');
    } else if (state.running && !uiState.running) {
      uiState.duckMessage = null;
    }
    applyState(state);
  });

  api.onPhaseComplete((data) => {
    history.push({ phase: data.phase, duration: data.duration, time: data.time });
    PomoStorage.saveHistory(history);
    renderHistory();
    uiState.pomodorosToday = data.pomodorosToday;

    if (data.phase === 'work') {
      notify('Work done!', `Completed pomodoro #${data.pomodorosToday}. Time for a break.`);
    } else {
      notify('Break over!', 'Back to work!');
    }
    PomoAudio.phaseCompleteSound(data.phase);
    uiState.duckMessage = null;
  });

  async function init() {
    // First launch / missing dark key: follow system preference and persist
    if (isFirstLaunch || !hadStoredDark) {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        settings.dark = true;
      }
      PomoStorage.saveSettings(settings);
    }

    loadSettingsUI();
    await saveSettings();
    await api.setPomodorosToday(uiState.pomodorosToday);

    const isFloating = await api.getFloatState();
    syncPressed(btnFloat, isFloating);

    const state = await api.getState();
    setDuckMessage('Ready to focus?');
    applyState(state);
    renderHistory();
  }

  init();
})();
