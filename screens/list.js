// ============================================
// HERBI – Einkaufsliste Screen (list.js)
// ============================================

Screens.list = function(el, params) {
  const { weekKey, selectedMeals, fromMeal } = params || {};
  const key = weekKey || Store.getCurrentWeekKey();
  // selectedMeals = Set/Array von "Mo-lunch", "Di-dinner" etc. (aus Wochenplan-Auswahl)
  // fromMeal = { day, type } wenn direkt aus Rezept geöffnet
  const mealFilter = fromMeal
    ? new Set([`${fromMeal.day}-${fromMeal.type}`])
    : (selectedMeals && selectedMeals.length > 0 ? new Set(selectedMeals) : null);
  // null = keine Filterung = alle Mahlzeiten

  const plan = Store.getPlan(key);
  if (!plan) {
    el.innerHTML = `
      <div>
        <div class="status-spacer"></div>
        <div class="page-header">
          <div class="page-header-row"><h1 class="page-title">Einkaufsliste</h1></div>
        </div>
        <div class="empty-state">
          <div class="empty-emoji">🛒</div>
          <div class="empty-text">Kein Wochenplan vorhanden.<br>Erstelle zuerst einen Plan.</div>
          <button class="primary-btn" onclick="navigate('plan')">Zum Plan</button>
        </div>
      </div>
    `;
    return;
  }

  // --- Einkaufsliste aus Plan generieren ---
  const CATEGORIES = [
    { id:'gemuese',   icon:'🥦', name:'Gemüse & Obst'     },
    { id:'protein',   icon:'🥩', name:'Protein'            },
    { id:'trocken',   icon:'🍝', name:'Trocken & Pasta'    },
    { id:'milch',     icon:'🥛', name:'Milch & Käse'       },
    { id:'saucen',    icon:'🫙', name:'Saucen & Gewürze'   },
    { id:'sonstiges', icon:'🧂', name:'Sonstiges'          },
  ];

  // Kategorie aus Zutat ableiten (simpel)
  function guessCategory(ingName) {
    const n = ingName.toLowerCase();
    if (/brokkoli|spinat|karott|tomate|zwiebel|knoblauch|paprika|lauch|salat|avocado|zitrone|limette|ingwer|petersilie|gurke|aubergine|zucchini/.test(n)) return 'gemuese';
    if (/tofu|lachs|garnelen|hähnchen|ei|ricotta|mozzarella|parmesan|feta|joghurt|quark/.test(n)) return 'protein';
    if (/pasta|nudel|reis|quinoa|linsen|kichererbsen|mehl|brot|baguette|couscous|bulgur|nori|soba|udon|ramen|pizza/.test(n)) return 'trocken';
    if (/milch|sahne|butter|käse|mozzarella|parmesan|joghurt|quark|kefir/.test(n)) return 'milch';
    if (/öl|sauce|soße|paste|sojasauce|miso|tahini|pesto|salz|pfeffer|gewürz|sesam|chili|paprika.pulver/.test(n)) return 'saucen';
    return 'sonstiges';
  }

  function buildShoppingList() {
    const itemMap = {};
    const DAYS = ['Mo','Di','Mi','Do','Fr','Sa','So'];

    DAYS.forEach(day => {
      ['breakfast','lunch','dinner'].forEach(type => {
        const meal = plan.meals?.[day]?.[type];
        if (!meal || meal.is_rest) return;
        // Filter: wenn mealFilter gesetzt, nur ausgewählte Mahlzeiten
        if (mealFilter && !mealFilter.has(`${day}-${type}`)) return;

        (meal.ingredients || []).forEach(ing => {
          const key = ing.name.toLowerCase().trim().replace(/\s+/g,'-');
          if (itemMap[key]) {
            if (itemMap[key].unit === ing.unit) {
              itemMap[key].amount += ing.amount;
            }
            const label = `${day} ${type === 'lunch' ? 'Mittag' : type === 'dinner' ? 'Abend' : 'Früh'}`;
            if (!itemMap[key].usedIn.includes(label)) itemMap[key].usedIn.push(label);
          } else {
            itemMap[key] = {
              key,
              name:     ing.name,
              amount:   ing.amount,
              unit:     ing.unit || '',
              category: guessCategory(ing.name),
              usedIn:   [`${day} ${type === 'lunch' ? 'Mittag' : type === 'dinner' ? 'Abend' : 'Früh'}`],
            };
          }
        });
      });
    });

    return Object.values(itemMap).map(item => {
      let amtStr = '';
      const v = item.amount;
      if (item.unit === 'g' && v >= 1000) amtStr = `${(v/1000).toFixed(v%1000===0?0:1)} kg`;
      else if (item.unit === 'ml' && v >= 1000) amtStr = `${(v/1000).toFixed(1)} l`;
      else amtStr = `${Number.isInteger(v) ? v : parseFloat(v.toFixed(1))}${item.unit ? ' '+item.unit : ''}`;
      return {
        ...item,
        amtStr,
        forStr: item.usedIn.slice(0, 3).join(', ') + (item.usedIn.length > 3 ? '…' : ''),
      };
    });
  }

  const allItems    = buildShoppingList();
  let activeFilter  = 'alle';

  // Surplus-Tracking: wie viel hat der User gekauft?
  const savedSurplus = Store.getSurplusData(key) || {};
  const boughtAmounts = {}; // itemKey → { bought, unit }
  // Mit gespeicherten Werten initialisieren
  Object.keys(savedSurplus).forEach(k => {
    boughtAmounts[k] = savedSurplus[k];
  });
  // Default: exakt die benötigte Menge
  allItems.forEach(item => {
    if (!boughtAmounts[item.key]) {
      boughtAmounts[item.key] = { bought: item.amount, unit: item.unit, name: item.name, emoji: item.emoji || '🛒', isFresh: guessFresh(item) };
    }
  });

  function guessFresh(item) {
    const n = item.name.toLowerCase();
    return /ei|eier|fleisch|fisch|lachs|garnelen|tofu|milch|joghurt|quark|ricotta|mozzarella|brokkoli|spinat|salat|tomate|gurke|avocado|karotte|paprika|zucchini/.test(n);
  }

  function getSurplus(item) {
    const b = boughtAmounts[item.key]?.bought || item.amount;
    return Math.max(0, b - item.amount);
  }

  function hasSurplus() {
    return allItems.some(item => getSurplus(item) > 0);
  }

  function isChecked(itemKey) {
    return Store.isItemChecked(key, itemKey);
  }

  function doneCount() {
    return allItems.filter(i => isChecked(i.key)).length;
  }

  function pct() {
    return allItems.length ? Math.round((doneCount() / allItems.length) * 100) : 0;
  }

  function filteredItems() {
    if (activeFilter === 'alle') return allItems;
    return allItems.filter(i => i.category === activeFilter);
  }

  function catRemaining(catId) {
    return allItems.filter(i => i.category === catId && !isChecked(i.key)).length;
  }

  function render() {
    const done = doneCount();
    const p    = pct();

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;min-height:100%">
        <div class="status-spacer"></div>

        <div class="page-header">
          <div class="page-header-row">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="recipe-hero-btn left" style="position:static" id="back-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,18 9,12 15,6"/></svg>
              </div>
              <h1 class="page-title">Einkaufsliste</h1>
            </div>
            <div style="display:flex;gap:6px">
              <div class="icon-btn" id="share-btn" title="Zu Bring! senden">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="list-stats">
            <div class="list-stat"><div class="list-stat-val">${allItems.length}</div><div class="list-stat-key">Artikel</div></div>
            <div class="list-stat"><div class="list-stat-val">${done}</div><div class="list-stat-key">Erledigt</div></div>
            <div class="list-stat"><div class="list-stat-val">ca. ${(plan.total_cost || 0).toFixed(0)} €</div><div class="list-stat-key">Gesamt</div></div>
            <div class="list-stat"><div class="list-stat-val">${allItems.length - done}</div><div class="list-stat-key">Offen</div></div>
          </div>

          <!-- Progress -->
          <div class="list-prog-row">
            <span class="list-prog-label">Fortschritt</span>
            <div class="budget-track" style="flex:1;margin:0 10px">
              <div class="budget-fill" style="width:${p}%"></div>
            </div>
            <span class="list-prog-pct">${p} %</span>
          </div>

          <!-- Filter Reset -->
          ${mealFilter ? `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0 8px">
            <div style="flex:1;font-size:12px;color:var(--text-2)">
              ${[...mealFilter].map(id => {
                const [d,t] = id.split('-');
                const tl = {breakfast:'Frühstück',lunch:'Mittag',dinner:'Abend'};
                return d + ' ' + (tl[t]||t);
              }).join(', ')}
            </div>
            <button id="clear-filter-btn" style="font-size:11px;font-weight:600;color:var(--green);background:transparent;border:none;cursor:pointer;padding:4px 0;white-space:nowrap">
              Alle anzeigen ✕
            </button>
          </div>
          ` : ''}

          <!-- Cat Tabs -->
          <div class="cat-tabs-wrap">
            <div class="cat-tab${activeFilter === 'alle' ? ' active' : ''}" data-cat="alle">🛒 Alle</div>
            ${CATEGORIES.filter(c => allItems.some(i => i.category === c.id)).map(c => `
              <div class="cat-tab${activeFilter === c.id ? ' active' : ''}" data-cat="${c.id}">${c.icon} ${c.name.split(' ')[0]}</div>
            `).join('')}
          </div>
        </div>

        <!-- List Body -->
        <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none">
          <div class="list-body" id="list-body">
            ${renderListBody()}
          </div>
        </div>

        <!-- Bottom -->
        <div class="bottom-bar">
          <button class="action-btn" id="check-all-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>
            ${done === allItems.length ? 'Zurücksetzen' : 'Alle abhaken'}
          </button>
          ${hasSurplus() ? `
          <button class="action-btn" id="pantry-btn" style="background:#F97B22;color:#fff;border-color:#F97B22">
            📦 Vorrat speichern
          </button>` : `
          <button class="action-btn bring" id="bring-btn">
            🛍️ Zu Bring!
          </button>`}
        </div>
      </div>
    `;

    // Events
    el.querySelector('#back-btn').addEventListener('click', () => goBack());
    el.querySelector('#share-btn').addEventListener('click', () => {
      Router.navigate('share', { weekKey: key, items: allItems });
    });

    // Filter zurücksetzen → alle Mahlzeiten anzeigen
    el.querySelector('#clear-filter-btn')?.addEventListener('click', () => {
      Router.navigate('list', { weekKey: key }); // ohne Filter
    });

    el.querySelectorAll('[data-cat]').forEach(tab => {
      tab.addEventListener('click', () => {
        activeFilter = tab.dataset.cat;
        render();
      });
    });

    // Checkbox click
    el.querySelectorAll('[data-cb]').forEach(cb => {
      cb.addEventListener('click', e => {
        e.stopPropagation();
        Store.toggleListItem(key, cb.dataset.cb);
        render();
      });
    });

    // Minus button
    el.querySelectorAll('[data-minus]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const k = btn.dataset.minus;
        const item = allItems.find(i => i.key === k);
        if (!item) return;
        const step = getStep(item.unit);
        const minAmt = item.amount; // nie unter benötigte Menge
        if (!boughtAmounts[k]) boughtAmounts[k] = { bought: item.amount, unit: item.unit, name: item.name };
        boughtAmounts[k].bought = Math.max(minAmt, boughtAmounts[k].bought - step);
        // Save to store
        Store.saveSurplusData(key, boughtAmounts);
        render();
      });
    });

    // Plus button
    el.querySelectorAll('[data-plus]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const k = btn.dataset.plus;
        const item = allItems.find(i => i.key === k);
        if (!item) return;
        const step = getStep(item.unit);
        if (!boughtAmounts[k]) boughtAmounts[k] = { bought: item.amount, unit: item.unit, name: item.name };
        boughtAmounts[k].bought += step;
        Store.saveSurplusData(key, boughtAmounts);
        render();
      });
    });

    // Vorrat speichern
    el.querySelector('#pantry-btn')?.addEventListener('click', () => {
      const surplusItems = allItems
        .filter(item => getSurplus(item) > 0)
        .map(item => ({
          ...item,
          surplusAmount: getSurplus(item),
          isFresh: guessFresh(item),
          emoji: item.emoji || '🥡',
        }));
      Store.savePantryItems(surplusItems);
      // Navigate to pantry tab
      navigate('pantry');
    });

    el.querySelector('#check-all-btn').addEventListener('click', () => {
      const allDone = allItems.every(i => isChecked(i.key));
      allItems.forEach(i => {
        const checked = isChecked(i.key);
        if (allDone && checked) Store.toggleListItem(key, i.key);
        else if (!allDone && !checked) Store.toggleListItem(key, i.key);
      });
      render();
    });

    el.querySelector('#bring-btn').addEventListener('click', () => {
      Router.navigate('share', { weekKey: key, items: allItems });
    });
  }

  function renderListBody() {
    const items = filteredItems();
    if (items.length === 0) return `<div class="empty-state"><div class="empty-emoji">✅</div><div class="empty-text">Alles erledigt!</div></div>`;

    if (activeFilter !== 'alle') {
      return items.map(item => renderItem(item)).join('');
    }

    // Grouped by category
    return CATEGORIES.map(cat => {
      const catItems = items.filter(i => i.category === cat.id);
      if (catItems.length === 0) return '';
      const remaining = catItems.filter(i => !isChecked(i.key)).length;
      return `
        <div class="cat-section">
          <div class="cat-header">
            <span class="cat-icon">${cat.icon}</span>
            <span class="cat-name">${cat.name}</span>
            <span class="cat-remaining">${remaining} offen</span>
          </div>
          ${catItems.map(item => renderItem(item)).join('')}
        </div>
      `;
    }).join('');
  }

  function renderItem(item) {
    const done    = isChecked(item.key);
    const bought  = boughtAmounts[item.key]?.bought ?? item.amount;
    const surplus = Math.max(0, bought - item.amount);
    const surplusStr = surplus > 0
      ? formatAmt(surplus, item.unit) + ' übrig'
      : 'exakt';
    const surplusColor = surplus > 0 ? '#F97B22' : '#9a9a94';

    return `
      <div class="list-item${done ? ' done' : ''}" data-item-key="${item.key}" style="flex-direction:column;align-items:stretch;gap:4px;padding:8px 0">
        <div style="display:flex;align-items:center;gap:9px">
          <div class="list-item-cb${done ? ' on' : ''}" style="flex-shrink:0" data-cb="${item.key}">
            ${done ? '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
          </div>
          <div class="list-item-info">
            <div class="list-item-name">${item.name}</div>
            <div class="list-item-for">Brauche: ${item.amtStr}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding-left:29px">
          <span style="font-size:11px;color:var(--color-text-secondary)">Kaufe:</span>
          <button data-minus="${item.key}" style="width:20px;height:20px;border-radius:50%;border:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--color-text-secondary);line-height:1;flex-shrink:0">−</button>
          <span data-bought-val="${item.key}" style="font-size:12px;font-weight:500;color:var(--color-text-primary);min-width:40px;text-align:center">${formatAmt(bought, item.unit)}</span>
          <button data-plus="${item.key}" style="width:20px;height:20px;border-radius:50%;border:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--color-text-secondary);line-height:1;flex-shrink:0">+</button>
          <span style="font-size:10px;font-weight:500;color:${surplusColor}" data-surplus-lbl="${item.key}">${surplusStr}</span>
        </div>
      </div>
    `;
  }

  function formatAmt(amount, unit) {
    if (!unit) return String(Math.round(amount));
    if (unit === 'g' && amount >= 1000) return (amount/1000).toFixed(amount%1000===0?0:1) + ' kg';
    if (unit === 'ml' && amount >= 1000) return (amount/1000).toFixed(1) + ' l';
    return (Number.isInteger(amount) ? amount : parseFloat(amount.toFixed(1))) + ' ' + unit;
  }

  function getStep(unit) {
    if (unit === 'g' || unit === 'ml') return 50;
    return 1;
  }

  render();
};

// ============================================
// SHARE / BRING SCREEN
// ============================================
Screens.share = function(el, params) {
  const { weekKey, items = [] } = params || {};
  const bringToken  = localStorage.getItem('bring_token');
  const bringUuid   = localStorage.getItem('bring_uuid');
  const bringListId = localStorage.getItem('bring_list_id');
  const bringEmail  = localStorage.getItem('bring_email');

  let sendingToBring = false;

  function render() {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;min-height:100%">
        <div class="status-spacer"></div>

        <div class="page-header">
          <div class="page-header-row">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="recipe-hero-btn left" style="position:static" id="back-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,18 9,12 15,6"/></svg>
              </div>
              <h1 class="page-title">Liste teilen</h1>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-2);margin-top:-4px">${items.length} Artikel · ca. ${Store.getPlan(weekKey)?.total_cost?.toFixed(0) || '?'} €</div>
        </div>

        <div style="flex:1;overflow-y:auto;padding:0 16px 16px">

          <!-- Bring! Card -->
          <div class="bring-card">
            <div class="bring-header">
              <div class="bring-logo">🛍️</div>
              <div>
                <div class="bring-title">Bring!</div>
                <div class="bring-sub">Direkt in deine Einkaufsliste</div>
              </div>
            </div>
            <div class="bring-body">

              ${bringToken ? `
                <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--green-light);border-radius:var(--radius-md);font-size:12px;color:var(--green-dark)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22,11.08V12a10,10,0,1,1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
                  Verbunden als <b>${bringEmail || 'Bring! Account'}</b>
                </div>
              ` : `
                <div style="display:flex;flex-direction:column;gap:8px">
                  <div style="font-size:13px;color:var(--text-2);line-height:1.5">Einmalig mit Bring! verbinden:</div>
                  <input type="email" id="bring-email" placeholder="E-Mail" style="width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--border-mid);font-size:14px;background:var(--bg-2);outline:none">
                  <input type="password" id="bring-pw" placeholder="Passwort" style="width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--border-mid);font-size:14px;background:var(--bg-2);outline:none">
                  <button class="bring-send-btn" id="bring-login-btn">Mit Bring! verbinden</button>
                </div>
              `}

              <!-- Options -->
              ${bringToken ? `
              <div style="display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <div style="font-size:13px;font-weight:600;color:var(--text)">Mengenangaben</div>
                    <div style="font-size:11px;color:var(--text-2)">z.B. "Brokkoli – 600 g"</div>
                  </div>
                  <div class="toggle-pill on" id="tog-qty"></div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <div style="font-size:13px;font-weight:600;color:var(--text)">Erledigte überspringen</div>
                    <div style="font-size:11px;color:var(--text-2)">Bereits abgehakte nicht senden</div>
                  </div>
                  <div class="toggle-pill on" id="tog-skip"></div>
                </div>
              </div>
              <button class="bring-send-btn" id="bring-send-btn" ${sendingToBring ? 'disabled' : ''}>
                ${sendingToBring
                  ? '⏳ Wird gesendet…'
                  : `🛍️ ${items.length} Artikel zu Bring! senden`}
              </button>
              ` : ''}
            </div>
          </div>

          <!-- Other share options -->
          <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-3);margin-bottom:10px">Andere Optionen</div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
            <div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;padding:8px 4px" id="share-whatsapp">
              <div style="width:44px;height:44px;border-radius:14px;background:#25D366;display:flex;align-items:center;justify-content:center;font-size:22px">💬</div>
              <span style="font-size:10px;color:var(--text-2);font-weight:500">WhatsApp</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;padding:8px 4px" id="share-copy">
              <div style="width:44px;height:44px;border-radius:14px;background:var(--bg-2);border:0.5px solid var(--border-mid);display:flex;align-items:center;justify-content:center;font-size:22px">📋</div>
              <span style="font-size:10px;color:var(--text-2);font-weight:500">Kopieren</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;padding:8px 4px" id="share-mail">
              <div style="width:44px;height:44px;border-radius:14px;background:#EA4335;display:flex;align-items:center;justify-content:center;font-size:22px">📧</div>
              <span style="font-size:10px;color:var(--text-2);font-weight:500">E-Mail</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;padding:8px 4px" id="share-native">
              <div style="width:44px;height:44px;border-radius:14px;background:var(--bg-2);border:0.5px solid var(--border-mid);display:flex;align-items:center;justify-content:center;font-size:22px">⬆️</div>
              <span style="font-size:10px;color:var(--text-2);font-weight:500">Mehr</span>
            </div>
          </div>
        </div>
      </div>
    `;

    el.querySelector('#back-btn').addEventListener('click', () => goBack());

    // Bring Login
    el.querySelector('#bring-login-btn')?.addEventListener('click', async () => {
      const email = el.querySelector('#bring-email')?.value.trim();
      const pw    = el.querySelector('#bring-pw')?.value.trim();
      if (!email || !pw) return alert('E-Mail und Passwort eingeben');
      try {
        const { token, uuid } = await API.bringLogin(email, pw);
        localStorage.setItem('bring_token', token);
        localStorage.setItem('bring_uuid', uuid);
        localStorage.setItem('bring_email', email);
        // Erste Liste als Standard
        const lists = await API.getBringLists(uuid, token);
        if (lists[0]) localStorage.setItem('bring_list_id', lists[0].listUuid);
        render();
      } catch (e) {
        alert('Login fehlgeschlagen: ' + e.message);
      }
    });

    // Bring Send
    el.querySelector('#bring-send-btn')?.addEventListener('click', async () => {
      sendingToBring = true;
      render();
      try {
        const checkedKeys = items.filter(i => Store.isItemChecked(weekKey, i.key)).map(i => i.key);
        const result = await API.sendToBring(
          bringListId,
          bringToken,
          items.map(i => ({ ...i, key: i.key })),
          { includeAmounts: true, skipChecked: true, checkedKeys }
        );
        sendingToBring = false;
        alert(`✓ ${result.sent} Artikel zu Bring! gesendet!`);
        goBack();
      } catch (e) {
        sendingToBring = false;
        alert('Fehler: ' + e.message);
        render();
      }
    });

    // Share functions
    function buildListText() {
      return '🌿 Herbi Einkaufsliste\n\n' +
        items.map(i => `• ${i.name} – ${i.amtStr}`).join('\n');
    }

    el.querySelector('#share-whatsapp')?.addEventListener('click', () => {
      window.open('https://wa.me/?text=' + encodeURIComponent(buildListText()));
    });

    el.querySelector('#share-copy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(buildListText()).then(() => {
        alert('Liste kopiert!');
      });
    });

    el.querySelector('#share-mail')?.addEventListener('click', () => {
      window.location.href = 'mailto:?subject=Einkaufsliste&body=' + encodeURIComponent(buildListText());
    });

    el.querySelector('#share-native')?.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: 'Herbi Einkaufsliste', text: buildListText() });
      }
    });
  }

  render();
};
