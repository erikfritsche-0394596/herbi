// ============================================
// HERBI – Rezeptebuch Screen (cookbook.js)
// ============================================

Screens.cookbook = function(el, params) {

  const TAG_LABELS = {
    'meal-prep':'Meal Prep','vegetarisch':'Veggie','vegan':'Vegan',
    'pescetarisch':'Fisch','high-protein':'High-Protein','schnell':'Schnell',
    'italienisch':'Italienisch','asiatisch':'Asiatisch','mexikanisch':'Mexikanisch',
    'mediterran':'Mediterran','deutsch':'Deutsch','aus-vorrat':'Aus Vorrat',
  };
  const TAG_COLORS = {
    'meal-prep':'tag-mp','vegetarisch':'tag-green','vegan':'tag-green',
    'pescetarisch':'tag-green','high-protein':'tag-amber','schnell':'tag-gray',
    'italienisch':'tag-red','asiatisch':'tag-pink','mexikanisch':'tag-red',
    'mediterran':'tag-green','aus-vorrat':'tag-mp',
  };

  let searchQuery  = '';
  let activeFilter = 'alle';
  let sortBy       = 'recent'; // 'recent' | 'most-cooked' | 'name'

  function getRecipes() {
    const all = Object.values(Store.getCookbook());
    // Filter
    let filtered = all.filter(r => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return r.name?.toLowerCase().includes(q) ||
               r.tags?.some(t => t.includes(q));
      }
      return true;
    });
    if (activeFilter !== 'alle') {
      filtered = filtered.filter(r => r.tags?.includes(activeFilter));
    }
    // Sort
    if (sortBy === 'most-cooked') {
      filtered.sort((a, b) => (b.cookCount || 1) - (a.cookCount || 1));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name?.localeCompare(b.name));
    } else {
      filtered.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    }
    return filtered;
  }

  function getAllTags() {
    const tags = new Set();
    Object.values(Store.getCookbook()).forEach(r => {
      (r.tags || []).forEach(t => tags.add(t));
    });
    return [...tags].filter(t => TAG_LABELS[t]);
  }

  function formatDate(iso) {
    const d = new Date(iso);
    const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    return `${d.getDate()}. ${months[d.getMonth()]}`;
  }

  function render() {
    const recipes = getRecipes();
    const total   = Object.keys(Store.getCookbook()).length;
    const tags    = getAllTags();

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;min-height:100%">
        <div class="status-spacer"></div>

        <div class="page-header">
          <div class="page-header-row">
            <h1 class="page-title">Rezeptebuch</h1>
            <div style="display:flex;gap:6px;align-items:center">
              <span style="font-size:12px;color:var(--color-text-tertiary);font-weight:500">${total} Rezepte</span>
            </div>
          </div>

          <!-- Suche -->
          <div style="position:relative;margin-bottom:10px">
            <svg style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--color-text-tertiary)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              id="search-input"
              type="search"
              placeholder="Rezept suchen…"
              value="${searchQuery}"
              style="width:100%;padding:9px 12px 9px 34px;border-radius:10px;border:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary);font-size:13px;color:var(--color-text-primary);outline:none;-webkit-appearance:none"
            >
          </div>

          <!-- Sort + Filter -->
          <div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin-bottom:2px;padding-bottom:2px">
            <select id="sort-select" style="padding:5px 10px;border-radius:20px;border:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary);font-size:11px;font-weight:500;color:var(--color-text-secondary);outline:none;flex-shrink:0;cursor:pointer">
              <option value="recent"     ${sortBy==='recent'     ?'selected':''}>Neueste</option>
              <option value="most-cooked"${sortBy==='most-cooked'?'selected':''}>Meist gekocht</option>
              <option value="name"       ${sortBy==='name'       ?'selected':''}>A–Z</option>
            </select>
            <div class="cat-tab${activeFilter==='alle'?' active':''}" data-filter="alle" style="flex-shrink:0;padding:5px 10px;font-size:11px">Alle</div>
            ${tags.map(t => `
              <div class="cat-tab${activeFilter===t?' active':''}" data-filter="${t}" style="flex-shrink:0;padding:5px 10px;font-size:11px;white-space:nowrap">
                ${TAG_LABELS[t]||t}
              </div>
            `).join('')}
          </div>
        </div>

        <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:10px 16px 16px">
          ${total === 0 ? `
          <div class="empty-state">
            <div class="empty-emoji">📖</div>
            <div class="empty-text">Noch keine Rezepte gespeichert.<br>Koche ein Gericht und tippe "Würde ich wieder kochen" um es hier zu speichern.</div>
          </div>
          ` : recipes.length === 0 ? `
          <div class="empty-state">
            <div class="empty-emoji">🔍</div>
            <div class="empty-text">Keine Rezepte gefunden.</div>
          </div>
          ` : `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${recipes.map(r => renderCard(r)).join('')}
          </div>
          `}
        </div>
      </div>
    `;

    // Search
    el.querySelector('#search-input')?.addEventListener('input', e => {
      searchQuery = e.target.value;
      render();
    });

    // Sort
    el.querySelector('#sort-select')?.addEventListener('change', e => {
      sortBy = e.target.value;
      render();
    });

    // Filter tabs
    el.querySelectorAll('[data-filter]').forEach(tab => {
      tab.addEventListener('click', () => {
        activeFilter = tab.dataset.filter;
        render();
      });
    });

    // Recipe card tap
    el.querySelectorAll('[data-recipe-id]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.recipeId;
        const recipe = Store.getRecipe(id);
        if (recipe) {
          Router.navigate('cookbook-recipe', { recipe });
        }
      });
    });
  }

  function renderCard(r) {
    const mainTag = (r.tags || []).find(t => TAG_LABELS[t]);
    const tagColor = TAG_COLORS[mainTag] || 'tag-gray';
    const tagLabel = TAG_LABELS[mainTag] || '';
    return `
      <div data-recipe-id="${r.id}" style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-lg);overflow:hidden;cursor:pointer;transition:border-color 0.12s" >
        <div style="height:80px;background:var(--color-background-secondary);display:flex;align-items:center;justify-content:center;font-size:38px;position:relative">
          ${r.emoji || '🍽️'}
          ${r.cookCount > 1 ? `<div style="position:absolute;top:6px;right:7px;background:#2D7D3A;color:#fff;font-size:9px;font-weight:600;padding:2px 5px;border-radius:6px">${r.cookCount}x</div>` : ''}
        </div>
        <div style="padding:8px 9px 10px">
          <div style="font-size:12px;font-weight:600;color:var(--color-text-primary);margin-bottom:5px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${r.name}</div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            ${mainTag ? `<span class="tag ${tagColor}" style="font-size:9px">${tagLabel}</span>` : '<span></span>'}
            <span style="font-size:9px;color:var(--color-text-tertiary)">${r.time_min ? r.time_min+'min' : ''}</span>
          </div>
        </div>
      </div>
    `;
  }

  render();
};

// ============================================
// COOKBOOK RECIPE DETAIL
// ============================================
Screens['cookbook-recipe'] = function(el, params) {
  const { recipe } = params;
  if (!recipe) { goBack(); return; }

  let portions    = Store.getSettings().portions || 1;
  let checkedIngs = new Set();
  let doneSteps   = new Set();
  const BASE_P    = portions;

  const TAG_LABELS = {
    'meal-prep':'Meal Prep','vegetarisch':'Veggie','vegan':'Vegan',
    'pescetarisch':'Fisch','high-protein':'High-Protein','schnell':'Schnell',
    'italienisch':'Italienisch','asiatisch':'Asiatisch','aus-vorrat':'Aus Vorrat',
  };
  const TAG_COLORS = {
    'meal-prep':'tag-mp','vegetarisch':'tag-green','vegan':'tag-green',
    'pescetarisch':'tag-green','high-protein':'tag-amber',
    'italienisch':'tag-red','asiatisch':'tag-pink','aus-vorrat':'tag-mp',
  };

  function fmtAmt(base, unit, p) {
    const v = (base / BASE_P) * p;
    if (unit==='g'&&v>=1000) return (v/1000).toFixed(v%1000===0?0:1)+' kg';
    if (unit==='ml'&&v>=1000) return (v/1000).toFixed(1)+' l';
    return (Number.isInteger(v)?v:parseFloat(v.toFixed(1)))+(unit?' '+unit:'');
  }

  function render() {
    const ings  = recipe.ingredients || [];
    const steps = recipe.steps || [];

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;min-height:100%">

        <div class="recipe-hero" style="background:#EAF3DE">
          <div class="recipe-hero-btn left" id="back-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,18 9,12 15,6"/></svg>
          </div>
          <div class="recipe-hero-emoji">${recipe.emoji || '🍽️'}</div>
          <div class="recipe-hero-btn right" id="delete-btn" title="Aus Buch entfernen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/></svg>
          </div>
        </div>

        <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none">
          <div class="recipe-body">

            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px">
              <div class="recipe-title" style="flex:1;margin-right:12px">${recipe.name}</div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:11px;color:var(--color-text-tertiary)">${recipe.cookCount||1}x gekocht</div>
                <div style="font-size:10px;color:var(--color-text-tertiary);margin-top:2px">Gespeichert ${new Date(recipe.savedAt).toLocaleDateString('de-DE',{day:'numeric',month:'short'})}</div>
              </div>
            </div>

            <div class="recipe-tags" style="margin-bottom:14px">
              ${(recipe.tags||[]).map(t=>{
                const c=TAG_COLORS[t]||'tag-gray';
                const l=TAG_LABELS[t]||t;
                return `<span class="tag ${c}">${l}</span>`;
              }).join('')}
            </div>

            <div class="recipe-meta">
              ${recipe.time_min?`<div class="meta-card"><div class="meta-val">${recipe.time_min} min</div><div class="meta-key">Kochzeit</div></div>`:''}
              ${recipe.price?`<div class="meta-card"><div class="meta-val">${typeof recipe.price==='number'?recipe.price.toFixed(2).replace('.',',')+' €':recipe.price}</div><div class="meta-key">Kosten</div></div>`:''}
              <div class="meta-card"><div class="meta-val">${recipe.cookCount||1}x</div><div class="meta-key">Gekocht</div></div>
            </div>

            ${ings.length > 0 ? `
            <div class="sec-label">Zutaten</div>
            <div class="portions-row">
              <span class="portions-label">Portionen</span>
              <div class="stepper">
                <button class="stepper-btn" id="minus-btn" ${portions<=1?'disabled':''}>−</button>
                <span class="stepper-val" id="p-val">${portions}</span>
                <button class="stepper-btn" id="plus-btn" ${portions>=8?'disabled':''}>+</button>
              </div>
            </div>
            <div class="ing-list">
              ${ings.map((ing,i)=>`
                <div class="ing-row${checkedIngs.has(i)?' done':''}" data-ing="${i}">
                  <div class="ing-cb${checkedIngs.has(i)?' on':''}">
                    ${checkedIngs.has(i)?'<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>':''}
                  </div>
                  <span class="ing-name">${ing.name}</span>
                  <span class="ing-amt">${fmtAmt(ing.amount,ing.unit,portions)}</span>
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${steps.length > 0 ? `
            <div class="sec-label">Zubereitung</div>
            <div class="steps-list">
              ${steps.map((s,i)=>`
                <div class="step-row" data-step="${i}">
                  <div class="step-num-col">
                    <div class="step-num${doneSteps.has(i)?' done':''}">
                      ${doneSteps.has(i)?'<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>':i+1}
                    </div>
                    ${i<steps.length-1?'<div class="step-line"></div>':''}
                  </div>
                  <div class="step-body">
                    <div class="step-text${doneSteps.has(i)?' done':''}">${s.text}</div>
                    ${s.timer_min?`<span class="step-timer"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg> ${s.timer_min} min</span>`:''}
                  </div>
                </div>
              `).join('')}
            </div>
            ` : `<div style="padding:16px;text-align:center;color:var(--color-text-tertiary);font-size:13px">Noch keine Zubereitung gespeichert.</div>`}

          </div>
        </div>

        <div class="bottom-bar">
          <button class="action-btn" id="add-to-plan-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Zum Plan hinzufügen
          </button>
          <button class="action-btn primary" id="cook-now-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>
            Jetzt kochen
          </button>
        </div>
      </div>
    `;

    el.querySelector('#back-btn').addEventListener('click', () => goBack());

    el.querySelector('#delete-btn').addEventListener('click', () => {
      if (confirm(`"${recipe.name}" aus dem Rezeptebuch entfernen?`)) {
        Store.removeRecipe(recipe.id);
        goBack();
      }
    });

    el.querySelectorAll('[data-ing]').forEach(row => {
      row.addEventListener('click', () => {
        const i = parseInt(row.dataset.ing);
        checkedIngs.has(i) ? checkedIngs.delete(i) : checkedIngs.add(i);
        render();
      });
    });

    el.querySelectorAll('[data-step]').forEach(row => {
      row.addEventListener('click', () => {
        const i = parseInt(row.dataset.step);
        doneSteps.has(i) ? doneSteps.delete(i) : doneSteps.add(i);
        render();
      });
    });

    el.querySelector('#minus-btn')?.addEventListener('click', () => { if(portions>1){portions--;render();} });
    el.querySelector('#plus-btn')?.addEventListener('click',  () => { if(portions<8){portions++;render();} });

    el.querySelector('#add-to-plan-btn').addEventListener('click', () => {
      const weekKey = Store.getCurrentWeekKey();
      let plan = Store.getPlan(weekKey);
      const DAYS = ['Mo','Di','Mi','Do','Fr','Sa','So'];
      const todayIdx = getTodayIndex();
      const mealObj = { ...recipe, from_cookbook: true };

      if (!plan) {
        const emptyDays = {};
        DAYS.forEach(d => { emptyDays[d] = {}; });
        emptyDays[DAYS[todayIdx]].dinner = mealObj;
        Store.savePlan(weekKey, { meals: emptyDays, total_cost: 0 });
      } else {
        let saved = false;
        for (let offset = 0; offset < 7 && !saved; offset++) {
          const dk = DAYS[(todayIdx + offset) % 7];
          for (const slot of ['dinner','lunch']) {
            if (!plan.meals[dk]?.[slot] || plan.meals[dk][slot].is_rest) {
              if (!plan.meals[dk]) plan.meals[dk] = {};
              plan.meals[dk][slot] = mealObj;
              Store.savePlan(weekKey, plan);
              saved = true; break;
            }
          }
        }
        if (!saved) {
          if (!plan.meals[DAYS[todayIdx]]) plan.meals[DAYS[todayIdx]] = {};
          plan.meals[DAYS[todayIdx]].dinner = mealObj;
          Store.savePlan(weekKey, plan);
        }
      }

      // cookCount erhöhen
      Store.saveRecipe({ ...recipe });

      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#2D7D3A;color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999;white-space:nowrap';
      toast.textContent = `✓ ${recipe.name} zum Plan hinzugefügt`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
      navigate('plan');
    });

    el.querySelector('#cook-now-btn').addEventListener('click', () => {
      Store.saveRecipe({ ...recipe }); // cookCount +1
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#2D7D3A;color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999;white-space:nowrap';
      toast.textContent = `🍳 Guten Appetit!`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    });
  }

  render();
};
