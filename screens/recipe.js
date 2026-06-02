// ============================================
// HERBI – Rezept Screen (recipe.js)
// ============================================

Screens.recipe = function(el, params) {
  const { weekKey, day, type, meal } = params;

  if (!meal) {
    el.innerHTML = `<div class="empty-state"><div class="empty-emoji">😕</div><div class="empty-text">Rezept nicht gefunden.</div></div>`;
    return;
  }

  let portions    = Store.getSettings().portions || 1;
  let checkedIngs = new Set();
  let doneSteps   = new Set();

  const BASE_PORTIONS = portions; // für Skalierung

  const BAR_COLORS = { breakfast:'#F97B22', lunch:'#2D7D3A', dinner:'#185FA5' };
  const TYPE_LABELS = { breakfast:'Frühstück', lunch:'Mittagessen', dinner:'Abendessen' };

  function fmtAmount(base, unit, p) {
    const v = (base / BASE_PORTIONS) * p;
    if (unit === 'g' || unit === 'ml') return `${Math.round(v)} ${unit}`;
    if (unit === 'EL' || unit === 'TL') return `${parseFloat(v.toFixed(1))} ${unit}`;
    if (Number.isInteger(v)) return `${v}${unit ? ' ' + unit : ''}`;
    return `${parseFloat(v.toFixed(1))}${unit ? ' ' + unit : ''}`;
  }

  function render() {
    const ings   = meal.ingredients || [];
    const steps  = meal.steps || [];
    const kcal   = meal.kcal_per_portion ? Math.round(meal.kcal_per_portion * portions / BASE_PORTIONS) : null;
    const protein = meal.protein_g ? Math.round(meal.protein_g * portions / BASE_PORTIONS) : null;

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;min-height:100%">

        <!-- Hero -->
        <div class="recipe-hero">
          <div class="recipe-hero-btn left" id="back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,18 9,12 15,6"/></svg>
          </div>
          <div class="recipe-hero-emoji">${meal.emoji || '🍽️'}</div>
          <div class="recipe-hero-btn right" id="swap-btn" title="Rezept tauschen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17,1 21,5 17,9"/><path d="M3,11V9a4,4,0,0,1,4-4h14"/><polyline points="7,23 3,19 7,15"/><path d="M21,13v2a4,4,0,0,1-4,4H3"/></svg>
          </div>
        </div>

        <!-- Body -->
        <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none">
          <div class="recipe-body">

            <!-- Title & Tags -->
            <div class="recipe-title">${meal.name}</div>
            <div class="recipe-tags">
              ${meal.tags?.map(t => {
                const TAG_MAP = {
                  'meal-prep':'tag-mp','vegetarisch':'tag-green','vegan':'tag-green',
                  'pescetarisch':'tag-green','high-protein':'tag-amber','italienisch':'tag-red',
                  'asiatisch':'tag-pink','mexikanisch':'tag-red','mediterran':'tag-green',
                };
                const tagLabels = {
                  'meal-prep':'Meal Prep','vegetarisch':'Veggie','vegan':'Vegan',
                  'pescetarisch':'Fisch','high-protein':'High-Protein','italienisch':'Italienisch',
                  'asiatisch':'Asiatisch','mexikanisch':'Mexikanisch','mediterran':'Mediterran',
                };
                const cls = TAG_MAP[t] || 'tag-gray';
                const lbl = tagLabels[t] || t;
                return `<span class="tag ${cls}">${lbl}</span>`;
              }).join('') || ''}
            </div>

            <!-- Meta -->
            <div class="recipe-meta">
              ${meal.time_min ? `<div class="meta-card"><div class="meta-val">${meal.time_min} min</div><div class="meta-key">Kochzeit</div></div>` : ''}
              ${kcal ? `<div class="meta-card"><div class="meta-val" id="meta-kcal">${kcal} kcal</div><div class="meta-key">Pro Portion</div></div>` : ''}
              ${meal.price ? `<div class="meta-card"><div class="meta-val">${formatPrice(meal.price)}</div><div class="meta-key">Gesamt</div></div>` : ''}
              ${protein ? `<div class="meta-card"><div class="meta-val" id="meta-prot">${protein} g</div><div class="meta-key">Protein</div></div>` : ''}
            </div>

            <!-- Meal Prep Note -->
            ${meal.tags?.includes('meal-prep') ? `
            <div class="mealprep-info" style="margin-bottom:16px">
              🔁 <span style="margin-left:4px">Meal Prep: Für 3 Portionen kochen – erste Portion frisch, Rest im Kühlschrank für 2 weitere Tage. Dressing separat lagern.</span>
            </div>
            ` : ''}

            <!-- Zutaten -->
            ${ings.length > 0 ? `
            <div class="sec-label">Zutaten</div>
            <div class="portions-row">
              <span class="portions-label">Portionen</span>
              <div class="stepper">
                <button class="stepper-btn" id="minus-btn" ${portions <= 1 ? 'disabled' : ''}>−</button>
                <span class="stepper-val" id="portions-val">${portions}</span>
                <button class="stepper-btn" id="plus-btn" ${portions >= 8 ? 'disabled' : ''}>+</button>
              </div>
            </div>
            <div class="ing-list" id="ing-list">
              ${ings.map((ing, i) => `
                <div class="ing-row${checkedIngs.has(i) ? ' done' : ''}" data-ing="${i}">
                  <div class="ing-cb${checkedIngs.has(i) ? ' on' : ''}">
                    ${checkedIngs.has(i) ? '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
                  </div>
                  <span class="ing-name">${ing.name}</span>
                  <span class="ing-amt">${fmtAmount(ing.amount, ing.unit, portions)}</span>
                </div>
              `).join('')}
            </div>
            ` : ''}

            <!-- Zubereitung -->
            ${steps.length > 0 ? `
            <div class="sec-label">Zubereitung</div>
            <div class="steps-list" id="steps-list">
              ${steps.map((step, i) => `
                <div class="step-row" data-step="${i}">
                  <div class="step-num-col">
                    <div class="step-num${doneSteps.has(i) ? ' done' : ''}">
                      ${doneSteps.has(i)
                        ? '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>'
                        : i + 1}
                    </div>
                    ${i < steps.length - 1 ? '<div class="step-line"></div>' : ''}
                  </div>
                  <div class="step-body">
                    <div class="step-text${doneSteps.has(i) ? ' done' : ''}">${step.text}</div>
                    ${step.timer_min ? `
                    <span class="step-timer">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                      ${step.timer_min} min
                    </span>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
            ` : ''}

          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="bottom-bar">
          <button class="action-btn" id="list-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1,1h4l2.68,13.39a2,2,0,0,0,2,1.61h9.72a2,2,0,0,0,2-1.61L23,6H6"/></svg>
            Einkaufsliste
          </button>
          <button class="action-btn primary" id="cooked-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>
            ${meal.cooked ? 'Als ungekocht markieren' : 'Gekocht! ✓'}
          </button>
        </div>
      </div>
    `;

    // Events
    el.querySelector('#back-btn').addEventListener('click', () => goBack());

    el.querySelector('#swap-btn').addEventListener('click', () => {
      Router.navigate('swap', { weekKey, day, type, meal });
    });

    // Ingredient checkboxes
    el.querySelectorAll('[data-ing]').forEach(row => {
      row.addEventListener('click', () => {
        const i = parseInt(row.dataset.ing);
        if (checkedIngs.has(i)) checkedIngs.delete(i);
        else checkedIngs.add(i);
        render();
      });
    });

    // Step checkboxes
    el.querySelectorAll('[data-step]').forEach(row => {
      row.addEventListener('click', () => {
        const i = parseInt(row.dataset.step);
        if (doneSteps.has(i)) doneSteps.delete(i);
        else doneSteps.add(i);
        render();
      });
    });

    // Portions
    el.querySelector('#minus-btn')?.addEventListener('click', () => {
      if (portions > 1) { portions--; render(); }
    });
    el.querySelector('#plus-btn')?.addEventListener('click', () => {
      if (portions < 8) { portions++; render(); }
    });

    // Einkaufsliste – nur Zutaten dieses Gerichts
    el.querySelector('#list-btn').addEventListener('click', () => {
      Router.navigate('list', { weekKey, fromMeal: { day, type } });
    });

    // Gekocht markieren
    el.querySelector('#cooked-btn').addEventListener('click', () => {
      Store.markCooked(weekKey, day, type, !meal.cooked);
      meal.cooked = !meal.cooked;
      render();
      // Kurz Toast zeigen
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#2D7D3A;color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999;white-space:nowrap';
      toast.textContent = meal.cooked ? '✓ Als gekocht markiert' : 'Markierung entfernt';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    });
  }

  render();
};

// ============================================
// SWAP SCREEN
// ============================================
Screens.swap = function(el, params) {
  const { weekKey, day, type, meal } = params;
  let selectedId   = null;
  let activeFilter = 'Alle';
  let alternatives = [];
  let loading      = true;

  const filters = ['Alle','Vegetarisch','High-Protein','Asiatisch','Italienisch','Mediterran'];

  async function loadAlternatives() {
    try {
      const apiKey   = localStorage.getItem('herbi_api_key');
      const settings = Store.getSettings();
      alternatives   = await API.suggestAlternatives(meal, settings, apiKey);
    } catch (e) {
      console.error(e);
      alternatives = [];
    }
    loading = false;
    render();
  }

  function matchesFilter(alt) {
    if (activeFilter === 'Alle') return true;
    const map = {
      'Vegetarisch':  ['vegetarisch','vegan'],
      'High-Protein': ['high-protein'],
      'Asiatisch':    ['asiatisch'],
      'Italienisch':  ['italienisch'],
      'Mediterran':   ['mediterran'],
    };
    return (map[activeFilter] || []).some(t => alt.tags?.includes(t));
  }

  function render() {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;min-height:100%">
        <div class="status-spacer"></div>

        <!-- Header -->
        <div style="padding:12px 16px 8px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <div class="recipe-hero-btn left" style="position:static" id="back-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,18 9,12 15,6"/></svg>
            </div>
            <span style="font-size:17px;font-weight:700;color:var(--text)">Rezept tauschen</span>
          </div>

          <!-- Current meal -->
          <div class="swap-current">
            <span style="font-size:24px">${meal.emoji || '🍽️'}</span>
            <div>
              <div class="swap-current-label">Wird ersetzt</div>
              <div class="swap-current-name">${meal.name}</div>
            </div>
          </div>

          <!-- Filters -->
          <div class="swap-filter-row">
            ${filters.map(f => `
              <button class="swap-filter${f === activeFilter ? ' active' : ''}" data-filter="${f}">${f}</button>
            `).join('')}
          </div>
        </div>

        <!-- Alternatives list -->
        <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:0 16px">
          ${loading ? `
            <div class="loading-screen" style="min-height:200px">
              <div class="spinner"></div>
              <div class="loading-text">Alternativen werden gesucht…</div>
            </div>
          ` : alternatives.length === 0 ? `
            <div class="empty-state">
              <div class="empty-emoji">🤔</div>
              <div class="empty-text">Keine Alternativen gefunden.<br>Versuche einen anderen Filter.</div>
            </div>
          ` : `
            <div class="swap-alts">
              ${alternatives.filter(matchesFilter).map(alt => `
                <div class="swap-card${selectedId === alt.id ? ' selected' : ''}" data-alt-id="${alt.id}">
                  <div class="swap-inner">
                    <div class="swap-bar"></div>
                    <div class="swap-info">
                      <div class="swap-name-row">
                        <span class="swap-name">${alt.name}</span>
                        <div style="display:flex;align-items:center;gap:6px">
                          <span class="swap-price">${alt.price ? formatPrice(alt.price) : ''}</span>
                          <div class="swap-check">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>
                          </div>
                        </div>
                      </div>
                      <div class="meal-tags">
                        ${alt.time_min ? `<span class="tag tag-gray"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg> ${alt.time_min} min</span>` : ''}
                        ${(alt.tags || []).map(t => {
                          const m = {'meal-prep':'tag-mp','vegetarisch':'tag-green','vegan':'tag-green','pescetarisch':'tag-green','high-protein':'tag-amber','italienisch':'tag-red','asiatisch':'tag-pink'};
                          const l = {'meal-prep':'Meal Prep','vegetarisch':'Veggie','vegan':'Vegan','pescetarisch':'Fisch','high-protein':'High-Protein','italienisch':'Italienisch','asiatisch':'Asiatisch'};
                          return `<span class="tag ${m[t]||'tag-gray'}">${l[t]||t}</span>`;
                        }).join('')}
                      </div>
                    </div>
                    <div class="swap-img">${alt.emoji || '🍽️'}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Bottom -->
        <div class="bottom-bar">
          <button class="action-btn" id="cancel-btn">Abbrechen</button>
          <button class="action-btn primary" id="confirm-btn" ${!selectedId ? 'disabled style="opacity:0.35"' : ''}>
            Übernehmen
          </button>
        </div>
      </div>
    `;

    el.querySelector('#back-btn').addEventListener('click', () => goBack());
    el.querySelector('#cancel-btn').addEventListener('click', () => goBack());

    el.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        render();
      });
    });

    el.querySelectorAll('[data-alt-id]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.altId;
        selectedId = selectedId === id ? null : id;
        render();
      });
    });

    el.querySelector('#confirm-btn')?.addEventListener('click', () => {
      if (!selectedId) return;
      const chosen = alternatives.find(a => a.id === selectedId);
      if (chosen) {
        Store.swapMeal(weekKey, day, type, chosen);
        goBack();
        // Toast
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#2D7D3A;color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999;white-space:nowrap';
        toast.textContent = `✓ ${chosen.name} übernommen`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
      }
    });
  }

  render();
  loadAlternatives();
};
