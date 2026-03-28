'use strict';

/* ══ FITNESS STATE HELPERS ══ */
function ensureFitnessState() {
  if (!Array.isArray(S.workout)) S.workout = [];
  if (!Array.isArray(S.workoutCards)) S.workoutCards = [];
  if (!S.gymLog || typeof S.gymLog !== 'object') S.gymLog = {};
  if (!S.cardioLog || typeof S.cardioLog !== 'object') S.cardioLog = {};
  if (!Array.isArray(S.cardioHistory)) S.cardioHistory = [];
  if (!Array.isArray(S.calorieHistory)) S.calorieHistory = [];
  if (!Array.isArray(S.workoutHistory)) S.workoutHistory = [];
  if (!S.exerciseHistory || typeof S.exerciseHistory !== 'object') S.exerciseHistory = {};
  if (!Array.isArray(S.weightLog)) S.weightLog = [];
}

function normExerciseKey(name) {
  return String(name || '').trim().toLowerCase();
}

function getExerciseHistory(name) {
  ensureFitnessState();
  const key = normExerciseKey(name);
  if (!S.exerciseHistory[key]) S.exerciseHistory[key] = [];
  return S.exerciseHistory[key];
}

function getLastExerciseLog(name) {
  const hist = getExerciseHistory(name);
  return hist.length ? hist[hist.length - 1] : null;
}

function getPrevExerciseLog(name) {
  const hist = getExerciseHistory(name);
  return hist.length >= 2 ? hist[hist.length - 2] : null;
}

function calcPctIncrease(prev, curr) {
  const p = Number(prev);
  const c = Number(curr);
  if (!p || !c || p <= 0) return null;
  return ((c - p) / p) * 100;
}

function fmtPct(pct) {
  if (pct === null || Number.isNaN(pct)) return '';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

/* ══ BODY WEIGHT ══ */
function logWeightEntry() {
  ensureFitnessState();
  const kg    = parseFloat(eid('weightKg').value);
  const date  = eid('weightDate').value || today();
  const notes = (eid('weightNotes').value || '').trim();
  if (!kg || kg <= 0) { toast('Enter a weight'); return; }

  // Replace existing entry for same date or push new
  const idx = S.weightLog.findIndex(e => e.date === date);
  const entry = { id: Date.now(), date, weight: kg, notes };
  if (idx >= 0) S.weightLog[idx] = entry;
  else S.weightLog.push(entry);

  eid('weightKg').value    = '';
  eid('weightNotes').value = '';
  scheduleSave();
  renderWeightLog();
  toast('Weight logged');
}

function renderWeightLog() {
  ensureFitnessState();
  const c = eid('weightHistory');
  if (!c) return;
  const entries = [...S.weightLog].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  if (!entries.length) { c.innerHTML = ''; return; }
  c.innerHTML = entries.map(e =>
    `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border-lt);font-size:0.78rem">
      <span style="color:var(--muted);font-family:'DM Mono',monospace;font-size:0.7rem;min-width:80px">${e.date}</span>
      <span style="color:var(--cream);font-weight:600">${e.weight} kg</span>
      ${e.notes ? `<span style="color:var(--muted-lt);flex:1">${escapeHtml(e.notes)}</span>` : ''}
      <button onclick="deleteWeightEntry('${e.date}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.8rem;padding:0 4px">×</button>
    </div>`
  ).join('');
}

function deleteWeightEntry(date) {
  ensureFitnessState();
  S.weightLog = S.weightLog.filter(e => e.date !== date);
  scheduleSave();
  renderWeightLog();
}

/* ══ GYM WEEK ══ */
function renderGymWeek() {
  ensureFitnessState();

  const week = weekDays();
  const c = eid('gymWeek');
  c.innerHTML = '';

  week.forEach((d, i) => {
    const wd = S.workout[i] || { type: 'Rest', rest: true };
    const done = !!S.gymLog[d];
    const isRest = !!wd.rest;

    const div = document.createElement('div');
    div.className = `gym-day${isRest ? ' rest' : ''}${done ? ' done' : ''}`;

    const cardOptions = (S.workoutCards||[]).map(wc =>
      `<option value="${wc.id}"${wd.cardId==wc.id?' selected':''}>${escapeHtml(wc.title||'')}</option>`
    ).join('');

    div.innerHTML = `
      <div class="dn">${DAY_SHORT[i]}</div>
      ${wd.cardId
        ? `<div style="display:flex;align-items:center;gap:3px;flex-wrap:wrap;justify-content:center">
             <span style="font-size:0.52rem;background:var(--rose);padding:2px 6px;border-radius:20px;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px">${escapeHtml(wd.type||'')}</span>
             <button style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.75rem;line-height:1;padding:0 2px" onclick="event.stopPropagation();unlinkPreset(${i})" title="Unlink preset">×</button>
           </div>`
        : `<input class="editable wt-inp" value="${escapeHtml(wd.type || '')}" onchange="updateWDay(${i},this.value)" onclick="event.stopPropagation()" title="${t('click_rename')}">`
      }
      <div class="ck">${done ? '✓' : isRest ? '—' : '○'}</div>
      ${!isRest ? `<select style="font-size:0.48rem;background:transparent;border:1px solid var(--border);border-radius:4px;color:var(--muted);margin-top:3px;width:100%;padding:1px 2px;max-width:80px" onchange="event.stopPropagation();assignPreset(${i},this.value)" onclick="event.stopPropagation()">
        <option value="">— preset —</option>
        ${cardOptions}
      </select>` : ''}
      <button
        onclick="event.stopPropagation();toggleRestDay(${i})"
        title="${isRest ? t('mark_training') : t('mark_rest')}"
        style="margin-top:4px;background:none;border:1px solid ${isRest ? 'var(--border)' : 'var(--border-hi)'};border-radius:5px;color:${isRest ? 'var(--muted)' : 'var(--blush)'};font-size:0.5rem;font-family:'DM Mono',monospace;letter-spacing:0.08em;text-transform:uppercase;padding:2px 5px;cursor:pointer;transition:all 0.15s;"
      >${isRest ? t('gym') : t('rest')}</button>
      ${!isRest && wd.cardId ? `<button onclick="event.stopPropagation();scrollToCard(${wd.cardId})" style="margin-top:3px;background:none;border:1px solid var(--border-hi);border-radius:5px;color:var(--blush);font-size:0.5rem;font-family:'DM Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;padding:2px 5px;cursor:pointer">Log →</button>` : ''}
    `;

    div.addEventListener('click', () => {
      if (isRest) return;

      S.gymLog[d] = !S.gymLog[d];

      if (S.gymLog[d]) {
        const gh = hfind('gym','lift','workout','training','weights');
        if (gh) gh.days[d] = true;
      }

      scheduleSave();
      renderGymWeek();
      if (typeof renderHabits === 'function') renderHabits();
      if (typeof renderTodaySummary === 'function') renderTodaySummary();
    });

    c.appendChild(div);
  });
}

function toggleRestDay(i){
  ensureFitnessState();
  if(!S.workout[i]) S.workout[i]={type:'',rest:false};
  S.workout[i].rest = !S.workout[i].rest;
  if(S.workout[i].rest) S.workout[i].type='Rest';
  else if((S.workout[i].type||'').toLowerCase()==='rest') S.workout[i].type='';
  scheduleSave();
  renderGymWeek();
}

function updateWDay(i, val) {
  ensureFitnessState();

  if (!S.workout[i]) S.workout[i] = { type: '', rest: false, cardId: null };
  S.workout[i].type = val;
  S.workout[i].rest = String(val).trim().toLowerCase() === 'rest';
  S.workout[i].cardId = null; // clear preset link when manually renaming

  scheduleSave();
  renderGymWeek();
}

/* ══ WORKOUT CARDS ══ */
// Track which cards are expanded (by card id)
const _expandedCards = new Set();

function toggleWorkoutCard(id) {
  if (_expandedCards.has(id)) _expandedCards.delete(id);
  else _expandedCards.add(id);
  renderWorkoutCards();
}

function renderWorkoutCards() {
  ensureFitnessState();

  const c = eid('workoutCards');
  c.innerHTML = '';

  if (!S.workoutCards.length) {
    c.innerHTML = `<div style="text-align:center;padding:48px 24px;grid-column:span 2">
      <div style="font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--border-lt);margin-bottom:10px">◆</div>
      <div style="font-size:0.66rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace;margin-bottom:8px">${t('no_workout_cards')}</div>
      <div style="font-size:0.72rem;color:var(--muted-lt);max-width:240px;margin:0 auto;line-height:1.6">${t('no_workout_cards_hint')}</div>
    </div>`;
    return;
  }

  S.workoutCards.forEach(wc => {
    const expanded = _expandedCards.has(wc.id);
    const exCount  = (wc.exercises || []).length;
    const div = document.createElement('div');
    div.className = 'card';

    // Collapsed header — always visible
    const header = `
      <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="toggleWorkoutCard(${wc.id})">
        <input
          class="editable wk-title-inp"
          value="${escapeHtml(wc.title || '')}"
          onchange="updateWCF(${wc.id},'title',this.value)"
          onclick="event.stopPropagation()"
          title="Edit title"
          style="flex:1;background:none;border:none;color:var(--mist);font-size:0.88rem"
        >
        <span style="font-size:0.55rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${exCount} exercise${exCount!==1?'s':''}</span>
        <span style="font-size:0.75rem;color:var(--blush);flex-shrink:0">${expanded ? '▾' : '▸'}</span>
      </div>`;

    // Expanded body
    const body = expanded ? `
      <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
        <div class="exlist">
          ${(wc.exercises || []).map(ex => {
            const last = getLastExerciseLog(ex.name);
            const prev = getPrevExerciseLog(ex.name);
            const pct  = last && prev ? calcPctIncrease(prev.weight, last.weight) : null;
            return `
              <div class="ex-item" style="display:block;">
                <div style="display:flex;align-items:center;gap:7px;">
                  <input class="editable ex-name-inp" value="${escapeHtml(ex.name||'')}" onchange="updateEx(${wc.id},${ex.id},'name',this.value)" title="Edit exercise">
                  <button class="ex-del" onclick="delEx(${wc.id},${ex.id})">✕</button>
                </div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:7px;padding-left:14px;">
                  <input class="add-inp" id="logW-${ex.id}" type="number" step="0.5" placeholder="${t('weight_ph')}" style="width:68px;flex:none;" value="${last?.weight ?? ''}">
                  <input class="add-inp" id="logR-${ex.id}" type="number" placeholder="${t('reps_ph')}" style="width:68px;flex:none;" value="${last?.reps ?? ''}">
                  <input class="add-inp" id="logSets-${ex.id}" type="number" min="1" placeholder="sets" style="width:58px;flex:none;padding-right:14px;" value="${last?.sets ?? 1}" title="Sets">
                  <button class="btn btn-g" style="font-size:0.66rem;padding:4px 9px" onclick="logExercise(${wc.id},${ex.id})">${t('log')}</button>
                </div>
                <div id="lastLog-${ex.id}" style="margin-top:6px;padding-left:14px;font-size:0.64rem;color:var(--muted-lt);font-family:'DM Mono',monospace;">
                  ${last ? `${t('last_colon')} ${last.sets>1?last.sets+' × ':''}${last.weight}kg × ${last.reps}${pct!==null?` <span style="color:var(--gold-lt)">${fmtPct(pct)}</span>`:''}` : t('no_log_yet')}
                </div>
              </div>`;
          }).join('')}
        </div>

        <div class="add-ex-row" style="margin-top:9px">
          <input class="add-inp" id="exN-${wc.id}" placeholder="${t('exercise_ph')}" style="flex:1">
          <button class="btn btn-g" style="font-size:0.68rem;padding:4px 9px" onclick="addEx(${wc.id})">+ ${t('add')}</button>
        </div>

        <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;">
          <button class="btn btn-d" style="font-size:0.66rem;padding:4px 9px" onclick="delWorkoutCard(${wc.id})">${t('remove')}</button>
          <button class="btn btn-p" style="font-size:0.68rem;padding:5px 10px" onclick="logWorkoutSession(${wc.id})">${t('log_session')}</button>
        </div>
      </div>` : '';

    div.innerHTML = header + body;
    c.appendChild(div);
  });
}


function renderTrainingLog(){
  const c = eid('trainingLog');
  if(!c) return;
  c.innerHTML = '';

  const hist = [...(S.workoutHistory||[])].reverse();

  const sec = document.createElement('div');
  sec.className = 'sec';
  sec.style.cssText = 'display:flex;align-items:center;gap:8px';
  sec.innerHTML = `${t('training_log')} <span class="lbl">${hist.length} ${hist.length!==1?t('sessions_plural_s'):t('sessions_plural')}</span><button class="btn btn-g" style="font-size:0.6rem;padding:2px 8px;margin-left:auto" onclick="openTrainingFull()" data-i18n="view_all">View all →</button>`;
  c.appendChild(sec);

  if(!hist.length){
    c.innerHTML += `<div style="text-align:center;padding:40px 24px"><div style="font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--border-lt);margin-bottom:10px">◆</div><div style="font-size:0.66rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace">${t('no_sessions')}</div></div>`;
    return;
  }

  const grouped = {};
  hist.forEach(item => {
    const year  = (item.date||'').slice(0,4);
    const month = (item.date||'').slice(0,7);
    const key   = year + '|' + month;
    if(!grouped[key]) grouped[key]=[];
    grouped[key].push(item);
  });

  const wrap = document.createElement('div');
  wrap.className = 'card';

  // Group by year first
  const years = {};
  Object.keys(grouped).sort().reverse().forEach(key => {
    const [year] = key.split('|');
    if (!years[year]) years[year] = [];
    years[year].push(key);
  });

  Object.keys(years).sort().reverse().forEach(year => {
    const yearLbl = document.createElement('div');
    yearLbl.style.cssText = 'font-size:0.65rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted);font-family:"DM Mono",monospace;padding:12px 0 4px;';
    yearLbl.textContent = year;
    wrap.appendChild(yearLbl);

    years[year].forEach(key => {
      const month = key.split('|')[1];
      const d = new Date(month + '-02');
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--blush);font-family:"DM Mono",monospace;padding:6px 0 4px;border-bottom:1px solid var(--border);margin-bottom:4px;padding-left:8px;';
      lbl.textContent = d.toLocaleDateString('en-US', {month:'long'});
      wrap.appendChild(lbl);

      grouped[key].forEach(item => {
        const row = document.createElement('div');
        row.className = 'ex-item';
        row.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:12px;';
        row.innerHTML = `
          <div style="display:flex;align-items:baseline;gap:10px;flex:1;min-width:0;cursor:pointer" onclick="openSessionDetail(${item.id})">
            <div style="font-size:0.62rem;color:var(--muted-lt);font-family:'DM Mono',monospace;flex-shrink:0">${escapeHtml(item.date||'')}</div>
            <div style="font-size:0.8rem;color:var(--mist);flex-shrink:0">${escapeHtml(item.title||'Workout')}</div>
            <div style="font-size:0.68rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.summary||'')}</div>
          </div>
          <button class="habit-del" style="opacity:0.4" onclick="deleteWorkoutSession(${item.id})">✕</button>
        `;
        wrap.appendChild(row);
      }); // grouped[key]
    }); // years[year]
  }); // years

  c.appendChild(wrap);
}

function openSessionDetail(id){
  const s = (S.workoutHistory||[]).find(s => s.id === id);
  if(!s) return;
  eid('sdTitle').textContent = s.title || 'Workout';
  eid('sdDate').textContent = s.date || '';
  const ex = eid('sdExercises');
  if(s.exercises && s.exercises.length){
    ex.innerHTML = s.exercises.map(e => {
      // Support both old flat format { weight, reps, sets } and new { loggedSets: [...] }
      const setsArr = Array.isArray(e.loggedSets) ? e.loggedSets
        : (e.weight != null ? [{ weight: e.weight, reps: e.reps, sets: e.sets }] : []);
      return `
        <div style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="font-size:0.82rem;color:var(--mist);margin-bottom:5px">${escapeHtml(e.name||'')}</div>
          ${setsArr.map((set, i) => `
            <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--muted-lt);padding:2px 0;font-family:'DM Mono',monospace">
              <span style="color:var(--muted)">Set ${i + 1}</span>
              <span>${set.weight != null ? set.weight + 'kg' : ''}${set.weight != null && set.reps != null ? ' × ' : ''}${set.reps != null ? set.reps + ' reps' : ''}</span>
            </div>`).join('')}
        </div>`;
    }).join('');
  } else {
    ex.innerHTML = `<div style="font-size:0.75rem;color:var(--muted);text-align:center;padding:20px">${escapeHtml(s.summary||t('no_exercise_data'))}</div>`;
  }
  openModal('mSessionDetail');
}

function deleteWorkoutSession(id){
  const session = (S.workoutHistory||[]).find(s=>s.id===id);
  S.workoutHistory = (S.workoutHistory||[]).filter(s=>s.id!==id);
  // If no more sessions on that date, un-tick gymLog for that day
  if (session) {
    const remaining = (S.workoutHistory||[]).filter(s=>s.date===session.date);
    if (!remaining.length) delete S.gymLog[session.date];
  }
  scheduleSave();
  renderTrainingLog();
}

function addWorkoutCard(){
  ensureFitnessState();
  S.workoutCards.push({id:Date.now(),title:t('new_block'),subtitle:'',exercises:[]});
  scheduleSave();
  renderWorkoutCards();
}

function delWorkoutCard(id){
  if(!confirm(t('remove_workout_card')))return;
  S.workoutCards=S.workoutCards.filter(w=>w.id!==id);
  scheduleSave();
  renderWorkoutCards();
}

/* ══ WORKOUT TEMPLATE EDITING ══ */
function updateWCF(id, f, v) {
  ensureFitnessState();
  const wc = S.workoutCards.find(w => w.id === id);
  if (!wc) return;
  wc[f] = v;
  scheduleSave();
}

function updateEx(wcId, exId, f, v) {
  ensureFitnessState();
  const wc = S.workoutCards.find(w => w.id === wcId);
  if (!wc) return;

  const ex = (wc.exercises || []).find(e => e.id === exId);
  if (!ex) return;

  ex[f] = v;
  scheduleSave();
  renderWorkoutCards();
}

function delEx(wcId, exId) {
  ensureFitnessState();
  const wc = S.workoutCards.find(w => w.id === wcId);
  if (!wc) return;

  wc.exercises = (wc.exercises || []).filter(e => e.id !== exId);
  scheduleSave();
  renderWorkoutCards();
}

function addEx(wcId) {
  ensureFitnessState();

  const name = eid(`exN-${wcId}`).value.trim();
  if (!name) return;

  const wc = S.workoutCards.find(w => w.id === wcId);
  if (!wc) return;

  if (!Array.isArray(wc.exercises)) wc.exercises = [];
  wc.exercises.push({ id: Date.now(), name });

  eid(`exN-${wcId}`).value = '';

  scheduleSave();
  renderWorkoutCards();
}

/* ══ EXERCISE LOGGING ══ */
function logExercise(wcId, exId) {
  ensureFitnessState();

  const wc = S.workoutCards.find(w => w.id === wcId);
  if (!wc) return;

  const ex = (wc.exercises || []).find(e => e.id === exId);
  if (!ex) return;

  const weight = parseFloat(eid(`logW-${exId}`).value);
  const reps = parseInt(eid(`logR-${exId}`).value, 10);
  const setsEl = eid(`logSets-${exId}`);
  const setsCount = setsEl ? (parseInt(setsEl.value, 10) || 1) : 1;

  if (!weight || weight <= 0) {
    toast(t('enter_weight'));
    return;
  }

  const entry = {
    date: today(),
    weight,
    reps: reps || 0,
    sets: setsCount
  };

  const hist = getExerciseHistory(ex.name);
  hist.push(entry);

  // Keep current input values — do NOT reset so other exercise inputs are preserved
  if (setsEl) setsEl.value = setsCount;

  // Update only the last-log display for this exercise (no full re-render)
  const lastLogDiv = eid(`lastLog-${exId}`);
  if (lastLogDiv) {
    const prev = hist.length >= 2 ? hist[hist.length - 2] : null;
    const pct = prev ? calcPctIncrease(prev.weight, entry.weight) : null;
    lastLogDiv.innerHTML = `${t('last_colon')} ${setsCount > 1 ? setsCount + ' × ' : ''}${weight}kg × ${reps || 0}${pct !== null ? ` <span style="color:var(--gold-lt)">${fmtPct(pct)}</span>` : ''}`;
    const pctVal = hist.length >= 2 ? calcPctIncrease(hist[hist.length - 2].weight, weight) : null;
    if (pctVal !== null && pctVal > 0) toast(`${ex.name}: ${fmtPct(pctVal)} ${t('from_last_log')}`);
    else toast(`${ex.name} ${t('exercise_logged')}`);
  }

  scheduleSave();
}

function logWorkoutSession(wcId) {
  ensureFitnessState();

  const wc = S.workoutCards.find(w => w.id === wcId);
  if (!wc) return;

  const summary = exercises
    .map(ex => {
      const best = (ex.loggedSets || []).reduce((b, s) => (!b || (parseFloat(s.weight)||0) > (parseFloat(b.weight)||0)) ? s : b, null);
      return best ? `${ex.name} ${best.weight}kg×${best.reps}` : null;
    })
    .filter(Boolean)
    .slice(0, 5)
    .join(' · ');

  const todayStr = today();
  const exercises = (wc.exercises||[]).map(ex => {
    const todaySets = (S.exerciseHistory[ex.name] || []).filter(e => e.date === todayStr);
    if (!todaySets.length) {
      const last = getLastExerciseLog(ex.name);
      return last ? { name: ex.name, loggedSets: [{ weight: last.weight, reps: last.reps, sets: last.sets }] } : null;
    }
    return { name: ex.name, loggedSets: todaySets };
  }).filter(Boolean);

  S.workoutHistory.push({
    id: Date.now(),
    cardId: wc.id,
    title: wc.title || 'Workout',
    date: today(),
    summary: summary || 'Session completed',
    exercises
  });

  const gh = hfind('gym','lift','workout','training','weights');
  if (gh) gh.days[today()] = true;
  S.gymLog[today()] = true;

  // Auto-link this card to today in the training week
  const week = weekDays();
  const todayIdx = week.indexOf(today());
  if (todayIdx >= 0) {
    if (!S.workout[todayIdx]) S.workout[todayIdx] = {};
    S.workout[todayIdx].cardId = wc.id;
    S.workout[todayIdx].type   = wc.title || 'Workout';
    S.workout[todayIdx].rest   = false;
  }

  scheduleSave();
  renderWorkoutCards();
  renderGymWeek();
  renderTrainingLog();
  if (typeof renderHabits === 'function') renderHabits();

  toast(`${wc.title || t('workout')} ${t('workout_saved')}`);
}

/* ══ CARDIO ══ */
function renderCardioSection() {
  const wdEl = eid('weightDate');
  if (wdEl && !wdEl.value) wdEl.value = today();
  renderCardioHistory();
  renderWeightLog();
}

function renderCardioHistory() {
  const c = eid('cardioHistory');
  if (!c) return;
  ensureFitnessState();
  const hist = [...(S.cardioHistory || [])].reverse();
  if (!hist.length) {
    c.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:0.7rem;font-family:'DM Mono',monospace">${t('no_cardio_sessions')}</div>`;
    return;
  }

  // Group by year-month
  const grouped = {};
  hist.forEach(s => {
    const key = (s.date || '').slice(0, 7);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  c.innerHTML = Object.keys(grouped).sort().reverse().map(month => {
    const d = new Date(month + '-02');
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const rows = grouped[month].map(s => {
      const meta = [s.duration, s.distance, s.steps ? s.steps.toLocaleString() + ' steps' : ''].filter(Boolean).join(' · ');
      return `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;gap:8px;align-items:baseline;flex:1;min-width:0">
          <span style="font-size:0.58rem;color:var(--muted-lt);font-family:'DM Mono',monospace;flex-shrink:0">${escapeHtml(s.date||'')}</span>
          <span style="font-size:0.78rem;color:var(--mist)">${escapeHtml(s.activity||'Cardio')}</span>
          ${meta ? `<span style="font-size:0.64rem;color:var(--muted)">${escapeHtml(meta)}</span>` : ''}
        </div>
        <button class="habit-del" style="opacity:0.4" onclick="deleteCardioSession(${s.id})">✕</button>
      </div>`;
    }).join('');
    return `<div style="font-size:0.55rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--blush);font-family:'DM Mono',monospace;padding:8px 0 4px;border-bottom:1px solid var(--border);margin-bottom:2px">${label}</div>${rows}`;
  }).join('');
}

function logCardioSession() {
  ensureFitnessState();
  const activity = (eid('cardioActivity').value || '').trim();
  const duration = (eid('cardioDuration').value || '').trim();
  const distance = (eid('cardioDistance').value || '').trim();
  const stepsVal = eid('cardioSteps').value;
  const steps    = stepsVal ? parseInt(stepsVal, 10) : null;
  const dateVal  = eid('cardioDate').value || today();
  if (!activity) return;
  if (!S.cardioHistory) S.cardioHistory = [];
  S.cardioHistory.push(makeCardioSession({ activity, duration, distance, steps, date: dateVal }));
  scheduleSave();
  eid('cardioActivity').value  = '';
  eid('cardioDuration').value  = '';
  eid('cardioDistance').value  = '';
  eid('cardioSteps').value     = '';
  eid('cardioDate').value      = today();
  renderCardioHistory();
  if (typeof renderHabits === 'function') renderHabits();
  toast(t('cardio_logged'));
}

function deleteCardioSession(id) {
  S.cardioHistory = (S.cardioHistory || []).filter(s => s.id !== id);
  scheduleSave();
  renderCardioHistory();
}

function renderCalorieSection() {
  const mode = (S.appPrefs && S.appPrefs.calorieMode) || 'meal';
  const mealInp = eid('calorieMeal');
  if (mealInp) mealInp.style.display = mode === 'meal' ? '' : 'none';
  const btn = eid('calorieModeBtn');
  if (btn) btn.textContent = mode === 'meal' ? 'Meal mode' : 'Daily mode';
  const dateEl = eid('calorieDate');
  if (dateEl && !dateEl.value) dateEl.value = today();
  renderCalorieHistory();
}

function toggleCalorieMode() {
  if (!S.appPrefs) S.appPrefs = {};
  S.appPrefs.calorieMode = (S.appPrefs.calorieMode === 'daily') ? 'meal' : 'daily';
  scheduleSave();
  renderCalorieSection();
}

function renderCalorieHistory() {
  const c = eid('calorieHistory');
  if (!c) return;
  ensureFitnessState();
  const hist = [...(S.calorieHistory || [])].reverse();
  if (!hist.length) {
    c.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:0.7rem;font-family:'DM Mono',monospace">${t('no_calorie_sessions') || 'No entries logged yet.'}</div>`;
    return;
  }
  c.innerHTML = hist.slice(0, 20).map(s => `
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--blush-dim)">
      <div style="display:flex;gap:10px;align-items:baseline;flex:1">
        <span style="font-size:0.6rem;color:var(--muted-lt);font-family:'DM Mono',monospace;flex-shrink:0">${escapeHtml(s.date||'')}</span>
        <span style="font-size:0.8rem;color:var(--mist)">${escapeHtml(s.description||'Meal')}</span>
        ${s.calories ? `<span style="font-size:0.68rem;color:var(--gold-lt);font-family:'DM Mono',monospace">${escapeHtml(String(s.calories))} kcal</span>` : ''}
      </div>
      <button class="habit-del" style="opacity:0.4" onclick="deleteCalorieSession(${s.id})">✕</button>
    </div>
  `).join('');
}

function logCalorieSession() {
  ensureFitnessState();
  const mode        = (S.appPrefs && S.appPrefs.calorieMode) || 'meal';
  const mealEl      = eid('calorieMeal');
  const description = mode === 'meal' ? ((mealEl && mealEl.value) || '').trim() : 'Daily Total';
  const calories    = parseFloat(eid('calorieAmount').value || '');
  const dateVal     = eid('calorieDate').value || today();
  if (!calories) return;
  if (!Array.isArray(S.calorieHistory)) S.calorieHistory = [];
  S.calorieHistory.push({ id: Date.now(), date: dateVal, description, calories });
  scheduleSave();
  if (mealEl) mealEl.value = '';
  eid('calorieAmount').value = '';
  eid('calorieDate').value   = today();
  renderCalorieHistory();
  toast(t('calories_logged') || 'Calories logged.');
}

function deleteCalorieSession(id) {
  S.calorieHistory = (S.calorieHistory || []).filter(s => s.id !== id);
  scheduleSave();
  renderCalorieHistory();
}

/* ══ WORKOUT PRESETS ══ */
function assignPreset(dayIndex, cardId) {
  ensureFitnessState();
  const id = parseInt(cardId, 10);
  if (!id) return;
  const wc = (S.workoutCards || []).find(w => w.id === id);
  if (!wc) return;
  if (!S.workout[dayIndex]) S.workout[dayIndex] = { type: '', rest: false, cardId: null };
  S.workout[dayIndex].cardId = wc.id;
  S.workout[dayIndex].type = wc.title || '';
  S.workout[dayIndex].rest = false;
  scheduleSave();
  renderGymWeek();
}

function unlinkPreset(dayIndex) {
  ensureFitnessState();
  if (!S.workout[dayIndex]) return;
  S.workout[dayIndex].cardId = null;
  scheduleSave();
  renderGymWeek();
}

function scrollToCard(cardId) {
  go('fitness', document.querySelector('.tab[onclick*="fitness"]'));
  setTimeout(() => {
    const idx = (S.workoutCards || []).findIndex(w => w.id === cardId);
    const cards = eid('workoutCards');
    if (idx >= 0 && cards && cards.children[idx]) {
      cards.children[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 60);
}

/* ══ FULL TRAINING LOG ══ */
function openTrainingFull() {
  eid('tfSearch').value = '';
  renderTrainingFullList('');
  openModal('mTrainingFull');
}

function filterTrainingFull(query) {
  renderTrainingFullList(query.toLowerCase().trim());
}

function renderTrainingFullList(query) {
  const hist = [...(S.workoutHistory || [])].reverse();
  const filtered = query
    ? hist.filter(item =>
        (item.title || '').toLowerCase().includes(query) ||
        (item.exercises || []).some(e => (e.name || '').toLowerCase().includes(query))
      )
    : hist;

  const grouped = {};
  filtered.forEach(item => {
    const month = (item.date || '').slice(0, 7);
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(item);
  });

  const c = eid('tfList');
  c.innerHTML = '';

  if (!filtered.length) {
    c.innerHTML = `<div style="text-align:center;padding:32px 0;font-size:0.72rem;color:var(--muted)">${t('no_sessions')}</div>`;
    return;
  }

  Object.keys(grouped).sort().reverse().forEach(month => {
    const lbl = document.createElement('div');
    lbl.style.cssText = 'font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--blush);font-family:"DM Mono",monospace;padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px;';
    const d = new Date(month + '-02');
    lbl.textContent = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    c.appendChild(lbl);

    grouped[month].forEach(item => {
      const row = document.createElement('div');
      row.style.cssText = 'border-bottom:1px solid var(--border);';
      row.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;cursor:pointer;gap:8px" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <div style="display:flex;gap:10px;align-items:baseline;min-width:0">
            <span style="font-size:0.62rem;color:var(--muted-lt);font-family:'DM Mono',monospace;flex-shrink:0">${escapeHtml(item.date||'')}</span>
            <span style="font-size:0.82rem;color:var(--mist);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.title||'Workout')}</span>
          </div>
          <span style="font-size:0.68rem;color:var(--muted);flex-shrink:0">▸</span>
        </div>
        <div style="display:none;padding:6px 0 10px 12px">
          ${(item.exercises||[]).map(e=>`
            <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.76rem">
              <span style="color:var(--mist)">${escapeHtml(e.name||'')}</span>
              <span style="color:var(--muted-lt);font-family:'DM Mono',monospace">${[e.sets,e.weight!=null?e.weight+'kg':null,e.reps!=null?e.reps+' reps':null].filter(Boolean).join(' · ')}</span>
            </div>`).join('')}
          ${!(item.exercises||[]).length?`<div style="font-size:0.72rem;color:var(--muted)">${escapeHtml(item.summary||'')}</div>`:''}
        </div>`;
      c.appendChild(row);
    });
  });
}
