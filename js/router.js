// ============================================
// HERBI – Router (router.js)
// Verwaltet welcher Screen gerade sichtbar ist
// und die Navigation zwischen Screens.
// ============================================

const Router = (() => {
  let currentScreen = null;
  let history = [];

  // Alle registrierten Screens
  const screens = {};

  // Screen registrieren
  function register(name, renderFn) {
    screens[name] = renderFn;
  }

  // Zu einem Screen navigieren
  function navigate(name, params = {}, options = {}) {
    const container = document.getElementById('screen-container');
    if (!container) return;

    // Render-Funktion aufrufen
    if (!screens[name]) {
      console.error(`Screen "${name}" not found`);
      return;
    }

    // Alten Screen als prev markieren
    const existing = container.querySelector('.screen.active');
    if (existing) {
      existing.classList.remove('active');
      if (!options.replace) {
        existing.classList.add('prev');
        // Nach Transition entfernen
        setTimeout(() => {
          if (existing.parentNode) existing.remove();
        }, 350);
      } else {
        existing.remove();
      }
    }

    // Neuen Screen erstellen
    const screenEl = document.createElement('div');
    screenEl.className = 'screen';
    screenEl.id = `screen-${name}`;
    container.appendChild(screenEl);

    // Inhalt rendern
    screens[name](screenEl, params);

    // Aktivieren (nach kurzer Pause für Animation)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        screenEl.classList.add('active');
      });
    });

    // History verwalten
    if (!options.replace) {
      history.push({ name, params });
    } else {
      history[history.length - 1] = { name, params };
    }

    currentScreen = name;

    // Bottom Nav aktualisieren
    updateBottomNav(name);
  }

  // Zurück navigieren
  function back() {
    if (history.length <= 1) return;
    history.pop();
    const prev = history[history.length - 1];
    navigate(prev.name, prev.params, { replace: true });
  }

  // Bottom Nav aktualisieren
  function updateBottomNav(screenName) {
    const nav = document.getElementById('bottom-nav');
    if (!nav) return;

    // Nav nur bei Haupt-Screens anzeigen
    const mainScreens = ['plan', 'pantry', 'settings'];
    nav.style.display = mainScreens.includes(screenName) ? 'flex' : 'none';

    // Aktiven Tab markieren
    nav.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === screenName);
    });
  }

  // Aktuellen Screen Namen holen
  function getCurrent() {
    return currentScreen;
  }

  return { register, navigate, back, getCurrent };
})();

// Global verfügbar machen
function navigate(screen, params) {
  Router.navigate(screen, params);
}
function goBack() {
  Router.back();
}
