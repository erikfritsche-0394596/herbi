// ============================================
// HERBI – API (api.js)
// Claude API für Wochenplan-Generierung
// Bring! API für Einkaufslisten-Integration
// ============================================

const API = (() => {


  // ============================================
  // CLAUDE API – Wochenplan generieren
  // ============================================

  async function generateWeekPlan(settings, apiKey) {
    const {
      supermarkets, budget, portions, meals,
      cuisines, mealConfig, diets, avoids
    } = settings;

    const supermarktNames = {
      rewe: 'Rewe', edeka: 'Edeka', lidl: 'Lidl',
      netto: 'Netto', denns: "denn's Bio", goasia: 'Go Asia',
    };
    const supermarktLabel = supermarkets.map(s => supermarktNames[s] || s).join(', ');

    const aktive_mahlzeiten = [];
    if (meals.breakfast) aktive_mahlzeiten.push('Frühstück');
    if (meals.lunch)     aktive_mahlzeiten.push('Mittagessen');
    if (meals.dinner)    aktive_mahlzeiten.push('Abendessen');

    const levelLabels = ['Sehr schnell (15 min)', 'Schnell (20 min)', 'Normal (30 min)', 'Aufwendig (60+ min)'];

    const prompt = `Du bist ein Küchenchef und erstellst einen personalisierten Wochenplan.

EINSTELLUNGEN:
- Supermarkt: ${supermarktLabel} (Berlin)
- Budget: ${budget}€ pro Woche
- Personen: ${portions}
- Mahlzeiten: ${aktive_mahlzeiten.join(', ')}
- Lieblingsküchen: ${cuisines.join(', ')}
- Mittagessen: ${mealConfig.lunch.mealprep ? 'Meal Prep (für 2-3 Tage)' : levelLabels[mealConfig.lunch.level]}
- Abendessen: ${levelLabels[mealConfig.dinner.level]}
- Ernährung: ${diets.join(', ')}
- Vermeiden: ${avoids.length > 0 ? avoids.join(', ') : 'nichts'}

Erstelle einen 7-Tage-Wochenplan (Montag bis Sonntag).

WICHTIG:
- Meal Prep Gerichte kommen an Montag frisch, Di+Mi als Reste
- Zweites Meal Prep kommt an Mittwoch frisch, Do+Fr als Reste
- Sa+So sind einfachere oder abwechslungsreiche Mahlzeiten
- Gesamtkosten UNTER ${budget}€ halten
- Zutaten überschneiden sich wo möglich (weniger Einkauf)
- Alle Gerichte müssen beim genannten Supermarkt in Berlin einkaufbar sein

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärung):

{
  "total_cost": 48.50,
  "days": {
    "Mo": {
      "lunch": {
        "name": "Gerichtname",
        "emoji": "🍝",
        "price": 3.80,
        "time_min": 20,
        "tags": ["meal-prep", "vegetarisch"],
        "is_rest": false,
        "rest_of": null,
        "ingredients": [
          {"name": "Zutat", "amount": 200, "unit": "g"}
        ],
        "steps": [
          {"text": "Schritt 1...", "timer_min": 10},
          {"text": "Schritt 2...", "timer_min": null}
        ]
      },
      "dinner": { ... }
    },
    "Di": { ... },
    "Mi": { ... },
    "Do": { ... },
    "Fr": { ... },
    "Sa": { ... },
    "So": { ... }
  }
}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 8000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(`Claude API Error: ${err.error?.message || response.status}`);
      }

      const data = await response.json();
      const text = data.content[0].text.trim();

      // JSON parsen (Markdown-Fences entfernen falls vorhanden)
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(clean);

    } catch (error) {
      console.error('generateWeekPlan error:', error);
      throw error;
    }
  }

  // ============================================
  // CLAUDE API – Alternative Rezepte vorschlagen
  // ============================================

  async function suggestAlternatives(currentMeal, settings, apiKey, count = 5) {
    const prompt = `Schlage ${count} alternative Rezepte für ein "${currentMeal.name}" vor.

Bedingungen:
- Supermarkt: ${settings.supermarkets.join(', ')} in Berlin
- Budget pro Mahlzeit: ca. ${(settings.budget / 14).toFixed(0)}€
- Personen: ${settings.portions}
- Ernährung: ${settings.diets.join(', ')}
- Vermeiden: ${settings.avoids.join(', ') || 'nichts'}
- Typ: Meal Prep Mittagessen

Antworte NUR mit einem JSON-Array:
[
  {
    "id": "alt-1",
    "name": "Rezeptname",
    "emoji": "🥗",
    "price": 3.40,
    "time_min": 20,
    "tags": ["meal-prep", "vegetarisch", "high-protein"]
  }
]`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
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
      const text = data.content[0].text.trim();
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(clean);

    } catch (error) {
      console.error('suggestAlternatives error:', error);
      throw error;
    }
  }

  // ============================================
  // BRING! API – Einkaufsliste senden
  // ============================================

  // Bring! Login (Email + Passwort)
  async function bringLogin(email, password) {
    try {
      const response = await fetch('https://api.getbring.com/rest/v2/bringauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      });

      if (!response.ok) throw new Error('Bring! Login fehlgeschlagen');

      const data = await response.json();
      return {
        token: data.access_token,
        uuid: data.uuid,
      };
    } catch (error) {
      console.error('bringLogin error:', error);
      throw error;
    }
  }

  // Bring! Listen abrufen
  async function getBringLists(uuid, token) {
    try {
      const response = await fetch(`https://api.getbring.com/rest/v2/bringusers/${uuid}/lists`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Bring! Listen konnten nicht geladen werden');

      const data = await response.json();
      return data.lists || [];
    } catch (error) {
      console.error('getBringLists error:', error);
      throw error;
    }
  }

  // Artikel zur Bring! Liste hinzufügen
  async function sendToBring(listId, token, items, options = {}) {
    const { includeAmounts = true, includeCategory = true, skipChecked = true, checkedKeys = [] } = options;

    let sent = 0;
    const errors = [];

    for (const item of items) {
      // Überspringen wenn abgehakt
      if (skipChecked && checkedKeys.includes(item.key)) continue;

      const details = includeAmounts ? item.amount : '';
      const specification = includeCategory ? item.category : '';

      try {
        const body = new URLSearchParams({
          purchase: item.name,
          recently: '',
        });
        if (details) body.append('details', details);
        if (specification) body.append('specification', specification);

        const response = await fetch(
          `https://api.getbring.com/rest/v2/bringlists/${listId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Bearer ${token}`,
            },
            body: body.toString(),
          }
        );

        if (response.ok) {
          sent++;
        } else {
          errors.push(item.name);
        }

        // Kurze Pause zwischen Requests (Rate Limiting)
        await new Promise(r => setTimeout(r, 80));

      } catch (e) {
        errors.push(item.name);
      }
    }

    return { sent, errors };
  }

  // ============================================
  // HELPER – Wochenplan zu Einkaufsliste
  // ============================================

  function planToShoppingList(planData) {
    // Alle Zutaten aus dem Plan sammeln und zusammenführen
    const itemMap = {};

    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const mealTypes = ['breakfast', 'lunch', 'dinner'];

    days.forEach(day => {
      mealTypes.forEach(type => {
        const meal = planData.days?.[day]?.[type];
        if (!meal || meal.is_rest) return;

        meal.ingredients?.forEach(ing => {
          const key = ing.name.toLowerCase().replace(/\s+/g, '-');
          if (itemMap[key]) {
            // Menge addieren (nur wenn gleiche Einheit)
            if (itemMap[key].unit === ing.unit) {
              itemMap[key].amount += ing.amount;
            }
            itemMap[key].usedIn.push(`${day} ${type === 'lunch' ? 'Mittag' : type === 'dinner' ? 'Abend' : 'Früh'}`);
          } else {
            itemMap[key] = {
              key,
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit,
              category: ing.category || 'Sonstiges',
              usedIn: [`${day} ${type === 'lunch' ? 'Mittag' : type === 'dinner' ? 'Abend' : 'Früh'}`],
            };
          }
        });
      });
    });

    return Object.values(itemMap).map(item => ({
      ...item,
      amountStr: formatAmount(item.amount, item.unit),
      forStr: item.usedIn.slice(0, 3).join(', ') + (item.usedIn.length > 3 ? '…' : ''),
    }));
  }

  function formatAmount(amount, unit) {
    if (!unit) return String(amount);
    if (unit === 'g' && amount >= 1000) return `${(amount/1000).toFixed(amount % 1000 === 0 ? 0 : 1)} kg`;
    if (unit === 'ml' && amount >= 1000) return `${(amount/1000).toFixed(1)} l`;
    const rounded = Number.isInteger(amount) ? amount : parseFloat(amount.toFixed(1));
    return `${rounded} ${unit}`;
  }

  return {
    generateWeekPlan,
    suggestAlternatives,
    bringLogin,
    getBringLists,
    sendToBring,
    planToShoppingList,
  };
})();
