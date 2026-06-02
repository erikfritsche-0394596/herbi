// ============================================
// HERBI – State Management (store.js)
// Alle App-Daten werden hier verwaltet und
// im localStorage gespeichert.
// ============================================

const Store = (() => {

  // --- Default-Einstellungen (werden beim ersten Start gesetzt) ---
  const DEFAULTS = {
    // Onboarding abgeschlossen?
    onboardingDone: false,

    // Benutzereinstellungen
    settings: {
      supermarkets: ['rewe'],       // Ausgewählte Supermärkte
      budget: 70,                   // Wochenbudget in €
      portions: 1,                  // Anzahl Personen
      meals: {
        lunch: true,
        dinner: true,
        breakfast: false,
      },
      cuisines: ['italienisch', 'asiatisch'],
      mealConfig: {
        lunch:  { level: 1, mealprep: true },   // 0=sehr schnell, 1=schnell, 2=normal, 3=aufwendig
        dinner: { level: 2, mealprep: false },
      },
      diets: ['alles'],             // Ernährungsweise
      avoids: [],                   // Unverträglichkeiten
    },

    // Wochenpläne: { "2026-W23": { meals: {...}, budget_used: 50 } }
    plans: {},

    // Einkaufsliste: { "2026-W23": { checked: ["item-id", ...] } }
    lists: {},

    // Bring! API Token
    bringToken: null,
    bringListId: null,
  };

  // --- Interner State ---
  let state = {};

  // --- Laden aus localStorage ---
  function load() {
    try {
      const saved = localStorage.getItem('herbi_state');
      if (saved) {
        state = JSON.parse(saved);
        // Fehlende Keys mit Defaults auffüllen
        state = deepMerge(DEFAULTS, state);
      } else {
        state = JSON.parse(JSON.stringify(DEFAULTS));
      }
    } catch (e) {
      console.error('Store load error:', e);
      state = JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  // --- Speichern in localStorage ---
  function save() {
    try {
      localStorage.setItem('herbi_state', JSON.stringify(state));
    } catch (e) {
      console.error('Store save error:', e);
    }
  }

  // --- Deep Merge Helper ---
  function deepMerge(defaults, saved) {
    const result = { ...defaults };
    for (const key in saved) {
      if (saved[key] !== null && typeof saved[key] === 'object' && !Array.isArray(saved[key])) {
        result[key] = deepMerge(defaults[key] || {}, saved[key]);
      } else {
        result[key] = saved[key];
      }
    }
    return result;
  }

  // --- Aktuelle Kalenderwoche berechnen ---
  function getCurrentWeekKey() {
    const now = new Date();
    const year = now.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  // --- Woche zu Datum-Range ---
  function weekKeyToDates(weekKey) {
    const [year, weekPart] = weekKey.split('-W');
    const week = parseInt(weekPart);
    // Erster Tag der KW (Montag)
    const jan1 = new Date(parseInt(year), 0, 1);
    const dayOfWeek = jan1.getDay() || 7; // 1=Mo, 7=So
    const firstMonday = new Date(jan1);
    firstMonday.setDate(jan1.getDate() + (8 - dayOfWeek) % 7);
    const monday = new Date(firstMonday);
    monday.setDate(firstMonday.getDate() + (week - 2) * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }

  // --- Plan für eine Woche speichern ---
  function savePlan(weekKey, planData) {
    if (!state.plans) state.plans = {};
    state.plans[weekKey] = planData;
    save();
  }

  // --- Plan für eine Woche laden ---
  function getPlan(weekKey) {
    return state.plans?.[weekKey] || null;
  }

  // --- Mahlzeit als gekocht markieren ---
  function markCooked(weekKey, dayKey, mealType, cooked = true) {
    if (!state.plans?.[weekKey]) return;
    if (!state.plans[weekKey].meals?.[dayKey]?.[mealType]) return;
    state.plans[weekKey].meals[dayKey][mealType].cooked = cooked;
    save();
  }

  // --- Mahlzeit tauschen ---
  function swapMeal(weekKey, dayKey, mealType, newMeal) {
    if (!state.plans?.[weekKey]) return;
    state.plans[weekKey].meals[dayKey][mealType] = newMeal;
    save();
  }

  // --- Einkaufsliste: Item abhaken ---
  function toggleListItem(weekKey, itemKey) {
    if (!state.lists) state.lists = {};
    if (!state.lists[weekKey]) state.lists[weekKey] = { checked: [] };
    const idx = state.lists[weekKey].checked.indexOf(itemKey);
    if (idx >= 0) {
      state.lists[weekKey].checked.splice(idx, 1);
    } else {
      state.lists[weekKey].checked.push(itemKey);
    }
    save();
  }

  // --- Ob ein Item abgehakt ist ---
  function isItemChecked(weekKey, itemKey) {
    return state.lists?.[weekKey]?.checked?.includes(itemKey) ?? false;
  }

  // --- Einstellungen updaten ---
  function updateSettings(updates) {
    state.settings = { ...state.settings, ...updates };
    save();
  }

  // --- Onboarding als abgeschlossen markieren ---
  function completeOnboarding() {
    state.onboardingDone = true;
    save();
  }

  // --- Alle Wochen mit Plänen ---
  function getAllWeeks() {
    return Object.keys(state.plans || {}).sort();
  }


  // ============================================
  // VORRAT (Pantry) Funktionen
  // ============================================

  // Vorrats-Item speichern
  // item = { key, name, emoji, amount, unit, category, addedAt, isFresh }
  function savePantryItem(item) {
    if (!state.pantry) state.pantry = {};
    state.pantry[item.key] = {
      ...item,
      addedAt: item.addedAt || new Date().toISOString(),
    };
    save();
  }

  // Mehrere Vorrats-Items auf einmal speichern
  function savePantryItems(items) {
    if (!state.pantry) state.pantry = {};
    items.forEach(item => {
      if (item.surplusAmount > 0) {
        const key = item.name.toLowerCase().trim().replace(/\s+/g, '-');
        const existing = state.pantry[key];
        state.pantry[key] = {
          key,
          name:      item.name,
          emoji:     item.emoji || '🥡',
          amount:    (existing?.amount || 0) + item.surplusAmount,
          unit:      item.unit,
          category:  item.category || 'sonstiges',
          isFresh:   item.isFresh || false,
          addedAt:   new Date().toISOString(),
        };
      }
    });
    save();
  }

  // Vorrats-Item aktualisieren (z.B. Menge reduzieren nach dem Kochen)
  function updatePantryItem(key, updates) {
    if (!state.pantry?.[key]) return;
    state.pantry[key] = { ...state.pantry[key], ...updates };
    if (state.pantry[key].amount <= 0) {
      delete state.pantry[key];
    }
    save();
  }

  // Vorrats-Item löschen
  function removePantryItem(key) {
    if (state.pantry?.[key]) {
      delete state.pantry[key];
      save();
    }
  }

  // Alle Vorrats-Items laden
  function getPantry() {
    return state.pantry || {};
  }

  // Vorrat nach einer Mahlzeit reduzieren
  function deductPantryForMeal(ingredients) {
    if (!state.pantry) return;
    ingredients.forEach(ing => {
      const key = ing.name.toLowerCase().trim().replace(/\s+/g, '-');
      if (state.pantry[key]) {
        state.pantry[key].amount -= ing.amount;
        if (state.pantry[key].amount <= 0) {
          delete state.pantry[key];
        }
      }
    });
    save();
  }

  // Einkaufsliste: Surplus-Mengen speichern
  // surplusData = { itemKey: { bought, needed, unit, name, emoji, isFresh } }
  function saveSurplusData(weekKey, surplusData) {
    if (!state.surplusData) state.surplusData = {};
    state.surplusData[weekKey] = surplusData;
    save();
  }

  function getSurplusData(weekKey) {
    return state.surplusData?.[weekKey] || {};
  }

  // Initialisieren
  load();

  // Public API
  return {
    get: (key) => state[key],
    getSettings: () => state.settings,
    isOnboardingDone: () => state.onboardingDone,
    completeOnboarding,
    updateSettings,
    savePlan,
    getPlan,
    markCooked,
    swapMeal,
    toggleListItem,
    isItemChecked,
    getAllWeeks,
    getCurrentWeekKey,
    weekKeyToDates,
    save,
    savePantryItem,
    savePantryItems,
    updatePantryItem,
    removePantryItem,
    getPantry,
    deductPantryForMeal,
    saveSurplusData,
    getSurplusData,
    // Für Debugging
    _state: () => state,
  };
})();
