// ============================================
// HERBI – App Bootstrap (app.js)
// Startet die App, registriert Screens
// ============================================

// --- Shared Tag-Definitionen ---
const TAG_DEFS = {
  'meal-prep':    { label: 'Meal Prep',     cls: 'tag-mp'    },
  'rest':         { label: 'Reste',          cls: 'tag-mp'    },
  'vegetarisch':  { label: 'Veggie',         cls: 'tag-green' },
  'vegan':        { label: 'Vegan',          cls: 'tag-green' },
  'pescetarisch': { label: 'Fisch',          cls: 'tag-green' },
  'high-protein': { label: 'High-Protein',   cls: 'tag-amber' },
  'low-carb':     { label: 'Low-Carb',       cls: 'tag-amber' },
  'italienisch':  { label: 'Italienisch',    cls: 'tag-red'   },
  'asiatisch':    { label: 'Asiatisch',      cls: 'tag-pink'  },
  'mexikanisch':  { label: 'Mexikanisch',    cls: 'tag-red'   },
  'mediterran':   { label: 'Mediterran',     cls: 'tag-green' },
  'schnell':      { label: 'Schnell',        cls: 'tag-gray'  },
};

// --- Tag HTML generieren ---
function renderTags(tags = [], extraClass = '') {
  return tags.map(t => {
    const def = TAG_DEFS[t];
    if (!def) return '';
    return `<span class="tag ${def.cls} ${extraClass}">${def.label}</span>`;
  }).join('');
}

// --- Zeit-Tag ---
function timeTag(minutes) {
  if (!minutes) return '';
  return `<span class="tag tag-gray">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
    ${minutes} min
  </span>`;
}

// --- Preis formatieren ---
function formatPrice(price) {
  if (!price || price === 0) return '–';
  return price.toFixed(2).replace('.', ',') + ' €';
}

// --- Toast anzeigen ---
function showToast(el, message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast fade-in';
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>
    ${message}
  `;
  el.insertBefore(toast, el.firstChild);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// --- Loading Screen ---
function showLoading(el, text = 'Plan wird erstellt…') {
  el.innerHTML = `
    <div class="loading-screen">
      <div class="spinner"></div>
      <div class="loading-text">${text}</div>
    </div>
  `;
}

// --- Wochentag-Namen ---
const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const DAY_FULL  = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

// --- Heutigen Wochentag-Index (0=Mo, 6=So) ---
function getTodayIndex() {
  const day = new Date().getDay(); // 0=So, 1=Mo, ...
  return day === 0 ? 6 : day - 1;
}

// --- Datum formatieren (z.B. "1. Juni") ---
function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return `${date.getDate()}. ${months[date.getMonth()]}`;
}

// --- Service Worker registrieren (für Offline-Support) ---
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    });
  }
}

// ============================================
// APP START
// ============================================
document.addEventListener('DOMContentLoaded', () => {

  // Screens registrieren
  Router.register('onboarding-markets',  Screens.onboardingMarkets);
  Router.register('onboarding-budget',   Screens.onboardingBudget);
  Router.register('onboarding-cuisine',  Screens.onboardingCuisine);
  Router.register('plan',                Screens.plan);
  Router.register('recipe',              Screens.recipe);
  Router.register('swap',                Screens.swap);
  Router.register('list',                Screens.list);
  Router.register('share',               Screens.share);
  Router.register('settings',            Screens.settings);

  // Service Worker
  registerServiceWorker();

  // Ersten Screen bestimmen
  if (Store.isOnboardingDone()) {
    Router.navigate('plan', {}, { replace: true });
  } else {
    Router.navigate('onboarding-markets', {}, { replace: true });
  }
});
