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
  } catch { toast(t('avatar_upload_error')); }
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
let _activeTab = 'summary';

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
  }
  if (name === 'today') {
    renderHabits();
    renderPrayer();
    renderTodaySummary();
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
  if (name === 'food'     && typeof renderFoodTab     === 'function') renderFoodTab();
  if (name === 'projects' && typeof renderProjects    === 'function') renderProjects();
  if (name === 'media'    && typeof renderBooks       === 'function') renderBooks();
  if (name === 'focus'    && typeof renderFocusTab    === 'function') renderFocusTab();
}

/* ══ ONBOARDING ══ */
const HABIT_PRESETS=[
  'Prayer (All 5)','Gym / Lift','Cardio / Walk','Reading',
  'Study / Deep Work','Sleep On Time','Hydration','Stretch / Mobility',
  'Journal / Reflect','Cold Shower'
];
let _selectedHabits=new Set(['Prayer (All 5)','Gym / Lift','Cardio / Walk','Reading','Study / Deep Work','Sleep On Time']);

function showOnboarding(){
  _selectedHabits=new Set(['Prayer (All 5)','Gym / Lift','Cardio / Walk','Reading','Study / Deep Work','Sleep On Time']);
  renderOnboardHabits();
  showOnboardStep(1);
  openModal('mOnboard');
}

function showOnboardStep(n){
  document.querySelectorAll('.onboard-step').forEach((s,i)=>s.classList.toggle('active',i+1===n));
  document.querySelectorAll('.onboard-pip').forEach((p,i)=>p.classList.toggle('done',i<n));
}

function toggleOnboardHabit(name){
  if(_selectedHabits.has(name)) _selectedHabits.delete(name);
  else _selectedHabits.add(name);
  renderOnboardHabits();
}

function renderOnboardHabits(){
  const c=eid('onboardHabits');if(!c)return;
  c.innerHTML=HABIT_PRESETS.map(h=>`
    <div class="onboard-habit-opt${_selectedHabits.has(h)?' selected':''}" onclick="toggleOnboardHabit('${escapeAttr(h)}')">
      <div class="onboard-check">${_selectedHabits.has(h)?'✓':''}</div>
      <span>${escapeHtml(h)}</span>
    </div>`).join('');
}

function finishOnboarding(){
  const displayName=(eid('onboardName').value||'').trim();
  const username=(eid('onboardUsername').value||'').trim().replace(/[^a-zA-Z0-9_]/g,'').slice(0,30);
  const goalText=(eid('onboardGoal').value||'').trim();
  const goalCat=eid('onboardGoalCat').value||'Personal';

  S.appTitle = displayName ? displayName+"'s OS" : 'My OS';
  S.appSub   = '';
  S.habits   = [..._selectedHabits].map((name)=>makeHabit({name}));
  S.goals    = goalText ? [makeGoal({text:goalText,category:goalCat,progress:0})] : [];
  S.projects = [];
  S.onboarded= true;

  closeModal('mOnboard');

  if(username && currentUser){
    sb.from('profiles').upsert({ id: currentUser.id, username }, { onConflict: 'id' }).then(()=>{
      if(!currentProfile) currentProfile = {};
      currentProfile.username = username;
      renderHeroProfile();
    });
  }
  const country = (eid('onboardCountry')?.value || '').trim();
  if(country && currentUser){
    sb.from('profiles').upsert({ id: currentUser.id, country }, { onConflict: 'id' }).then(()=>{
      if(!currentProfile) currentProfile = {};
      currentProfile.country = country;
      // appSub will auto-update via getSeasonLabel() on next renderAll
    });
  }
  scheduleSave();
  renderAll();
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

function renderTodaySummary(){
  const c = eid('todaySummary');
  if(!c) return;

  const todayStr = today();
  const habitsDone  = (S.habits||[]).filter(h=>h.days&&h.days[todayStr]).length;
  const habitsTotal = (S.habits||[]).length;
  const gymDone     = !!(S.gymLog&&S.gymLog[todayStr]);
  const cardioMins  = (S.cardioLog&&S.cardioLog[todayStr]) || 0;
  const activeMediaItems = (S.media||[]).filter(m=>m.status==='reading');
  const activeProjs = (S.projects||[]).filter(p=>p.status==='Active').length;
  const insight     = calmInsight(todayStr, habitsDone, habitsTotal, gymDone, cardioMins);

  const stats = [
    {label:t('habits'),  val: habitsTotal ? `${habitsDone} / ${habitsTotal}` : '—'},
    {label:t('gym'),     val: gymDone ? `✓ ${t('done')}` : t('not_logged')},
    ...(cardioMins>0 ? [{label:t('cardio'), val:`${cardioMins} ${t('min')}`}] : []),
    ...(activeProjs>0 ? [{label:t('projects'), val:`${activeProjs} ${t('active')}`}] : []),
  ];

  // M4: In-progress media widget
  const mediaHtml = activeMediaItems.length ? `
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">
      <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono',monospace;margin-bottom:6px">In Progress</div>
      ${activeMediaItems.slice(0,3).map(m => {
        const pct = typeof getBookPct === 'function' ? getBookPct(m) : 0;
        return `<div style="margin-bottom:6px;cursor:pointer" onclick="go('media');setMediaTypeF('${m.mediaType}')">
          <div style="display:flex;justify-content:space-between;margin-bottom:2px">
            <span style="font-size:0.76rem;color:var(--mist);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:75%">${escapeHtml(m.title)}</span>
            ${pct > 0 ? `<span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace">${pct}%</span>` : ''}
          </div>
          ${pct > 0 ? `<div style="height:2px;background:var(--mid);border-radius:2px"><div style="height:2px;width:${pct}%;background:var(--blush);border-radius:2px"></div></div>` : ''}
        </div>`;
      }).join('')}
    </div>` : '';

  c.innerHTML = `
    <div class="card" style="padding:14px 20px">
      <div style="font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--blush);font-family:'DM Mono',monospace;margin-bottom:12px">${t('today_glance')}</div>
      <div style="display:flex;gap:28px;flex-wrap:wrap">
        ${stats.map(s=>`
          <div>
            <div style="font-size:0.55rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono',monospace;margin-bottom:3px">${s.label}</div>
            <div style="font-size:0.82rem;color:var(--mist)">${escapeHtml(String(s.val))}</div>
          </div>`).join('')}
      </div>
      ${mediaHtml}
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:0.8rem;color:var(--muted-lt);font-style:italic;font-family:'Cormorant Garamond',serif;">${escapeHtml(insight)}</div>
    </div>
  `;
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
}

/* ══ INLINE TITLE EDITING ══ */
let _titleSaveTimer = null;
function setupInlineEdits(){
  if(inlineEditsBound) return;
  inlineEditsBound = true;
  eid('appTitle').addEventListener('input',e=>{
    S.appTitle=e.target.textContent;
    clearTimeout(_titleSaveTimer);
    _titleSaveTimer = setTimeout(()=>scheduleSave(), 800);
  });
}

/* ══ INIT ══ */
async function initApp(){
  if(typeof restoreAppearance === 'function') restoreAppearance();
  setupMobileUX();
  const hasData = await loadFromSupabase();
  eid('dateBadge').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
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

// Booted by auth.js after session restore or login.