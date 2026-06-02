// ============================================
// HERBI – Vorrat Screen (pantry.js)
// ============================================

Screens.pantry = function(el, params) {

  const FRESH_CATEGORIES = ['gemuese', 'protein', 'milch'];

  function getPantryItems() {
    const pantry = Store.getPantry();
    return Object.values(pantry).sort((a, b) => {
      // Frisches zuerst
      if (a.isFresh && !b.isFresh) return -1;
      if (!a.isFresh && b.isFresh) return 1;
      return new Date(b.addedAt) - new Date(a.addedAt);
    });
  }

  function daysSince(isoDate) {
    const ms = Date.now() - new Date(isoDate).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  function freshnessLabel(item) {
    const days = daysSince(item.addedAt);
    if (!item.isFresh) return { label: 'Trocken', color: '#2D7D3A', bg: '#EAF3DE' };
    if (days === 0) return { label: 'Heute', color: '#2D7D3A', bg: '#EAF3DE' };
    if (days === 1) return { label: 'Gestern', color: '#F97B22', bg: '#FAEEDA' };
    if (days <= 3) return { label: `Vor ${days}T`, color: '#F97B22', bg: '#FAEEDA' };
    return { label: 'Aufbrauchen!', color: '#E24B4A', bg: '#FAECE7' };
  }

  function formatAmt(amount, unit) {
    if (!unit) return String(Math.round(amount));
    const v = amount;
    if (unit === 'g' && v >= 1000) return (v/1000).toFixed(v%1000===0?0:1) + ' kg';
    if (unit === 'ml' && v >= 1000) return (v/1000).toFixed(1) + ' l';
    return (Number.isInteger(v) ? v : parseFloat(v.toFixed(1))) + ' ' + unit;
  }

  let loadingRecipes = false;
  let suggestedRecipes = [];
  let generationError = null;

  async function generatePantryRecipes() {
    const items = getPantryItems();
    if (items.length === 0) return;

    loadingRecipes = true;
    generationError = null;
    render();

    try {
      const apiKey  = localStorage.getItem('herbi_api_key');
      const settings = Store.getSettings();

      const ingredientList = items
        .map(i => `${i.name}: ${formatAmt(i.amount, i.unit)}`)
        .join(', ');

      const prompt = `Du bist ein Küchenchef. Der Nutzer hat folgende Zutaten zuhause (Vorrat):
${ingredientList}

Ernährungsweise: ${settings.diets?.join(', ') || 'alles'}
Lieblingsküchen: ${settings.cuisines?.join(', ') || 'alles'}

Erstelle 3 Rezeptvorschläge die hauptsächlich diese Zutaten verwenden.
Für jedes Rezept: zeige welche Vorrats-Zutaten verwendet werden und was minimal noch fehlt (max 1-2 Sachen).

Antworte NUR mit JSON (kein Markdown):
[
  {
    "id": "r1",
    "name": "Rezeptname",
    "emoji": "🍝",
    "time_min": 20,
    "tags": ["vegetarisch", "schnell"],
    "uses_pantry": ["Zutat1", "Zutat2"],
    "extra_needed": ["Zutat3"],
    "extra_cost": 1.50,
    "steps": [
      {"text": "Schritt 1...", "timer_min": null},
      {"text": "Schritt 2...", "timer_min": 10}
    ]
  }
]`;

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
      const text = data.content[0].text.trim().replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
      suggestedRecipes = JSON.parse(text);

    } catch (err) {
      console.error('Pantry recipe error:', err);
      generationError = err.message;
    }

    loadingRecipes = false;
    render();
  }

  function render() {
    const items    = getPantryItems();
    const fresh    = items.filter(i => i.isFresh);
    const dry      = items.filter(i => !i.isFresh);
    const hasItems = items.length > 0;

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;min-height:100%">
        <div class="status-spacer"></div>

        <div class="page-header">
          <div class="page-header-row">
            <h1 class="page-title">Vorrat</h1>
            <div style="display:flex;gap:6px">
              ${hasItems ? `
              <div class="icon-btn" id="gen-btn" title="Rezepte generieren">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
              </div>` : ''}
              <div class="icon-btn" id="add-btn" title="Manuell hinzufügen">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
            </div>
          </div>
          ${hasItems ? `
          <div style="display:flex;gap:8px;margin-bottom:2px">
            <div style="flex:1;background:var(--color-background-secondary);border-radius:var(--radius-md);padding:8px 12px;text-align:center">
              <div style="font-size:18px;font-weight:500;color:var(--color-text-primary)">${items.length}</div>
              <div style="font-size:10px;color:var(--color-text-tertiary)">Artikel</div>
            </div>
            <div style="flex:1;background:${fresh.length > 0 ? '#FAEEDA' : 'var(--color-background-secondary)'};border-radius:var(--radius-md);padding:8px 12px;text-align:center">
              <div style="font-size:18px;font-weight:500;color:${fresh.length > 0 ? '#633806' : 'var(--color-text-primary)'}">${fresh.length}</div>
              <div style="font-size:10px;color:${fresh.length > 0 ? '#633806' : 'var(--color-text-tertiary)'}">Frisch</div>
            </div>
            <div style="flex:1;background:var(--color-background-secondary);border-radius:var(--radius-md);padding:8px 12px;text-align:center">
              <div style="font-size:18px;font-weight:500;color:var(--color-text-primary)">${dry.length}</div>
              <div style="font-size:10px;color:var(--color-text-tertiary)">Trocken</div>
            </div>
          </div>` : ''}
        </div>

        <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:0 16px 16px">

          ${!hasItems ? `
          <div class="empty-state">
            <div class="empty-emoji">📦</div>
            <div class="empty-text">Noch kein Vorrat gespeichert.<br>Beim Einkaufen mehr kaufen als nötig → wird automatisch hier gespeichert.</div>
            <button class="primary-btn" id="empty-add-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Manuell hinzufügen
            </button>
          </div>
          ` : `

          ${fresh.length > 0 ? `
          <div style="margin-bottom:14px">
            <div class="sec-label" style="margin-bottom:8px">Frisch – bald aufbrauchen</div>
            ${fresh.map(item => renderItem(item)).join('')}
          </div>` : ''}

          ${dry.length > 0 ? `
          <div style="margin-bottom:16px">
            <div class="sec-label" style="margin-bottom:8px">Trocken – hält länger</div>
            ${dry.map(item => renderItem(item)).join('')}
          </div>` : ''}

          <!-- KI Rezeptvorschläge -->
          <div style="margin-bottom:16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div class="sec-label" style="margin-bottom:0">KI-Rezeptvorschläge</div>
              ${!loadingRecipes && suggestedRecipes.length === 0 && !generationError ? `
              <button id="load-recipes-btn" style="font-size:11px;font-weight:500;color:#2D7D3A;background:transparent;border:none;cursor:pointer">
                Vorschläge laden ✨
              </button>` : ''}
            </div>

            ${loadingRecipes ? `
            <div style="display:flex;align-items:center;gap:10px;padding:14px;background:var(--color-background-secondary);border-radius:var(--radius-md)">
              <div class="spinner" style="width:20px;height:20px;border-width:2px"></div>
              <span style="font-size:13px;color:var(--color-text-secondary)">KI sucht passende Rezepte…</span>
            </div>
            ` : generationError ? `
            <div style="padding:12px;background:#FAECE7;border-radius:var(--radius-md);font-size:12px;color:#712B13">
              Fehler: ${generationError}
              <button id="retry-btn" style="display:block;margin-top:8px;padding:6px 12px;border-radius:8px;background:#E24B4A;color:#fff;font-size:11px;font-weight:500;border:none;cursor:pointer">Nochmal versuchen</button>
            </div>
            ` : suggestedRecipes.length > 0 ? suggestedRecipes.map((recipe, i) => renderRecipeCard(recipe, i)).join('') : `
            <div style="padding:12px;background:var(--color-background-secondary);border-radius:var(--radius-md);font-size:12px;color:var(--color-text-secondary);text-align:center">
              Tippe oben auf ✨ oder "Vorschläge laden" um KI-Rezepte zu generieren.
            </div>
            `}
          </div>
          `}
        </div>
      </div>
    `;

    // Events
    el.querySelector('#gen-btn')?.addEventListener('click', generatePantryRecipes);
    el.querySelector('#load-recipes-btn')?.addEventListener('click', generatePantryRecipes);
    el.querySelector('#retry-btn')?.addEventListener('click', generatePantryRecipes);
    el.querySelector('#empty-add-btn')?.addEventListener('click', showAddModal);
    el.querySelector('#add-btn')?.addEventListener('click', showAddModal);

    // Delete items
    el.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        Store.removePantryItem(btn.dataset.delete);
        render();
      });
    });

    // Edit amount
    el.querySelectorAll('[data-edit-minus]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const key  = btn.dataset.editMinus;
        const item = Store.getPantry()[key];
        if (!item) return;
        const step = item.unit === 'g' || item.unit === 'ml' ? 50 : 1;
        Store.updatePantryItem(key, { amount: Math.max(0, item.amount - step) });
        render();
      });
    });
    el.querySelectorAll('[data-edit-plus]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const key  = btn.dataset.editPlus;
        const item = Store.getPantry()[key];
        if (!item) return;
        const step = item.unit === 'g' || item.unit === 'ml' ? 50 : 1;
        Store.updatePantryItem(key, { amount: item.amount + step });
        render();
      });
    });

    // Add to plan
    el.querySelectorAll('[data-add-plan]').forEach(btn => {
      btn.addEventListener('click', () => {
        const recipe = suggestedRecipes[parseInt(btn.dataset.addPlan)];
        if (!recipe) return;
        // Zutaten aus Vorrat abziehen
        const pantry = Store.getPantry();
        const toDeduct = recipe.uses_pantry?.map(name => {
          const key = name.toLowerCase().trim().replace(/\s+/g, '-');
          const item = pantry[key];
          return item ? { name, amount: item.amount, unit: item.unit } : null;
        }).filter(Boolean) || [];
        Store.deductPantryForMeal(toDeduct);

        // Toast zeigen
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#2D7D3A;color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;font-weight:600;z-index:999;white-space:nowrap';
        toast.textContent = `✓ ${recipe.name} zum Plan hinzugefügt`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);

        navigate('plan');
      });
    });
  }

  function renderItem(item) {
    const f = freshnessLabel(item);
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--radius-md);margin-bottom:6px">
        <span style="font-size:22px;flex-shrink:0">${item.emoji || '🥡'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;color:var(--color-text-primary)">${item.name}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px">
            <div style="display:flex;align-items:center;gap:4px">
              <button data-edit-minus="${item.key}" style="width:18px;height:18px;border-radius:50%;border:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--color-text-secondary);line-height:1;flex-shrink:0">−</button>
              <span style="font-size:12px;font-weight:500;color:var(--color-text-primary)">${formatAmt(item.amount, item.unit)}</span>
              <button data-edit-plus="${item.key}" style="width:18px;height:18px;border-radius:50%;border:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--color-text-secondary);line-height:1;flex-shrink:0">+</button>
            </div>
            <span style="font-size:10px;font-weight:500;padding:2px 6px;border-radius:5px;background:${f.bg};color:${f.color}">${f.label}</span>
          </div>
        </div>
        <button data-delete="${item.key}" style="width:28px;height:28px;border-radius:50%;border:0.5px solid var(--color-border-secondary);background:var(--color-background-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/></svg>
        </button>
      </div>
    `;
  }

  function renderRecipeCard(recipe, idx) {
    const allFromPantry = !recipe.extra_needed?.length;
    return `
      <div style="background:var(--color-background-secondary);border-radius:var(--radius-lg);padding:12px;margin-bottom:8px;border:0.5px solid var(--color-border-tertiary)">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
          <span style="font-size:28px;flex-shrink:0">${recipe.emoji || '🍽️'}</span>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:500;color:var(--color-text-primary);line-height:1.3">${recipe.name}</div>
            <div style="font-size:11px;color:var(--color-text-secondary);margin-top:3px">
              ${recipe.time_min ? `${recipe.time_min} min · ` : ''}
              ${allFromPantry ? '<span style="color:#2D7D3A;font-weight:500">Alles vorhanden ✓</span>' : `ca. ${(recipe.extra_cost || 0).toFixed(2).replace('.', ',')} € extra`}
            </div>
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
          ${(recipe.tags || []).map(t => {
            const m = {'vegetarisch':'#EAF3DE','vegan':'#EAF3DE','pescetarisch':'#EAF3DE','high-protein':'#FAEEDA','schnell':'var(--color-background-secondary)','asiatisch':'#FBEAF0','italienisch':'#FAECE7'};
            const c = {'vegetarisch':'#27500A','vegan':'#27500A','pescetarisch':'#27500A','high-protein':'#633806','schnell':'var(--color-text-secondary)','asiatisch':'#72243E','italienisch':'#712B13'};
            return `<span style="font-size:10px;font-weight:500;padding:2px 6px;border-radius:5px;background:${m[t]||'var(--color-background-secondary)'};color:${c[t]||'var(--color-text-secondary)'}">${t}</span>`;
          }).join('')}
          <span style="font-size:10px;font-weight:500;padding:2px 6px;border-radius:5px;background:#E6F1FB;color:#185FA5">📦 Aus Vorrat</span>
        </div>

        ${recipe.uses_pantry?.length ? `
        <div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:4px">
          ✓ Verwendet: ${recipe.uses_pantry.join(', ')}
        </div>` : ''}

        ${recipe.extra_needed?.length ? `
        <div style="font-size:11px;color:#F97B22;margin-bottom:8px;display:flex;align-items:center;gap:4px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1,1h4l2.68,13.39a2,2,0,0,0,2,1.61h9.72a2,2,0,0,0,2-1.61L23,6H6"/></svg>
          Fehlt noch: ${recipe.extra_needed.join(', ')}
        </div>` : ''}

        <button data-add-plan="${idx}" style="width:100%;padding:10px;border-radius:10px;background:${allFromPantry ? '#2D7D3A' : '#F97B22'};color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>
          ${allFromPantry ? 'Zum Plan hinzufügen' : 'Zum Plan + Einkaufsliste'}
        </button>
      </div>
    `;
  }

  function showAddModal() {
    // Einfaches Prompt für manuelle Eingabe
    const name = prompt('Was möchtest du hinzufügen? (z.B. "Eier")');
    if (!name) return;
    const amtStr = prompt(`Wie viel ${name}? (z.B. "6 Stück" oder "250 g")`);
    if (!amtStr) return;

    const match = amtStr.match(/^([\d.]+)\s*(.*)$/);
    const amount = match ? parseFloat(match[1]) : 1;
    const unit   = match ? match[2].trim() : 'Stück';
    const key    = name.toLowerCase().trim().replace(/\s+/g, '-');
    const isFresh = /ei|eier|milch|joghurt|fleisch|fisch|lachs|tofu|gemüse|tomate|salat|karotte|paprika|brokkoli|spinat/.test(name.toLowerCase());

    Store.savePantryItem({ key, name, emoji: '🥡', amount, unit, isFresh, addedAt: new Date().toISOString() });
    render();
  }

  render();
};
