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
              <div class="icon-btn" id="import-btn" title="Rezept importieren">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </div>
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

    // Import from URL
    el.querySelector('#import-btn')?.addEventListener('click', () => {
      Router.navigate('cookbook-import', {});
    });

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

  let portions    = recipe.portions || Store.getSettings().portions || 1;
  let checkedIngs = new Set();
  let doneSteps   = new Set();
  const BASE_P    = portions; // Basis = gespeicherte Portionen des Rezepts

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

// ============================================
// COOKBOOK IMPORT SCREEN
// ============================================
Screens['cookbook-import'] = async function(el, params) {
  const { importUrl } = params || {};

  let url        = importUrl || '';
  let status     = importUrl ? 'loading' : 'idle';
  let errorMsg   = '';
  let importedRecipe = null;
  let mode       = 'url'; // 'url' | 'text' | 'blog'
  let textInput  = '';
  let blogUrl    = '';
  let blogRecipes = []; // gefundene Rezepte auf dem Blog
  let blogStatus = 'idle'; // idle | loading | results | error
  let selectedBlogRecipes = new Set();

  async function discoverBlogRecipes(domain) {
    blogStatus = 'loading';
    blogRecipes = [];
    selectedBlogRecipes = new Set();
    errorMsg = '';
    render();

    try {
      const apiKey = localStorage.getItem('herbi_api_key');
      if (!apiKey) throw new Error('Kein API Key gespeichert.');

      // URL normalisieren
      let cleanUrl = domain.trim();
      if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;

      const prompt = `Suche auf der Website "${cleanUrl}" nach Rezepten.

Analysiere die Website und erstelle eine Liste von Rezepten die dort zu finden sind.
Falls du die Website kennst, liste bekannte Rezepte auf.
Falls nicht, liste typische Rezepte die auf einer solchen Website zu finden wären.

Antworte NUR mit einem JSON-Array (kein Markdown, max. 15 Rezepte):
[
  {
    "name": "Rezeptname",
    "emoji": "🍝",
    "url": "https://vollständige-url-zum-rezept",
    "time_min": 30,
    "tags": ["vegetarisch"]
  }
]

Falls die Website keine Rezepte hat oder nicht existiert:
{"error": "Kurze Erklärung"}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      const rawJson = data.content[0].text.trim();
      const text = rawJson.replace(/```json[\s\S]*?```/g, m => m.slice(7,-3)).replace(/^```|```$/gm,'').trim();
      const result = JSON.parse(text);

      if (result.error) throw new Error(result.error);
      if (!Array.isArray(result)) throw new Error('Keine Rezepte gefunden.');

      blogRecipes = result;
      blogStatus = 'results';

    } catch(err) {
      console.error('Blog discovery error:', err);
      errorMsg = err.message;
      blogStatus = 'error';
    }
    render();
  }

  async function importSelectedBlogRecipes() {
    const toImport = [...selectedBlogRecipes].map(i => blogRecipes[i]);
    let imported = 0;

    for (const recipe of toImport) {
      try {
        // Vollständiges Rezept laden wenn URL vorhanden
        if (recipe.url) {
          await analyzeUrl(recipe.url);
          if (importedRecipe) {
            Store.saveRecipe({
              ...importedRecipe,
              tags: [...(importedRecipe.tags || []), 'noch-nicht-gekocht'],
              cookCount: 0,
              savedAt: new Date().toISOString(),
              portions: importedRecipe.portions || 1,
            });
            importedRecipe = null;
            imported++;
          }
        }
      } catch(e) {
        console.error('Import error for', recipe.name, e);
      }
    }

    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#2D7D3A;color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
    toast.textContent = `📖 ${imported} Rezept${imported!==1?'e':''} gespeichert!`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    navigate('cookbook');
  }

  async function analyzeText(text) {
    status = 'loading';
    errorMsg = '';
    render();

    try {
      const apiKey = localStorage.getItem('herbi_api_key');
      if (!apiKey) throw new Error('Kein API Key gespeichert.');

      const prompt = `Extrahiere aus folgendem Text ein strukturiertes Rezept.

TEXT:
${text}

WICHTIGE REGELN:
1. Übernimm die Zutatenmengen EXAKT so wie sie im Text stehen – rechne NICHTS um.
2. Erfinde keine Zutaten die nicht im Text stehen.
3. Wenn Portionen erwähnt werden, trage sie unter "portions" ein.

Antworte NUR mit einem JSON-Objekt (kein Markdown):
{
  "name": "Rezeptname (aus dem Text ableiten)",
  "emoji": "🍝",
  "source_type": "text",
  "time_min": 30,
  "portions": 4,
  "tags": ["vegetarisch"],
  "ingredients": [
    {"name": "Zutat", "amount": 200, "unit": "g"}
  ],
  "steps": [
    {"text": "Schritt 1...", "timer_min": null}
  ]
}

Falls der Text kein Rezept enthält:
{"error": "Kein Rezept gefunden"}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      const rawText = data.content[0].text.trim()
        .replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
      const result = JSON.parse(rawText);

      if (result.error) throw new Error(result.error);

      importedRecipe = result;
      status = 'success';

    } catch(err) {
      console.error('Text import error:', err);
      errorMsg = err.message;
      status = 'error';
    }
    render();
  }

  async function analyzeUrl(targetUrl) {
    status = 'loading';
    errorMsg = '';
    render();

    try {
      const apiKey = localStorage.getItem('herbi_api_key');
      if (!apiKey) throw new Error('Kein API Key gespeichert.');

      const prompt = `Analysiere diese URL und extrahiere das Rezept daraus.

URL: ${targetUrl}

WICHTIGE REGELN:
1. Übernimm die Zutatenmengen EXAKT so wie sie auf der Website stehen – rechne NICHTS um.
2. Wenn auf der Seite z.B. "4 Portionen" steht, übernimm alle Mengen für 4 Portionen und trage portionen: 4 ein.
3. Erfinde keine Mengen und teile keine Mengen durch eine andere Zahl.
4. Wenn du eine Website analysierst, lies den tatsächlichen Seiteninhalt.
5. Bei TikTok/Instagram/YouTube-Links: antworte mit {"error": "TikTok/Instagram/YouTube-Videos können leider nicht ausgelesen werden. Bitte nutze direkte Rezept-Websites wie Chefkoch, AllRecipes, etc."}

Antworte NUR mit einem JSON-Objekt (kein Markdown):
{
  "name": "Rezeptname",
  "emoji": "🍝",
  "source_url": "${targetUrl}",
  "source_type": "website|tiktok|instagram|youtube|other",
  "time_min": 30,
  "portions": 4,
  "tags": ["vegetarisch", "italienisch"],
  "ingredients": [
    {"name": "Zutat", "amount": 200, "unit": "g"}
  ],
  "steps": [
    {"text": "Schritt 1...", "timer_min": null}
  ],
  "notes": "Optionale Notiz vom Original"
}

Falls du kein Rezept extrahieren kannst, antworte mit:
{"error": "Kurze Erklärung warum"}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      const text = data.content[0].text.trim()
        .replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
      const result = JSON.parse(text);

      if (result.error) throw new Error(result.error);

      importedRecipe = result;
      status = 'success';

    } catch(err) {
      console.error('Import error:', err);
      errorMsg = err.message;
      status = 'error';
    }
    render();
  }

  function render() {
    const SOURCE_ICONS = {
      tiktok: '🎵', instagram: '📸', youtube: '▶️',
      website: '🌐', other: '🔗'
    };

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;min-height:100%">
        <div class="status-spacer"></div>

        <div class="page-header">
          <div class="page-header-row">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="recipe-hero-btn left" style="position:static" id="back-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,18 9,12 15,6"/></svg>
              </div>
              <h1 class="page-title">Rezept importieren</h1>
            </div>
          </div>
        </div>

        <div style="flex:1;padding:0 16px 16px;overflow-y:auto">

          ${status === 'idle' || status === 'error' ? `

          <!-- Mode Tabs -->
          <div style="display:flex;gap:6px;margin-bottom:16px;background:var(--color-background-secondary);padding:4px;border-radius:12px">
            <button data-mode="url" style="flex:1;padding:9px;border-radius:9px;font-size:13px;font-weight:500;border:none;cursor:pointer;background:${mode==='url'?'var(--color-background-primary)':'transparent'};color:${mode==='url'?'var(--color-text-primary)':'var(--color-text-secondary)'};transition:all 0.15s">
              🔗 Website-Link
            </button>
            <button data-mode="text" style="flex:1;padding:9px;border-radius:9px;font-size:13px;font-weight:500;border:none;cursor:pointer;background:${mode==='text'?'var(--color-background-primary)':'transparent'};color:${mode==='text'?'var(--color-text-primary)':'var(--color-text-secondary)'};transition:all 0.15s">
              📋 Text
            </button>
            <button data-mode="blog" style="flex:1;padding:9px;border-radius:9px;font-size:13px;font-weight:500;border:none;cursor:pointer;background:${mode==='blog'?'var(--color-background-primary)':'transparent'};color:${mode==='blog'?'var(--color-text-primary)':'var(--color-text-secondary)'};transition:all 0.15s">
              🔍 Blog
            </button>
          </div>

          ${mode === 'url' ? `
          <!-- URL Modus -->
          <div style="margin-bottom:16px">
            <div style="position:relative">
              <input
                id="url-input"
                type="url"
                placeholder="https://chefkoch.de/rezepte/..."
                value="${url}"
                style="width:100%;padding:13px 44px 13px 14px;border-radius:12px;border:1.5px solid ${status==='error'?'#E24B4A':'var(--color-border-secondary)'};background:var(--color-background-secondary);font-size:14px;color:var(--color-text-primary);outline:none;-webkit-appearance:none"
              >
              ${url ? `<div id="clear-btn" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--color-text-tertiary);font-size:18px;line-height:1">×</div>` : ''}
            </div>
            ${status === 'error' ? `<div style="margin-top:8px;padding:10px 12px;background:#FAECE7;border-radius:10px;font-size:12px;color:#712B13">${errorMsg}</div>` : ''}
          </div>
          <button id="analyze-btn" style="width:100%;padding:14px;border-radius:14px;background:${url?'#2D7D3A':'#9a9a94'};color:#fff;font-size:15px;font-weight:700;border:none;cursor:pointer;margin-bottom:16px" ${!url?'disabled':''}>
            Rezept analysieren ✨
          </button>
          <div style="padding:10px 12px;background:var(--color-background-secondary);border-radius:10px;font-size:12px;color:var(--color-text-secondary);line-height:1.6;margin-bottom:16px">
            ✅ Funktioniert mit: Chefkoch, Kitchenstories, AllRecipes, BBC Good Food, Essen&Trinken und allen normalen Rezept-Websites<br>
            ❌ Nicht möglich: TikTok, Instagram, YouTube → nutze dafür den <b>Text einfügen</b> Modus
          </div>
          <button id="shortcut-btn" style="width:100%;padding:11px;border-radius:11px;background:#007AFF;color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Shortcut-Anleitung
          </button>
          ` : `
          <!-- Text Modus -->
          <div style="margin-bottom:12px;padding:10px 12px;background:#E6F1FB;border-radius:10px;font-size:12px;color:#0C447C;line-height:1.6">
            <b>So geht's für TikTok/Instagram:</b><br>
            1. TikTok/Insta öffnen → Video antippen<br>
            2. Beschreibung des Videos kopieren (Zutaten stehen oft dort)<br>
            3. Oder: Kommentare lesen, Creator schreiben Rezept oft rein<br>
            4. Den Text hier einfügen
          </div>
          <textarea
            id="text-input"
            placeholder="Rezepttext hier einfügen…&#10;&#10;Zum Beispiel:&#10;500g Hähnchenbrust&#10;2 Knoblauchzehen&#10;1 TL Paprika&#10;..."
            style="width:100%;height:180px;padding:13px 14px;border-radius:12px;border:1.5px solid ${status==='error'?'#E24B4A':'var(--color-border-secondary)'};background:var(--color-background-secondary);font-size:14px;color:var(--color-text-primary);outline:none;-webkit-appearance:none;resize:none;line-height:1.6;font-family:-apple-system,sans-serif"
          >${textInput}</textarea>
          ${status === 'error' ? `<div style="margin-top:8px;padding:10px 12px;background:#FAECE7;border-radius:10px;font-size:12px;color:#712B13">${errorMsg}</div>` : ''}
          <button id="analyze-text-btn" style="width:100%;padding:14px;border-radius:14px;background:${textInput.trim()?'#2D7D3A':'#9a9a94'};color:#fff;font-size:15px;font-weight:700;border:none;cursor:pointer;margin-top:10px" ${!textInput.trim()?'disabled':''}>
            Rezept extrahieren ✨
          </button>
          `}

          ${mode === 'blog' ? `
          <!-- Blog Discovery Modus -->
          <div style="margin-bottom:12px;padding:10px 12px;background:#EAF3DE;border-radius:10px;font-size:12px;color:#27500A;line-height:1.6">
            Gib eine Website oder Blog-URL ein – nur den Domainnamen reicht. Claude sucht alle Rezepte die dort zu finden sind.
          </div>

          <div style="position:relative;margin-bottom:10px">
            <input
              id="blog-input"
              type="text"
              placeholder="z.B. chefkoch.de oder butterhand.com"
              value="${blogUrl}"
              style="width:100%;padding:13px 14px;border-radius:12px;border:1.5px solid var(--color-border-secondary);background:var(--color-background-secondary);font-size:14px;color:var(--color-text-primary);outline:none;-webkit-appearance:none"
            >
          </div>

          <button id="discover-btn" style="width:100%;padding:14px;border-radius:14px;background:${blogUrl.trim()?'#2D7D3A':'#9a9a94'};color:#fff;font-size:15px;font-weight:700;border:none;cursor:pointer;margin-bottom:14px" ${!blogUrl.trim()?'disabled':''}>
            ${blogStatus==='loading' ? 'Rezepte werden gesucht…' : 'Rezepte suchen 🔍'}
          </button>

          ${blogStatus === 'loading' ? `
          <div style="display:flex;align-items:center;gap:10px;padding:14px;background:var(--color-background-secondary);border-radius:12px">
            <div class="spinner" style="width:18px;height:18px;border-width:2px;flex-shrink:0"></div>
            <span style="font-size:13px;color:var(--color-text-secondary)">Claude durchsucht die Website…</span>
          </div>
          ` : blogStatus === 'error' ? `
          <div style="padding:10px 12px;background:#FAECE7;border-radius:10px;font-size:12px;color:#712B13">${errorMsg}</div>
          ` : blogStatus === 'results' && blogRecipes.length > 0 ? `
          <div style="font-size:12px;font-weight:500;color:var(--color-text-secondary);margin-bottom:8px">${blogRecipes.length} Rezepte gefunden – wähle die die du möchtest:</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
            ${blogRecipes.map((r,i) => `
            <div data-blog-recipe="${i}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1.5px solid ${selectedBlogRecipes.has(i)?'#2D7D3A':'var(--color-border-secondary)'};background:${selectedBlogRecipes.has(i)?'#EAF3DE':'var(--color-background-primary)'};cursor:pointer;transition:all 0.12s">
              <div style="width:20px;height:20px;border-radius:50%;border:1.5px solid ${selectedBlogRecipes.has(i)?'#2D7D3A':'var(--color-border-secondary)'};background:${selectedBlogRecipes.has(i)?'#2D7D3A':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                ${selectedBlogRecipes.has(i)?'<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg>':''}
              </div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500;color:${selectedBlogRecipes.has(i)?'#27500A':'var(--color-text-primary)'}">${r.emoji||'🍽️'} ${r.name}</div>
                ${r.time_min?`<div style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px">${r.time_min} min</div>`:''}
              </div>
            </div>
            `).join('')}
          </div>
          ${selectedBlogRecipes.size > 0 ? `
          <button id="import-selected-btn" style="width:100%;padding:14px;border-radius:14px;background:#2D7D3A;color:#fff;font-size:15px;font-weight:700;border:none;cursor:pointer">
            ${selectedBlogRecipes.size} Rezept${selectedBlogRecipes.size!==1?'e':''} importieren →
          </button>` : ''}
          ` : ''}

          ` : ''}

          ` : status === 'loading' ? `
          <!-- Loading -->
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 0;gap:16px">
            <div style="font-size:48px">🔍</div>
            <div class="spinner"></div>
            <div style="font-size:15px;font-weight:600;color:var(--color-text-primary)">Rezept wird analysiert…</div>
            <div style="font-size:13px;color:var(--color-text-secondary);text-align:center;line-height:1.5">
              Claude liest die Seite und<br>extrahiert Zutaten & Schritte
            </div>
            <div style="font-size:11px;color:var(--color-text-tertiary);background:var(--color-background-secondary);padding:6px 12px;border-radius:20px;max-width:260px;text-align:center;word-break:break-all">${url}</div>
          </div>

          ` : status === 'success' && importedRecipe ? `
          <!-- Erfolg – Vorschau -->
          <div style="background:var(--color-background-secondary);border-radius:var(--border-radius-lg);padding:16px;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
              <span style="font-size:40px">${importedRecipe.emoji || '🍽️'}</span>
              <div>
                <div style="font-size:16px;font-weight:700;color:var(--color-text-primary);line-height:1.3">${importedRecipe.name}</div>
                <div style="font-size:11px;color:var(--color-text-secondary);margin-top:3px">
                  ${SOURCE_ICONS[importedRecipe.source_type]||'🔗'} ${importedRecipe.source_type||''}
                  ${importedRecipe.time_min ? ' · '+importedRecipe.time_min+' min' : ''}
                </div>
              </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">
              ${(importedRecipe.tags||[]).map(t=>`<span class="tag tag-gray" style="font-size:10px">${t}</span>`).join('')}
              <span class="tag" style="font-size:10px;background:#FAEEDA;color:#633806;font-weight:600">Noch nicht gekocht</span>
            </div>
            ${importedRecipe.portions ? `
            <div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:4px">
              <span style="background:#EAF3DE;color:#27500A;padding:2px 8px;border-radius:6px;font-weight:500">Für ${importedRecipe.portions} Portionen</span>
            </div>` : ''}
            ${importedRecipe.ingredients?.length ? `
            <div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:4px">${importedRecipe.ingredients.length} Zutaten gefunden</div>` : ''}
            ${importedRecipe.steps?.length ? `
            <div style="font-size:12px;color:var(--color-text-secondary)">${importedRecipe.steps.length} Schritte gefunden</div>` : ''}
          </div>

          <button id="save-btn" style="width:100%;padding:14px;border-radius:14px;background:#2D7D3A;color:#fff;font-size:15px;font-weight:700;border:none;cursor:pointer;margin-bottom:10px">
            📖 Ins Rezeptebuch speichern
          </button>
          <button id="retry-btn" style="width:100%;padding:11px;border-radius:12px;background:transparent;color:var(--color-text-secondary);font-size:13px;font-weight:500;border:0.5px solid var(--color-border-secondary);cursor:pointer">
            Andere URL versuchen
          </button>
          ` : ''}

        </div>
      </div>
    `;

    // Events
    el.querySelector('#back-btn')?.addEventListener('click', () => goBack());

    el.querySelector('#url-input')?.addEventListener('input', e => {
      url = e.target.value.trim();
      const btn = el.querySelector('#analyze-btn');
      if (btn) { btn.disabled = !url; btn.style.background = url ? '#2D7D3A' : '#9a9a94'; }
    });

    el.querySelector('#clear-btn')?.addEventListener('click', () => { url = ''; status = 'idle'; render(); });

    el.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.mode;
        status = 'idle';
        errorMsg = '';
        render();
      });
    });

    el.querySelector('#analyze-btn')?.addEventListener('click', () => {
      url = el.querySelector('#url-input')?.value.trim() || url;
      if (url) analyzeUrl(url);
    });

    el.querySelector('#text-input')?.addEventListener('input', e => {
      textInput = e.target.value;
      const btn = el.querySelector('#analyze-text-btn');
      if (btn) { btn.disabled = !textInput.trim(); btn.style.background = textInput.trim() ? '#2D7D3A' : '#9a9a94'; }
    });

    el.querySelector('#analyze-text-btn')?.addEventListener('click', () => {
      textInput = el.querySelector('#text-input')?.value || textInput;
      if (textInput.trim()) analyzeText(textInput.trim());
    });

    // Blog mode events
    el.querySelector('#blog-input')?.addEventListener('input', e => {
      blogUrl = e.target.value;
      const btn = el.querySelector('#discover-btn');
      if (btn) { btn.disabled = !blogUrl.trim(); btn.style.background = blogUrl.trim() ? '#2D7D3A' : '#9a9a94'; }
    });

    el.querySelector('#discover-btn')?.addEventListener('click', () => {
      blogUrl = el.querySelector('#blog-input')?.value.trim() || blogUrl;
      if (blogUrl) discoverBlogRecipes(blogUrl);
    });

    el.querySelectorAll('[data-blog-recipe]').forEach(card => {
      card.addEventListener('click', () => {
        const i = parseInt(card.dataset.blogRecipe);
        if (selectedBlogRecipes.has(i)) selectedBlogRecipes.delete(i);
        else selectedBlogRecipes.add(i);
        render();
      });
    });

    el.querySelector('#import-selected-btn')?.addEventListener('click', () => {
      importSelectedBlogRecipes();
    });

    el.querySelector('#shortcut-btn')?.addEventListener('click', () => {
      Router.navigate('shortcut-guide', {});
    });

    el.querySelector('#save-btn')?.addEventListener('click', () => {
      if (!importedRecipe) return;
      const recipe = {
        ...importedRecipe,
        tags: [...(importedRecipe.tags || []), 'noch-nicht-gekocht'],
        cookCount: 0,
        savedAt: new Date().toISOString(),
        portions: importedRecipe.portions || 1,
      };
      Store.saveRecipe(recipe);
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#2D7D3A;color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.15)';
      toast.textContent = `📖 "${importedRecipe.name}" gespeichert!`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
      navigate('cookbook');
    });

    el.querySelector('#retry-btn')?.addEventListener('click', () => { status = 'idle'; importedRecipe = null; render(); });
  }

  // Auto-start wenn URL übergeben
  if (importUrl) analyzeUrl(importUrl);
  else render();
};

// ============================================
// SHORTCUT GUIDE SCREEN
// ============================================
Screens['shortcut-guide'] = function(el, params) {
  const BASE_URL = 'https://erikfritsche-0394596.github.io/herbi/';

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;min-height:100%">
      <div class="status-spacer"></div>
      <div class="page-header">
        <div class="page-header-row">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="recipe-hero-btn left" style="position:static" id="back-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,18 9,12 15,6"/></svg>
            </div>
            <h1 class="page-title">Shortcut einrichten</h1>
          </div>
        </div>
      </div>

      <div style="flex:1;overflow-y:auto;padding:0 16px 24px">

        <div style="background:#007AFF;border-radius:var(--border-radius-lg);padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
          <div style="font-size:36px">⚡</div>
          <div>
            <div style="font-size:15px;font-weight:700;color:#fff">Einmalig einrichten</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:2px;line-height:1.4">Danach: TikTok/Safari → Teilen → Herbi → fertig</div>
          </div>
        </div>

        ${[
          { num:1, icon:'📱', title:'Kurzbefehle-App öffnen', desc:'Die App ist auf jedem iPhone vorinstalliert. Falls nicht: App Store → "Kurzbefehle".' },
          { num:2, icon:'➕', title:'Neuen Kurzbefehl erstellen', desc:'Oben rechts auf das <b>+</b> tippen → "Aktion hinzufügen".' },
          { num:3, icon:'🔍', title:'"URL" suchen', desc:'Im Suchfeld "URL" eingeben → <b>"URL"</b> Aktion auswählen.' },
          { num:4, icon:'📋', title:'Diese URL eintragen', desc:`Tippe auf das URL-Feld und füge folgendes ein:<br><code style="background:rgba(0,0,0,0.08);padding:3px 6px;border-radius:4px;font-size:11px;word-break:break-all">${BASE_URL}?import=[Eingabe]</code><br><br>Das <b>[Eingabe]</b> ist eine Variable – tippe erst die URL ein, dann tippe auf das blaue <b>+</b> und wähle <b>"Kurzbefehl-Eingabe"</b>.` },
          { num:5, icon:'🌐', title:'"Im Browser öffnen" hinzufügen', desc:'Zweite Aktion: "URL öffnen" → URL aus vorherigem Schritt auswählen.' },
          { num:6, icon:'✏️', title:'Kurzbefehl benennen', desc:'Oben auf den Namen tippen → <b>"Rezept zu Herbi"</b> eingeben.' },
          { num:7, icon:'🎉', title:'Fertig!', desc:'Ab jetzt: In TikTok/Instagram/Safari auf <b>Teilen</b> → <b>"Rezept zu Herbi"</b> → App öffnet sich automatisch und analysiert das Rezept.' },
        ].map(s => `
          <div style="display:flex;gap:12px;margin-bottom:14px;align-items:flex-start">
            <div style="width:28px;height:28px;border-radius:50%;background:#2D7D3A;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">${s.num}</div>
            <div style="flex:1;background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:11px 12px">
              <div style="font-size:13px;font-weight:600;color:var(--color-text-primary);margin-bottom:4px">${s.icon} ${s.title}</div>
              <div style="font-size:12px;color:var(--color-text-secondary);line-height:1.6">${s.desc}</div>
            </div>
          </div>
        `).join('')}

        <div style="background:#EAF3DE;border-radius:var(--border-radius-md);padding:12px 14px;margin-top:4px">
          <div style="font-size:12px;color:#27500A;line-height:1.6">
            <b>💡 Tipp:</b> Du kannst den Kurzbefehl auch zum Startbildschirm hinzufügen für noch schnelleren Zugriff. Oder den Shortcut aus der Kurzbefehle-Galerie suchen – suche nach "Share to URL".
          </div>
        </div>

      </div>
    </div>
  `;

  el.querySelector('#back-btn')?.addEventListener('click', () => goBack());
};
