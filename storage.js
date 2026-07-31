/** localStorage helpers + settings/history (browser context). */
(function (global) {
  const defaultSettings = {
    work: 25,
    short: 5,
    long: 15,
    pomosBeforeLong: 4,
    sound: true,
    notifications: true,
    volume: 50,
    dark: false,
  };

  function safeJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch {
      return fallback;
    }
  }

  function setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadSettings() {
    const raw = safeJSON('pomoSettings', null);
    const hadStoredDark = raw != null && Object.prototype.hasOwnProperty.call(raw, 'dark');
    const settings = Object.assign({}, defaultSettings, raw || {});
    return { settings, hadStoredDark, isFirstLaunch: raw == null };
  }

  function saveSettings(settings) {
    setJSON('pomoSettings', settings);
  }

  function loadHistory() {
    const today = new Date().toDateString();
    const all = safeJSON('pomoHistory', {});
    return all[today] || [];
  }

  function saveHistory(history) {
    const today = new Date().toDateString();
    const all = safeJSON('pomoHistory', {});
    all[today] = history;
    setJSON('pomoHistory', all);
  }

  /** Count completed work phases from today's history. */
  function countWorkSessions(history) {
    return history.filter((h) => h.phase === 'work').length;
  }

  global.PomoStorage = {
    defaultSettings,
    loadSettings,
    saveSettings,
    loadHistory,
    saveHistory,
    countWorkSessions,
  };
})(window);
