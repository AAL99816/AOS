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
  const entry = { id: uid(), date, weight: kg, notes };
  if (idx >= 0) S.weightLog[idx] = entry;
  else S.weightLog.push(entry);

  eid('weightKg').value    = '';
  eid('weightNotes').value = '';
  scheduleSave();
  renderWeightLog();
  toast('Weight logged');
}

let _weightLogExpanded = false;

function _weightWeeklyTrend(entries) {
  if (entries.length < 2) return null;
  const latest = entries[0];
  const cutoff = new Date(latest.date);
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  // Find closest entry at or before cutoff
  const ref = entries.find(e => e.date <= cutoffStr);
  if (!ref) return null;
  return ((latest.weight - ref.weight) / ref.weight) * 100;
}

function _weightSparklineSVG(ascEntries) {
  if (ascEntries.length < 2) return '';
  const W = 300, H = 56, PAD = 4;
  const weights = ascEntries.map(e => +e.weight).filter(Number.isFinite);
  if (weights.length < 2) return '';
  const mn = Math.min(...weights), mx = Math.max(...weights);
  const range = mx - mn || 1;
  const pts = ascEntries.map((e, i) => {
    const x = PAD + (i / (ascEntries.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((+e.weight - mn) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const lastX = (PAD + (W - PAD * 2)).toFixed(1);
  const firstX = PAD.toFixed(1);
  const fillD = `M ${pts[0]} L ${pts.join(' L ')} L ${lastX},${H} L ${firstX},${H} Z`;
  const minLbl = mn.toFixed(1), maxLbl = mx.toFixed(1);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="display:block;width:100%;height:56px;margin-bottom:8px">
    <defs>
      <linearGradient id="wSparkGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c9a96e" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#c9a96e" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <path d="${fillD}" fill="url(#wSparkGrad)"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="#c9a96e" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    <text x="${PAD}" y="${H - 1}" font-size="8" fill="#7a7a7a" font-family="monospace">${minLbl}</text>
    <text x="${PAD}" y="10" font-size="8" fill="#7a7a7a" font-family="monospace">${maxLbl}</text>
  </svg>`;
}

function renderWeightLog() {
  ensureFitnessState();
  const c = eid('weightHistory');
  if (!c) return;
  const allEntries = [...S.weightLog].sort((a, b) => b.date.localeCompare(a.date));
  if (!allEntries.length) { c.innerHTML = ''; return; }

  const trend = _weightWeeklyTrend(allEntries);
  const trendStr = trend === null ? '' :
    `<span style="font-size:0.62rem;font-family:'DM Mono',monospace;color:${trend < 0 ? 'var(--gold-lt)' : trend > 0 ? 'var(--petal)' : 'var(--muted)'};margin-left:8px">${trend > 0 ? '+' : ''}${trend.toFixed(1)}% / wk</span>`;

  const entryRow = e =>
    `<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid var(--border-lt);font-size:0.78rem">
      <span style="color:var(--muted);font-family:'DM Mono',monospace;font-size:0.7rem;min-width:80px">${e.date}</span>
      <span style="color:var(--cream);font-weight:600">${e.weight} kg</span>
      ${e.notes ? `<span style="color:var(--muted-lt);flex:1;font-size:0.7rem">${escapeHtml(e.notes)}</span>` : '<span style="flex:1"></span>'}
      <button onclick="deleteWeightEntry('${e.date}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.8rem;padding:0 4px">×</button>
    </div>`;

  const chartEntries = allEntries.slice(0, 30).reverse(); // ascending for chart
  const sparkline = _weightSparklineSVG(chartEntries);

  if (_weightLogExpanded) {
    const shown = allEntries.slice(0, 30);
    c.innerHTML =
      `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:0.65rem;color:var(--muted);font-family:'DM Mono',monospace">${allEntries.length} entries${trendStr}</span>
        <button onclick="_weightLogExpanded=false;renderWeightLog()" style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:0.72rem;padding:0">Collapse ▴</button>
      </div>
      ${sparkline}
      ${shown.map(entryRow).join('')}
      ${allEntries.length > 30 ? `<div style="font-size:0.62rem;color:var(--muted);text-align:center;padding:6px 0">Showing 30 of ${allEntries.length}</div>` : ''}`;
  } else {
    const preview = allEntries.slice(0, 4);
    c.innerHTML =
      `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:0.65rem;color:var(--muted);font-family:'DM Mono',monospace">${allEntries.length} entries${trendStr}</span>
        <button onclick="_weightLogExpanded=true;renderWeightLog()" style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:0.72rem;padding:0">View all ▾</button>
      </div>
      ${sparkline}
      ${preview.map(entryRow).join('')}`;
  }
}

function deleteWeightEntry(date) {
  ensureFitnessState();
  const entry = S.weightLog.find(e => e.date === date);
  S.weightLog = S.weightLog.filter(e => e.date !== date);
  scheduleSave();
  renderWeightLog();
  if (entry) {
    toastUndo(`${entry.weight}kg entry removed`, () => {
      if (!Array.isArray(S.weightLog)) S.weightLog = [];
      S.weightLog.push(entry);
      scheduleSave();
      renderWeightLog();
    });
  }
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
      `<option value="${wc.id}"${String(wd.cardId)===String(wc.id)?' selected':''}>${escapeHtml(wc.title||'')}</option>`
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
      ${!isRest && wd.cardId ? `<button onclick="event.stopPropagation();scrollToCard('${wd.cardId}')" style="margin-top:3px;background:none;border:1px solid var(--border-hi);border-radius:5px;color:var(--blush);font-size:0.5rem;font-family:'DM Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;padding:2px 5px;cursor:pointer">Log →</button>` : ''}
    `;

    div.addEventListener('click', () => {
      if (isRest) return;

      const wasDone = !!S.gymLog[d];
      S.gymLog[d] = !wasDone;

      const gh = hfind('gym','lift','workout','training','weights');
      if (S.gymLog[d]) {
        if (gh) gh.days[d] = true;
      } else {
        if (gh) delete gh.days[d];
      }

      scheduleSave();
      renderGymWeek();
      if (typeof renderHabits === 'function') renderHabits();
      if (typeof renderTodaySummary === 'function') renderTodaySummary();

      toastUndo(S.gymLog[d] ? `${d} marked trained` : `${d} unmarked`, () => {
        S.gymLog[d] = wasDone;
        if (gh) { if (wasDone) gh.days[d] = true; else delete gh.days[d]; }
        scheduleSave();
        renderGymWeek();
        if (typeof renderHabits === 'function') renderHabits();
      });
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
  S.workout[i].type = String(val).trim().slice(0, 60);
  S.workout[i].rest = String(val).trim().toLowerCase() === 'rest';
  S.workout[i].cardId = null; // clear preset link when manually renaming

  scheduleSave();
  renderGymWeek();
}

/* ══ WORKOUT CARDS ══ */
// Track which cards are expanded (by card id)
const _expandedCards = new Set();

function toggleWorkoutCard(id) {
  const key = String(id);
  if (_expandedCards.has(key)) _expandedCards.delete(key);
  else _expandedCards.add(key);
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
    const expanded = _expandedCards.has(String(wc.id));
    const exCount  = (wc.exercises || []).length;
    const div = document.createElement('div');
    div.className = 'card';

    // Collapsed header — always visible
    const header = `
      <div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="toggleWorkoutCard('${wc.id}')">
        <input
          class="editable wk-title-inp"
          value="${escapeHtml(wc.title || '')}"
          onchange="updateWCF('${wc.id}','title',this.value)"
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
            // Progressive overload: suggest last weight +2.5kg if previous session was clean
            const overloadHint  = last && pct === null && prev === null ? '' :
              (last && last.reps >= 8 && last.weight > 0 ? `<span style="color:var(--gold);margin-left:6px" title="Suggested increase">↑ try ${last.weight + 2.5}kg</span>` : '');
            return `
              <div class="ex-item" style="display:block;">
                <div style="display:flex;align-items:center;gap:7px;">
                  <input class="editable ex-name-inp" value="${escapeHtml(ex.name||'')}" onchange="updateEx('${wc.id}','${ex.id}','name',this.value)" title="Edit exercise" list="exerciseNameList">
                  <button class="ex-del" onclick="delEx('${wc.id}','${ex.id}')">✕</button>
                </div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:7px;padding-left:14px;">
                  <input class="add-inp" id="logW-${ex.id}" type="number" step="0.5" placeholder="${t('weight_ph')}" style="width:68px;flex:none;" value="${last?.weight ?? ''}">
                  <input class="add-inp" id="logR-${ex.id}" type="number" placeholder="${t('reps_ph')}" style="width:68px;flex:none;" value="${last?.reps ?? ''}">
                  <input class="add-inp" id="logSets-${ex.id}" type="number" min="1" placeholder="sets" style="width:58px;flex:none;padding-right:14px;" value="${last?.sets ?? 1}" title="Sets">
                  <button class="btn btn-g" style="font-size:0.66rem;padding:4px 9px" onclick="logExercise('${wc.id}','${ex.id}')">${t('log')}</button>
                </div>
                <div id="lastLog-${ex.id}" style="margin-top:6px;padding-left:14px;font-size:0.64rem;color:var(--muted-lt);font-family:'DM Mono',monospace;">
                  ${last ? `${t('last_colon')} ${last.sets>1?last.sets+' × ':''}${last.weight}kg × ${last.reps}${pct!==null?` <span style="color:${pct>0?'var(--gold-lt)':'var(--petal)'}">${fmtPct(pct)}</span>`:''}${overloadHint}` : t('no_log_yet')}
                </div>
              </div>`;
          }).join('')}
        </div>

        <div class="add-ex-row" style="margin-top:9px">
          <input class="add-inp" id="exN-${wc.id}" placeholder="${t('exercise_ph')}" style="flex:1" list="exerciseNameList">
          <button class="btn btn-g" style="font-size:0.68rem;padding:4px 9px" onclick="addEx('${wc.id}')">+ ${t('add')}</button>
        </div>

        <textarea id="sessionNote-${wc.id}" placeholder="Session notes…" style="display:block;width:100%;box-sizing:border-box;margin-top:10px;background:var(--mid);border:1px solid var(--border);border-radius:6px;color:var(--muted);font-size:0.7rem;font-family:'DM Mono',monospace;resize:none;padding:7px 10px;min-height:44px;outline:none;line-height:1.5"></textarea>

        <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:8px">
          <button class="btn btn-d" style="font-size:0.66rem;padding:4px 9px" onclick="delWorkoutCard('${wc.id}')">${t('remove')}</button>
          <div style="display:flex;gap:6px">
            <button class="btn btn-g" style="font-size:0.66rem;padding:4px 9px" onclick="repeatLastWorkout('${wc.id}')" title="Pre-fill with last session's values">Repeat Last</button>
            <button class="btn btn-p" style="font-size:0.68rem;padding:5px 10px" onclick="logWorkoutSession('${wc.id}')">${t('log_session')}</button>
          </div>
        </div>
      </div>` : '';

    div.innerHTML = header + body;
    c.appendChild(div);
  });

  _refreshExerciseDatalist();
}


let _trainingLogLimit = 30;

function renderTrainingLog(){
  const c = eid('trainingLog');
  if(!c) return;
  c.innerHTML = '';

  const histAll = [...(S.workoutHistory||[])].reverse();
  const hist    = histAll.slice(0, _trainingLogLimit);

  const sec = document.createElement('div');
  sec.className = 'sec';
  sec.style.cssText = 'display:flex;align-items:center;gap:8px';
  sec.innerHTML = `${t('training_log')} <span class="lbl">${histAll.length} ${histAll.length!==1?t('sessions_plural_s'):t('sessions_plural')}</span><button class="btn btn-g" style="font-size:0.6rem;padding:2px 8px;margin-left:auto" onclick="openTrainingFull()" data-i18n="view_all">View all →</button>`;
  c.appendChild(sec);

  if(!histAll.length){
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
          <div style="display:flex;align-items:baseline;gap:10px;flex:1;min-width:0;cursor:pointer" onclick="openSessionDetail('${item.id}')">
            <div style="font-size:0.62rem;color:var(--muted-lt);font-family:'DM Mono',monospace;flex-shrink:0">${escapeHtml(item.date||'')}</div>
            <div style="font-size:0.8rem;color:var(--mist);flex-shrink:0">${escapeHtml(item.title||'Workout')}</div>
            <div style="font-size:0.68rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(item.summary||'')}</div>
          </div>
          <button class="habit-del" style="opacity:0.4" onclick="deleteWorkoutSession('${item.id}')">✕</button>
        `;
        wrap.appendChild(row);
      }); // grouped[key]
    }); // years[year]
  }); // years

  c.appendChild(wrap);

  if (histAll.length > _trainingLogLimit) {
    const more = document.createElement('button');
    more.className = 'btn btn-g';
    more.style.cssText = 'width:100%;margin-top:10px;font-size:0.68rem';
    more.textContent = `Load more (${histAll.length - _trainingLogLimit} remaining)`;
    more.onclick = () => { _trainingLogLimit += 30; renderTrainingLog(); };
    c.appendChild(more);
  }
}

function openSessionDetail(id){
  const s = (S.workoutHistory||[]).find(s => String(s.id) === String(id));
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
          ${(() => {
            // Expand loggedSets entries: each entry may represent multiple sets (entry.sets > 1)
            const rows = [];
            setsArr.forEach(set => {
              const count = (parseInt(set.sets) || 1);
              for (let i = 0; i < count; i++) rows.push(set);
            });
            return rows.map((set, i) => `
              <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--muted-lt);padding:2px 0;font-family:'DM Mono',monospace">
                <span style="color:var(--muted)">Set ${i + 1}</span>
                <span>${set.weight != null ? set.weight + 'kg' : ''}${set.weight != null && set.reps != null ? ' \u00d7 ' : ''}${set.reps != null ? set.reps + ' reps' : ''}</span>
              </div>`).join('');
          })()}
        </div>`;
    }).join('');
  } else {
    ex.innerHTML = `<div style="font-size:0.75rem;color:var(--muted);text-align:center;padding:20px">${escapeHtml(s.summary||t('no_exercise_data'))}</div>`;
  }
  // Session notes
  const sdNotes = eid('sdNotes');
  if (sdNotes) {
    if (s.notes) {
      sdNotes.textContent = s.notes;
      sdNotes.style.display = '';
    } else {
      sdNotes.style.display = 'none';
    }
  }
  openModal('mSessionDetail');
}

function deleteWorkoutSession(id){
  const session = (S.workoutHistory||[]).find(s=>String(s.id)===String(id));
  const backup  = session ? JSON.parse(JSON.stringify(session)) : null;
  S.workoutHistory = (S.workoutHistory||[]).filter(s=>String(s.id)!==String(id));
  // If no more sessions on that date, un-tick gymLog for that day
  if (session) {
    const remaining = (S.workoutHistory||[]).filter(s=>s.date===session.date);
    if (!remaining.length) {
      delete S.gymLog[session.date];
      if (typeof renderGymWeek === 'function') renderGymWeek();
      if (typeof renderHabits === 'function') renderHabits();
    }
  }
  scheduleSave();
  renderTrainingLog();
  if (backup) {
    toastUndo(`Session "${backup.title||'Workout'}" removed`, () => {
      if (!Array.isArray(S.workoutHistory)) S.workoutHistory = [];
      S.workoutHistory.push(backup);
      scheduleSave();
      renderTrainingLog();
    });
  }
}

/* Pre-fill all exercise inputs with last-logged values for this card */
function repeatLastWorkout(wcId) {
  ensureFitnessState();
  const wc = S.workoutCards.find(w => String(w.id) === String(wcId));
  if (!wc) return;
  let filled = 0;
  (wc.exercises || []).forEach(ex => {
    const last = getLastExerciseLog(ex.name);
    if (!last) return;
    const wEl = eid(`logW-${ex.id}`);
    const rEl = eid(`logR-${ex.id}`);
    const sEl = eid(`logSets-${ex.id}`);
    if (wEl) { wEl.value = last.weight; filled++; }
    if (rEl) rEl.value = last.reps;
    if (sEl) sEl.value = last.sets || 1;
  });
  toast(filled ? `Filled ${filled} exercise${filled !== 1 ? 's' : ''} from last session` : 'No previous data for this card');
}

/* Keep the exercise autocomplete datalist current */
function _refreshExerciseDatalist() {
  const dl = eid('exerciseNameList');
  if (!dl) return;
  // All DB names + custom exercise names + any legacy history keys not in DB
  const dbNames = (typeof EXERCISE_DB !== 'undefined' ? EXERCISE_DB : []).map(e => e.name);
  const customNames = (S.customExercises || []).map(e => e.name);
  const histNames = Object.keys(S.exerciseHistory || {}).filter(n => n && n.trim());
  const allNames = [...new Set([...dbNames, ...customNames, ...histNames])].sort();
  dl.innerHTML = allNames.map(n => `<option value="${escapeAttr(n)}">`).join('');
}

/* Migrate name-keyed exerciseHistory entries to canonical names from EXERCISE_DB.
   Called once on boot. Unmatched entries kept as-is (custom exercises). */
function migrateExerciseHistory() {
  if (typeof EXERCISE_DB === 'undefined') return;
  if (!S.exerciseHistory) return;
  const newHist = {};
  for (const [key, entries] of Object.entries(S.exerciseHistory)) {
    const match = EXERCISE_DB.find(e => e.name.toLowerCase() === key.toLowerCase());
    const canonicalKey = match ? match.name.toLowerCase() : key;
    if (!newHist[canonicalKey]) newHist[canonicalKey] = [];
    newHist[canonicalKey] = [...newHist[canonicalKey], ...entries];
  }
  S.exerciseHistory = newHist;
}

function addWorkoutCard(){
  ensureFitnessState();
  S.workoutCards.push({id:uid(),title:t('new_block'),subtitle:'',exercises:[]});
  scheduleSave();
  renderWorkoutCards();
}

function delWorkoutCard(id){
  if(!confirm(t('remove_workout_card')))return;
  S.workoutCards=S.workoutCards.filter(w=>String(w.id)!==String(id));
  scheduleSave();
  renderWorkoutCards();
}

/* ══ WORKOUT TEMPLATE EDITING ══ */
function updateWCF(id, f, v) {
  ensureFitnessState();
  const wc = S.workoutCards.find(w => String(w.id) === String(id));
  if (!wc) return;
  wc[f] = v;
  scheduleSave();
}

function updateEx(wcId, exId, f, v) {
  ensureFitnessState();
  const wc = S.workoutCards.find(w => String(w.id) === String(wcId));
  if (!wc) return;

  const ex = (wc.exercises || []).find(e => String(e.id) === String(exId));
  if (!ex) return;

  ex[f] = v;
  scheduleSave();
  renderWorkoutCards();
}

function delEx(wcId, exId) {
  ensureFitnessState();
  const wc = S.workoutCards.find(w => String(w.id) === String(wcId));
  if (!wc) return;

  const ex = (wc.exercises || []).find(e => String(e.id) === String(exId));
  wc.exercises = (wc.exercises || []).filter(e => String(e.id) !== String(exId));

  // Clean up exercise history so deleted exercises don't ghost in PBs
  if (ex && ex.name) {
    const key = normExerciseKey(ex.name);
    // Only remove if no other card still has an exercise with the same name
    const stillUsed = (S.workoutCards || []).some(w =>
      (w.exercises || []).some(e => normExerciseKey(e.name) === key)
    );
    if (!stillUsed) delete S.exerciseHistory[key];
  }

  scheduleSave();
  renderWorkoutCards();
}

function addEx(wcId) {
  ensureFitnessState();

  const name = eid(`exN-${wcId}`).value.trim();
  if (!name) return;

  const wc = S.workoutCards.find(w => String(w.id) === String(wcId));
  if (!wc) return;

  if (!Array.isArray(wc.exercises)) wc.exercises = [];
  wc.exercises.push({ id: uid(), name });

  eid(`exN-${wcId}`).value = '';

  scheduleSave();
  renderWorkoutCards();
}

/* ══ EXERCISE LOGGING ══ */
function logExercise(wcId, exId) {
  ensureFitnessState();

  const wc = S.workoutCards.find(w => String(w.id) === String(wcId));
  if (!wc) return;

  const ex = (wc.exercises || []).find(e => String(e.id) === String(exId));
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

  const wc = S.workoutCards.find(w => String(w.id) === String(wcId));
  if (!wc) return;

  const todayStr = today();
  const exercises = (wc.exercises||[]).map(ex => {
    const key = normExerciseKey(ex.name);
    const todaySets = (S.exerciseHistory[key] || []).filter(e => e.date === todayStr);
    if (!todaySets.length) {
      const last = getLastExerciseLog(ex.name);
      return last ? { name: ex.name, loggedSets: [{ weight: last.weight, reps: last.reps, sets: last.sets }] } : null;
    }
    return { name: ex.name, loggedSets: todaySets };
  }).filter(Boolean);

  const summary = exercises
    .map(ex => {
      const best = (ex.loggedSets || []).reduce((b, s) => (!b || (parseFloat(s.weight)||0) > (parseFloat(b.weight)||0)) ? s : b, null);
      return best ? `${ex.name} ${best.weight}kg×${best.reps}` : null;
    })
    .filter(Boolean)
    .slice(0, 5)
    .join(' · ');

  const noteEl = eid(`sessionNote-${wc.id}`);
  const sessionNote = noteEl ? noteEl.value.trim() : '';

  S.workoutHistory.push({
    id: uid(),
    cardId: wc.id,
    title: wc.title || 'Workout',
    date: today(),
    summary: summary || 'Session completed',
    notes: sessionNote,
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

  if (typeof renderMuscleHeatmap === 'function') renderMuscleHeatmap();
  toast(`${wc.title || t('workout')} ${t('workout_saved')}`);
}

/* ══ MUSCLE VOLUME HEATMAP ══ */

// Canonical muscle groups for the heatmap grid
const MUSCLE_GROUPS = [
  { key: 'chest',       label: 'Chest' },
  { key: 'back',        label: 'Back' },
  { key: 'lats',        label: 'Lats' },
  { key: 'shoulders',   label: 'Shoulders' },
  { key: 'traps',       label: 'Traps' },
  { key: 'biceps',      label: 'Biceps' },
  { key: 'triceps',     label: 'Triceps' },
  { key: 'forearms',    label: 'Forearms' },
  { key: 'core',        label: 'Core' },
  { key: 'glutes',      label: 'Glutes' },
  { key: 'quads',       label: 'Quads' },
  { key: 'hamstrings',  label: 'Hamstrings' },
  { key: 'calves',      label: 'Calves' },
  { key: 'neck',        label: 'Neck' },
];

function _getMuscleInfo(exerciseName) {
  if (typeof EXERCISE_DB === 'undefined') return null;
  const key = normExerciseKey(exerciseName);
  return EXERCISE_DB.find(e => e.name.toLowerCase() === key) || null;
}

/* Compute sets volume per muscle group for the past N days from workoutHistory */
function _muscleWeeklyVolume(days) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const vol = {}; // muscleKey → total sets (primary = 1, secondary = 0.33)

  (S.workoutHistory || []).forEach(session => {
    if (!session.date || session.date < cutoff) return;
    (session.exercises || []).forEach(ex => {
      const info = _getMuscleInfo(ex.name || '');
      if (!info) return;

      // Count total sets logged in this exercise entry
      const loggedSets = Array.isArray(ex.loggedSets) ? ex.loggedSets
        : (ex.weight != null ? [{ weight: ex.weight, reps: ex.reps, sets: ex.sets || 1 }] : []);
      const totalSets = loggedSets.reduce((s, e) => s + (parseInt(e.sets) || 1), 0);
      if (!totalSets) return;

      (info.muscles || []).forEach(m => {
        vol[m] = (vol[m] || 0) + totalSets;
      });
      (info.secondary || []).forEach(m => {
        vol[m] = (vol[m] || 0) + totalSets * 0.33;
      });
    });
  });
  return vol;
}

function renderMuscleHeatmap() {
  const el = eid('muscleHeatmap');
  if (!el) return;

  const vol = _muscleWeeklyVolume(7);
  const allVals = MUSCLE_GROUPS.map(g => vol[g.key] || 0);
  const maxVol = Math.max(...allVals, 1);

  // Intensity buckets: 0 = untrained, 1-4 = light → high
  function intensityClass(v) {
    if (!v) return 0;
    const pct = v / maxVol;
    if (pct < 0.25) return 1;
    if (pct < 0.5)  return 2;
    if (pct < 0.75) return 3;
    return 4;
  }

  const COLORS = ['var(--mid)', 'var(--border)', '#a07060', 'var(--blush)', 'var(--petal)'];
  const totalSets = Object.values(vol).reduce((s, v) => s + v, 0);

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div class="sec" style="margin:0;font-size:0.66rem">Weekly Muscle Volume</div>
      <span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace">${totalSets ? 'This week' : 'No data this week'}</span>
    </div>
    <div class="card" style="padding:12px 14px">
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">
        ${MUSCLE_GROUPS.map(g => {
          const v = vol[g.key] || 0;
          const ic = intensityClass(v);
          const sets = Math.round(v * 10) / 10;
          return `<div title="${g.label}: ${sets} sets" style="text-align:center">
            <div style="width:100%;padding-bottom:100%;background:${COLORS[ic]};border-radius:5px;position:relative;transition:background 0.2s">
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
                ${ic >= 3 ? `<span style="font-size:0.5rem;color:var(--cream);font-family:'DM Mono',monospace">${Math.round(sets)}</span>` : ''}
              </div>
            </div>
            <div style="font-size:0.5rem;color:var(--muted);margin-top:3px;letter-spacing:0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.label}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;justify-content:flex-end">
        <span style="font-size:0.52rem;color:var(--muted)">Low</span>
        ${COLORS.map(c => `<div style="width:10px;height:10px;border-radius:2px;background:${c}"></div>`).join('')}
        <span style="font-size:0.52rem;color:var(--muted)">High</span>
      </div>
    </div>`;
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
        <button class="habit-del" style="opacity:0.4" onclick="deleteCardioSession('${s.id}')">✕</button>
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
  S.cardioHistory = (S.cardioHistory || []).filter(s => String(s.id) !== String(id));
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

let _calorieHistLimit = 20;

function renderCalorieHistory() {
  const c = eid('calorieHistory');
  if (!c) return;
  ensureFitnessState();
  const hist = [...(S.calorieHistory || [])].reverse();
  if (!hist.length) {
    c.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:0.7rem;font-family:'DM Mono',monospace">${t('no_calorie_sessions') || 'No entries logged yet.'}</div>`;
    return;
  }
  function _calRowHtml(s) {
    return `
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--blush-dim)">
        <div style="display:flex;gap:10px;align-items:baseline;flex:1">
          <span style="font-size:0.6rem;color:var(--muted-lt);font-family:'DM Mono',monospace;flex-shrink:0">${escapeHtml(s.date||'')}</span>
          <span style="font-size:0.8rem;color:var(--mist)">${escapeHtml(s.description||'Meal')}</span>
          ${s.calories ? `<span style="font-size:0.68rem;color:var(--gold-lt);font-family:'DM Mono',monospace">${escapeHtml(String(s.calories))} kcal</span>` : ''}
        </div>
        <button class="habit-del" style="opacity:0.4" onclick="deleteCalorieSession('${s.id}')">✕</button>
      </div>`;
  }

  const shown = hist.slice(0, _calorieHistLimit);
  c.innerHTML = shown.map(_calRowHtml).join('');

  if (hist.length > _calorieHistLimit) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-g';
    btn.style.cssText = 'width:100%;margin-top:8px;font-size:0.68rem';
    btn.textContent = `Load more (${hist.length - _calorieHistLimit} remaining)`;
    btn.onclick = () => {
      const next = hist.slice(_calorieHistLimit, _calorieHistLimit + 20);
      _calorieHistLimit += 20;
      btn.remove();
      next.forEach(s => c.insertAdjacentHTML('beforeend', _calRowHtml(s)));
      if (hist.length > _calorieHistLimit) {
        const newBtn = btn.cloneNode(false);
        newBtn.textContent = `Load more (${hist.length - _calorieHistLimit} remaining)`;
        newBtn.onclick = btn.onclick;
        c.appendChild(newBtn);
      }
    };
    c.appendChild(btn);
  }
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
  S.calorieHistory.push({ id: uid(), date: dateVal, description, calories });
  scheduleSave();
  if (mealEl) mealEl.value = '';
  eid('calorieAmount').value = '';
  eid('calorieDate').value   = today();
  renderCalorieHistory();
  toast(t('calories_logged') || 'Calories logged.');
}

function deleteCalorieSession(id) {
  S.calorieHistory = (S.calorieHistory || []).filter(s => String(s.id) !== String(id));
  scheduleSave();
  renderCalorieHistory();
}

/* ══ WORKOUT PRESETS ══ */
function assignPreset(dayIndex, cardId) {
  ensureFitnessState();
  if (!cardId) return;
  const wc = (S.workoutCards || []).find(w => String(w.id) === String(cardId));
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
    const idx = (S.workoutCards || []).findIndex(w => String(w.id) === String(cardId));
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

let _filterTrainingTimer = null;
function filterTrainingFull(query) {
  clearTimeout(_filterTrainingTimer);
  _filterTrainingTimer = setTimeout(() => renderTrainingFullList(query.toLowerCase().trim()), 200);
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
          ${(item.exercises||[]).map(e=>{
            const setsArr = Array.isArray(e.loggedSets) ? e.loggedSets
              : (e.weight != null ? [{ weight: e.weight, reps: e.reps, sets: e.sets }] : []);
            const best = setsArr.reduce((b, s) => (!b || (parseFloat(s.weight)||0) > (parseFloat(b.weight)||0)) ? s : b, null);
            const summary = best
              ? [setsArr.length > 1 ? setsArr.length + ' sets' : null, best.weight != null ? best.weight+'kg' : null, best.reps != null ? best.reps+' reps' : null].filter(Boolean).join(' × ')
              : '';
            return `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.76rem">
              <span style="color:var(--mist)">${escapeHtml(e.name||'')}</span>
              <span style="color:var(--muted-lt);font-family:'DM Mono',monospace">${escapeHtml(summary)}</span>
            </div>`;
          }).join('')}
          ${!(item.exercises||[]).length?`<div style="font-size:0.72rem;color:var(--muted)">${escapeHtml(item.summary||'')}</div>`:''}
        </div>`;
      c.appendChild(row);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXERCISE PROGRESSION + 1RM CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

/* Epley formula: 1RM = weight × (1 + reps/30) */
function epley1RM(weight, reps) {
  const w = parseFloat(weight);
  const r = parseInt(reps);
  if (!w || !r || w <= 0 || r <= 0) return null;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

/* Best set 1RM from a loggedSets array */
function bestE1RM(loggedSets) {
  let best = 0;
  (loggedSets || []).forEach(s => {
    const count = parseInt(s.sets) || 1;
    for (let i = 0; i < count; i++) {
      const v = epley1RM(s.weight, s.reps) || 0;
      if (v > best) best = v;
    }
  });
  return best || null;
}

/* Build time-series for a given exercise key + metric */
function epBuildSeries(key, metricId, rangeDays) {
  const hist = getExerciseHistory(key); // sorted oldest-first by push order
  const cutoff = rangeDays > 0
    ? new Date(Date.now() - rangeDays * 86400000).toISOString().slice(0, 10)
    : '0000-00-00';

  // Group by date (keep best value per day)
  const byDate = {};
  hist.forEach(entry => {
    if (!entry.date || entry.date < cutoff) return;
    const loggedSets = Array.isArray(entry.loggedSets) ? entry.loggedSets
      : (entry.weight != null ? [{ weight: entry.weight, reps: entry.reps, sets: entry.sets || 1 }] : []);

    let val;
    if (metricId === 'e1rm') {
      val = bestE1RM(loggedSets);
    } else if (metricId === 'maxWeight') {
      val = loggedSets.reduce((m, s) => Math.max(m, parseFloat(s.weight) || 0), 0) || null;
    } else { // totalVolume
      val = loggedSets.reduce((sum, s) => {
        const count = parseInt(s.sets) || 1;
        return sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0) * count;
      }, 0) || null;
    }

    if (val == null) return;
    if (!byDate[entry.date] || val > byDate[entry.date]) byDate[entry.date] = val;
  });

  return Object.keys(byDate).sort().map(d => ({ date: d, value: byDate[d] }));
}

/* Inline SVG line chart — no external library needed */
function epDrawChart(points, metricLabel) {
  const el = eid('epChart');
  if (!el) return;
  if (points.length < 2) {
    el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:0.72rem;color:var(--muted)">Not enough data to chart (need 2+ sessions)</div>`;
    return;
  }
  const W = el.clientWidth || 520;
  const H = 180;
  const PAD = { top: 14, right: 12, bottom: 28, left: 44 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const vals = points.map(p => p.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  const xScale = i => PAD.left + (i / (points.length - 1)) * iW;
  const yScale = v => PAD.top + iH - ((v - minV) / range) * iH;

  // Path
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.value).toFixed(1)}`).join(' ');

  // X axis labels (max 6)
  const step = Math.max(1, Math.floor(points.length / 6));
  const xLabels = points
    .filter((_, i) => i % step === 0 || i === points.length - 1)
    .map((p, _) => {
      const origIdx = points.indexOf(p);
      const x = xScale(origIdx);
      const label = p.date.slice(5); // MM-DD
      return `<text x="${x.toFixed(1)}" y="${(H - 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="DM Mono,monospace">${label}</text>`;
    }).join('');

  // Y axis labels
  const yTicks = [minV, minV + range * 0.5, maxV];
  const yLabels = yTicks.map(v => {
    const y = yScale(v);
    return `<text x="${(PAD.left - 5).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--muted)" font-family="DM Mono,monospace">${Math.round(v)}</text>`;
  }).join('');

  // Dots
  const dots = points.map((p, i) => {
    const x = xScale(i).toFixed(1);
    const y = yScale(p.value).toFixed(1);
    const tip = `${p.date}: ${Math.round(p.value * 10) / 10}${metricLabel === 'Volume' ? 'kg' : 'kg'}`;
    return `<circle cx="${x}" cy="${y}" r="3" fill="var(--blush)" stroke="var(--cream)" stroke-width="1.2"><title>${tip}</title></circle>`;
  }).join('');

  // PR marker (last point that equals max)
  const prIdx = points.reduce((best, p, i) => p.value >= points[best].value ? i : best, 0);
  const prX = xScale(prIdx).toFixed(1);
  const prY = (yScale(points[prIdx].value) - 10).toFixed(1);
  const prMarker = `<text x="${prX}" y="${prY}" text-anchor="middle" font-size="9" fill="var(--gold)" font-family="DM Mono,monospace">PR</text>`;

  el.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <path d="${path}" fill="none" stroke="var(--blush)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${prMarker}${xLabels}${yLabels}
  </svg>`;
}

let _epCurrentKey = '';
let _epFilterTimer = null;

function openExerciseProgress(exerciseName) {
  // Populate search box
  if (exerciseName) {
    eid('epSearch').value = exerciseName;
    _epCurrentKey = normExerciseKey(exerciseName);
  } else {
    // Default: first exercise with any history
    const keys = Object.keys(S.exerciseHistory || {}).filter(k => (S.exerciseHistory[k] || []).length > 0);
    _epCurrentKey = keys[0] || '';
    eid('epSearch').value = _epCurrentKey
      ? (_epCurrentKey.charAt(0).toUpperCase() + _epCurrentKey.slice(1))
      : '';
  }
  eid('epSearchResults').style.display = 'none';
  eid('ep1RMCalc').style.display = 'none';
  epRender();
  openModal('mExerciseProgress');
}

function epFilterExercise(query) {
  clearTimeout(_epFilterTimer);
  _epFilterTimer = setTimeout(() => {
    const q = query.trim().toLowerCase();
    const res = eid('epSearchResults');
    if (!q) { res.style.display = 'none'; return; }

    const dbNames = (typeof EXERCISE_DB !== 'undefined' ? EXERCISE_DB : []).map(e => e.name);
    const customNames = (S.customExercises || []).map(e => e.name);
    const histNames = Object.keys(S.exerciseHistory || {})
      .filter(k => (S.exerciseHistory[k] || []).length > 0)
      .map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const allNames = [...new Set([...dbNames, ...customNames, ...histNames])];
    const matches = allNames.filter(n => n.toLowerCase().includes(q)).slice(0, 12);

    if (!matches.length) { res.style.display = 'none'; return; }
    res.style.display = '';
    res.innerHTML = matches.map(n => {
      const hasData = !!(S.exerciseHistory || {})[normExerciseKey(n)]?.length;
      return `<div onclick="epSelectExercise('${escapeAttr(n)}')" style="padding:8px 12px;cursor:pointer;font-size:0.8rem;color:var(--mist);display:flex;justify-content:space-between;border-bottom:1px solid var(--border)">
        <span>${escapeHtml(n)}</span>
        ${hasData ? `<span style="font-size:0.6rem;color:var(--blush);font-family:'DM Mono',monospace">data</span>` : ''}
      </div>`;
    }).join('');
  }, 150);
}

function epSelectExercise(name) {
  _epCurrentKey = normExerciseKey(name);
  eid('epSearch').value = name;
  eid('epSearchResults').style.display = 'none';
  epRender();
}

function epRender() {
  if (!_epCurrentKey) return;
  const metric = (eid('epMetric') && eid('epMetric').value) || 'e1rm';
  const range  = parseInt((eid('epRange') && eid('epRange').value) || '90');
  const metricLabel = metric === 'totalVolume' ? 'Volume' : 'kg';

  const points = epBuildSeries(_epCurrentKey, metric, range);
  epDrawChart(points, metricLabel);

  // Stats
  const statsEl = eid('epStats');
  if (statsEl) {
    if (points.length) {
      const vals = points.map(p => p.value);
      const pr = Math.max(...vals);
      const recent = vals[vals.length - 1];
      const prev   = vals.length >= 2 ? vals[vals.length - 2] : null;
      const trend  = (prev != null && prev !== 0) ? ((recent - prev) / prev * 100) : null;
      const trendStr = trend != null ? fmtPct(trend) : '—';
      const trendColor = trend > 0 ? 'var(--gold)' : trend < 0 ? 'var(--petal)' : 'var(--muted)';
      const unit = metric === 'totalVolume' ? '' : ' kg';
      statsEl.innerHTML = [
        { label: 'PR', value: Math.round(pr * 10) / 10 + unit },
        { label: 'Last', value: Math.round(recent * 10) / 10 + unit },
        { label: 'Trend', value: trendStr, color: trendColor },
      ].map(s => `<div class="card" style="padding:8px 10px;text-align:center">
        <div style="font-size:0.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">${s.label}</div>
        <div style="font-size:0.88rem;color:${s.color || 'var(--mist)'};font-family:'DM Mono',monospace">${s.value}</div>
      </div>`).join('');
    } else {
      statsEl.innerHTML = '';
    }
  }

  // Session log list
  const logEl = eid('epLog');
  if (logEl) {
    const hist = [...(getExerciseHistory(_epCurrentKey))].reverse().slice(0, 40);
    if (!hist.length) {
      logEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted)">No sessions logged yet for this exercise.</div>`;
      return;
    }
    logEl.innerHTML = hist.map(entry => {
      const loggedSets = Array.isArray(entry.loggedSets) ? entry.loggedSets
        : (entry.weight != null ? [{ weight: entry.weight, reps: entry.reps, sets: entry.sets || 1 }] : []);
      const setsExpanded = loggedSets.flatMap(s => {
        const count = parseInt(s.sets) || 1;
        return Array.from({ length: count }, () => s);
      });
      const setsStr = setsExpanded.map(s =>
        [s.weight != null ? s.weight + 'kg' : null, s.reps != null ? s.reps + ' reps' : null].filter(Boolean).join(' × ')
      ).join(' | ');
      const e1rm = bestE1RM(loggedSets);
      return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border-lt)">
        <span style="color:var(--muted);font-family:'DM Mono',monospace;font-size:0.68rem;flex-shrink:0;margin-right:8px">${entry.date || ''}</span>
        <span style="flex:1;color:var(--muted-lt);font-size:0.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(setsStr)}</span>
        ${e1rm ? `<span style="font-size:0.66rem;color:var(--blush);font-family:'DM Mono',monospace;flex-shrink:0;margin-left:6px" title="Est. 1RM">${Math.round(e1rm)}kg</span>` : ''}
      </div>`;
    }).join('');
  }
}

/* 1RM Calculator (standalone, not tied to a specific exercise) */
function calc1RM() {
  const w = parseFloat(eid('c1rmWeight').value);
  const r = parseInt(eid('c1rmReps').value);
  const res = eid('c1rmResult');
  if (!w || !r || w <= 0 || r <= 0) { res.textContent = 'Enter weight and reps'; return; }
  const e = epley1RM(w, r);
  // Common percentages table
  const pcts = [100, 95, 90, 85, 80, 75, 70];
  res.innerHTML = `<span style="color:var(--gold)">Est. 1RM: ${Math.round(e * 10) / 10} kg</span>
    <div style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap">
      ${pcts.map(p => `<span style="font-size:0.62rem;color:var(--muted)">${p}% → <b style="color:var(--mist)">${Math.round(e * p / 100 * 10) / 10}kg</b></span>`).join('')}
    </div>`;
}
