// ============================================
// HERBI – Onboarding Screens (onboarding.js)
// ============================================

const Screens = window.Screens || {};

// ============================================
// API KEY SCREEN (erscheint nur einmal)
// ============================================
Screens.apiKey = function(el, params) {
  el.innerHTML = `
    <div style="min-height:100%;display:flex;flex-direction:column;padding:0">
      <div class="status-spacer"></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:32px 24px">
        <div style="font-size:56px;text-align:center;margin-bottom:24px">🌿</div>
        <h1 style="font-size:28px;font-weight:800;letter-spacing:-0.5px;color:var(--text);margin-bottom:10px;text-align:center">Willkommen bei Herbi</h1>
        <p style="font-size:15px;color:var(--text-2);text-align:center;line-height:1.6;margin-bottom:36px">
          Für die KI-Planung brauchst du einmalig einen Claude API Key. Er wird sicher auf deinem iPhone gespeichert.
        </p>

        <div style="margin-bottom:12px">
          <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px">Claude API Key</div>
          <input
            type="password"
            id="api-key-input"
            placeholder="sk-ant-..."
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            style="width:100%;padding:14px 16px;border-radius:14px;border:1.5px solid var(--border-mid);background:var(--bg-2);font-size:14px;color:var(--text);font-family:monospace;outline:none;-webkit-appearance:none"
          >
        </div>

        <div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:var(--blue-light);border-radius:10px;margin-bottom:28px;font-size:12px;color:#0C447C;line-height:1.5">
          <span style="flex-shrink:0">🔒</span>
          <span>Der Key wird nur lokal auf deinem iPhone im Browser-Speicher gespeichert – nirgendwo sonst.</span>
        </div>

        <a href="https://console.anthropic.com/settings/keys" target="_blank"
          style="display:block;text-align:center;font-size:13px;color:var(--green);font-weight:600;margin-bottom:28px;text-decoration:none">
          Noch keinen Key? → console.anthropic.com ↗
        </a>

        <button id="api-key-btn" style="width:100%;padding:17px;border-radius:16px;background:#2D7D3A;color:#fff;font-size:17px;font-weight:700;border:none;cursor:pointer;opacity:0.35;margin-top:8px;display:block" disabled>
          Weiter →
        </button>
      </div>
    </div>
  `;

  const input = el.querySelector('#api-key-input');
  const btn   = el.querySelector('#api-key-btn');

  input.addEventListener('input', () => {
    const val = input.value.trim();
    const valid = val.startsWith('sk-ant-') && val.length > 20;
    btn.disabled = !valid;
    btn.style.opacity = valid ? '1' : '0.35';
  });

  btn.addEventListener('click', () => {
    const key = input.value.trim();
    if (!key) return;
    localStorage.setItem('herbi_api_key', key);
    Router.navigate('onboarding-markets');
  });
};

// ============================================
// SCREEN 1 – SUPERMARKT AUSWAHL
// ============================================
Screens.onboardingMarkets = function(el, params) {
  const markets = [
    { id:'rewe',   logo:'R', color:'#CC0000', tcolor:'#fff',    name:'Rewe',    desc:'Täglicher Einkauf'        },
    { id:'edeka',  logo:'E', color:'#F5A800', tcolor:'#003087', name:'Edeka',   desc:'Qualität & Vielfalt'      },
    { id:'lidl',   logo:'L', color:'#FFD700', tcolor:'#003087', name:'Lidl',    desc:'Aktionen & Frische'       },
    { id:'netto',  logo:'N', color:'#E30613', tcolor:'#fff',    name:'Netto',   desc:'Günstig & nah'            },
    { id:'denns',  logo:'d', color:'#5A8A3C', tcolor:'#fff',    name:"denn's",  desc:'Bio & nachhaltig'         },
    { id:'goasia', logo:'亚', color:'#D4000F', tcolor:'#FFD700', name:'Go Asia', desc:'Asiatische Spezialitäten' },
  ];

  let selected = new Set(Store.getSettings().supermarkets || []);

  function render() {
    el.innerHTML = `
      <div class="onboarding-screen">
        <div class="status-spacer"></div>
        <div class="onboarding-progress">
          <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">Schritt 1 von 4</div>
          <div class="progress-track"><div class="progress-fill" style="width:25%"></div></div>
        </div>
        <div class="onboarding-body">
          <h1 class="onboarding-title">Wo kaufst du ein?</h1>
          <p class="onboarding-sub">Mehrere möglich – wir passen Rezepte und Preise an.</p>
          <div class="chip-grid" id="market-grid"></div>
        </div>
        <div class="onboarding-footer">
          <div id="sel-label" style="text-align:center;font-size:12px;color:var(--text-2);margin-bottom:10px;min-height:16px"></div>
          <button class="continue-btn" id="cont-btn" ${selected.size === 0 ? 'disabled' : ''}>Weiter</button>
        </div>
      </div>
    `;

    const grid = el.querySelector('#market-grid');
    markets.forEach(m => {
      const sel = selected.has(m.id);
      const chip = document.createElement('div');
      chip.className = `market-chip${sel ? ' selected' : ''}`;
      chip.innerHTML = `
        <div class="market-logo" style="background:${m.color};color:${m.tcolor}">${m.logo}</div>
        <div>
          <div style="font-size:13px;font-weight:600">${m.name}</div>
          <div style="font-size:11px;color:var(--text-3);margin-top:1px">${m.desc}</div>
        </div>
      `;
      chip.addEventListener('click', () => {
        if (selected.has(m.id)) selected.delete(m.id);
        else selected.add(m.id);
        render();
      });
      grid.appendChild(chip);
    });

    const names = [...selected].map(id => markets.find(m => m.id === id)?.name).filter(Boolean);
    el.querySelector('#sel-label').textContent = names.length ? names.join(', ') : '';
    const contBtn = el.querySelector('#cont-btn');
    contBtn.disabled = selected.size === 0;
    contBtn.addEventListener('click', () => {
      Store.updateSettings({ supermarkets: [...selected] });
      Router.navigate('onboarding-budget');
    });
  }

  render();
};

// ============================================
// SCREEN 2 – BUDGET, MAHLZEITEN, PERSONEN
// ============================================
Screens.onboardingBudget = function(el, params) {
  const s = Store.getSettings();
  let budget   = s.budget   || 70;
  let portions = s.portions || 1;
  let meals    = Object.assign({ breakfast: false, lunch: true, dinner: true }, s.meals);

  const persLabels = ['nur für mich','zu zweit','zu dritt','zu viert','für 5','für 6'];
  const presets    = [40, 60, 80, 100];
  const MEAL_LIST  = [
    { key:'breakfast', icon:'🌅', name:'Frühstück',   time:'ca. 7–9 Uhr'   },
    { key:'lunch',     icon:'☀️',  name:'Mittagessen', time:'ca. 12–14 Uhr' },
    { key:'dinner',    icon:'🌙',  name:'Abendessen',  time:'ca. 18–20 Uhr' },
  ];

  function activeMealCount() { return Object.values(meals).filter(Boolean).length; }

  function perMeal() {
    return (budget / (7 * Math.max(1, activeMealCount()) * portions)).toFixed(2).replace('.', ',');
  }

  function render() {
    el.innerHTML = `
      <div class="onboarding-screen">
        <div class="status-spacer"></div>
        <div class="onboarding-progress">
          <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">Schritt 2 von 4</div>
          <div class="progress-track"><div class="progress-fill" style="width:50%"></div></div>
        </div>
        <div class="onboarding-body">
          <h1 class="onboarding-title">Was darf's kosten?</h1>
          <p class="onboarding-sub">Budget, Mahlzeiten und Personen einstellen.</p>

          <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-3);margin-bottom:10px">Wochenbudget</div>
          <div class="budget-display">
            <div class="budget-big" id="budget-num">${budget}</div>
            <div class="budget-unit">€ pro Woche</div>
          </div>
          <div class="slider-wrap">
            <input type="range" id="budget-slider" min="20" max="200" step="5" value="${budget}">
            <div class="slider-labels"><span>20 €</span><span>200 €</span></div>
          </div>
          <div class="preset-row" id="preset-row">
            ${presets.map(p => `<button class="preset-btn${p === budget ? ' active' : ''}" data-val="${p}">${p} €</button>`).join('')}
          </div>

          <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-3);margin-bottom:10px;margin-top:4px">Welche Mahlzeiten?</div>
          <div class="meal-toggle-list" id="meal-toggles">
            ${MEAL_LIST.map(m => `
              <div class="meal-toggle-row${meals[m.key] ? ' active' : ''}" data-meal="${m.key}">
                <div class="meal-toggle-left">
                  <span class="meal-toggle-icon">${m.icon}</span>
                  <div>
                    <div class="meal-toggle-name">${m.name}</div>
                    <div class="meal-toggle-time">${m.time}</div>
                  </div>
                </div>
                <div class="toggle-pill${meals[m.key] ? ' on' : ''}"></div>
              </div>
            `).join('')}
          </div>

          <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-3);margin-bottom:10px">Personen</div>
          <div class="persons-row">
            <div>
              <div class="persons-label" id="persons-label">${portions} ${portions === 1 ? 'Person' : 'Personen'}</div>
              <div class="persons-sub" id="persons-sub">${persLabels[portions - 1]}</div>
            </div>
            <div class="stepper">
              <button class="stepper-btn" id="minus-btn" ${portions <= 1 ? 'disabled' : ''}>−</button>
              <span class="stepper-val" id="portions-val">${portions}</span>
              <button class="stepper-btn" id="plus-btn" ${portions >= 6 ? 'disabled' : ''}>+</button>
            </div>
          </div>

          <div style="background:var(--bg-2);border-radius:var(--radius-md);padding:10px 14px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-2);padding:2px 0">
              <span>Mahlzeiten / Tag</span>
              <span id="meals-count" style="font-weight:600;color:var(--text)">${activeMealCount()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-2);padding:2px 0">
              <span>Ca. pro Mahlzeit & Person</span>
              <span id="per-meal" style="font-weight:600;color:var(--text)">~${perMeal()} €</span>
            </div>
          </div>
        </div>
        <div class="onboarding-footer">
          <button class="continue-btn" id="budget-cont">Weiter</button>
        </div>
      </div>
    `;

    // Slider
    el.querySelector('#budget-slider').addEventListener('input', e => {
      budget = parseInt(e.target.value);
      el.querySelector('#budget-num').textContent = budget;
      el.querySelector('#per-meal').textContent = '~' + perMeal() + ' €';
      el.querySelectorAll('.preset-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.val) === budget);
      });
    });

    // Presets
    el.querySelectorAll('.preset-btn').forEach(b => {
      b.addEventListener('click', () => {
        budget = parseInt(b.dataset.val);
        el.querySelector('#budget-slider').value = budget;
        el.querySelector('#budget-num').textContent = budget;
        el.querySelector('#per-meal').textContent = '~' + perMeal() + ' €';
        el.querySelectorAll('.preset-btn').forEach(x => x.classList.toggle('active', x === b));
      });
    });

    // Meal toggles
    el.querySelectorAll('.meal-toggle-row').forEach(row => {
      row.addEventListener('click', () => {
        const key = row.dataset.meal;
        if (meals[key] && activeMealCount() === 1) return;
        meals[key] = !meals[key];
        render();
      });
    });

    // Stepper
    el.querySelector('#minus-btn').addEventListener('click', () => {
      if (portions > 1) { portions--; render(); }
    });
    el.querySelector('#plus-btn').addEventListener('click', () => {
      if (portions < 6) { portions++; render(); }
    });

    // Continue
    el.querySelector('#budget-cont').addEventListener('click', () => {
      Store.updateSettings({ budget, portions, meals });
      Router.navigate('onboarding-cuisine');
    });
  }

  render();
};

// ============================================
// SCREEN 3 – KÜCHE & MAHLZEIT-KONFIGURATION
// ============================================
Screens.onboardingCuisine = function(el, params) {
  const s = Store.getSettings();
  let selectedCuisines = new Set(s.cuisines || ['italienisch', 'asiatisch']);
  let mealConfig = JSON.parse(JSON.stringify(s.mealConfig || {
    lunch:  { level: 1, mealprep: true  },
    dinner: { level: 2, mealprep: false },
  }));
  let selectedDiets  = new Set(s.diets  || ['alles']);
  let selectedAvoids = new Set(s.avoids || []);
  let moreOpen = false;

  const CUISINES = [
    { id:'italienisch', icon:'🍝', label:'Italienisch' },
    { id:'asiatisch',   icon:'🥢', label:'Asiatisch'   },
    { id:'mexikanisch', icon:'🌮', label:'Mexikanisch'  },
    { id:'mediterran',  icon:'🫒', label:'Mediterran'   },
    { id:'deutsch',     icon:'🥨', label:'Deutsch'      },
    { id:'indisch',     icon:'🍛', label:'Indisch'      },
    { id:'american',    icon:'🍔', label:'American'     },
    { id:'arabisch',    icon:'🧆', label:'Arabisch'     },
    { id:'japanisch',   icon:'🍱', label:'Japanisch'    },
    { id:'thai',        icon:'🍜', label:'Thai'         },
  ];
  const DIETS = [
    { id:'alles',        emoji:'🍽️', name:'Alles'        },
    { id:'flexitarisch', emoji:'🥗', name:'Flexitarisch' },
    { id:'vegetarisch',  emoji:'🥦', name:'Vegetarisch'  },
    { id:'vegan',        emoji:'🌱', name:'Vegan'        },
    { id:'pescetarisch', emoji:'🐟', name:'Pescetarisch' },
    { id:'highprotein',  emoji:'💪', name:'High-Protein' },
  ];
  const AVOIDS = [
    { id:'gluten',  label:'Gluten'  },
    { id:'laktose', label:'Laktose' },
    { id:'nüsse',   label:'Nüsse'   },
    { id:'schwein', label:'Schwein' },
    { id:'alkohol', label:'Alkohol' },
    { id:'scharf',  label:'Scharf'  },
  ];
  const LEVELS = [
    { label:'Sehr schnell', time:'15 min'  },
    { label:'Schnell',      time:'20 min'  },
    { label:'Normal',       time:'30 min'  },
    { label:'Aufwendig',    time:'60+ min' },
  ];

  function pct(v, max) { return Math.round((v / max) * 100) + '%'; }

  function moreSub() {
    if (moreOpen) return '';
    const parts = [];
    if (!(selectedDiets.size === 1 && selectedDiets.has('alles'))) {
      parts.push([...selectedDiets].map(id => DIETS.find(d => d.id === id)?.name).filter(Boolean).join(', '));
    }
    if (selectedAvoids.size > 0) {
      parts.push([...selectedAvoids].map(id => AVOIDS.find(a => a.id === id)?.label).filter(Boolean).join(', '));
    }
    return parts.length ? parts.join(' · ') : 'Ernährungsweise, Unverträglichkeiten';
  }

  function renderMealBlock(meal) {
    const cfg    = mealConfig[meal];
    const isLunch = meal === 'lunch';
    return `
      <div class="meal-config-block">
        <div class="meal-config-header">
          <span class="meal-config-icon">${isLunch ? '☀️' : '🌙'}</span>
          <span class="meal-config-name">${isLunch ? 'Mittagessen' : 'Abendessen'}</span>
          <span class="meal-config-badge">${LEVELS[cfg.level].time}</span>
        </div>
        <div class="meal-config-body">
          <div class="slider-label-row">
            <span class="slider-key-label">Aufwand</span>
            <span class="slider-val-label" id="${meal}-desc">${LEVELS[cfg.level].label}</span>
          </div>
          <div class="custom-track">
            <div class="custom-track-bg"></div>
            <div class="custom-track-fill" id="${meal}-fill" style="width:${pct(cfg.level, 3)}"></div>
            <input type="range" min="0" max="3" step="1" value="${cfg.level}" data-meal="${meal}">
          </div>
          <div class="tick-row">
            ${LEVELS.map((l, i) => `<span class="tick${i === cfg.level ? ' active' : ''}">${l.label}</span>`).join('')}
          </div>
          ${isLunch ? `
          <div class="mealprep-toggle-row">
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text)">Meal Prep</div>
              <div style="font-size:11px;color:var(--text-2);margin-top:1px">Einmal kochen, 2–3 Tage essen</div>
            </div>
            <div class="toggle-pill${cfg.mealprep ? ' on' : ''}" id="lunch-mp-toggle"></div>
          </div>
          ${cfg.mealprep ? `<div class="mealprep-info">🔁 <span style="margin-left:4px">Rezepte werden für Batch-Kochen optimiert.</span></div>` : ''}
          ` : ''}
        </div>
      </div>
    `;
  }

  function render() {
    const meals = Store.getSettings().meals || {};
    el.innerHTML = `
      <div class="onboarding-screen">
        <div class="status-spacer"></div>
        <div class="onboarding-progress">
          <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">Schritt 3 von 4</div>
          <div class="progress-track"><div class="progress-fill" style="width:75%"></div></div>
        </div>
        <div class="onboarding-body">
          <h1 class="onboarding-title">Was magst du essen?</h1>
          <p class="onboarding-sub">Küchen auswählen und Mahlzeiten konfigurieren.</p>

          <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-3);margin-bottom:10px">Lieblingsküchen</div>
          <div class="cuisine-wrap" id="cuisine-wrap">
            ${CUISINES.map(c => `
              <div class="cuisine-chip${selectedCuisines.has(c.id) ? ' selected' : ''}" data-cuisine="${c.id}">
                <span>${c.icon}</span><span>${c.label}</span>
              </div>
            `).join('')}
          </div>

          <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-3);margin-bottom:10px">Mahlzeiten konfigurieren</div>
          ${meals.lunch  !== false ? renderMealBlock('lunch')  : ''}
          ${meals.dinner !== false ? renderMealBlock('dinner') : ''}

          <div class="more-settings">
            <div class="more-settings-header" id="more-header">
              <div class="more-settings-left">
                <span style="font-size:18px">⚙️</span>
                <div>
                  <div class="more-settings-title">Weitere Einstellungen</div>
                  <div class="more-settings-sub" id="more-sub">${moreSub()}</div>
                </div>
              </div>
              <span class="chevron${moreOpen ? ' open' : ''}">▾</span>
            </div>
            ${moreOpen ? `
            <div class="more-settings-body">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-3);margin-bottom:8px">Ernährungsweise</div>
              <div class="diet-wrap" id="diet-wrap">
                ${DIETS.map(d => `
                  <div class="diet-chip${selectedDiets.has(d.id) ? ' selected' : ''}" data-diet="${d.id}">
                    <span>${d.emoji}</span><span>${d.name}</span>
                  </div>
                `).join('')}
              </div>
              <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-3);margin-bottom:8px">Was vermeidest du?</div>
              <div class="avoid-chips" id="avoid-chips">
                ${AVOIDS.map(a => `
                  <div class="avoid-chip${selectedAvoids.has(a.id) ? ' active' : ''}" data-avoid="${a.id}">
                    ${selectedAvoids.has(a.id) ? '✕ ' : '+ '}${a.label}
                  </div>
                `).join('')}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        <div class="onboarding-footer">
          <button class="continue-btn" id="cuisine-cont">Plan erstellen ✨</button>
        </div>
      </div>
    `;

    // Cuisine chips
    el.querySelectorAll('[data-cuisine]').forEach(chip => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.cuisine;
        if (selectedCuisines.has(id)) selectedCuisines.delete(id);
        else selectedCuisines.add(id);
        render();
      });
    });

    // Meal level sliders
    el.querySelectorAll('input[type=range][data-meal]').forEach(slider => {
      slider.addEventListener('input', () => {
        mealConfig[slider.dataset.meal].level = parseInt(slider.value);
        render();
      });
    });

    // Meal prep toggle
    const mpToggle = el.querySelector('#lunch-mp-toggle');
    if (mpToggle) {
      mpToggle.addEventListener('click', () => {
        mealConfig.lunch.mealprep = !mealConfig.lunch.mealprep;
        render();
      });
    }

    // More settings
    el.querySelector('#more-header')?.addEventListener('click', () => {
      moreOpen = !moreOpen;
      render();
    });

    // Diet chips
    el.querySelectorAll('[data-diet]').forEach(chip => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.diet;
        if (id === 'alles') {
          selectedDiets = new Set(['alles']);
        } else {
          selectedDiets.delete('alles');
          if (selectedDiets.has(id)) {
            selectedDiets.delete(id);
            if (selectedDiets.size === 0) selectedDiets.add('alles');
          } else {
            selectedDiets.add(id);
          }
        }
        render();
      });
    });

    // Avoid chips
    el.querySelectorAll('[data-avoid]').forEach(chip => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.avoid;
        if (selectedAvoids.has(id)) selectedAvoids.delete(id);
        else selectedAvoids.add(id);
        render();
      });
    });

    // Continue
    el.querySelector('#cuisine-cont').addEventListener('click', () => {
      Store.updateSettings({
        cuisines:   [...selectedCuisines],
        mealConfig,
        diets:      [...selectedDiets],
        avoids:     [...selectedAvoids],
      });
      Store.completeOnboarding();
      Router.navigate('plan-generating');
    });
  }

  render();
};

// ============================================
// PLAN GENERATING (Loading Screen)
// ============================================
Screens['plan-generating'] = async function(el, params) {
  const msgs = [
    'Rezepte werden ausgewählt…',
    'Budget wird berechnet…',
    'Meal Prep wird geplant…',
    'Einkaufsliste wird vorbereitet…',
  ];
  let msgIdx = 0;

  el.innerHTML = `
    <div style="min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:40px">
      <div style="font-size:56px">🌿</div>
      <div class="spinner"></div>
      <div style="font-size:16px;font-weight:600;color:var(--text);text-align:center" id="loading-msg">${msgs[0]}</div>
      <div style="font-size:13px;color:var(--text-2);text-align:center;line-height:1.5">KI erstellt deinen<br>persönlichen Wochenplan…</div>
    </div>
  `;

  const msgEl    = el.querySelector('#loading-msg');
  const interval = setInterval(() => {
    msgIdx = (msgIdx + 1) % msgs.length;
    if (msgEl) msgEl.textContent = msgs[msgIdx];
  }, 1800);

  try {
    const apiKey  = localStorage.getItem('herbi_api_key');
    if (!apiKey) throw new Error('Kein API Key gespeichert.');

    const settings = Store.getSettings();
    const weekKey  = Store.getCurrentWeekKey();
    const planData = await API.generateWeekPlan(settings, apiKey);

    Store.savePlan(weekKey, {
      meals:        planData.days,
      total_cost:   planData.total_cost,
      generated_at: new Date().toISOString(),
    });

    clearInterval(interval);
    Router.navigate('plan', {}, { replace: true });

  } catch (err) {
    clearInterval(interval);
    console.error('Plan generation failed:', err);
    el.innerHTML = `
      <div style="min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px">
        <div style="font-size:48px">😕</div>
        <div style="font-size:18px;font-weight:700;color:var(--text);text-align:center">Plan konnte nicht erstellt werden</div>
        <div style="font-size:13px;color:var(--text-2);text-align:center;line-height:1.5;max-width:280px">${err.message}</div>
        <button id="back-btn" style="padding:12px 24px;border-radius:12px;background:var(--green);color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer;margin-top:8px">
          Zurück
        </button>
      </div>
    `;
    el.querySelector('#back-btn').addEventListener('click', () => {
      Router.navigate('onboarding-cuisine');
    });
  }
};
