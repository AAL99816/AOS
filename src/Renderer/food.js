'use strict';
// ─────────────────────────────────────────────────────────────
// food.js — Food tab (MyFitnessPal-style)
// API: Open Food Facts (free, no key, CORS-enabled)
// Data: S.foodLog  = { 'YYYY-MM-DD': [{ id, name, brand, meal, grams, kcal, protein, carbs, fat, fiber, per100g }] }
//       S.foodTargets = { kcal, protein, carbs, fat }
// ─────────────────────────────────────────────────────────────

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };

let _foodSearchTimer = null;
let _foodDate        = null; // null means "use today()" — set on init
let _foodResults     = [];
let _foodEditId      = null; // id of entry being edited

// ── Init ─────────────────────────────────────────────────────

function _foodEffectiveDate() {
  return _foodDate || today();
}

function initFoodTab() {
  if (!S.foodLog)     S.foodLog     = {};
  if (!S.foodTargets) S.foodTargets = { kcal: 2000, protein: 150, carbs: 200, fat: 65 };
  _foodDate = today();
  const dateEl = eid('foodDate');
  if (dateEl) {
    dateEl.value = _foodDate;
    dateEl.onchange = () => { _foodDate = dateEl.value || today(); renderFoodTab(); };
  }
  renderFoodTab();
}

function renderFoodTab() {
  if (!S.foodLog)     S.foodLog     = {};
  if (!S.foodTargets) S.foodTargets = { kcal: 2000, protein: 150, carbs: 200, fat: 65 };
  renderFoodMacroBar();
  renderFoodMeals();
}

// ── Macro summary bar ─────────────────────────────────────────

function renderFoodMacroBar() {
  const el = eid('foodMacroBar');
  if (!el) return;
  const entries = S.foodLog[_foodEffectiveDate()] || [];
  const totals = _sumMacros(entries);
  const T = S.foodTargets;
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px">
      ${_macroCell('Calories', totals.kcal, T.kcal, 'kcal', 'var(--blush)')}
      ${_macroCell('Protein',  totals.protein, T.protein, 'g', 'var(--gold)')}
      ${_macroCell('Carbs',    totals.carbs,   T.carbs,   'g', 'var(--petal)')}
      ${_macroCell('Fat',      totals.fat,     T.fat,     'g', 'var(--muted-lt)')}
    </div>
    <div style="font-size:0.64rem;color:var(--muted);text-align:right;cursor:pointer;text-decoration:underline" onclick="openFoodTargets()">Edit targets</div>`;
}

function _macroCell(label, val, target, unit, color) {
  const pct = target ? Math.min(100, Math.round((val / target) * 100)) : 0;
  const over = val > target && target > 0;
  return `<div style="text-align:center">
    <div style="font-size:0.62rem;color:var(--muted);margin-bottom:3px">${label}</div>
    <div style="font-size:1rem;color:${over ? 'var(--petal)' : 'var(--cream)'};font-family:'DM Mono',monospace;font-weight:500">${Math.round(val)}</div>
    <div style="font-size:0.58rem;color:var(--muted)">${unit}${target ? ' / ' + target : ''}</div>
    <div style="height:4px;background:var(--mid);border-radius:3px;margin-top:4px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:${over ? 'var(--petal)' : color};border-radius:3px;transition:width 0.3s"></div>
    </div>
  </div>`;
}

function _sumMacros(entries) {
  return (entries || []).reduce((s, e) => ({
    kcal:    s.kcal    + (e.kcal    || 0),
    protein: s.protein + (e.protein || 0),
    carbs:   s.carbs   + (e.carbs   || 0),
    fat:     s.fat     + (e.fat     || 0),
    fiber:   s.fiber   + (e.fiber   || 0)
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
}

// ── Meal sections ─────────────────────────────────────────────

function renderFoodMeals() {
  const el = eid('foodMeals');
  if (!el) return;
  const entries = S.foodLog[_foodEffectiveDate()] || [];
  el.innerHTML = MEAL_TYPES.map(meal => {
    const items = entries.filter(e => e.meal === meal);
    const totals = _sumMacros(items);
    return `
      <div style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:0.72rem;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase">${MEAL_LABELS[meal]}</span>
          <span style="font-size:0.66rem;color:var(--muted-lt);font-family:'DM Mono',monospace">${items.length ? Math.round(totals.kcal) + ' kcal' : ''}</span>
        </div>
        <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;overflow:hidden">
          ${items.length ? items.map(e => _foodEntryRow(e)).join('') : ''}
          <div onclick="openFoodSearch('${meal}')"
            style="display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;color:var(--muted);font-size:0.76rem;transition:background 0.12s;border-top:${items.length ? '1px solid var(--border)' : 'none'}"
            onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
            <span style="font-size:1rem;line-height:1">+</span> Add food
          </div>
        </div>
      </div>`;
  }).join('');
}

function _foodEntryRow(e) {
  return `
    <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:0.8rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(e.name)}</div>
        ${e.brand ? `<div style="font-size:0.64rem;color:var(--muted)">${escapeHtml(e.brand)}</div>` : ''}
        <div style="font-size:0.64rem;color:var(--muted-lt);font-family:'DM Mono',monospace;margin-top:1px">
          ${e.grams}g · P ${Math.round(e.protein)}g · C ${Math.round(e.carbs)}g · F ${Math.round(e.fat)}g
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:0.86rem;color:var(--gold-lt);font-family:'DM Mono',monospace">${Math.round(e.kcal)}</div>
        <div style="font-size:0.6rem;color:var(--muted)">kcal</div>
      </div>
      <button onclick="deleteFoodEntry('${e.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.72rem;padding:0 2px;flex-shrink:0">✕</button>
    </div>`;
}

// ── Food search ───────────────────────────────────────────────

let _currentMeal = 'breakfast';

function openFoodSearch(meal) {
  _currentMeal = meal || 'breakfast';
  _foodResults = [];
  const modal = eid('mFoodSearch');
  if (!modal) return;
  modal.classList.add('open');
  const inp = eid('foodSearchInput');
  if (inp) { inp.value = ''; inp.focus(); }
  eid('foodSearchResults').innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:20px;text-align:center">Search for any food…</div>`;
  eid('foodAddForm').style.display = 'none';
  const lbl = eid('foodMealLabel');
  if (lbl) lbl.textContent = MEAL_LABELS[meal] || meal;
}

function closeFoodSearch() {
  const modal = eid('mFoodSearch');
  if (modal) modal.classList.remove('open');
  _foodResults = [];
}

function onFoodSearchInput() {
  clearTimeout(_foodSearchTimer);
  const q = eid('foodSearchInput')?.value.trim();
  if (!q) { eid('foodSearchResults').innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:20px;text-align:center">Start typing to search…</div>`; return; }
  eid('foodSearchResults').innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:20px;text-align:center">Searching…</div>`;
  _foodSearchTimer = setTimeout(() => _doFoodSearch(q), 400);
}

async function _doFoodSearch(q) {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,brands,nutriments,serving_size`;
    const r = await fetch(url);
    const d = await r.json();
    _foodResults = (d.products || [])
      .filter(p => p.product_name && p.nutriments)
      .map(p => ({
        name:    p.product_name || '',
        brand:   (p.brands || '').split(',')[0].trim(),
        per100g: {
          kcal:    parseFloat(p.nutriments['energy-kcal_100g'] || p.nutriments['energy_100g'] / 4.184 || 0),
          protein: parseFloat(p.nutriments['proteins_100g']    || 0),
          carbs:   parseFloat(p.nutriments['carbohydrates_100g'] || 0),
          fat:     parseFloat(p.nutriments['fat_100g']          || 0),
          fiber:   parseFloat(p.nutriments['fiber_100g']        || 0)
        }
      }))
      .filter(p => p.per100g.kcal > 0);

    if (!_foodResults.length) {
      eid('foodSearchResults').innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:20px;text-align:center">No results — try a different search or add manually</div>`;
      return;
    }
    eid('foodSearchResults').innerHTML = _foodResults.map((r, i) => `
      <div onclick="selectFoodResult(${i})"
        style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s"
        onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.name)}</div>
          ${r.brand ? `<div style="font-size:0.65rem;color:var(--muted)">${escapeHtml(r.brand)}</div>` : ''}
        </div>
        <div style="font-size:0.7rem;color:var(--gold-lt);font-family:'DM Mono',monospace;flex-shrink:0">${Math.round(r.per100g.kcal)} kcal/100g</div>
      </div>`).join('') +
      `<div onclick="selectFoodManual()"
        style="padding:10px 14px;cursor:pointer;color:var(--muted);font-size:0.74rem;border-top:1px solid var(--border);transition:background 0.12s"
        onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
        Add manually instead
      </div>`;
  } catch(e) {
    eid('foodSearchResults').innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:20px;text-align:center">Search failed — check connection or add manually</div>`;
  }
}

function selectFoodResult(i) {
  const r = _foodResults[i];
  if (!r) return;
  eid('foodAddName').value  = r.name;
  eid('foodAddBrand').value = r.brand || '';
  _showFoodAddForm(r.per100g, false);
}

function selectFoodManual() {
  eid('foodAddName').value  = '';
  eid('foodAddBrand').value = '';
  _showFoodAddForm(null, true);
}

function _showFoodAddForm(per100g, manual) {
  const form = eid('foodAddForm');
  if (!form) return;
  form.style.display = '';
  eid('foodSearchResults').style.display = 'none';
  eid('foodSearchInput').style.display   = 'none';

  const macroFields = eid('foodManualMacros');
  if (manual) {
    macroFields.style.display = '';
    eid('foodAddGrams').value = '100';
  } else {
    macroFields.style.display = 'none';
    eid('foodAddGrams').value = '100';
  }

  // Store per100g data on the form element for use when saving
  form._per100g = per100g;
  form._manual  = manual;
  _updateFoodMacroPreview();
}

function _updateFoodMacroPreview() {
  const form = eid('foodAddForm');
  if (!form) return;
  const grams = parseFloat(eid('foodAddGrams')?.value) || 100;
  const p100  = form._per100g;
  const preview = eid('foodMacroPreview');
  if (!preview) return;
  if (form._manual || !p100) { preview.innerHTML = ''; return; }
  const ratio = grams / 100;
  preview.innerHTML = `
    <div style="display:flex;gap:12px;font-size:0.68rem;font-family:'DM Mono',monospace;color:var(--muted-lt);flex-wrap:wrap;margin-top:6px">
      <span>${Math.round(p100.kcal * ratio)} kcal</span>
      <span>P ${(p100.protein * ratio).toFixed(1)}g</span>
      <span>C ${(p100.carbs * ratio).toFixed(1)}g</span>
      <span>F ${(p100.fat * ratio).toFixed(1)}g</span>
    </div>`;
}

function saveFoodEntry() {
  const form    = eid('foodAddForm');
  const name    = eid('foodAddName')?.value.trim();
  const brand   = eid('foodAddBrand')?.value.trim() || '';
  const grams   = parseFloat(eid('foodAddGrams')?.value) || 100;
  const meal    = eid('foodAddMeal')?.value || _currentMeal;
  if (!name) { toast('Enter a food name'); return; }

  let kcal, protein, carbs, fat, fiber, per100g;
  if (form._manual || !form._per100g) {
    kcal    = parseFloat(eid('foodManualKcal')?.value)    || 0;
    protein = parseFloat(eid('foodManualProtein')?.value) || 0;
    carbs   = parseFloat(eid('foodManualCarbs')?.value)   || 0;
    fat     = parseFloat(eid('foodManualFat')?.value)     || 0;
    fiber   = parseFloat(eid('foodManualFiber')?.value)   || 0;
    per100g = { kcal, protein, carbs, fat, fiber };
  } else {
    const r = form._per100g;
    const ratio = grams / 100;
    kcal    = r.kcal    * ratio;
    protein = r.protein * ratio;
    carbs   = r.carbs   * ratio;
    fat     = r.fat     * ratio;
    fiber   = r.fiber   * ratio;
    per100g = r;
  }

  if (!S.foodLog) S.foodLog = {};
  const _date = _foodEffectiveDate();
  if (!S.foodLog[_date]) S.foodLog[_date] = [];

  S.foodLog[_date].push({
    id: Date.now(),
    name, brand, meal, grams,
    kcal, protein, carbs, fat, fiber, per100g
  });

  scheduleSave();
  closeFoodSearch();
  renderFoodTab();
  toast(`${name} added`);
}

function deleteFoodEntry(id) {
  const _date = _foodEffectiveDate();
  if (!S.foodLog?.[_date]) return;
  S.foodLog[_date] = S.foodLog[_date].filter(e => String(e.id) !== String(id));
  scheduleSave();
  renderFoodTab();
}

// ── Food targets modal ────────────────────────────────────────

function openFoodTargets() {
  const T = S.foodTargets || {};
  eid('ftKcal').value    = T.kcal    || 2000;
  eid('ftProtein').value = T.protein || 150;
  eid('ftCarbs').value   = T.carbs   || 200;
  eid('ftFat').value     = T.fat     || 65;
  eid('mFoodTargets').classList.add('open');
}

function saveFoodTargets() {
  if (!S.foodTargets) S.foodTargets = {};
  S.foodTargets.kcal    = parseFloat(eid('ftKcal')?.value)    || 2000;
  S.foodTargets.protein = parseFloat(eid('ftProtein')?.value) || 150;
  S.foodTargets.carbs   = parseFloat(eid('ftCarbs')?.value)   || 200;
  S.foodTargets.fat     = parseFloat(eid('ftFat')?.value)     || 65;
  scheduleSave();
  eid('mFoodTargets').classList.remove('open');
  renderFoodMacroBar();
  toast('Targets saved');
}
