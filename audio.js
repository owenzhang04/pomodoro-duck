/** Web Audio beeps / quacks (browser context). */
(function (global) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function getSettings() {
    return global.pomoAppSettings || { sound: true, volume: 50 };
  }

  function resume() {
    if (audioCtx.state === 'suspended') {
      return audioCtx.resume();
    }
    return Promise.resolve();
  }

  function beep(freq = 880, dur = 0.15, type = 'sine') {
    const settings = getSettings();
    if (!settings.sound) return;
    const vol = Math.max(0.001, (settings.volume / 100) * 0.3);
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur);
  }

  function quack() {
    if (!getSettings().sound) return;
    [400, 350, 300, 250].forEach((f, i) => {
      setTimeout(() => beep(f, 0.12, 'triangle'), i * 80);
    });
  }

  /** Play cue for the phase that just finished. */
  function phaseCompleteSound(completedPhase) {
    if (!getSettings().sound) return;
    if (completedPhase === 'work') {
      quack();
    } else {
      [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.2), i * 150));
    }
  }

  global.PomoAudio = { resume, beep, quack, phaseCompleteSound };
})(window);
