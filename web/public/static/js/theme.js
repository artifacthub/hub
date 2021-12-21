(() => {
  const detectActiveThemeMode = () => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const updateActiveStyleSheet = (currentTheme) => {
    document.getElementsByTagName('html')[0].setAttribute('data-theme', currentTheme);
    document
      .querySelector(`meta[name='theme-color']`)
      .setAttribute('content', currentTheme === 'light' ? '#417598' : '#131216');
  };

  const themeDarkModeFn = () => {
    const newTheme = detectActiveThemeMode();
    updateActiveStyleSheet(newTheme);
  };

  let theme = detectActiveThemeMode(); // By default, automatic theme is enabled
  const activeProfile = localStorage.getItem('activeProfile');
  const prefs = localStorage.getItem('prefs');
  if (activeProfile && prefs) {
    const savedPrefs = JSON.parse(prefs);
    const activeUserPrefs = savedPrefs[activeProfile];
    if (activeUserPrefs) {
      if (activeUserPrefs.theme.configured === 'automatic') {
        // If user has enabled automatic mode, listener for color schema change is activated
        const currentMode = window.matchMedia(`(prefers-color-scheme: dark)`);
        try {
          currentMode.addEventListener('change', themeDarkModeFn);
        } catch {
          try {
            currentMode.addListener(themeDarkModeFn);
          } catch {
            // Old browser
          }
        }
      } else {
        theme = activeUserPrefs.theme.effective;
      }
    }
  }
  updateActiveStyleSheet(theme);
})();
