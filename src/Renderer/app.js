'use strict';

/* ══ SEASON SUBTITLE ══ */
function getSeasonLabel() {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  const season = m <= 5 ? t('spring') : m <= 8 ? t('summer') : t('fall');
  const country = (typeof currentProfile !== 'undefined' && currentProfile?.country) || '';
  return country ? `${country} · ${season} ${y}` : `${season} ${y}`;
}

/* ══ PROFILE ══ */
function renderHeroProfile(){
  const av = eid('heroAvatar');
  const un = eid('heroUsernameInp');
  if(!av || !un) return;
  const prof      = (typeof currentProfile !== 'undefined' && currentProfile) || {};
  const avatarUrl = prof.avatar_url || '';
  const username  = prof.username   || '';
  const initials  = (username || (typeof currentUser !== 'undefined' && currentUser?.email) || '?')[0].toUpperCase();
  av.innerHTML = avatarUrl
    ? `<img src="${escapeAttr(avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover">`
    : `<span>${escapeHtml(initials)}</span>`;
  un.textContent = username ? '@' + username : '';
}

async function uploadAvatar(input){
  const f = input.files[0];
  if(!f || !currentUser) return;
  if(f.size > 5 * 1024 * 1024){ toast(t('avatar_upload_error') || 'Image too large — max 5 MB'); input.value = ''; return; }
  try{
    const url = await uploadAsset('avatar', f);
    await sb.from('profiles').upsert({ id: currentUser.id, email: currentUser.email, avatar_url: url }, { onConflict: 'id' });
    if(!currentProfile) currentProfile = {};
    currentProfile.avatar_url = url;
    renderHeroProfile();
    toast(t('avatar_updated'));
  } catch(e) { console.error('[uploadAvatar]', e); toast(t('avatar_upload_error')); }
}

async function saveUsername(val){
  if(!currentUser) return;
  const username = val.trim().replace(/[^a-zA-Z0-9_]/g,'').slice(0,30);
  if(!username) return;
  await sb.from('profiles').upsert({ id: currentUser.id, username }, { onConflict: 'id' });
  if(!currentProfile) currentProfile = {};
  currentProfile.username = username;
  toast(t('username_saved'));
}

/* ══ HERO ══ */
async function uploadHero(input){
  const f = input.files[0];
  if(!f) return;
  if(f.size > 5 * 1024 * 1024){ toast('Image too large — max 5 MB'); input.value = ''; return; }

  try {
    S.heroImg = await uploadAsset('hero', f);
  } catch {
    S.heroImg = await new Promise(res => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.readAsDataURL(f);
    });
  }

  const img = eid('heroImg');
  if(S.heroImg){ img.src=S.heroImg; img.classList.add('has-image'); }
  else { img.src=''; img.classList.remove('has-image'); }
  scheduleSave();
}

/* ══ EXPORT / IMPORT ══ */
async function doExport(){const res=await window.api.exportData(JSON.stringify(S,null,2));if(res.ok)toast(t('backup_exported'));}
async function doImport(){
  // D4: Auto-backup current data before overwriting
  try { await window.api.exportData(JSON.stringify(S, null, 2)); } catch(_) {}
  const res=await window.api.importData();if(!res.ok)return;
  try{S=normalizeAppState(JSON.parse(res.data));scheduleSave();renderAll();toast(t('data_imported'));}
  catch(e){alert(t('file_read_error'));}
}

/* ══ NAV ══ */
let _activeTab = 'today';

function go(name,btn){
  _activeTab = name;
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  const panel = eid('panel-'+name);
  if (panel) panel.classList.add('active');
  if(btn) btn.classList.add('active');
  _renderTab(name);
}

function _renderTab(name) {
  if (name === 'summary' || name === 'review') {
    if (typeof renderWeeklyReview === 'function') renderWeeklyReview();
    if (typeof renderAnnualGoals  === 'function') renderAnnualGoals();
    if (typeof renderWinsLog      === 'function') renderWinsLog();
  }
  if (name === 'today') {
    renderHabits();
    renderPrayer();
    if (typeof renderToday === 'function') renderToday();
    else renderTodaySummary(); // fallback if today.js not loaded
    if (typeof renderMoodSection === 'function') renderMoodSection();
  }
  if (name === 'fitness') {
    renderGymWeek();
    renderWorkoutCards();
    renderTrainingLog();
    if (typeof renderCardioSection     === 'function') renderCardioSection();
    if (typeof renderWeightLog         === 'function') renderWeightLog();
    if (typeof renderBodyWeightSection === 'function') renderBodyWeightSection();
    if (typeof renderExercisePbs       === 'function') renderExercisePbs();
    if (typeof renderMuscleHeatmap     === 'function') renderMuscleHeatmap();
  }
  if (name === 'food'     && typeof renderFoodTab     === 'function') { if (typeof _bindFoodDatePicker === 'function') _bindFoodDatePicker(); renderFoodTab(); }
  if (name === 'projects' && typeof renderProjects    === 'function') renderProjects();
  if (name === 'media'    && typeof renderBooks       === 'function') renderBooks();
  if (name === 'focus'    && typeof renderFocusTab    === 'function') renderFocusTab();
  if (name === 'notes'     && typeof renderNotes      === 'function') renderNotes();
  if (name === 'community' && typeof renderCommunity  === 'function') renderCommunity();
  // Apply module visibility after the tab has rendered its DOM
  if (typeof applyModules === 'function') applyModules();
}

/* ══ ONBOARDING ══ */
const HABIT_PRESETS = [
  'Prayer (All 5)', 'Gym / Lift', 'Cardio / Walk', 'Reading',
  'Study / Deep Work', 'Sleep On Time', 'Hydration', 'Stretch / Mobility',
  'Journal / Reflect', 'Cold Shower'
];

// All tabs in canonical order (id must match go() call names and modId in MODULE_REGISTRY)
const TAB_MANIFEST = [
  { id: 'today',     label: 'Today',     desc: 'Daily dashboard with habits, water, and notes',    modId: 'tab.today'     },
  { id: 'fitness',   label: 'Fitness',   desc: 'Workouts, cardio, weight tracking',                modId: 'tab.fitness'   },
  { id: 'food',      label: 'Food',      desc: 'Calorie diary, meal plans, grocery list',          modId: 'tab.food'      },
  { id: 'projects',  label: 'Projects',  desc: 'Tasks, deadlines, project notes',                  modId: 'tab.projects'  },
  { id: 'media',     label: 'Media',     desc: 'Books, shows, films, games, albums',               modId: 'tab.media'     },
  { id: 'notes',     label: 'Notes',     desc: 'Free-form notes with wiki-links',                  modId: 'tab.notes'     },
  { id: 'focus',     label: 'Focus',     desc: 'Pomodoro timer and focus session log',             modId: 'tab.focus'     },
  { id: 'community', label: 'Community', desc: 'Public profiles and activity feed',                modId: 'tab.community' },
  { id: 'summary',   label: 'Summary',   desc: 'Weekly review, streaks, mood log',                 modId: 'tab.summary'   },
];

// Onboarding transient state
let _selectedHabits  = new Set(['Prayer (All 5)', 'Gym / Lift', 'Cardio / Walk', 'Reading', 'Study / Deep Work', 'Sleep On Time']);
let _onboardStyle    = 'tracker';
let _onboardEnabled  = new Set(TAB_MANIFEST.map(t => t.id));
let _onboardOrder    = TAB_MANIFEST.map(t => t.id);
let _onboardDefault  = 'today';

function showOnboarding() {
  _selectedHabits = new Set(['Prayer (All 5)', 'Gym / Lift', 'Cardio / Walk', 'Reading', 'Study / Deep Work', 'Sleep On Time']);
  _onboardStyle   = 'tracker';
  _onboardEnabled = new Set(TAB_MANIFEST.map(t => t.id));
  _onboardOrder   = TAB_MANIFEST.map(t => t.id);
  _onboardDefault = 'today';
  renderOnboardHabits();
  _renderOnboardTabs();
  _renderOnboardOrder();
  showOnboardStep(1);
  openModal('mOnboard');
}

function showOnboardStep(n) {
  document.querySelectorAll('.onboard-step').forEach((s, i) => s.classList.toggle('active', i + 1 === n));
  document.querySelectorAll('.onboard-pip').forEach((p, i) => p.classList.toggle('done', i < n));
  if (n === 4) _renderOnboardTabs();
  if (n === 5) _renderOnboardOrder();
}

function onboardSelectStyle(style) {
  _onboardStyle = style;
  document.querySelectorAll('.onboard-style-opt').forEach(el =>
    el.classList.toggle('selected', el.dataset.style === style)
  );
  if (style === 'tracker') {
    _onboardEnabled = new Set(TAB_MANIFEST.map(t => t.id));
    _onboardDefault = 'today';
  } else {
    // Notes-first: start with a focused set
    _onboardEnabled = new Set(['today', 'notes', 'projects', 'media', 'focus', 'summary']);
    _onboardDefault = 'notes';
  }
  _onboardOrder = TAB_MANIFEST.map(t => t.id).filter(id => _onboardEnabled.has(id));
}

function toggleOnboardHabit(name) {
  if (_selectedHabits.has(name)) _selectedHabits.delete(name);
  else _selectedHabits.add(name);
  renderOnboardHabits();
}

function renderOnboardHabits() {
  const c = eid('onboardHabits'); if (!c) return;
  c.innerHTML = HABIT_PRESETS.map(h => `
    <div class="onboard-habit-opt${_selectedHabits.has(h) ? ' selected' : ''}" onclick="toggleOnboardHabit('${escapeAttr(h)}')">
      <div class="onboard-check">${_selectedHabits.has(h) ? '✓' : ''}</div>
      <span>${escapeHtml(h)}</span>
    </div>`).join('');
}

function _renderOnboardTabs() {
  const c = eid('onboardTabPicker'); if (!c) return;
  c.innerHTML = TAB_MANIFEST.map(t => `
    <div class="onboard-tab-opt${_onboardEnabled.has(t.id) ? ' selected' : ''}"
         data-tabid="${t.id}" onclick="_onboardToggleTab('${t.id}')">
      <div class="onboard-check">${_onboardEnabled.has(t.id) ? '✓' : ''}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.8rem;color:var(--cream);font-weight:500">${escapeHtml(t.label)}</div>
        <div style="font-size:0.62rem;color:var(--muted);line-height:1.3;margin-top:1px">${escapeHtml(t.desc)}</div>
      </div>
    </div>`).join('');
}

function _onboardToggleTab(id) {
  if (_onboardEnabled.has(id)) {
    _onboardEnabled.delete(id);
    _onboardOrder = _onboardOrder.filter(x => x !== id);
  } else {
    _onboardEnabled.add(id);
    if (!_onboardOrder.includes(id)) {
      // Re-insert at canonical position
      const canonical = TAB_MANIFEST.map(t => t.id);
      const pos = canonical.indexOf(id);
      let inserted = false;
      for (let i = pos + 1; i < canonical.length; i++) {
        const idx = _onboardOrder.indexOf(canonical[i]);
        if (idx >= 0) { _onboardOrder.splice(idx, 0, id); inserted = true; break; }
      }
      if (!inserted) _onboardOrder.push(id);
    }
  }
  if (!_onboardEnabled.has(_onboardDefault)) {
    _onboardDefault = _onboardOrder[0] || 'today';
  }
  _renderOnboardTabs();
  _renderOnboardOrder();
}

function _renderOnboardOrder() {
  const c = eid('onboardTabOrder'); if (!c) return;
  const visible = _onboardOrder.filter(id => _onboardEnabled.has(id));
  c.innerHTML = visible.map((id, i) => {
    const t = TAB_MANIFEST.find(x => x.id === id);
    const label = t ? t.label : id;
    const isDefault = _onboardDefault === id;
    return `<div class="onboard-order-item" data-tabid="${id}">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:0">
        <input type="radio" name="obDefaultTab" value="${id}" ${isDefault ? 'checked' : ''}
          onchange="_onboardDefault='${id}';_renderOnboardOrder()"
          style="accent-color:var(--blush);cursor:pointer;flex-shrink:0">
        <span style="font-size:0.8rem;color:var(--cream)">${escapeHtml(label)}</span>
        ${isDefault ? '<span style="font-size:0.58rem;color:var(--blush);font-family:\'DM Mono\',monospace;margin-left:4px">default</span>' : ''}
      </label>
      <div style="display:flex;gap:3px">
        <button onclick="_onboardMoveTab('${id}',-1)" ${i === 0 ? 'disabled' : ''}
          class="onboard-order-btn">^</button>
        <button onclick="_onboardMoveTab('${id}',1)" ${i === visible.length - 1 ? 'disabled' : ''}
          class="onboard-order-btn">v</button>
      </div>
    </div>`;
  }).join('');
}

function _onboardMoveTab(id, dir) {
  const visible = _onboardOrder.filter(x => _onboardEnabled.has(x));
  const idx = visible.indexOf(id);
  if (idx < 0) return;
  const swapIdx = idx + dir;
  if (swapIdx < 0 || swapIdx >= visible.length) return;
  const oi = _onboardOrder.indexOf(id);
  const oj = _onboardOrder.indexOf(visible[swapIdx]);
  [_onboardOrder[oi], _onboardOrder[oj]] = [_onboardOrder[oj], _onboardOrder[oi]];
  _renderOnboardOrder();
}

// Apply saved tabOrder to nav DOM (called on boot and after onboarding)
function applyTabOrder() {
  const order = S.appPrefs && S.appPrefs.tabOrder;
  if (!order || !order.length) return;
  const nav = document.querySelector('nav');
  if (!nav) return;
  order.forEach(tabId => {
    const btn = nav.querySelector(`.tab[onclick*="'${tabId}'"]`);
    if (btn) nav.appendChild(btn);
  });
}

function finishOnboarding() {
  const displayName = (eid('onboardName').value || '').trim();
  const username    = (eid('onboardUsername').value || '').trim().replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30);
  S.appTitle    = displayName ? displayName + "'s OS" : 'My OS';
  S.appSub      = '';
  S.habits      = [..._selectedHabits].map(name => makeHabit({ name }));
  S.projects    = [];
  S.onboarded   = true;

  // Write tab visibility
  if (!S.modules) S.modules = {};
  TAB_MANIFEST.forEach(t => { if (t.modId) S.modules[t.modId] = _onboardEnabled.has(t.id); });

  // Write tab order + default
  S.appPrefs.tabOrder   = [..._onboardOrder];
  S.appPrefs.defaultTab = _onboardDefault;

  closeModal('mOnboard');

  if (username && currentUser) {
    sb.from('profiles').upsert({ id: currentUser.id, username }, { onConflict: 'id' }).then(() => {
      if (!currentProfile) currentProfile = {};
      currentProfile.username = username;
      renderHeroProfile();
    });
  }
  const country = (eid('onboardCountry')?.value || '').trim();
  if (country && currentUser) {
    sb.from('profiles').upsert({ id: currentUser.id, country }, { onConflict: 'id' }).then(() => {
      if (!currentProfile) currentProfile = {};
      currentProfile.country = country;
    });
  }

  scheduleSave();
  renderAll();
  applyModules();
  applyTabOrder();
  go(_onboardDefault || 'today');
  toast(t('welcome_toast'));
}

/* ══ TODAY SUMMARY ══ */
function calmInsight(todayStr, habitsDone, habitsTotal, gymDone, cardioMins){
  const hour = new Date().getHours();
  const prayerLog = (S.prayerLog && S.prayerLog[todayStr]) || {};
  const prayersDone = (typeof PRAYERS !== 'undefined') ? PRAYERS.filter(p=>!!prayerLog[p]).length : 0;

  if(prayersDone === 5 && habitsTotal && habitsDone === habitsTotal)
    return t('insight_all');
  if(prayersDone === 5) return t('insight_all_prayers');
  if(prayersDone > 0 && prayersDone < 5) return `${prayersDone} ${t('of')} 5 ${t('prayers_done')}. ${5-prayersDone} ${t('remaining')}.`;

  if(habitsTotal && habitsDone === habitsTotal) return t('insight_all_habits');
  if(habitsTotal && habitsDone/habitsTotal >= 0.7) return `${habitsDone} ${t('of')} ${habitsTotal} ${t('habits_momentum')}`;

  if(gymDone && cardioMins >= 30) return t('insight_gym_cardio');
  if(gymDone) return t('insight_gym');
  if(cardioMins >= 30) return `${cardioMins} ${t('cardio_goal_met')}`;

  const readH = (typeof hfind !== 'undefined') ? hfind('read','reading','book') : null;
  const readStr = readH ? calcStreak(readH.days||{}) : 0;
  if(readStr >= 7) return `${readStr}${t('day_reading_streak')}`;
  if(readStr >= 3) return `${readStr} ${t('days_reading_row')}`;

  if(habitsTotal && habitsDone === 0 && hour >= 15) return t('insight_nothing');
  if(hour < 10) return t('morning_msg');
  if(hour < 17) return t('afternoon_msg');
  return t('evening_msg');
}

// renderTodaySummary() is defined in today.js — see renderTodaySummary shim there.
// This stub is kept so renderAll() line 286 doesn't crash if today.js loads after app.js
// (script order in index.html: today.js before app.js, so today.js wins in practice).
function renderTodaySummary() {
  if (typeof renderToday === 'function') renderToday();
}

/* ══ RENDER ALL ══ */
function renderAll(){
  // ── Global elements (always update) ──
  eid('appTitle').textContent = S.appTitle;
  eid('appSub').textContent = getSeasonLabel();

  const img = eid('heroImg');
  if (S.heroImg) { img.src = S.heroImg; img.classList.add('has-image'); }
  else { img.src = ''; img.classList.remove('has-image'); }

  eid('quoteText').value  = S.quote.text;
  eid('quoteAuthor').value = S.quote.author;
  if(eid('cardioTarget')) eid('cardioTarget').value = S.cardioTarget || '';
  eid('dailyNotes').value = S.notes[today()] || '';
  if(eid('cardioDate'))  eid('cardioDate').value  = today();
  if(eid('calorieDate')) eid('calorieDate').value = today();

  applyReflectionVisibility();
  if (typeof applyAllFeatures === 'function') applyAllFeatures();

  // ── Active tab content only ──
  _renderTab(_activeTab);
  // _renderTab already calls applyModules at its end
}

/* ══ INLINE TITLE EDITING ══ */
let _titleSaveTimer = null;
function setupInlineEdits(){
  if(inlineEditsBound) return;
  inlineEditsBound = true;
  eid('appTitle').addEventListener('input',e=>{
    S.appTitle = e.target.textContent.slice(0, 80);
    if (e.target.textContent.length > 80) {
      // Trim in-place without losing cursor
      e.target.textContent = S.appTitle;
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(e.target);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    clearTimeout(_titleSaveTimer);
    _titleSaveTimer = setTimeout(()=>scheduleSave(), 800);
  });
}

/* ══ INIT ══ */
async function initApp(){
  if(typeof restoreAppearance === 'function') restoreAppearance();
  setupMobileUX();
  const hasData = await loadFromSupabase();
  function _refreshDateBadge() {
    eid('dateBadge').textContent = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  }
  _refreshDateBadge();
  // Refresh when the user returns to the tab (covers midnight crossings and background stays)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) _refreshDateBadge(); });
  setupInlineEdits();
  renderHeroProfile();

  const knownUser = localStorage.getItem('aos_user_exists')==='true';
  if(!hasData && !knownUser){
    renderAll();
    showOnboarding();
    return;
  }
  if(!S.onboarded){ S.onboarded=true; scheduleSave(); }
  if (typeof initFoodTab === 'function') initFoodTab();
  if (typeof migrateExerciseHistory === 'function') migrateExerciseHistory();
  renderAll();
  applyTabOrder();
  const startTab = (S.appPrefs && S.appPrefs.defaultTab) || 'today';
  if (startTab !== 'today') go(startTab);
}

async function bootApp(){
  if(appBooted) return;
  appBooted = true;
  try{
    await initApp();
  }catch(e){
    appBooted = false;
    throw e;
  }
}

/* ══ PAST NOTES ══ */
function openPastNotes() {
  const todayStr = today();
  const entries = Object.entries(S.notes || {})
    .filter(([d, v]) => d !== todayStr && v && v.trim())
    .sort((a, b) => b[0].localeCompare(a[0]));

  const list = eid('pnList');
  const detail = eid('pnDetail');
  detail.style.display = 'none';
  list.style.display = '';

  if (!entries.length) {
    list.innerHTML = `<div style="text-align:center;padding:32px 0;font-size:0.72rem;color:var(--muted)">${t('no_past_notes')}</div>`;
  } else {
    list.innerHTML = entries.map(([d, v]) => `
      <div style="cursor:pointer;padding:10px 0;border-bottom:1px solid var(--border)" onclick="showPastNoteDetail('${escapeAttr(d)}')">
        <div style="font-size:0.62rem;color:var(--blush);font-family:'DM Mono',monospace;margin-bottom:3px">${escapeHtml(d)}</div>
        <div style="font-size:0.78rem;color:var(--muted-lt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml((v||'').slice(0,120))}</div>
      </div>`).join('');
  }
  openModal('mPastNotes');
}

function showPastNoteDetail(dateStr) {
  const v = (S.notes || {})[dateStr] || '';
  eid('pnDetailDate').textContent = dateStr;
  eid('pnDetailContent').textContent = v;
  eid('pnDetail').style.display = '';
  eid('pnList').style.display = 'none';
}

/* ══ MOBILE GESTURES & UX ══ */

const _TAB_ORDER = ['summary','today','fitness','projects','media'];

function _getCurrentTabIndex() {
  const active = document.querySelector('.tab.active');
  if (!active) return 0;
  const m = (active.getAttribute('onclick') || '').match(/go\('(\w+)'/);
  return m ? _TAB_ORDER.indexOf(m[1]) : 0;
}

function _goByIndex(i) {
  if (i < 0 || i >= _TAB_ORDER.length) return;
  const name = _TAB_ORDER[i];
  const btn  = document.querySelector(`.tab[onclick*="go('${name}'"]`);
  go(name, btn);
  if (typeof haptic === 'function') haptic(8);
}

// FEATURE: Global Search — Ctrl+K / Cmd+K shortcut — remove to disable
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    if (typeof openGlobalSearch === 'function' && feat('globalSearch')) openGlobalSearch();
  }
});

let _mobileUXBound = false;
function setupMobileUX() {
  if (_mobileUXBound) return;
  _mobileUXBound = true;
  /* ── Swipe between tabs ── */
  let _tx = 0, _ty = 0, _tt = 0;
  document.addEventListener('touchstart', e => {
    _tx = e.touches[0].clientX;
    _ty = e.touches[0].clientY;
    _tt = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', e => {
    if (e.target.closest('.modal-bg.open') || e.target.closest('#bkDropdown')) return;
    const dx = e.changedTouches[0].clientX - _tx;
    const dy = e.changedTouches[0].clientY - _ty;
    if (Date.now() - _tt > 400) return;
    if (Math.abs(dy) > Math.abs(dx) * 0.6) return;
    if (Math.abs(dx) < 55) return;
    _goByIndex(_getCurrentTabIndex() + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ── Pull-to-refresh ── */
  let _py = 0, _pulling = false;
  const _ind = eid('pullIndicator');
  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0) { _py = e.touches[0].clientY; _pulling = true; }
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!_pulling) return;
    if (_ind && (e.touches[0].clientY - _py) > 55) _ind.style.display = 'flex';
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!_pulling) return;
    const dy = e.changedTouches[0].clientY - _py;
    if (dy > 80 && typeof saveToSupabase === 'function') {
      saveToSupabase();
      if (typeof haptic === 'function') haptic(18);
      if (_ind) { _ind.textContent = '✓ Syncing…'; setTimeout(() => { _ind.style.display = 'none'; _ind.textContent = '↓ Release to sync'; }, 1600); }
    } else if (_ind) { _ind.style.display = 'none'; }
    _pulling = false;
  }, { passive: true });

  /* ── Keyboard-aware modals (iOS) ── */
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const open = document.querySelector('.modal-bg.open');
      if (!open) return;
      const offset = window.innerHeight - window.visualViewport.offsetTop - window.visualViewport.height;
      open.style.paddingBottom = offset > 50 ? `${offset}px` : '';
    });
  }
}

/* ══ FLOATING QUICK-ADD BUTTON ══ */
let _fabOpen = false;

function fabOpen() {
  const sheet = eid('fabSheet');
  const btn   = eid('fabBtn');
  if (!sheet) return;

  if (_fabOpen) {
    fabClose();
    return;
  }
  _fabOpen = true;
  if (btn) { btn.textContent = '✕'; btn.style.transform = 'rotate(45deg)'; }

  const content = eid('fabSheetContent');
  if (!content) return;

  // Context-aware content based on active tab
  switch (_activeTab) {
    case 'today':
    case 'summary':
      content.innerHTML = _fabContentToday();
      break;
    case 'fitness':
      content.innerHTML = _fabContentFitness();
      break;
    case 'food':
      content.innerHTML = _fabContentFood();
      break;
    case 'projects':
      content.innerHTML = _fabContentProjects();
      break;
    case 'media':
      content.innerHTML = _fabContentMedia();
      break;
    default:
      content.innerHTML = _fabContentToday();
  }

  sheet.style.display = 'block';

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', _fabOutsideHandler);
  }, 0);
}

function _fabOutsideHandler(e) {
  if (!e.target.closest('#fabSheet') && !e.target.closest('#fabBtn')) fabClose();
}

function fabClose() {
  _fabOpen = false;
  const sheet = eid('fabSheet');
  const btn   = eid('fabBtn');
  if (sheet) sheet.style.display = 'none';
  if (btn) { btn.textContent = '+'; btn.style.transform = ''; }
  document.removeEventListener('click', _fabOutsideHandler);
}

function _fabContentToday() {
  return `
    <div class="section-lbl">Quick Add</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-g" style="text-align:left;font-size:0.76rem" onclick="fabClose();if(typeof addWater==='function')addWater(1)">+ Water</button>
      <button class="btn btn-g" style="text-align:left;font-size:0.76rem" onclick="fabClose();if(typeof openHabitManager==='function')openHabitManager()">Manage Habits</button>
      <button class="btn btn-g" style="text-align:left;font-size:0.76rem" onclick="fabClose();go('fitness')">Log Workout</button>
      <button class="btn btn-g" style="text-align:left;font-size:0.76rem" onclick="fabClose();go('food')">Log Food</button>
    </div>`;
}

function _fabContentFitness() {
  const cards = (S.workoutCards || []).slice(0, 4);
  const cardBtns = cards.length
    ? cards.map(wc => `<button class="btn btn-g" style="text-align:left;font-size:0.74rem" onclick="fabClose();toggleWorkoutCard('${wc.id}')">${escapeHtml(wc.title||'Workout')}</button>`).join('')
    : `<button class="btn btn-g" style="text-align:left;font-size:0.74rem" onclick="fabClose();addWorkoutCard()">+ New Card</button>`;
  return `
    <div class="section-lbl">Fitness</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${cardBtns}
      <button class="btn btn-g" style="text-align:left;font-size:0.74rem" onclick="fabClose();addWater(1)">+ Water</button>
      <button class="btn btn-g" style="text-align:left;font-size:0.74rem" onclick="fabClose();if(typeof openExerciseProgress==='function')openExerciseProgress()">Progress Chart</button>
    </div>`;
}

function _fabContentFood() {
  return `
    <div class="section-lbl">Food</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-g" style="text-align:left;font-size:0.76rem" onclick="fabClose();go('food');if(typeof openFoodSearch==='function')openFoodSearch('other')">+ Log Food</button>
      <button class="btn btn-g" style="text-align:left;font-size:0.76rem" onclick="fabClose();go('food')">Open Food</button>
      <button class="btn btn-g" style="text-align:left;font-size:0.76rem" onclick="fabClose();addWater(1)">+ Water</button>
    </div>`;
}

function _fabContentProjects() {
  const projs = (S.projects || []).filter(p => p.status !== 'Done').slice(0, 4);
  const projBtns = projs.length
    ? projs.map(p => `<button class="btn btn-g" style="text-align:left;font-size:0.74rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(220px,calc(100vw - 90px))" onclick="fabClose();openProjectDetail('${p.id}')">${escapeHtml(p.title||'Project')}</button>`).join('')
    : '';
  return `
    <div class="section-lbl">Projects</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${projBtns}
      <button class="btn btn-p" style="text-align:left;font-size:0.74rem" onclick="fabClose();openModal('mProject')">+ New Project</button>
    </div>`;
}

function _fabContentMedia() {
  return `
    <div class="section-lbl">Media</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-g" style="text-align:left;font-size:0.76rem" onclick="fabClose();openModal('mBook')">+ Add Book / Show</button>
    </div>`;
}

// Booted by auth.js after session restore or login.