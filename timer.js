/**
 * Wall-clock Pomodoro timer for the main process.
 * Remaining time is derived from endsAt so it stays accurate when the UI is hidden.
 */

const PHASE_ICONS = { work: '⏱', short: '☕', long: '🦆' };

function createTimer({ onUpdate, onComplete }) {
  const state = {
    phase: 'work',
    running: false,
    remaining: 25 * 60,
    total: 25 * 60,
    endsAt: null,
    segmentStartedAt: null,
    activeMs: 0,
    pomodorosToday: 0,
    settings: {
      work: 25,
      short: 5,
      long: 15,
      pomosBeforeLong: 4,
    },
  };

  let tickId = null;

  function getRemaining() {
    if (state.running && state.endsAt != null) {
      return Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
    }
    return state.remaining;
  }

  function snapshot() {
    const remaining = getRemaining();
    return {
      phase: state.phase,
      running: state.running,
      remaining,
      total: state.total,
      pomodorosToday: state.pomodorosToday,
      settings: { ...state.settings },
    };
  }

  function emitUpdate() {
    onUpdate(snapshot());
  }

  function getNextBreakPhase() {
    const { pomodorosToday, settings } = state;
    return pomodorosToday > 0 && pomodorosToday % settings.pomosBeforeLong === 0
      ? 'long'
      : 'short';
  }

  function stopTick() {
    if (tickId != null) {
      clearInterval(tickId);
      tickId = null;
    }
  }

  function flushActiveMs() {
    if (state.segmentStartedAt != null) {
      state.activeMs += Date.now() - state.segmentStartedAt;
      state.segmentStartedAt = null;
    }
  }

  function startTick() {
    stopTick();
    tickId = setInterval(() => {
      const remaining = getRemaining();
      state.remaining = remaining;
      if (remaining <= 0) {
        completePhase();
        return;
      }
      emitUpdate();
    }, 250);
  }

  function startPhase(phase, { autoStart = false } = {}) {
    stopTick();
    flushActiveMs();
    state.phase = phase;
    state.total = Math.max(1, state.settings[phase] || 25) * 60;
    state.remaining = state.total;
    state.endsAt = null;
    state.activeMs = 0;
    state.segmentStartedAt = null;
    state.running = false;

    if (autoStart) {
      state.running = true;
      state.endsAt = Date.now() + state.remaining * 1000;
      state.segmentStartedAt = Date.now();
      startTick();
    }
    emitUpdate();
  }

  function completePhase() {
    stopTick();
    flushActiveMs();
    state.running = false;
    state.endsAt = null;
    state.remaining = 0;

    const durationMin = Math.max(1, Math.round(state.activeMs / 60000) || Math.round(state.total / 60));
    const completedPhase = state.phase;
    let nextPhase;

    if (completedPhase === 'work') {
      state.pomodorosToday++;
      nextPhase = getNextBreakPhase();
    } else {
      nextPhase = 'work';
    }

    onComplete({
      phase: completedPhase,
      duration: durationMin,
      time: Date.now(),
      pomodorosToday: state.pomodorosToday,
      nextPhase,
    });

    startPhase(nextPhase, { autoStart: true });
  }

  function toggle() {
    if (state.running) {
      state.remaining = getRemaining();
      flushActiveMs();
      state.running = false;
      state.endsAt = null;
      stopTick();
      emitUpdate();
      return snapshot();
    }

    if (state.remaining <= 0) {
      state.remaining = state.total;
    }
    state.running = true;
    state.endsAt = Date.now() + state.remaining * 1000;
    state.segmentStartedAt = Date.now();
    startTick();
    emitUpdate();
    return snapshot();
  }

  function reset() {
    stopTick();
    flushActiveMs();
    state.running = false;
    state.endsAt = null;
    state.remaining = state.total;
    state.activeMs = 0;
    state.segmentStartedAt = null;
    emitUpdate();
    return snapshot();
  }

  function skip() {
    stopTick();
    flushActiveMs();
    state.running = false;
    state.endsAt = null;
    state.activeMs = 0;
    state.segmentStartedAt = null;
    const next = state.phase === 'work' ? getNextBreakPhase() : 'work';
    startPhase(next, { autoStart: false });
    return snapshot();
  }

  function setSettings(partial) {
    const next = { ...state.settings, ...partial };
    for (const key of ['work', 'short', 'long', 'pomosBeforeLong']) {
      const n = parseInt(next[key], 10);
      if (Number.isFinite(n) && n >= 1) next[key] = n;
    }
    state.settings = next;

    if (!state.running) {
      state.total = Math.max(1, state.settings[state.phase] || 25) * 60;
      state.remaining = state.total;
    }
    emitUpdate();
  }

  function setPomodorosToday(n) {
    state.pomodorosToday = Math.max(0, parseInt(n, 10) || 0);
    emitUpdate();
  }

  function trayTitle() {
    const snap = snapshot();
    return `${PHASE_ICONS[snap.phase] || '⏱'} ${formatTime(snap.remaining)}`;
  }

  // Idle tray before first tick
  startPhase('work', { autoStart: false });

  return {
    snapshot,
    toggle,
    reset,
    skip,
    setSettings,
    setPomodorosToday,
    trayTitle,
    getRemaining,
    dispose: stopTick,
  };
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

module.exports = { createTimer, formatTime, PHASE_ICONS };
