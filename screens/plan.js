// ============================================
// HERBI – Wochenplan Screen (plan.js)
// ============================================

Screens.plan = function(el, params) {

  const DAYS       = ['Mo','Di','Mi','Do','Fr','Sa','So'];
  const DAY_MONTHS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

  const TAG_MAP = {
    'meal-prep':    { l:'Meal Prep',    c:'tag-mp'    },
    'rest':         { l:'Reste',        c:'tag-mp'    },
    'vegetarisch':  { l:'Veggie',       c:'tag-green' },
    'vegan':        { l:'Vegan',        c:'tag-green' },
    'pescetarisch': { l:'Fisch',        c:'tag-green' },
    'high-protein': { l:'High-Protein', c:'tag-amber' },
    'italienisch':  { l:'Italienisch',  c:'tag-red'   },
    'asiatisch':    { l:'Asiatisch',    c:'tag-pink'  },
    'mexikanisch':  { l:'Mexikanisch',  c:'tag-red'   },
    'mediterran':   { l:'Mediterran',   c:'tag-green' },
    'deutsch':      { l:'Deutsch',      c:'tag-gray'  },
    'indisch':      { l:'Indisch',      c:'tag-amber' },
    'schnell':      { l:'Schnell',      c:'tag-gray'  },
  };

  // --- State ---
  let allWeeks      = [];   // ['2026-W22', '2026-W23', ...]
  let activeWeekIdx = 0;
  let activeDay     = getTodayIndex();
  let overviewOpen  = false;
  let checkedMeals  = new Set(); // für Auswahl-Logik

  // --- Initialisieren ---
  function init() {
    const currentKey = Store.getCurrentWeekKey();
    allWeeks = Store.getAllWeeks();

    // Aktuelle Woche sicherstellen
    if (!allWeeks.includes(currentKey)) {
      allWeeks.push(currentKey);
    }
    // Nächste Woche immer anzeigen (auch wenn leer)
    const nextKey = getNextWeekKey(currentKey);
    if (!allWeeks.includes(nextKey)) allWeeks.push(nextKey);

    allWeeks.sort();
    activeWeekIdx = allWeeks.indexOf(currentKey);
    if (activeWeekIdx < 0) activeWeekIdx = allWeeks.length - 1;

    render();
  }

  // --- Hilfsfunktionen ---
  function getNextWeekKey(key) {
    const [year, wPart] = key.split('-W');
    const week = parseInt(wPart);
    if (week >= 52) return `${parseInt(year) + 1}-W01`;
    return `${year}-W${String(week + 1).padStart(2, '0')}`;
  }

  function weekKeyToMondayDate(key) {
    const [year, wPart] = key.split('-W');
    const week = parseInt(wPart);
    const jan1 = new Date(parseInt(year), 0, 1);
    const dayOfWeek = jan1.getDay() || 7;
    const firstMon = new Date(jan1);
    firstMon.setDate(jan1.getDate() + (8 - dayOfWeek) % 7);
    const mon = new Date(firstMon);
    mon.setDate(firstMon.getDate() + (week - 2) * 7);
    return mon;
  }

  function weekDates(key) {
    const mon = weekKeyToMondayDate(key);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
  }

  function weekLabel(key) {
    const [, wPart] = key.split('-W');
    return 'KW ' + parseInt(wPart);
  }

  function weekSubLabel(key) {
    const dates = weekDates(key);
    const first = dates[0];
    const last  = dates[6];
    const fm    = DAY_MONTHS[first.getMonth()];
    const lm    = DAY_MONTHS[last.getMonth()];
    const sameMonth = first.getMonth() === last.getMonth();
    return sameMonth
      ? `${first.getDate()}–${last.getDate()}. ${fm}`
      : `${first.getDate()}. ${fm} – ${last.getDate()}. ${lm}`;
  }

  function isCurrentWeek(key) {
    return key === Store.getCurrentWeekKey();
  }

  function hasPlan(key) {
    return !!Store.getPlan(key);
  }

  function getMeal(key, day, type) {
    return Store.getPlan(key)?.meals?.[day]?.[type] || null;
  }

  function mealIds(key) {
    if (!hasPlan(key)) return [];
    return DAYS.flatMap(d =>
      ['lunch','dinner','breakfast'].map(t => `${d}-${t}`)
        .filter(id => getMeal(key, d, id.split('-')[1]))
    );
  }

  function dayMealIds(key, day) {
    return ['breakfast','lunch','dinner']
      .map(t => `${day}-${t}`)
      .filter(id => getMeal(key, day, id.split('-')[1]));
  }

  function allCookedInDay(key, day) {
    return dayMealIds(key, day).every(id => {
      const [d, t] = id.split('-');
      const m = getMeal(key, d, t);
      return m?.is_rest || m?.cooked;
    });
  }

  function someCookedInDay(key, day) {
    return dayMealIds(key, day).some(id => {
      const [d, t] = id.split('-');
      const m = getMeal(key, d, t);
      return m?.cooked;
    });
  }

  function renderTagsHtml(tags) {
    return (tags || []).map(t => {
      const def = TAG_MAP[t];
      if (!def) return '';
      return `<span class="tag ${def.c}">${def.l}</span>`;
    }).join('');
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  function render() {
    const key     = allWeeks[activeWeekIdx];
    const plan    = Store.getPlan(key);
    const dates   = weekDates(key);
    const isCurr  = isCurrentWeek(key);
    const todayIdx = getTodayIndex();
    const budget  = plan?.total_cost || Store.getSettings().budget;
    const maxBudget = Store.getSettings().budget;

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%">
        <div class="status-spacer"></div>

        <!-- Top Bar -->
        <div class="page-header">
          <!-- Week Navigation -->
          <div class="week-nav-row">
            <button class="week-arrow" id="prev-week" ${activeWeekIdx === 0 ? 'disabled' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,18 9,12 15,6"/></svg>
            </button>
            <div class="week-center" id="week-center">
              <div class="week-kw-label">${weekLabel(key)}</div>
              <div class="week-dates-label${!hasPlan(key) ? ' empty' : ''}">${weekSubLabel(key)}${hasPlan(key) ? ' · geplant' : ' · nicht geplant'}</div>
            </div>
            <button class="week-arrow" id="next-week" ${activeWeekIdx === allWeeks.length - 1 ? 'disabled' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9,18 15,12 9,6"/></svg>
            </button>
            <div style="display:flex;gap:6px;margin-left:10px">
              <div class="icon-btn" id="refresh-btn" title="${checkedMeals.size > 0 ? checkedMeals.size + ' ersetzen' : 'Alle ersetzen'}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><path d="M20.49,15a9,9,0,1,1-2.12-9.36L23,10"/></svg>
              </div>
              <div class="icon-btn" id="cart-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1,1h4l2.68,13.39a2,2,0,0,0,2,1.61h9.72a2,2,0,0,0,2-1.61L23,6H6"/></svg>
                ${checkedMeals.size > 0 ? `<div class="btn-badge">${checkedMeals.size}</div>` : ''}
              </div>
            </div>
          </div>

          <!-- Week Overview (collapsible) -->
          <div id="week-overview" style="display:${overviewOpen ? 'block' : 'none'}">
            <div class="week-overview-grid" id="week-overview-grid"></div>
            <button class="new-week-btn" id="new-week-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Neue Woche planen
            </button>
          </div>

          <!-- Budget Bar (only when plan exists) -->
          ${hasPlan(key) ? `
          <div class="budget-bar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12,6v6l4,2"/></svg>
            <span class="budget-label">${Store.getSettings().supermarkets?.[0] || 'Rewe'}</span>
            <span class="budget-amount">ca. ${(plan?.total_cost || 0).toFixed(0)} €</span>
            <div class="budget-track">
              <div class="budget-fill" style="width:${Math.min(100, Math.round(((plan?.total_cost || 0) / maxBudget) * 100))}%"></div>
            </div>
            <span class="budget-of">von <b>${maxBudget} €</b></span>
          </div>
          ` : ''}

          <!-- Day Tabs -->
          ${hasPlan(key) ? `
          <div class="day-tabs" id="day-tabs">
            ${DAYS.map((d, i) => {
              const isToday    = isCurr && i === todayIdx;
              const hasCooked  = someCookedInDay(key, d);
              const isActive   = i === activeDay;
              return `
                <div class="day-tab${isActive ? ' active' : ''}${hasCooked ? ' has-cooked' : ''}" data-day="${i}">
                  <span class="day-tab-short">${d}${isToday ? '<span class="today-badge">heute</span>' : ''}</span>
                  <span class="day-tab-num">${dates[i].getDate()}</span>
                  <div class="day-tab-dot"></div>
                </div>
              `;
            }).join('')}
          </div>
          ` : ''}
        </div>

        <!-- Day Content -->
        <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none" id="day-scroll">
          <div id="day-content"></div>
        </div>
      </div>
    `;

    // Events
    el.querySelector('#prev-week')?.addEventListener('click', () => {
      if (activeWeekIdx > 0) { activeWeekIdx--; activeDay = 0; overviewOpen = false; render(); }
    });
    el.querySelector('#next-week')?.addEventListener('click', () => {
      if (activeWeekIdx < allWeeks.length - 1) { activeWeekIdx++; activeDay = 0; overviewOpen = false; render(); }
    });
    el.querySelector('#week-center')?.addEventListener('click', () => {
      overviewOpen = !overviewOpen; render();
    });
    el.querySelector('#cart-btn')?.addEventListener('click', () => {
      Router.navigate('list', { weekKey: key, selectedMeals: [...checkedMeals] });
    });
    el.querySelector('#refresh-btn')?.addEventListener('click', () => {
      confirmRegenerate(key);
    });
    el.querySelector('#new-week-btn')?.addEventListener('click', () => {
      generateNewWeek();
    });

    // Day tabs
    el.querySelectorAll('[data-day]').forEach(tab => {
      tab.addEventListener('click', () => {
        activeDay = parseInt(tab.dataset.day);
        render();
      });
    });

    // Week overview
    if (overviewOpen) renderWeekOverview();

    // Day content
    renderDayContent(key, dates);
  }

  // ============================================
  // WEEK OVERVIEW
  // ============================================
  function renderWeekOverview() {
    const grid = el.querySelector('#week-overview-grid');
    if (!grid) return;
    grid.innerHTML = '';

    allWeeks.forEach((wk, i) => {
      const plan = Store.getPlan(wk);
      const card = document.createElement('div');
      card.className = `week-mini-card${i === activeWeekIdx ? ' active' : ''}`;

      const dots = DAYS.map(d => {
        const cooked = plan && (
          getMeal(wk, d, 'lunch')?.cooked ||
          getMeal(wk, d, 'dinner')?.cooked
        );
        return `<div class="wmc-dot${cooked ? ' cooked' : ''}"></div>`;
      }).join('');

      const allCooked = plan && DAYS.every(d => allCookedInDay(wk, d));
      const anyCooked = plan && DAYS.some(d => someCookedInDay(wk, d));
      const status    = plan
        ? (allCooked ? '✓ fertig' : anyCooked ? 'läuft' : 'geplant')
        : 'leer';

      card.innerHTML = `
        <div class="wmc-kw">${weekLabel(wk)}</div>
        <div class="wmc-dates">${weekSubLabel(wk)}</div>
        <div class="wmc-dots">${dots}</div>
        <div class="wmc-status${plan ? ' planned' : ''}">${status}</div>
      `;
      card.addEventListener('click', () => {
        activeWeekIdx = i; activeDay = 0; overviewOpen = false; render();
      });
      grid.appendChild(card);
    });
  }

  // ============================================
  // DAY CONTENT
  // ============================================
  function renderDayContent(key, dates) {
    const content = el.querySelector('#day-content');
    if (!content) return;

    if (!hasPlan(key)) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-emoji">📅</div>
          <div class="empty-text">${weekLabel(key)} (${weekSubLabel(key)})<br>hat noch keinen Plan.</div>
          <button class="primary-btn" id="gen-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
            Woche planen
          </button>
        </div>
      `;
      content.querySelector('#gen-btn').addEventListener('click', generateNewWeek);
      return;
    }

    const day     = DAYS[activeDay];
    const date    = dates[activeDay];
    const isCurr  = isCurrentWeek(key);
    const isToday = isCurr && activeDay === getTodayIndex();

    const full    = allCookedInDay(key, day);
    const partial = someCookedInDay(key, day) && !full;

    const wrap = document.createElement('div');
    wrap.className = 'day-content';

    // Day label row with select-all checkbox
    const dayRow = document.createElement('div');
    dayRow.className = 'day-label-row';
    dayRow.innerHTML = `
      <span class="day-label">
        ${DAY_FULL[activeDay]}, ${date.getDate()}. ${DAY_MONTHS[date.getMonth()]}
        ${isToday ? '<span class="today-badge" style="margin-left:4px">heute</span>' : ''}
      </span>
      <div class="day-check-btn${full || partial ? ' on' : ''}" id="day-check">
        <div class="day-cb${full ? ' on' : partial ? ' partial' : ''}">
          ${full ? '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>' :
            partial ? '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>' : ''}
        </div>
        <span>Tag wählen</span>
      </div>
    `;
    dayRow.querySelector('#day-check').addEventListener('click', () => {
      const ids = dayMealIds(key, day);
      const allSelected = ids.every(id => checkedMeals.has(id));
      if (allSelected) ids.forEach(id => checkedMeals.delete(id));
      else ids.forEach(id => checkedMeals.add(id));
      render();
    });
    wrap.appendChild(dayRow);

    // Meal types to show
    const mealTypes = ['breakfast','lunch','dinner'].filter(t => {
      const settings = Store.getSettings();
      if (t === 'breakfast' && !settings.meals?.breakfast) return false;
      if (t === 'lunch'     && !settings.meals?.lunch)     return false;
      if (t === 'dinner'    && !settings.meals?.dinner)    return false;
      return true;
    });

    mealTypes.forEach(type => {
      const meal = getMeal(key, day, type);
      if (!meal) return;

      const mealId = `${day}-${type}`;

      // Meal Prep Reste → Banner statt Karte
      if (meal.is_rest) {
        const banner = document.createElement('div');
        banner.className = 'mp-banner';
        banner.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17,1 21,5 17,9"/><path d="M3,11V9a4,4,0,0,1,4-4h14"/><polyline points="7,23 3,19 7,15"/><path d="M21,13v2a4,4,0,0,1-4,4H3"/></svg>
          <span>Mittag: Reste vom Meal Prep – kein Kochen nötig.</span>
        `;
        wrap.appendChild(banner);
        return;
      }

      const isChecked = checkedMeals.has(mealId);
      const typeLabels = { breakfast:'Frühstück', lunch:'Mittag', dinner:'Abend' };
      const barColors  = { breakfast:'#F97B22',   lunch:'#2D7D3A', dinner:'#185FA5' };

      const card = document.createElement('div');
      card.className = `meal-card${isChecked ? ' selected' : ''}${meal.cooked ? ' cooked' : ''}`;

      const tagsHtml = meal.cooked
        ? `<span class="tag tag-done"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg> Gekocht</span>`
        : `${meal.time_min ? `<span class="tag tag-gray"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg> ${meal.time_min} min</span>` : ''}${renderTagsHtml(meal.tags)}`;

      card.innerHTML = `
        <div class="meal-inner">
          <div class="meal-cb-wrap" data-meal-id="${mealId}">
            <div class="meal-cb${isChecked ? ' on' : ''}">
              ${isChecked ? '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
            </div>
          </div>
          <div class="meal-color-bar" style="background:${barColors[type]}"></div>
          <div class="meal-info">
            <div class="meal-type-row">
              <span class="meal-type">${typeLabels[type]}</span>
              <span class="meal-price">${meal.price ? formatPrice(meal.price) : ''}</span>
            </div>
            <div class="meal-name">${meal.name}</div>
            <div class="meal-tags">${tagsHtml}</div>
          </div>
          <div class="meal-img" style="position:relative">
            ${meal.emoji || '🍽️'}
            ${meal.cooked ? `<div class="cooked-overlay"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2D7D3A" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg></div>` : ''}
          </div>
        </div>
      `;

      // Checkbox toggle
      card.querySelector('[data-meal-id]').addEventListener('click', e => {
        e.stopPropagation();
        if (checkedMeals.has(mealId)) checkedMeals.delete(mealId);
        else checkedMeals.add(mealId);
        render();
      });

      // Card tap → Recipe
      card.addEventListener('click', () => {
        Router.navigate('recipe', { weekKey: key, day, type, meal });
      });

      wrap.appendChild(card);
    });

    // Hint
    const hint = document.createElement('div');
    hint.className = 'selection-hint';
    hint.textContent = checkedMeals.size === 0
      ? 'Kein Häkchen = alle Mahlzeiten werden übernommen'
      : `${checkedMeals.size} Mahlzeit${checkedMeals.size !== 1 ? 'en' : ''} ausgewählt`;
    wrap.appendChild(hint);

    content.innerHTML = '';
    content.appendChild(wrap);
  }

  // ============================================
  // GENERATE NEW WEEK
  // ============================================
  async function generateNewWeek() {
    overviewOpen = false;
    const key = allWeeks[activeWeekIdx];
    const container = el.querySelector('#day-content') || el;

    // Loading anzeigen
    let cancelled = false;
    if (container) {
      container.innerHTML = `
        <div class="loading-screen" style="min-height:300px;gap:16px">
          <div style="font-size:40px">🌿</div>
          <div class="spinner"></div>
          <div class="loading-text" id="gen-msg">Plan wird erstellt…</div>
          <div style="font-size:12px;color:var(--text-3);text-align:center;line-height:1.6" id="gen-sub">KI wählt Rezepte für dich aus…</div>
          <button id="cancel-plan-btn" style="margin-top:8px;padding:9px 22px;border-radius:10px;background:transparent;color:var(--text-3);font-size:13px;font-weight:500;border:1px solid var(--border-mid);cursor:pointer">
            Abbrechen
          </button>
        </div>
      `;

      const subTexts = ['KI wählt Rezepte für dich aus…', 'Budget wird berechnet…', 'Meal Prep wird geplant…', 'Fast fertig…'];
      let subIdx = 0;
      const subInterval = setInterval(() => {
        subIdx = (subIdx + 1) % subTexts.length;
        const subEl = container.querySelector('#gen-sub');
        if (subEl) subEl.textContent = subTexts[subIdx];
      }, 2000);

      container.querySelector('#cancel-plan-btn')?.addEventListener('click', () => {
        cancelled = true;
        clearInterval(subInterval);
        render(); // Zurück zur normalen Ansicht
      });
    }

    try {
      const apiKey   = localStorage.getItem('herbi_api_key');
      const settings = Store.getSettings();
      const planData = await API.generateWeekPlan(settings, apiKey);

      if (cancelled) return; // Nutzer hat abgebrochen

      Store.savePlan(key, {
        meals:        planData.days,
        total_cost:   planData.total_cost,
        generated_at: new Date().toISOString(),
      });

      // Nächste leere Woche auch vorbereiten
      const nextKey = getNextWeekKey(key);
      if (!allWeeks.includes(nextKey)) {
        allWeeks.push(nextKey);
        allWeeks.sort();
      }

      render();

    } catch (err) {
      console.error(err);
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-emoji">😕</div>
            <div class="empty-text">Plan konnte nicht erstellt werden.<br>${err.message}</div>
            <button class="primary-btn" id="retry-btn">Nochmal versuchen</button>
          </div>
        `;
        container.querySelector('#retry-btn').addEventListener('click', generateNewWeek);
      }
    }
  }

  // ============================================
  // REGENERATE SELECTED / ALL
  // ============================================
  async function confirmRegenerate(key) {
    const n     = checkedMeals.size;
    const label = n > 0 ? `${n} ausgewählte Mahlzeit${n !== 1 ? 'en' : ''}` : 'den gesamten Plan';
    if (!confirm(`${label} durch neue Vorschläge ersetzen?`)) return;

    if (n === 0) {
      // Ganzen Plan neu generieren
      Store.savePlan(key, null);
      generateNewWeek();
    } else {
      // Nur ausgewählte tauschen – zur Swap-Ansicht
      checkedMeals.forEach(mealId => {
        const [day, type] = mealId.split('-');
        const meal = getMeal(key, day, type);
        if (meal) Router.navigate('swap', { weekKey: key, day, type, meal });
      });
    }
  }

  // Start
  init();
};

// ============================================
// SETTINGS SCREEN (stub – wird später ausgebaut)
// ============================================
Screens.settings = function(el, params) {
  const s = Store.getSettings();

  const MARKET_NAMES = {
    rewe:'Rewe', edeka:'Edeka', lidl:'Lidl',
    netto:'Netto', denns:"denn's", goasia:'Go Asia',
  };

  el.innerHTML = `
    <div>
      <div class="status-spacer"></div>
      <div class="page-header">
        <div class="page-header-row">
          <h1 class="page-title">Einstellungen</h1>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Einkauf</div>
        <div class="settings-group">
          <div class="settings-row" id="row-markets">
            <div class="settings-row-left">
              <span class="settings-row-icon">🛒</span>
              <span class="settings-row-label">Supermärkte</span>
            </div>
            <span class="settings-row-value">${(s.supermarkets || []).map(id => MARKET_NAMES[id] || id).join(', ')}</span>
          </div>
          <div class="settings-row" id="row-budget">
            <div class="settings-row-left">
              <span class="settings-row-icon">💶</span>
              <span class="settings-row-label">Wochenbudget</span>
            </div>
            <span class="settings-row-value">${s.budget} €</span>
          </div>
          <div class="settings-row" id="row-portions">
            <div class="settings-row-left">
              <span class="settings-row-icon">👤</span>
              <span class="settings-row-label">Personen</span>
            </div>
            <span class="settings-row-value">${s.portions} ${s.portions === 1 ? 'Person' : 'Personen'}</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">Küche</div>
        <div class="settings-group">
          <div class="settings-row" id="row-cuisines">
            <div class="settings-row-left">
              <span class="settings-row-icon">🍽️</span>
              <span class="settings-row-label">Lieblingsküchen</span>
            </div>
            <span class="settings-row-value">${(s.cuisines || []).join(', ')}</span>
          </div>
          <div class="settings-row" id="row-diets">
            <div class="settings-row-left">
              <span class="settings-row-icon">🥦</span>
              <span class="settings-row-label">Ernährungsweise</span>
            </div>
            <span class="settings-row-value">${(s.diets || ['alles']).join(', ')}</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-label">App</div>
        <div class="settings-group">
          <div class="settings-row" id="row-apikey">
            <div class="settings-row-left">
              <span class="settings-row-icon">🔑</span>
              <span class="settings-row-label">Claude API Key</span>
            </div>
            <span class="settings-row-value">sk-ant-••••••</span>
          </div>
          <div class="settings-row" id="row-reset">
            <div class="settings-row-left">
              <span class="settings-row-icon">🔄</span>
              <span class="settings-row-label" style="color:#E24B4A">App zurücksetzen</span>
            </div>
          </div>
        </div>
      </div>

      <div style="padding:0 16px 8px;font-size:12px;color:var(--text-3);text-align:center">
        Herbi · Nur für dich · Berlin 🌿
      </div>
    </div>
  `;

  // Edit settings → back to onboarding
  el.querySelector('#row-markets').addEventListener('click',  () => Router.navigate('onboarding-markets', { fromSettings: true }));
  el.querySelector('#row-budget').addEventListener('click',   () => Router.navigate('onboarding-budget',  { fromSettings: true }));
  el.querySelector('#row-portions').addEventListener('click', () => Router.navigate('onboarding-budget',  { fromSettings: true }));
  el.querySelector('#row-cuisines').addEventListener('click', () => Router.navigate('onboarding-cuisine', { fromSettings: true }));
  el.querySelector('#row-diets').addEventListener('click',    () => Router.navigate('onboarding-cuisine', { fromSettings: true }));

  el.querySelector('#row-apikey').addEventListener('click', () => {
    const key = prompt('Neuen Claude API Key eingeben:');
    if (key && key.startsWith('sk-ant-')) {
      localStorage.setItem('herbi_api_key', key);
      alert('API Key gespeichert ✓');
    }
  });

  el.querySelector('#row-reset').addEventListener('click', () => {
    if (confirm('Alle Daten und Pläne löschen?')) {
      localStorage.clear();
      location.reload();
    }
  });
};

// Stub screens (werden noch gebaut)
Screens.share = function(el, params) {
  el.innerHTML = `<div class="empty-state"><div class="empty-emoji">🚧</div><div class="empty-text">Kommt bald</div></div>`;
};
