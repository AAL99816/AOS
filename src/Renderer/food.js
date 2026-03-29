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

function _dateOffset(days) {
  const d = new Date(today() + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function _foodStreak() {
  const log = S.foodLog || {};
  let streak = 0;
  const d = new Date(today() + 'T00:00:00');
  while ((log[d.toISOString().slice(0, 10)] || []).length > 0) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
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
  renderFoodDiaryHeader();
  renderFoodMacroBar();
  renderFoodMeals();
}

function renderFoodDiaryHeader() {
  const el = eid('foodDiaryHeader');
  if (!el) return;
  const streak    = _foodStreak();
  const yesterday = _dateOffset(-1);
  const date      = _foodEffectiveDate();
  const isToday   = date === today();
  const hasYest   = (S.foodLog?.[yesterday] || []).length > 0;

  const streakHtml = streak >= 2
    ? `<span style="font-size:0.66rem;color:var(--gold);font-family:'DM Mono',monospace">${streak} day streak</span>`
    : '';
  const copyBtn = isToday && hasYest
    ? `<button class="btn btn-g" style="font-size:0.64rem;padding:3px 8px" onclick="copyYesterday()">Copy Yesterday</button>`
    : '';

  if (!streakHtml && !copyBtn) { el.innerHTML = ''; return; }
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">${streakHtml}<div>${copyBtn}</div></div>`;
}

function copyYesterday() {
  const yesterday = _dateOffset(-1);
  const src = S.foodLog?.[yesterday] || [];
  if (!src.length) { toast('No entries yesterday to copy'); return; }
  const date = _foodEffectiveDate();
  if (!S.foodLog) S.foodLog = {};
  const existing = (S.foodLog[date] || []).length;
  if (existing > 0 && !confirm(`Today already has ${existing} entr${existing === 1 ? 'y' : 'ies'}. Add yesterday's ${src.length} items anyway?`)) return;
  if (!S.foodLog[date]) S.foodLog[date] = [];
  src.forEach(e => S.foodLog[date].push({ ...e, id: Date.now() + Math.random() }));
  scheduleSave();
  renderFoodTab();
  toast(`Copied ${src.length} items from yesterday`);
}

// ── Macro summary bar ─────────────────────────────────────────

function renderFoodMacroBar() {
  const el = eid('foodMacroBar');
  if (!el) return;
  const entries = S.foodLog[_foodEffectiveDate()] || [];
  const totals = _sumMacros(entries);
  const T = S.foodTargets;

  const remaining = T.kcal - Math.round(totals.kcal);
  const over      = remaining < 0;
  const remColor  = over ? 'var(--petal)' : 'var(--gold-lt)';
  const consumed  = Math.round(totals.kcal);
  const pct       = T.kcal ? Math.min(100, Math.round((consumed / T.kcal) * 100)) : 0;
  const itemCount = entries.length;

  el.innerHTML = `
    <!-- Calorie budget banner -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div>
        <div style="font-size:1.6rem;font-family:'DM Mono',monospace;color:${remColor};font-weight:500;line-height:1">${Math.abs(remaining)}</div>
        <div style="font-size:0.62rem;color:var(--muted);margin-top:2px">${over ? 'kcal over goal' : 'kcal remaining'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:0.68rem;color:var(--muted);font-family:'DM Mono',monospace">${consumed} <span style="color:var(--muted)">/ ${T.kcal} eaten</span></div>
        <div style="font-size:0.58rem;color:var(--muted);margin-top:2px">${itemCount} item${itemCount!==1?'s':''} · <span style="cursor:pointer;text-decoration:underline" onclick="openFoodTargets()">Edit targets</span></div>
      </div>
    </div>
    <!-- Calorie progress bar -->
    <div style="height:5px;background:var(--mid);border-radius:3px;overflow:hidden;margin-bottom:14px">
      <div style="height:100%;width:${pct}%;background:${over?'var(--petal)':'var(--blush)'};border-radius:3px;transition:width 0.3s"></div>
    </div>
    <!-- Macro grid -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      ${_macroCell('Protein', totals.protein, T.protein, 'g', 'var(--gold)')}
      ${_macroCell('Carbs',   totals.carbs,   T.carbs,   'g', 'var(--petal)')}
      ${_macroCell('Fat',     totals.fat,     T.fat,     'g', 'var(--muted-lt)')}
    </div>
    ${totals.fiber > 0 ? `
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px">
      <span style="font-size:0.62rem;color:var(--muted);min-width:28px">Fiber</span>
      <div style="flex:1;height:3px;background:var(--mid);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${T.fiber ? Math.min(100,Math.round((totals.fiber/T.fiber)*100)) : 0}%;background:var(--muted-lt);border-radius:2px"></div>
      </div>
      <span style="font-size:0.62rem;color:var(--muted-lt);font-family:'DM Mono',monospace">${Math.round(totals.fiber)}g <span style="color:var(--muted)">/ ${T.fiber||25}g</span></span>
    </div>` : ''}
  `;
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
  const T = S.foodTargets || {};
  el.innerHTML = MEAL_TYPES.map(meal => {
    const items  = entries.filter(e => e.meal === meal);
    const totals = _sumMacros(items);
    const mealPct = T.kcal ? Math.min(100, Math.round((totals.kcal / T.kcal) * 100)) : 0;
    return `
      <div style="margin-bottom:16px">
        <div style="margin-bottom:6px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${items.length ? '4px' : '0'}">
            <span style="font-size:0.72rem;color:var(--muted);letter-spacing:0.07em;text-transform:uppercase">${MEAL_LABELS[meal]}</span>
            ${items.length ? `<span style="font-size:0.66rem;color:var(--muted-lt);font-family:'DM Mono',monospace">${Math.round(totals.kcal)} kcal</span>` : ''}
          </div>
          ${items.length ? `<div style="height:2px;background:var(--mid);border-radius:2px;overflow:hidden"><div style="height:100%;width:${mealPct}%;background:var(--blush);opacity:0.55;border-radius:2px;transition:width 0.3s"></div></div>` : ''}
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
  const macroLine = e.grams
    ? `${e.grams}g · P ${Math.round(e.protein)}g · C ${Math.round(e.carbs)}g · F ${Math.round(e.fat)}g`
    : `P ${Math.round(e.protein)}g · C ${Math.round(e.carbs)}g · F ${Math.round(e.fat)}g`;
  return `
    <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:0.8rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(e.name)}</div>
        ${e.brand ? `<div style="font-size:0.64rem;color:var(--muted)">${escapeHtml(e.brand)}</div>` : ''}
        <div style="font-size:0.64rem;color:var(--muted-lt);font-family:'DM Mono',monospace;margin-top:1px">${macroLine}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:0.86rem;color:var(--gold-lt);font-family:'DM Mono',monospace">${Math.round(e.kcal)}</div>
        <div style="font-size:0.6rem;color:var(--muted)">kcal</div>
      </div>
      <button onclick="editFoodEntry('${e.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.66rem;padding:0 2px;flex-shrink:0" title="Edit">✎</button>
      <button onclick="deleteFoodEntry('${e.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.72rem;padding:0 2px;flex-shrink:0">✕</button>
    </div>`;
}

// ── Food search ───────────────────────────────────────────────

let _currentMeal = 'breakfast';
let _foodMode    = 'search'; // 'search' | 'quick'

function openFoodSearch(meal) {
  _currentMeal = meal || 'breakfast';
  _foodResults = [];
  _foodMode    = 'search';
  const modal = eid('mFoodSearch');
  if (!modal) return;
  modal.classList.add('open');
  _applyFoodMode('search');
  // Pre-select the correct meal in Quick Add
  const qaMeal = eid('qaMeal');
  if (qaMeal) qaMeal.value = _currentMeal;
  const lbl = eid('foodMealLabel');
  if (lbl) lbl.textContent = MEAL_LABELS[meal] || meal;
  setTimeout(() => eid('foodSearchInput')?.focus(), 80);
}

function closeFoodSearch() {
  const modal = eid('mFoodSearch');
  if (modal) modal.classList.remove('open');
  _foodResults = [];
  _foodEditId  = null;
}

function setFoodMode(mode) {
  _foodMode = mode;
  _applyFoodMode(mode);
}

function _applyFoodMode(mode) {
  const searchInp     = eid('foodSearchInput');
  const resultsPane   = eid('foodSearchResults');
  const quickForm     = eid('foodQuickAddForm');
  const addForm       = eid('foodAddForm');
  const modeBtnSearch = eid('foodModeSearch');
  const modeBtnQuick  = eid('foodModeQuick');

  if (mode === 'quick') {
    if (searchInp)     searchInp.style.display   = 'none';
    if (resultsPane)   resultsPane.style.display  = 'none';
    if (quickForm)     quickForm.style.display    = '';
    if (addForm)       addForm.style.display      = 'none';
    if (modeBtnSearch) modeBtnSearch.classList.remove('active');
    if (modeBtnQuick)  modeBtnQuick.classList.add('active');
    // Clear + focus name field
    const qaName = eid('qaName');
    if (qaName) { qaName.value = ''; setTimeout(() => qaName.focus(), 80); }
    ['qaKcal','qaProtein','qaCarbs','qaFat','qaFiber'].forEach(id => { const el = eid(id); if (el) el.value = ''; });
    const qaMeal = eid('qaMeal');
    if (qaMeal) qaMeal.value = _currentMeal;
    const hint = eid('qaCalcHint');
    if (hint) hint.textContent = '';
  } else {
    if (searchInp)     searchInp.style.display   = '';
    if (resultsPane)   resultsPane.style.display  = '';
    if (quickForm)     quickForm.style.display    = 'none';
    if (addForm)       addForm.style.display      = 'none';
    if (modeBtnSearch) modeBtnSearch.classList.add('active');
    if (modeBtnQuick)  modeBtnQuick.classList.remove('active');
    if (searchInp)     searchInp.value = '';
    _showRecentFoods();
  }
}

function _backToSearch() {
  const addForm = eid('foodAddForm');
  if (addForm) addForm.style.display = 'none';
  const searchInp   = eid('foodSearchInput');
  const resultsPane = eid('foodSearchResults');
  if (searchInp)   searchInp.style.display   = '';
  if (resultsPane) resultsPane.style.display  = '';
  if (searchInp)   { searchInp.value = ''; searchInp.focus(); }
  _showRecentFoods();
}

function _getRecentFoods(limit = 10) {
  // Collect all entries across all days, deduplicate by name, most recent first
  const seen = new Set();
  const recents = [];
  const allDays = Object.keys(S.foodLog || {}).sort().reverse();
  for (const d of allDays) {
    for (const e of [...(S.foodLog[d] || [])].reverse()) {
      const key = e.name.toLowerCase();
      if (!seen.has(key) && e.name) {
        seen.add(key);
        recents.push(e);
        if (recents.length >= limit) return recents;
      }
    }
  }
  return recents;
}

function _showRecentFoods() {
  const el = eid('foodSearchResults');
  if (!el) return;
  const recents = _getRecentFoods(10);
  const customFoods = (S.customFoods || []).slice(0, 5);
  if (!recents.length && !customFoods.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:20px;text-align:center">Search the food database or use Quick Add</div>`;
    return;
  }

  // Show custom foods first if any
  const customHtml = customFoods.length ? `
    <div style="padding:8px 14px 4px;font-size:0.6rem;color:var(--gold-lt);letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Mono',monospace">My Foods</div>
    ${customFoods.map((cf, i) => `
      <div onclick="selectCustomFood(${i})"
        style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s"
        onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(cf.name)}</div>
          <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace">P${cf.protein||0}g · C${cf.carbs||0}g · F${cf.fat||0}g</div>
        </div>
        <div style="font-size:0.68rem;color:var(--gold-lt);font-family:'DM Mono',monospace;flex-shrink:0">${Math.round(cf.kcal||0)} kcal</div>
      </div>`).join('')}` : '';

  el.innerHTML = customHtml + (recents.length ? `
    <div style="padding:8px 14px 4px;font-size:0.6rem;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Mono',monospace">Recent</div>
    ${recents.map((r, i) => `
      <div onclick="selectRecentFood(${i})"
        style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s"
        onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.name)}</div>
          ${r.brand ? `<div style="font-size:0.62rem;color:var(--muted)">${escapeHtml(r.brand)}</div>` : ''}
        </div>
        <div style="font-size:0.68rem;color:var(--gold-lt);font-family:'DM Mono',monospace;flex-shrink:0">${Math.round(r.kcal)} kcal</div>
      </div>`).join('')}` : '');
  // store for later reference
  el._recentFoods = recents;
  el._customFoods = customFoods;
}

function selectCustomFood(i) {
  const el = eid('foodSearchResults');
  const customs = el?._customFoods || (S.customFoods || []).slice(0, 5);
  const cf = customs[i];
  if (!cf) return;
  if (!S.foodLog) S.foodLog = {};
  const _date = _foodEffectiveDate();
  if (!S.foodLog[_date]) S.foodLog[_date] = [];
  S.foodLog[_date].push({
    id: Date.now(),
    name: cf.name, brand: '', meal: _currentMeal, grams: 0,
    kcal: cf.kcal, protein: cf.protein, carbs: cf.carbs, fat: cf.fat, fiber: cf.fiber,
    per100g: null
  });
  scheduleSave();
  closeFoodSearch();
  renderFoodTab();
  toast(`${cf.name} added`);
}

function selectRecentFood(i) {
  const el = eid('foodSearchResults');
  const recents = el?._recentFoods || _getRecentFoods(10);
  const r = recents[i];
  if (!r) return;
  // Re-add with same macros, no gram scaling needed (stored as consumed values)
  if (!S.foodLog) S.foodLog = {};
  const _date = _foodEffectiveDate();
  if (!S.foodLog[_date]) S.foodLog[_date] = [];
  S.foodLog[_date].push({
    id: Date.now(),
    name: r.name, brand: r.brand || '', meal: _currentMeal,
    grams: r.grams, kcal: r.kcal, protein: r.protein,
    carbs: r.carbs, fat: r.fat, fiber: r.fiber, per100g: r.per100g
  });
  scheduleSave();
  closeFoodSearch();
  renderFoodTab();
  toast(`${r.name} added`);
}

function onFoodSearchInput() {
  clearTimeout(_foodSearchTimer);
  const q = eid('foodSearchInput')?.value.trim();
  if (!q) { _showRecentFoods(); return; }
  // Show My Foods matches instantly (no network needed)
  const myMatches = (S.customFoods || []).filter(cf => cf.name.toLowerCase().includes(q.toLowerCase()));
  const resultsEl = eid('foodSearchResults');
  if (resultsEl) {
    resultsEl.innerHTML = _myFoodsMatchHtml(myMatches) +
      `<div style="padding:${myMatches.length ? '10px' : '20px'} 14px;font-size:0.72rem;color:var(--muted);text-align:center;${myMatches.length ? 'border-top:1px solid var(--border)' : ''}">Searching database\u2026</div>`;
  }
  _foodSearchTimer = setTimeout(() => _doFoodSearch(q), 400);
}

function _myFoodsMatchHtml(matches) {
  if (!matches.length) return '';
  return `
    <div style="padding:8px 14px 4px;font-size:0.6rem;color:var(--gold-lt);letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Mono',monospace">My Foods</div>
    ${matches.map(cf => `
      <div onclick="selectSearchCustomFood('${cf.id}')"
        style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s"
        onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(cf.name)}</div>
          <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace">P${Math.round(cf.protein||0)}g \u00b7 C${Math.round(cf.carbs||0)}g \u00b7 F${Math.round(cf.fat||0)}g</div>
        </div>
        <div style="font-size:0.68rem;color:var(--gold-lt);font-family:'DM Mono',monospace;flex-shrink:0">${Math.round(cf.kcal||0)} kcal</div>
      </div>`).join('')}`;
}

async function _doFoodSearch(q) {
  const resultsEl = eid('foodSearchResults');
  if (!resultsEl) return;

  const myMatches = (S.customFoods || []).filter(cf => cf.name.toLowerCase().includes(q.toLowerCase()));

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);

    // Parallel: GCC-region first + global fallback
    const [gcRes, worldRes] = await Promise.allSettled([
      _fetchOFT(q, 'en:kuwait,en:saudi-arabia,en:united-arab-emirates', 6, ctrl.signal),
      _fetchOFT(q, null, 14, ctrl.signal)
    ]);
    clearTimeout(timeout);

    const gc    = gcRes.status    === 'fulfilled' ? gcRes.value    : [];
    const world = worldRes.status === 'fulfilled' ? worldRes.value : [];

    // Merge: GCC-tagged first, then global deduped by name
    const gcNames = new Set(gc.map(r => r.name.toLowerCase()));
    _foodResults = [
      ...gc.map(r => ({ ...r, _gcc: true })),
      ...world.filter(r => !gcNames.has(r.name.toLowerCase()))
    ].slice(0, 16);

    if (!_foodResults.length && !myMatches.length) {
      resultsEl.innerHTML = `
        <div style="padding:20px;text-align:center">
          <div style="font-size:0.78rem;color:var(--muted);margin-bottom:8px">No results for "${escapeHtml(q)}"</div>
          <div style="font-size:0.64rem;color:var(--muted);margin-bottom:12px">For Kuwait/local foods, save them in My Foods for instant access next time</div>
          <button class="btn btn-p" style="font-size:0.72rem" onclick="setFoodMode('quick')">Add manually \u2192</button>
        </div>`;
      return;
    }

    const dbHtml = _foodResults.length ? `
      <div style="padding:8px 14px 4px;font-size:0.6rem;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;font-family:'DM Mono',monospace">
        Database${gc.length ? ` \u00b7 <span style="color:var(--gold-lt)">${gc.length} GCC match${gc.length > 1 ? 'es' : ''}</span>` : ''}
      </div>
      ${_foodResults.map((r, i) => `
        <div onclick="selectFoodResult(${i})"
          style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s"
          onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
          <div style="flex:1;min-width:0">
            <div style="font-size:0.82rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.name)}</div>
            <div style="font-size:0.62rem;color:var(--muted)">
              ${r.brand ? escapeHtml(r.brand) : ''}${r._gcc ? `${r.brand ? ' \u00b7 ' : ''}<span style="color:var(--gold);font-size:0.58rem">GCC</span>` : ''}
            </div>
          </div>
          <div style="font-size:0.7rem;color:var(--gold-lt);font-family:'DM Mono',monospace;flex-shrink:0">${Math.round(r.per100g.kcal)} kcal/100g</div>
        </div>`).join('')}` : '';

    resultsEl.innerHTML = _myFoodsMatchHtml(myMatches) + dbHtml;

  } catch(e) {
    const isTimeout = e.name === 'AbortError';
    resultsEl.innerHTML = _myFoodsMatchHtml(myMatches) + `
      <div style="padding:16px;text-align:center">
        <div style="font-size:0.72rem;color:var(--muted);margin-bottom:10px">${isTimeout ? 'Search timed out' : 'Database unavailable'}</div>
        <button class="btn btn-p" style="font-size:0.72rem" onclick="setFoodMode('quick')">Add manually \u2192</button>
      </div>`;
  }
}

async function _fetchOFT(q, countries, size, signal) {
  let url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(q)}&page_size=${size}&fields=product_name,brands,nutriments`;
  if (countries) url += `&countries_tags=${encodeURIComponent(countries)}`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return (d.products || [])
    .filter(p => p.product_name && p.nutriments)
    .map(p => {
      const n = p.nutriments;
      const kcal = parseFloat(n['energy-kcal_100g'] ?? n['energy-kcal_serving'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0));
      return {
        name:    p.product_name.trim(),
        brand:   ((p.brands || '').split(',')[0]).trim(),
        per100g: {
          kcal:    kcal    || 0,
          protein: parseFloat(n['proteins_100g']        || 0),
          carbs:   parseFloat(n['carbohydrates_100g']   || 0),
          fat:     parseFloat(n['fat_100g']             || 0),
          fiber:   parseFloat(n['fiber_100g']           || 0)
        }
      };
    })
    .filter(p => p.per100g.kcal > 0 && p.name);
}

function selectFoodResult(i) {
  const r = _foodResults[i];
  if (!r) return;
  eid('foodAddName').value  = r.name;
  eid('foodAddBrand').value = r.brand || '';
  _showFoodAddForm(r.per100g, false);
}

function selectSearchCustomFood(id) {
  const cf = (S.customFoods || []).find(c => String(c.id) === String(id));
  if (!cf) return;
  if (!S.foodLog) S.foodLog = {};
  const _date = _foodEffectiveDate();
  if (!S.foodLog[_date]) S.foodLog[_date] = [];
  S.foodLog[_date].push({
    id: Date.now(),
    name: cf.name, brand: '', meal: _currentMeal, grams: 0,
    kcal: cf.kcal, protein: cf.protein, carbs: cf.carbs, fat: cf.fat, fiber: cf.fiber || 0,
    per100g: null
  });
  scheduleSave();
  closeFoodSearch();
  renderFoodTab();
  toast(`${cf.name} added`);
}

function selectFoodManual() {
  eid('foodAddName').value  = '';
  eid('foodAddBrand').value = '';
  _showFoodAddForm(null, true);
}

// ── Quick Add ─────────────────────────────────────────────────

function _qaEstimateMacros() {
  // If only kcal is entered and protein/carbs/fat are all 0, show a hint
  const kcal    = parseFloat(eid('qaKcal')?.value) || 0;
  const protein = parseFloat(eid('qaProtein')?.value) || 0;
  const carbs   = parseFloat(eid('qaCarbs')?.value) || 0;
  const fat     = parseFloat(eid('qaFat')?.value) || 0;
  const hint    = eid('qaCalcHint');
  if (!hint) return;
  if (kcal > 0 && protein === 0 && carbs === 0 && fat === 0) {
    hint.textContent = 'Tip: enter protein/carbs/fat for full macro tracking, or leave blank for kcal-only.';
  } else {
    const fromMacros = protein * 4 + carbs * 4 + fat * 9;
    if (fromMacros > 0 && Math.abs(fromMacros - kcal) > 20) {
      hint.textContent = `Macro total: ~${Math.round(fromMacros)} kcal (differs from entered ${Math.round(kcal)})`;
    } else {
      hint.textContent = '';
    }
  }
}

function saveQuickAdd() {
  const name    = eid('qaName')?.value.trim();
  const kcal    = parseFloat(eid('qaKcal')?.value)    || 0;
  const protein = parseFloat(eid('qaProtein')?.value) || 0;
  const carbs   = parseFloat(eid('qaCarbs')?.value)   || 0;
  const fat     = parseFloat(eid('qaFat')?.value)     || 0;
  const fiber   = parseFloat(eid('qaFiber')?.value)   || 0;
  const meal    = eid('qaMeal')?.value || _currentMeal;

  if (!name)          { toast('Enter a food name'); return; }
  if (!kcal && !protein && !carbs && !fat) { toast('Enter at least calories or macros'); return; }

  if (!S.foodLog) S.foodLog = {};
  const _date = _foodEffectiveDate();
  if (!S.foodLog[_date]) S.foodLog[_date] = [];

  // F10: Optionally save to custom foods library
  const saveCustom = eid('qaSaveCustom')?.checked;
  const isEdit = _foodEditId !== null;
  if (saveCustom && !isEdit) {
    if (!Array.isArray(S.customFoods)) S.customFoods = [];
    const exists = S.customFoods.some(cf => cf.name.toLowerCase() === name.toLowerCase());
    if (!exists) S.customFoods.push({ id: Date.now(), name, kcal, protein, carbs, fat, fiber });
  }

  if (_foodEditId !== null) {
    // Update existing entry
    const idx = S.foodLog[_date].findIndex(e => String(e.id) === String(_foodEditId));
    if (idx >= 0) {
      const existing = S.foodLog[_date][idx];
      S.foodLog[_date][idx] = { ...existing, name, meal, kcal, protein, carbs, fat, fiber };
    }
    _foodEditId = null;
  } else {
    S.foodLog[_date].push({
      id: Date.now(),
      name, brand: '', meal, grams: 0,
      kcal, protein, carbs, fat, fiber,
      per100g: null
    });
  }

  scheduleSave();
  closeFoodSearch();
  renderFoodTab();
  toast(`${name} added${saveCustom && !isEdit ? ' · saved to My Foods' : ''}`);
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

function editFoodEntry(id) {
  const _date = _foodEffectiveDate();
  const entry = (S.foodLog?.[_date] || []).find(e => String(e.id) === String(id));
  if (!entry) return;
  _currentMeal = entry.meal || 'breakfast';
  _foodEditId  = id;
  const modal = eid('mFoodSearch');
  if (!modal) return;
  modal.classList.add('open');
  _applyFoodMode('quick');
  const lbl = eid('foodMealLabel');
  if (lbl) lbl.textContent = MEAL_LABELS[entry.meal] || entry.meal;
  // Pre-fill Quick Add fields
  setTimeout(() => {
    const qaName = eid('qaName'); if (qaName) qaName.value = entry.name || '';
    const qaKcal = eid('qaKcal'); if (qaKcal) qaKcal.value = entry.kcal || '';
    const qaProtein = eid('qaProtein'); if (qaProtein) qaProtein.value = entry.protein || '';
    const qaCarbs = eid('qaCarbs'); if (qaCarbs) qaCarbs.value = entry.carbs || '';
    const qaFat = eid('qaFat'); if (qaFat) qaFat.value = entry.fat || '';
    const qaFiber = eid('qaFiber'); if (qaFiber) qaFiber.value = entry.fiber || '';
    const qaMeal = eid('qaMeal'); if (qaMeal) qaMeal.value = entry.meal || _currentMeal;
  }, 80);
}

function deleteFoodEntry(id) {
  const _date = _foodEffectiveDate();
  if (!S.foodLog?.[_date]) return;
  const entry = (S.foodLog[_date] || []).find(e => String(e.id) === String(id));
  if (!entry) return;
  toastUndo(`"${entry.name}" removed`, () => {
    if (!S.foodLog[_date]) S.foodLog[_date] = [];
    S.foodLog[_date].push(entry);
    scheduleSave();
    renderFoodTab();
  });
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
  const ftFiber = eid('ftFiber');
  if (ftFiber) ftFiber.value = T.fiber || 25;
  eid('mFoodTargets').classList.add('open');
}

function saveFoodTargets() {
  if (!S.foodTargets) S.foodTargets = {};
  S.foodTargets.kcal    = parseFloat(eid('ftKcal')?.value)    || 2000;
  S.foodTargets.protein = parseFloat(eid('ftProtein')?.value) || 150;
  S.foodTargets.carbs   = parseFloat(eid('ftCarbs')?.value)   || 200;
  S.foodTargets.fat     = parseFloat(eid('ftFat')?.value)     || 65;
  S.foodTargets.fiber   = parseFloat(eid('ftFiber')?.value)   || 25;
  scheduleSave();
  eid('mFoodTargets').classList.remove('open');
  renderFoodMacroBar();
  toast('Targets saved');
}

// ── Food sub-tab switching ────────────────────────────────────

let _foodSubTab = 'diary';

function setFoodTab(tab) {
  _foodSubTab = tab;
  ['diary','history','meals','myfoods'].forEach(t => {
    const btn  = eid(`ftab${t.charAt(0).toUpperCase()+t.slice(1)}`);
    const pane = eid(`foodPane${t.charAt(0).toUpperCase()+t.slice(1)}`);
    const active = t === tab;
    if (btn)  btn.classList.toggle('active', active);
    if (pane) pane.style.display = active ? '' : 'none';
  });
  if (tab === 'history') renderFoodHistory();
  if (tab === 'meals')   renderMealPlansList();
  if (tab === 'diary')   renderFoodTab();
  if (tab === 'myfoods') renderMyFoodsTab();
}

// ── Food History (diary log of past days) ────────────────────

function renderFoodHistory() {
  const el = eid('foodHistoryList');
  if (!el) return;
  const log = S.foodLog || {};
  // All days that have at least one entry, newest first
  const days = Object.keys(log)
    .filter(d => log[d] && log[d].length > 0)
    .sort()
    .reverse()
    .slice(0, 30);

  if (!days.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:24px;text-align:center">No food logged yet — start in the Diary tab</div>`;
    return;
  }

  el.innerHTML = days.map(d => {
    const entries = log[d];
    const totals  = _sumMacros(entries);
    const T       = S.foodTargets || {};
    const pct     = T.kcal ? Math.min(100, Math.round((totals.kcal / T.kcal) * 100)) : 0;
    const over     = T.kcal && totals.kcal > T.kcal;
    const dateLabel = new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
    const isToday  = d === today();

    return `
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:10px;cursor:pointer"
           onclick="setFoodDateAndDiary('${d}')"
           onmouseenter="this.style.borderColor='var(--blush)'" onmouseleave="this.style.borderColor='var(--border)'">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:0.82rem;color:var(--cream)">${dateLabel}${isToday ? ' <span style="font-size:0.6rem;color:var(--blush);margin-left:4px">Today</span>' : ''}</span>
          <span style="font-size:0.86rem;color:${over?'var(--petal)':'var(--gold-lt)'};font-family:'DM Mono',monospace">${Math.round(totals.kcal)} kcal</span>
        </div>
        <div style="height:4px;background:var(--mid);border-radius:3px;overflow:hidden;margin-bottom:8px">
          <div style="height:100%;width:${pct}%;background:${over?'var(--petal)':'var(--blush)'};border-radius:3px"></div>
        </div>
        <div style="display:flex;gap:14px;font-size:0.66rem;font-family:'DM Mono',monospace;color:var(--muted)">
          <span>P <span style="color:var(--gold)">${Math.round(totals.protein)}g</span></span>
          <span>C <span style="color:var(--petal)">${Math.round(totals.carbs)}g</span></span>
          <span>F <span style="color:var(--muted-lt)">${Math.round(totals.fat)}g</span></span>
          <span style="margin-left:auto">${entries.length} item${entries.length!==1?'s':''}</span>
        </div>
      </div>`;
  }).join('');
}

function setFoodDateAndDiary(d) {
  _foodDate = d;
  const dateEl = eid('foodDate');
  if (dateEl) dateEl.value = d;
  setFoodTab('diary');
}

// ── Meal Plans — workout-card style ──────────────────────────

const _expandedPlans = new Set();

function toggleMealPlan(id) {
  if (_expandedPlans.has(id)) _expandedPlans.delete(id);
  else _expandedPlans.add(id);
  renderMealPlansList();
}

function renameMealPlan(id, val) {
  const plan = (S.mealPlans || []).find(p => p.id === id);
  if (plan) { plan.name = val.trim() || plan.name; scheduleSave(); }
}

function renderMealPlansList() {
  const el = eid('mealPlansList');
  if (!el) return;
  const plans = S.mealPlans || [];
  if (!plans.length) {
    el.innerHTML = `
      <div style="text-align:center;padding:48px 24px">
        <div style="font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--border-lt);margin-bottom:10px">◆</div>
        <div style="font-size:0.66rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace;margin-bottom:8px">No meal plans yet</div>
        <div style="font-size:0.72rem;color:var(--muted-lt);max-width:220px;margin:0 auto;line-height:1.6">Log a full day of food, then click "Save Today as Plan"</div>
      </div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'progs-grid';

  plans.forEach((plan, i) => {
    const totals   = _sumMacros(plan.foods || []);
    const expanded = _expandedPlans.has(plan.id);
    const foodCount = (plan.foods || []).length;

    // Group foods by meal for expanded view
    const byMeal = {};
    (plan.foods || []).forEach(f => {
      const m = f.meal || 'snacks';
      if (!byMeal[m]) byMeal[m] = [];
      byMeal[m].push(f);
    });

    const expandedBody = expanded ? `
      <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
        ${MEAL_TYPES.filter(m => byMeal[m]?.length).map(m => `
          <div style="margin-bottom:10px">
            <div style="font-size:0.58rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:5px">
              ${MEAL_LABELS[m]}
              <span style="color:var(--gold-lt);margin-left:4px">${Math.round(_sumMacros(byMeal[m]).kcal)} kcal</span>
            </div>
            ${byMeal[m].map(f => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:0.74rem">
                <span style="color:var(--mist);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(f.name)}</span>
                <span style="color:var(--muted);font-family:'DM Mono',monospace;font-size:0.64rem;flex-shrink:0;margin-left:8px">${Math.round(f.kcal)} kcal</span>
              </div>`).join('')}
          </div>`).join('')}
        <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">
          <button class="btn btn-d" style="font-size:0.66rem;padding:4px 9px" onclick="deleteMealPlan(${i})">Remove</button>
          <button class="btn btn-p" style="font-size:0.68rem;padding:5px 12px" onclick="applyMealPlan(${i})">Apply to Today</button>
        </div>
      </div>` : '';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <!-- Header — always visible, click to expand -->
      <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="toggleMealPlan(${plan.id})">
        <input
          class="editable wk-title-inp"
          value="${escapeAttr(plan.name || '')}"
          onchange="renameMealPlan(${plan.id}, this.value)"
          onclick="event.stopPropagation()"
          title="Rename plan"
          style="flex:1;background:none;border:none;color:var(--mist);font-size:0.88rem"
        >
        <span style="font-size:0.55rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${foodCount} item${foodCount!==1?'s':''}</span>
        <span style="font-size:0.75rem;color:var(--blush);flex-shrink:0">${expanded ? '▾' : '▸'}</span>
      </div>
      <!-- Macro summary — always visible -->
      <div style="display:flex;gap:12px;margin-top:8px;font-size:0.66rem;font-family:'DM Mono',monospace">
        <span style="color:var(--gold-lt)">${Math.round(totals.kcal)} kcal</span>
        <span style="color:var(--gold)">P ${Math.round(totals.protein)}g</span>
        <span style="color:var(--petal)">C ${Math.round(totals.carbs)}g</span>
        <span style="color:var(--muted-lt)">F ${Math.round(totals.fat)}g</span>
      </div>
      ${expandedBody}`;

    grid.appendChild(card);
  });

  el.innerHTML = '';
  el.appendChild(grid);
}

function openSaveMealPlan() {
  const entries = S.foodLog?.[_foodEffectiveDate()] || [];
  if (!entries.length) { toast('No food logged today to save'); return; }
  eid('mealPlanName').value = '';
  const totals = _sumMacros(entries);
  const prev = eid('mealPlanPreview');
  if (prev) prev.innerHTML = `${entries.length} items · ${Math.round(totals.kcal)} kcal · P ${Math.round(totals.protein)}g · C ${Math.round(totals.carbs)}g · F ${Math.round(totals.fat)}g`;
  eid('mSaveMealPlan').classList.add('open');
  setTimeout(() => eid('mealPlanName')?.focus(), 80);
}

function saveMealPlan() {
  const name = eid('mealPlanName')?.value.trim();
  if (!name) { toast('Enter a plan name'); return; }
  const entries = (S.foodLog?.[_foodEffectiveDate()] || []).map(e => ({...e}));
  if (!entries.length) { toast('No food to save'); return; }
  if (!S.mealPlans) S.mealPlans = [];
  S.mealPlans.push({ id: Date.now(), name, foods: entries, createdOn: today() });
  scheduleSave();
  eid('mSaveMealPlan').classList.remove('open');
  renderMealPlansList();
  toast(`"${name}" saved`);
}

function applyMealPlan(i) {
  const plan = (S.mealPlans || [])[i];
  if (!plan) return;
  if (!S.foodLog) S.foodLog = {};
  const _date = _foodEffectiveDate();
  if (!S.foodLog[_date]) S.foodLog[_date] = [];
  plan.foods.forEach(f => S.foodLog[_date].push({ ...f, id: Date.now() + Math.random() }));
  scheduleSave();
  setFoodTab('diary');
  toast(`"${plan.name}" applied to ${_date === today() ? 'today' : _date}`);
}

function deleteMealPlan(i) {
  if (!S.mealPlans) return;
  const plan = S.mealPlans[i];
  S.mealPlans.splice(i, 1);
  scheduleSave();
  renderMealPlansList();
  toast(`"${plan?.name}" removed`);
}

// ── My Foods library management ───────────────────────────────

let _myFoodEditId = null;

function renderMyFoodsTab() {
  const el = eid('myFoodsList');
  if (!el) return;
  const q = (eid('myFoodsSearch')?.value || '').toLowerCase().trim();
  const foods = (S.customFoods || []).filter(cf => !q || cf.name.toLowerCase().includes(q));

  if (!foods.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:24px;text-align:center;line-height:1.7">
      ${q ? `No foods matching "${escapeHtml(q)}"` : 'No saved foods yet'}<br>
      <span style="font-size:0.68rem">Tap <b style="color:var(--cream)">+ Add</b> to save a food, or use <b style="color:var(--cream)">Quick Add</b> in the diary<br>and check "Save to My Foods"</span>
    </div>`;
    return;
  }

  el.innerHTML = foods.map(cf => `
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:11px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
      <div style="flex:1;min-width:0">
        <div style="font-size:0.82rem;color:var(--cream)">${escapeHtml(cf.name)}</div>
        <div style="font-size:0.62rem;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px">
          ${Math.round(cf.kcal||0)} kcal \u00b7 P${Math.round(cf.protein||0)}g \u00b7 C${Math.round(cf.carbs||0)}g \u00b7 F${Math.round(cf.fat||0)}g${cf.fiber ? ` \u00b7 Fiber ${Math.round(cf.fiber)}g` : ''}
        </div>
      </div>
      <button onclick="editCustomFood('${cf.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.72rem;padding:4px 6px;flex-shrink:0" title="Edit">\u270e</button>
      <button onclick="deleteCustomFood('${cf.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.76rem;padding:4px 6px;flex-shrink:0">\u2715</button>
    </div>`).join('');
}

function openAddToMyFoods() {
  _myFoodEditId = null;
  const title = eid('myFoodEditTitle');
  if (title) title.textContent = 'Add to My Foods';
  ['mfeeName','mfeeKcal','mfeeProtein','mfeeCarbs','mfeeFat','mfeeFiber'].forEach(id => {
    const el = eid(id); if (el) el.value = '';
  });
  eid('mMyFoodEdit').classList.add('open');
  setTimeout(() => eid('mfeeName')?.focus(), 80);
}

function editCustomFood(id) {
  const cf = (S.customFoods || []).find(c => String(c.id) === String(id));
  if (!cf) return;
  _myFoodEditId = id;
  const title = eid('myFoodEditTitle');
  if (title) title.textContent = 'Edit Food';
  const set = (elId, val) => { const el = eid(elId); if (el) el.value = val || ''; };
  set('mfeeName',    cf.name);
  set('mfeeKcal',    cf.kcal    || '');
  set('mfeeProtein', cf.protein || '');
  set('mfeeCarbs',   cf.carbs   || '');
  set('mfeeFat',     cf.fat     || '');
  set('mfeeFiber',   cf.fiber   || '');
  eid('mMyFoodEdit').classList.add('open');
  setTimeout(() => eid('mfeeName')?.focus(), 80);
}

function saveMyFoodEdit() {
  const name    = eid('mfeeName')?.value.trim();
  const kcal    = parseFloat(eid('mfeeKcal')?.value)    || 0;
  const protein = parseFloat(eid('mfeeProtein')?.value) || 0;
  const carbs   = parseFloat(eid('mfeeCarbs')?.value)   || 0;
  const fat     = parseFloat(eid('mfeeFat')?.value)     || 0;
  const fiber   = parseFloat(eid('mfeeFiber')?.value)   || 0;
  if (!name) { toast('Enter a name'); return; }
  if (!kcal && !protein && !carbs && !fat) { toast('Enter at least calories or macros'); return; }

  if (!Array.isArray(S.customFoods)) S.customFoods = [];

  if (_myFoodEditId !== null) {
    const idx = S.customFoods.findIndex(cf => String(cf.id) === String(_myFoodEditId));
    if (idx >= 0) S.customFoods[idx] = { ...S.customFoods[idx], name, kcal, protein, carbs, fat, fiber };
  } else {
    const exists = S.customFoods.some(cf => cf.name.toLowerCase() === name.toLowerCase());
    if (exists) { toast('A food with that name already exists'); return; }
    S.customFoods.push({ id: Date.now(), name, kcal, protein, carbs, fat, fiber });
  }

  _myFoodEditId = null;
  scheduleSave();
  eid('mMyFoodEdit').classList.remove('open');
  renderMyFoodsTab();
  toast(`${name} saved to My Foods`);
}

function deleteCustomFood(id) {
  if (!Array.isArray(S.customFoods)) return;
  const idx = S.customFoods.findIndex(cf => String(cf.id) === String(id));
  if (idx < 0) return;
  const removed = { ...S.customFoods[idx] };
  S.customFoods.splice(idx, 1);
  scheduleSave();
  renderMyFoodsTab();
  toastUndo(`"${removed.name}" removed`, () => {
    if (!Array.isArray(S.customFoods)) S.customFoods = [];
    S.customFoods.splice(idx, 0, removed);
    scheduleSave();
    renderMyFoodsTab();
  });
}
