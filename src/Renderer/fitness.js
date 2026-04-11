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

/* ── Notes helpers ── */
function _fitnessOpenNotes(workoutCardId) {
  const wc = (S.workoutCards || []).find(x => String(x.id) === String(workoutCardId));
  if (!wc || !wc._uuid) return;
  if (typeof openNotesForEntity === 'function') openNotesForEntity('workout_template', wc._uuid);
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

/* ══ REST TIMER ══ */
let _restTimerInterval = null;
let _restTimerRemaining = 0;
let _restTimerTotal = 0;

function getRestTimerSecs() {
  return parseInt((S.appPrefs && S.appPrefs.restTimerSecs) || 90);
}

function startRestTimer(secs) {
  secs = secs || getRestTimerSecs();
  _restTimerTotal = secs;
  _restTimerRemaining = secs;
  clearInterval(_restTimerInterval);
  const bar = eid('restTimerBar');
  if (bar) { bar.style.display = 'flex'; }
  _renderRestTimer();
  _restTimerInterval = setInterval(() => {
    _restTimerRemaining--;
    _renderRestTimer();
    if (_restTimerRemaining <= 0) {
      clearInterval(_restTimerInterval);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      toast('Rest done — next set!');
      setTimeout(restTimerStop, 1500);
    }
  }, 1000);
}

function _renderRestTimer() {
  const label = eid('restTimerLabel');
  const fill  = eid('restTimerFill');
  if (!label || !fill) return;
  const m = Math.floor(_restTimerRemaining / 60);
  const s = _restTimerRemaining % 60;
  label.textContent = `${m}:${String(s).padStart(2, '0')}`;
  const pct = _restTimerTotal > 0 ? Math.max(0, (_restTimerRemaining / _restTimerTotal) * 100) : 0;
  fill.style.width = pct + '%';
  fill.style.background = pct < 20 ? 'var(--petal)' : pct < 50 ? 'var(--gold)' : 'var(--blush)';
}

function restTimerSkip() {
  clearInterval(_restTimerInterval);
  restTimerStop();
  toast('Rest skipped');
}

function restTimerStop() {
  clearInterval(_restTimerInterval);
  const bar = eid('restTimerBar');
  if (bar) bar.style.display = 'none';
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
  const weights = ascEntries.map(e => +e.weight).filter(Number.isFinite);
  if (weights.length < 2) return '';

  const W = 460, H = 110;
  const PAD = { top: 20, right: 16, bottom: 24, left: 48 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const mn = Math.min(...weights);
  const mx = Math.max(...weights);
  // When all values are the same, expand the axis ±0.5 kg so it doesn't collapse
  const lo = mn === mx ? mn - 0.5 : mn;
  const hi = mn === mx ? mx + 0.5 : mx;
  const range = hi - lo;

  const xOf = i => PAD.left + (i / (ascEntries.length - 1)) * iW;
  const yOf = v => PAD.top + iH - ((v - lo) / range) * iH;

  const pts = ascEntries.map((e, i) => `${xOf(i).toFixed(1)},${yOf(+e.weight).toFixed(1)}`);

  // Filled area path
  const fillD = `M ${pts[0]} L ${pts.join(' L ')} L ${xOf(ascEntries.length - 1).toFixed(1)},${(PAD.top + iH).toFixed(1)} L ${xOf(0).toFixed(1)},${(PAD.top + iH).toFixed(1)} Z`;

  // Y-axis ticks: 3 even steps
  const yTicks = [lo, lo + range / 2, hi];
  const yTicksHtml = yTicks.map(v =>
    `<text x="${(PAD.left - 6).toFixed(1)}" y="${(yOf(v) + 3.5).toFixed(1)}" font-size="8.5" fill="#666" font-family="DM Mono,monospace" text-anchor="end">${v.toFixed(1)}</text>
     <line x1="${PAD.left}" y1="${yOf(v).toFixed(1)}" x2="${(PAD.left + iW).toFixed(1)}" y2="${yOf(v).toFixed(1)}" stroke="#2a2a2a" stroke-width="1"/>`
  ).join('');

  // X-axis date labels (max 5)
  const step = Math.max(1, Math.floor(ascEntries.length / 5));
  const xLabels = ascEntries
    .filter((_, i) => i % step === 0 || i === ascEntries.length - 1)
    .map((e, _, arr) => {
      const origIdx = ascEntries.indexOf(e);
      return `<text x="${xOf(origIdx).toFixed(1)}" y="${(H - 4).toFixed(1)}" font-size="8" fill="#555" font-family="DM Mono,monospace" text-anchor="middle">${e.date.slice(5)}</text>`;
    }).join('');

  // Dots
  const dots = ascEntries.map((e, i) =>
    `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(+e.weight).toFixed(1)}" r="3" fill="var(--blush)" stroke="#111" stroke-width="1.2"><title>${e.date}: ${e.weight} kg</title></circle>`
  ).join('');

  // Current weight label at last point
  const lastE = ascEntries[ascEntries.length - 1];
  const lastX = xOf(ascEntries.length - 1);
  const lastY = yOf(+lastE.weight);
  const labelAnchor = lastX > W * 0.8 ? 'end' : 'start';
  const labelDx = lastX > W * 0.8 ? -8 : 8;
  const currentLabel = `<text x="${(lastX + labelDx).toFixed(1)}" y="${(lastY - 6).toFixed(1)}" font-size="9.5" fill="#c9a96e" font-family="DM Mono,monospace" text-anchor="${labelAnchor}" font-weight="600">${lastE.weight} kg</text>`;

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="display:block;width:100%;height:110px;margin-bottom:10px">
    <defs>
      <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--blush)" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="var(--blush)" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    ${yTicksHtml}
    <path d="${fillD}" fill="url(#wGrad)"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="var(--blush)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${currentLabel}
    ${xLabels}
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
  migrateWorkoutCardNamesOnce();

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
        <button onclick="event.stopPropagation();_fitnessOpenNotes('${wc.id}')"
          style="background:none;border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:0.62rem;padding:2px 7px;border-radius:4px;font-family:'DM Mono',monospace;line-height:1;flex-shrink:0" title="Open notes">&rarr;</button>
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
            const overloadHint = (last && last.reps >= 8 && last.weight > 0)
              ? `<span style="color:var(--gold);margin-left:6px" title="Suggested increase">↑ try ${last.weight + 2.5}kg</span>` : '';
            // Look up muscle tags from DB
            const dbEntry = (typeof EXERCISE_DB !== 'undefined' ? EXERCISE_DB : []).find(e => e.name.toLowerCase() === (ex.name||'').toLowerCase());
            const muscleTags = dbEntry ? [...(dbEntry.muscles||[]),...(dbEntry.secondary||[])].slice(0,2)
              .map(m => `<span style="font-size:0.52rem;color:var(--muted);background:var(--deep);
                border:1px solid var(--border);border-radius:4px;padding:1px 5px;font-family:'DM Mono',monospace">${m}</span>`).join('') : '';
            return `
              <div class="ex-item" style="display:block;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border-lt)">
                <div style="display:flex;align-items:center;gap:7px;">
                  <div style="flex:1;min-width:0">
                    <div style="font-size:0.82rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(ex.name||'')}</div>
                    ${muscleTags ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px">${muscleTags}</div>` : ''}
                  </div>
                  <button class="ex-del" onclick="delEx('${wc.id}','${ex.id}')">✕</button>
                </div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
                  <input class="add-inp" id="logW-${ex.id}" type="number" step="0.5" placeholder="${t('weight_ph')}" style="width:68px;flex:none;" value="${last?.weight ?? ''}">
                  <input class="add-inp" id="logR-${ex.id}" type="number" placeholder="${t('reps_ph')}" style="width:68px;flex:none;" value="${last?.reps ?? ''}">
                  <input class="add-inp" id="logSets-${ex.id}" type="number" min="1" placeholder="sets" style="width:52px;flex:none;" value="${last?.sets ?? 1}" title="Sets">
                  <button class="btn btn-g" style="font-size:0.66rem;padding:4px 9px" onclick="logExercise('${wc.id}','${ex.id}')">${t('log')}</button>
                </div>
                <div id="lastLog-${ex.id}" style="margin-top:5px;font-size:0.64rem;color:var(--muted-lt);font-family:'DM Mono',monospace;">
                  ${last ? `${t('last_colon')} ${last.sets>1?last.sets+' × ':''}${last.weight}kg × ${last.reps}${pct!==null?` <span style="color:${pct>0?'var(--gold-lt)':'var(--petal)'}">${fmtPct(pct)}</span>`:''}${overloadHint}` : t('no_log_yet')}
                </div>
              </div>`;
          }).join('')}
        </div>

        <div style="margin-top:4px">
          <button class="btn btn-g" style="width:100%;font-size:0.72rem;padding:7px" onclick="openExercisePicker('${wc.id}')">+ Add Exercise</button>
        </div>

        <textarea id="sessionNote-${wc.id}" placeholder="Session notes…" style="display:block;width:100%;box-sizing:border-box;margin-top:10px;background:var(--mid);border:1px solid var(--border);border-radius:6px;color:var(--muted);font-size:0.7rem;font-family:'DM Mono',monospace;resize:none;padding:7px 10px;min-height:44px;outline:none;line-height:1.5"></textarea>

        <div style="margin-top:8px;display:flex;align-items:center;gap:6px">
          <span style="font-size:0.58rem;color:var(--muted)">Date:</span>
          <input type="date" id="sessionDate-${wc.id}" value="${today()}"
            style="background:var(--mid);border:1px solid var(--border);border-radius:6px;color:var(--gold-lt);font-size:0.66rem;padding:3px 7px;font-family:'DM Mono',monospace;outline:none;cursor:pointer">
          <span style="font-size:0.56rem;color:var(--muted)">Log past sessions here</span>
        </div>

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
          <button class="btn btn-g" style="font-size:0.6rem;padding:2px 8px;flex-shrink:0" onclick="openEditSession('${item.id}')">Edit</button>
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

// ── Edit session ─────────────────────────────────────────────────────────────
let _editingSessionId = null;

function openEditSession(id) {
  const s = (S.workoutHistory || []).find(s => String(s.id) === String(id));
  if (!s) return;
  _editingSessionId = id;

  eid('esTitle').value = s.title || 'Workout';
  eid('esDate').value  = s.date  || today();

  const listEl = eid('esExerciseList');
  const exercises = (s.exercises || []);
  listEl.innerHTML = exercises.length ? exercises.map((ex, i) => {
    // Resolve best set for pre-fill
    const setsArr = Array.isArray(ex.loggedSets) ? ex.loggedSets
      : (ex.weight != null ? [{ weight: ex.weight, reps: ex.reps || 0, sets: ex.sets || 1 }] : []);
    const best = setsArr.reduce((b, s) => (!b || (parseFloat(s.weight)||0) > (parseFloat(b.weight)||0)) ? s : b, setsArr[0] || {});
    return `
      <div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="font-size:0.78rem;color:var(--mist);margin-bottom:8px">${escapeHtml(ex.name || '')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <div>
            <div style="font-size:0.56rem;color:var(--muted);font-family:'DM Mono',monospace;margin-bottom:3px">Weight (kg)</div>
            <input type="number" step="0.5" class="add-inp" id="es-w-${i}" value="${best.weight || ''}"
              style="width:72px;font-size:0.76rem">
          </div>
          <div>
            <div style="font-size:0.56rem;color:var(--muted);font-family:'DM Mono',monospace;margin-bottom:3px">Reps</div>
            <input type="number" class="add-inp" id="es-r-${i}" value="${best.reps || ''}"
              style="width:60px;font-size:0.76rem">
          </div>
          <div>
            <div style="font-size:0.56rem;color:var(--muted);font-family:'DM Mono',monospace;margin-bottom:3px">Sets</div>
            <input type="number" min="1" class="add-inp" id="es-s-${i}" value="${setsArr.length || best.sets || 1}"
              style="width:52px;font-size:0.76rem">
          </div>
        </div>
      </div>`;
  }).join('') : `<div style="font-size:0.76rem;color:var(--muted);padding:16px 0">No exercises logged in this session.</div>`;

  openModal('mEditSession');
}

function saveEditSession() {
  const s = (S.workoutHistory || []).find(s => String(s.id) === String(_editingSessionId));
  if (!s) { closeModal('mEditSession'); return; }

  const oldDate = s.date;
  const newDate = eid('esDate').value || oldDate;
  const newTitle = eid('esTitle').value.trim() || s.title;

  // Update session header
  s.date  = newDate;
  s.title = newTitle;

  // Update exercises from inputs and rebuild exerciseHistory entries
  const exercises = (s.exercises || []);
  exercises.forEach((ex, i) => {
    const w = parseFloat(eid(`es-w-${i}`)?.value) || 0;
    const r = parseInt(eid(`es-r-${i}`)?.value, 10) || 0;
    const sets = parseInt(eid(`es-s-${i}`)?.value, 10) || 1;

    // Update the session record (flat format)
    ex.weight = w;
    ex.reps   = r;
    ex.sets   = sets;
    ex.loggedSets = [{ weight: w, reps: r, sets }];

    // Re-sync exerciseHistory: remove old date entries for this exercise that came from this session
    const key = normExerciseKey(ex.name);
    if (!S.exerciseHistory) S.exerciseHistory = {};
    if (!S.exerciseHistory[key]) S.exerciseHistory[key] = [];

    // Remove entries on the OLD date that match this weight (best-effort; we can't tag by session)
    // Strategy: if date changed, remove ALL entries on oldDate matching this exercise, re-add on newDate
    if (oldDate !== newDate) {
      S.exerciseHistory[key] = S.exerciseHistory[key].filter(e => e.date !== oldDate);
    } else {
      // Same date: remove and re-add to update weight/reps
      S.exerciseHistory[key] = S.exerciseHistory[key].filter(e => e.date !== newDate);
    }
    if (w > 0) S.exerciseHistory[key].push({ date: newDate, weight: w, reps: r, sets });
  });

  // Rebuild summary string
  s.summary = exercises
    .map(ex => ex.weight > 0 ? `${ex.name} ${ex.weight}kg×${ex.reps}` : null)
    .filter(Boolean).slice(0, 5).join(' · ') || 'Session edited';

  // Update gymLog if date changed
  if (oldDate !== newDate) {
    if (S.gymLog[oldDate]) delete S.gymLog[oldDate];
    S.gymLog[newDate] = true;
    // Update habit day too
    const gh = hfind('gym','lift','workout','training','weights');
    if (gh) {
      if (gh.days[oldDate]) delete gh.days[oldDate];
      gh.days[newDate] = true;
    }
  }

  scheduleSave();
  closeModal('mEditSession');
  renderTrainingLog();
  renderGymWeek();
  toast('Session updated');
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
            if (!rows.length) {
              return `<div style="font-size:0.66rem;color:var(--muted);font-style:italic">No set data recorded</div>`;
            }
            return rows.map((set, i) => {
              const w = set.weight !== undefined && set.weight !== null ? parseFloat(set.weight) : null;
              const r = set.reps  !== undefined && set.reps  !== null ? parseInt(set.reps)     : null;
              const wStr = w !== null && !isNaN(w) ? w + 'kg' : '';
              const rStr = r !== null && !isNaN(r) ? r + ' reps' : '';
              const mid  = wStr && rStr ? ' \u00d7 ' : '';
              return `
              <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--muted-lt);padding:2px 0;font-family:'DM Mono',monospace">
                <span style="color:var(--muted)">Set ${i + 1}</span>
                <span>${wStr}${mid}${rStr}</span>
              </div>`;
            }).join('');
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
  const dbNames     = (typeof EXERCISE_DB !== 'undefined' ? EXERCISE_DB : []).map(e => e.name);
  const customNames = (S.customExercises || []).map(e => e.name);
  const histNames   = Object.keys(S.exerciseHistory || {}).filter(n => n && n.trim());
  const allNames    = [...new Set([...dbNames, ...customNames, ...histNames])].sort();
  dl.innerHTML = allNames.map(n => `<option value="${escapeAttr(n)}">`).join('');
}

// ── Exercise Picker Modal ──────────────────────────────────────────────────────
let _pickerWcId       = null;  // which workout card we're adding to
let _pickerQuery      = '';
let _pickerMuscle     = '';    // '' = all
let _pickerEquip      = '';    // '' = all

const _MUSCLE_LABELS = {
  chest:'Chest', back:'Back', lats:'Lats', traps:'Traps',
  shoulders:'Shoulders', biceps:'Biceps', triceps:'Triceps', forearms:'Forearms',
  core:'Core', glutes:'Glutes', quads:'Quads', hamstrings:'Hamstrings', calves:'Calves',
};
const _EQUIP_LABELS = {
  barbell:'Barbell', dumbbell:'Dumbbell', cable:'Cable',
  machine:'Machine', bodyweight:'Bodyweight', kettlebell:'Kettlebell',
  band:'Band', cardio:'Cardio',
};

function openExercisePicker(wcId) {
  _pickerWcId   = wcId;
  _pickerQuery  = '';
  _pickerMuscle = '';
  _pickerEquip  = '';
  _renderPickerFilters();
  _renderPickerResults();
  const inp = eid('exPickerSearch');
  if (inp) inp.value = '';
  openModal('mExercisePicker');
  setTimeout(() => { const s = eid('exPickerSearch'); if (s) s.focus(); }, 120);
}

function setPickerQuery(q) {
  _pickerQuery = (q || '').toLowerCase().trim();
  _renderPickerResults();
}

function _setPickerMuscle(m) {
  _pickerMuscle = _pickerMuscle === m ? '' : m;
  _renderPickerFilters();
  _renderPickerResults();
}

function _setPickerEquip(e) {
  _pickerEquip = _pickerEquip === e ? '' : e;
  _renderPickerFilters();
  _renderPickerResults();
}

function _filterChip(label, active, onclick) {
  return `<button onclick="${onclick}"
    style="flex-shrink:0;padding:3px 10px;border-radius:20px;border:1px solid ${active ? 'var(--blush)' : 'var(--border)'};
      background:${active ? 'var(--blush-dim)' : 'transparent'};color:${active ? 'var(--blush)' : 'var(--muted)'};
      font-size:0.64rem;cursor:pointer;white-space:nowrap;font-family:'DM Mono',monospace;
      transition:all 0.12s">${escapeHtml(label)}</button>`;
}

function _renderPickerFilters() {
  const mEl = eid('exPickerMuscleFilters');
  const eEl = eid('exPickerEquipFilters');
  if (!mEl || !eEl) return;

  mEl.innerHTML = Object.entries(_MUSCLE_LABELS).map(([k, v]) =>
    _filterChip(v, _pickerMuscle === k, `_setPickerMuscle('${k}')`)
  ).join('');

  eEl.innerHTML = Object.entries(_EQUIP_LABELS).map(([k, v]) =>
    _filterChip(v, _pickerEquip === k, `_setPickerEquip('${k}')`)
  ).join('');
}

function _renderPickerResults() {
  const el = eid('exPickerResults');
  if (!el) return;

  const db = typeof EXERCISE_DB !== 'undefined' ? EXERCISE_DB : [];
  const custom = (S.customExercises || []).map(e => ({
    id: 'custom-' + e.name, name: e.name, muscles: [], secondary: [], equipment: 'custom', category: 'custom', pattern: 'other'
  }));
  const all = [...db, ...custom];

  let results = all;

  // Filter by muscle group
  if (_pickerMuscle) {
    results = results.filter(e =>
      (e.muscles || []).includes(_pickerMuscle) ||
      (e.secondary || []).includes(_pickerMuscle)
    );
  }

  // Filter by equipment
  if (_pickerEquip) {
    results = results.filter(e =>
      (e.equipment || '').toLowerCase() === _pickerEquip ||
      (e.category  || '').toLowerCase() === _pickerEquip
    );
  }

  // Filter by search query
  if (_pickerQuery) {
    results = results.filter(e =>
      e.name.toLowerCase().includes(_pickerQuery) ||
      (e.muscles || []).some(m => m.includes(_pickerQuery)) ||
      (e.category || '').includes(_pickerQuery) ||
      (e.pattern  || '').includes(_pickerQuery)
    );
  }

  if (!results.length) {
    // Offer to add as custom
    el.innerHTML = `
      <div style="padding:24px 16px;text-align:center">
        <div style="font-size:0.76rem;color:var(--muted);margin-bottom:14px">No exercises found</div>
        ${_pickerQuery ? `<button class="btn btn-g" onclick="addCustomExerciseFromPicker()"
          style="font-size:0.72rem">+ Add "${escapeHtml(_pickerQuery)}" as custom</button>` : ''}
      </div>`;
    return;
  }

  // Group by primary muscle (first muscle in array) if no query and no muscle filter
  const grouped = !_pickerQuery && !_pickerMuscle;
  if (grouped) {
    const groups = {};
    results.forEach(e => {
      const key = (e.muscles && e.muscles[0]) || 'other';
      const label = _MUSCLE_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1));
      if (!groups[label]) groups[label] = [];
      groups[label].push(e);
    });

    el.innerHTML = Object.entries(groups).map(([groupLabel, items]) => `
      <div style="margin-bottom:2px">
        <div style="font-size:0.55rem;letter-spacing:0.14em;text-transform:uppercase;
          color:var(--blush);font-family:'DM Mono',monospace;padding:10px 10px 6px;
          position:sticky;top:0;background:var(--panel)">${escapeHtml(groupLabel)}</div>
        ${items.map(e => _pickerExRow(e)).join('')}
      </div>
    `).join('');
  } else {
    el.innerHTML = results.slice(0, 80).map(e => _pickerExRow(e)).join('');
  }
}

function _pickerExRow(e) {
  const muscles = [...(e.muscles || []), ...(e.secondary || [])].slice(0, 3)
    .map(m => _MUSCLE_LABELS[m] || m).join(', ');
  const equip = _EQUIP_LABELS[e.equipment] || _EQUIP_LABELS[e.category] || (e.equipment || '');
  return `<div onclick="pickExercise('${escapeAttr(e.name)}')"
    style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;
      cursor:pointer;transition:background 0.1s"
    onmouseover="this.style.background='var(--mid)'"
    onmouseout="this.style.background=''">
    <div style="flex:1;min-width:0">
      <div style="font-size:0.8rem;color:var(--cream);white-space:nowrap;
        overflow:hidden;text-overflow:ellipsis">${escapeHtml(e.name)}</div>
      ${muscles ? `<div style="font-size:0.6rem;color:var(--muted);margin-top:1px">${escapeHtml(muscles)}</div>` : ''}
    </div>
    ${equip ? `<span style="font-size:0.58rem;color:var(--muted-lt);font-family:'DM Mono',monospace;
      flex-shrink:0;background:var(--deep);border:1px solid var(--border);
      border-radius:5px;padding:2px 7px">${escapeHtml(equip)}</span>` : ''}
  </div>`;
}

function pickExercise(name) {
  if (!_pickerWcId) return;
  ensureFitnessState();
  const wc = S.workoutCards.find(w => String(w.id) === String(_pickerWcId));
  if (!wc) return;
  if (!Array.isArray(wc.exercises)) wc.exercises = [];
  // Don't add duplicates
  if (wc.exercises.some(e => e.name.toLowerCase() === name.toLowerCase())) {
    toast('Already in this workout');
    closeModal('mExercisePicker');
    return;
  }
  wc.exercises.push({ id: uid(), name });
  scheduleSave();
  closeModal('mExercisePicker');
  renderWorkoutCards();
}

function addCustomExerciseFromPicker() {
  const name = _pickerQuery.trim();
  if (!name) return;
  if (!Array.isArray(S.customExercises)) S.customExercises = [];
  if (!S.customExercises.some(e => e.name.toLowerCase() === name.toLowerCase())) {
    S.customExercises.push({ id: uid(), name });
    scheduleSave();
  }
  pickExercise(name);
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
  _renderWorkoutPresetPicker();
  openModal('mWorkoutPreset');
}

function _renderWorkoutPresetPicker() {
  const el = eid('workoutPresetList');
  if (!el || typeof WORKOUT_PRESETS === 'undefined') return;
  el.innerHTML = WORKOUT_PRESETS.map(group => `
    <div style="margin-bottom:16px">
      <div style="font-size:0.58rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--blush);font-family:'DM Mono',monospace;padding:6px 0 8px;border-bottom:1px solid var(--border);margin-bottom:6px">${escapeHtml(group.category)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${group.workouts.map(w => `
          <button onclick="addWorkoutCardFromPreset('${escapeAttr(w.name)}')"
            style="background:var(--mid);border:1px solid var(--border);border-radius:8px;padding:7px 14px;color:var(--mist);font-size:0.76rem;cursor:pointer;font-family:'Jost',sans-serif;transition:border-color 0.15s"
            onmouseover="this.style.borderColor='var(--blush)'"
            onmouseout="this.style.borderColor='var(--border)'"
          >${escapeHtml(w.name)}</button>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function addWorkoutCardFromPreset(name) {
  ensureFitnessState();
  const allPresets = typeof WORKOUT_PRESETS !== 'undefined'
    ? WORKOUT_PRESETS.flatMap(g => g.workouts) : [];
  const preset = allPresets.find(w => w.name === name);
  S.workoutCards.push({
    id: uid(),
    title: name,
    subtitle: '',
    exercises: [],
    presetFocus: preset ? preset.focus : []
  });
  closeModal('mWorkoutPreset');
  scheduleSave();
  renderWorkoutCards();
}

/* Try to normalize existing card titles to canonical preset names.
   Called once on fitness tab mount. Cards that already have presetFocus are skipped. */
function migrateWorkoutCardNamesOnce() {
  if (!Array.isArray(S.workoutCards) || !S.workoutCards.length) return;
  if (typeof WORKOUT_PRESETS === 'undefined') return;
  const allPresets = WORKOUT_PRESETS.flatMap(g => g.workouts);
  let changed = false;
  S.workoutCards.forEach(wc => {
    if (wc.presetFocus !== undefined) return; // already processed
    const titleLower = (wc.title || '').trim().toLowerCase();
    let match = allPresets.find(p => p.name.toLowerCase() === titleLower);
    if (!match) {
      match = allPresets.find(p => {
        const pL = p.name.toLowerCase();
        return titleLower.includes(pL) || pL.includes(titleLower);
      });
    }
    if (match) {
      wc.title = match.name;
      wc.presetFocus = match.focus;
    } else {
      wc.presetFocus = [];
    }
    changed = true;
  });
  if (changed) scheduleSave();
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

  // Check for PR BEFORE pushing new entry
  const prevBestE1RM = hist.length
    ? Math.max(...hist.map(e => {
        const sets = Array.isArray(e.loggedSets) ? e.loggedSets
          : (e.weight != null ? [{ weight: e.weight, reps: e.reps, sets: e.sets || 1 }] : []);
        return bestE1RM(sets) || 0;
      }))
    : 0;
  const newE1RM = epley1RM(weight, reps) || 0;
  const isPR = newE1RM > 0 && newE1RM > prevBestE1RM;

  hist.push(entry);

  // Keep current input values — do NOT reset so other exercise inputs are preserved
  if (setsEl) setsEl.value = setsCount;

  // PR badge flash on the exercise row
  if (isPR) {
    const exRow = document.querySelector(`#logW-${exId}`)?.closest('.ex-item');
    if (exRow) {
      const badge = document.createElement('div');
      badge.textContent = '🏅 PR';
      badge.style.cssText = 'position:absolute;top:-8px;right:4px;background:var(--gold);color:var(--ink);font-size:0.58rem;font-family:"DM Mono",monospace;font-weight:700;padding:2px 7px;border-radius:10px;letter-spacing:0.06em;pointer-events:none;z-index:10;animation:prPop 0.35s ease';
      exRow.style.position = 'relative';
      exRow.appendChild(badge);
      setTimeout(() => badge.remove(), 3500);
    }
  }

  // Update only the last-log display for this exercise (no full re-render)
  const lastLogDiv = eid(`lastLog-${exId}`);
  if (lastLogDiv) {
    const prev = hist.length >= 2 ? hist[hist.length - 2] : null;
    const pct = prev ? calcPctIncrease(prev.weight, entry.weight) : null;
    const prBadge = isPR ? ` <span style="background:var(--gold);color:var(--ink);font-size:0.52rem;font-family:'DM Mono',monospace;padding:1px 5px;border-radius:6px;margin-left:4px;letter-spacing:0.05em">PR</span>` : '';
    lastLogDiv.innerHTML = `${t('last_colon')} ${setsCount > 1 ? setsCount + ' × ' : ''}${weight}kg × ${reps || 0}${pct !== null ? ` <span style="color:var(--gold-lt)">${fmtPct(pct)}</span>` : ''}${prBadge}`;
    if (isPR) toast(`🏅 PR! ${ex.name} — Est. 1RM ${Math.round(newE1RM)}kg`);
    else {
      const pctVal = hist.length >= 2 ? calcPctIncrease(hist[hist.length - 2].weight, weight) : null;
      if (pctVal !== null && pctVal > 0) toast(`${ex.name}: ${fmtPct(pctVal)} ${t('from_last_log')}`);
      else toast(`${ex.name} ${t('exercise_logged')}`);
    }
  }

  startRestTimer();
  scheduleSave();
}

function logWorkoutSession(wcId) {
  ensureFitnessState();

  const wc = S.workoutCards.find(w => String(w.id) === String(wcId));
  if (!wc) return;

  // Use date picker if present, fall back to today
  const datePickerEl = eid(`sessionDate-${wc.id}`);
  const sessionDate  = (datePickerEl && datePickerEl.value) || today();
  const todayStr = sessionDate;
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
    date: sessionDate,
    summary: summary || 'Session completed',
    notes: sessionNote,
    exercises
  });

  const gh = hfind('gym','lift','workout','training','weights');
  if (gh) { if (!gh.days) gh.days = {}; gh.days[sessionDate] = true; }
  S.gymLog[sessionDate] = true;

  // Auto-link this card to the session date in the training week (only if it's this week)
  const week = weekDays();
  const todayIdx = week.indexOf(sessionDate);
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
  // Reset date picker to today after logging
  setTimeout(() => { const dp = eid(`sessionDate-${wc.id}`); if (dp) dp.value = today(); }, 50);

  // Heatmap hidden — code preserved: if (typeof renderMuscleHeatmap === 'function') renderMuscleHeatmap();
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
              : (e.weight !== undefined && e.weight !== null ? [{ weight: e.weight, reps: e.reps, sets: e.sets }] : []);
            const best = setsArr.reduce((b, s) => (!b || (parseFloat(s.weight)||0) > (parseFloat(b.weight)||0)) ? s : b, null);
            const bw = best && (parseFloat(best.weight) || 0);
            const br = best && (parseInt(best.reps) || 0);
            const summary = best && (bw || br)
              ? [setsArr.length > 1 ? setsArr.length + ' sets' : null, bw ? bw+'kg' : null, br ? br+' reps' : null].filter(Boolean).join(' × ')
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
  // Always start in single mode
  _epMode = 'single';
  const sPanel = eid('epSinglePanel');
  const cPanel = eid('epComparePanelWrap');
  const sBtn   = eid('epModeSingle');
  const cBtn   = eid('epModeCompare');
  if (sPanel) sPanel.style.display = '';
  if (cPanel) cPanel.style.display = 'none';
  if (sBtn) { sBtn.style.background = 'var(--blush)'; sBtn.style.color = 'var(--cream)'; }
  if (cBtn) { cBtn.style.background = 'none'; cBtn.style.color = 'var(--muted)'; }
  if (eid('epTitle')) eid('epTitle').textContent = 'Exercise Progress';

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

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-EXERCISE COMPARE CHART
// ─────────────────────────────────────────────────────────────────────────────

const COMPARE_COLORS = ['#e87ea1','#f4d03f','#4fc3f7','#a5d6a7','#ce93d8','#ffb74d','#ef9a9a'];

let _compareSelected = new Set();
let _epMode = 'single'; // 'single' | 'compare'

function epSetMode(mode) {
  _epMode = mode;
  const sBtn   = eid('epModeSingle');
  const cBtn   = eid('epModeCompare');
  const sPanel = eid('epSinglePanel');
  const cPanel = eid('epComparePanelWrap');

  if (mode === 'compare') {
    if (sBtn) { sBtn.style.background = 'none'; sBtn.style.color = 'var(--muted)'; }
    if (cBtn) { cBtn.style.background = 'var(--blush)'; cBtn.style.color = 'var(--cream)'; }
    if (sPanel) sPanel.style.display = 'none';
    if (cPanel) cPanel.style.display = '';
    if (eid('epTitle')) eid('epTitle').textContent = 'Compare Exercises';
    _renderComparePanel();
    epRenderCompare();
  } else {
    if (sBtn) { sBtn.style.background = 'var(--blush)'; sBtn.style.color = 'var(--cream)'; }
    if (cBtn) { cBtn.style.background = 'none'; cBtn.style.color = 'var(--muted)'; }
    if (sPanel) sPanel.style.display = '';
    if (cPanel) cPanel.style.display = 'none';
    if (eid('epTitle')) eid('epTitle').textContent = 'Exercise Progress';
    epRender();
  }
}

function _renderComparePanel() {
  const container = eid('epCompareList');
  if (!container) return;
  const hist = S.exerciseHistory || {};
  const exercises = Object.keys(hist).filter(k => (hist[k] || []).length > 0).sort();
  if (!exercises.length) {
    container.innerHTML = `<div style="color:var(--muted);font-size:0.72rem;padding:16px;text-align:center">Log some sessions first to compare exercises.</div>`;
    return;
  }
  container.innerHTML = exercises.map((key, i) => {
    const displayName = key.charAt(0).toUpperCase() + key.slice(1);
    const color = COMPARE_COLORS[i % COMPARE_COLORS.length];
    const checked = _compareSelected.has(key);
    return `<label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;border-bottom:1px solid var(--border-lt)">
      <input type="checkbox" onchange="epCompareToggle('${escapeAttr(key)}',this.checked)" ${checked?'checked':''} style="accent-color:${color};width:14px;height:14px;flex-shrink:0">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></span>
      <span style="flex:1;font-size:0.8rem;color:var(--mist)">${escapeHtml(displayName)}</span>
      <span style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace">${(hist[key]||[]).length} sessions</span>
    </label>`;
  }).join('');
}

function epCompareToggle(key, checked) {
  if (checked) _compareSelected.add(key);
  else _compareSelected.delete(key);
  epRenderCompare();
}

function epRenderCompare() {
  const chartEl  = eid('epChart');
  const statsEl  = eid('epStats');
  const logEl    = eid('epLog');
  if (logEl) logEl.innerHTML = '';

  if (!_compareSelected.size) {
    if (chartEl) chartEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:0.72rem;color:var(--muted)">Select exercises above to compare</div>`;
    if (statsEl) statsEl.innerHTML = '';
    return;
  }

  const metric = (eid('epMetricC') && eid('epMetricC').value) || 'e1rm';
  const range  = parseInt((eid('epRangeC') && eid('epRangeC').value) || '90');

  const keys = [..._compareSelected];
  const allSeries = keys.map((key, i) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    color: COMPARE_COLORS[i % COMPARE_COLORS.length],
    points: epBuildSeries(key, metric, range)
  })).filter(s => s.points.length >= 1);

  epDrawCompareChart(allSeries);

  if (statsEl) {
    statsEl.innerHTML = allSeries.map(s => {
      if (!s.points.length) return '';
      const pr = Math.max(...s.points.map(p => p.value));
      const unit = metric === 'totalVolume' ? '' : 'kg';
      return `<div class="card" style="padding:8px 10px;text-align:center;border-left:3px solid ${s.color}">
        <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeAttr(s.label)}">${escapeHtml(s.label.length > 14 ? s.label.slice(0,13)+'…' : s.label)}</div>
        <div style="font-size:0.82rem;color:var(--mist);font-family:'DM Mono',monospace">PR ${Math.round(pr*10)/10}${unit}</div>
      </div>`;
    }).join('');
  }
}

function epDrawCompareChart(series) {
  const el = eid('epChart');
  if (!el) return;

  const withData = series.filter(s => s.points.length >= 2);
  if (!withData.length) {
    el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:0.72rem;color:var(--muted)">Need at least 2 sessions per exercise to draw a chart</div>`;
    return;
  }

  const W = el.clientWidth || 520;
  const H = 200;
  const PAD = { top: 16, right: 12, bottom: 36, left: 44 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const allDates = [...new Set(withData.flatMap(s => s.points.map(p => p.date)))].sort();
  if (allDates.length < 2) {
    el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:0.72rem;color:var(--muted)">Need data on 2+ different dates</div>`;
    return;
  }

  const allVals = withData.flatMap(s => s.points.map(p => p.value));
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const vRange = maxV - minV || 1;

  const xOf = date => PAD.left + (allDates.indexOf(date) / (allDates.length - 1)) * iW;
  const yOf = v    => PAD.top + iH - ((v - minV) / vRange) * iH;

  // Gridlines
  const yTicks = [minV, minV + vRange * 0.5, maxV];
  const grids = yTicks.map(v =>
    `<line x1="${PAD.left}" y1="${yOf(v).toFixed(1)}" x2="${(PAD.left+iW).toFixed(1)}" y2="${yOf(v).toFixed(1)}" stroke="#2a2a2a" stroke-width="1"/>`
  ).join('');

  // Y labels
  const yLabels = yTicks.map(v =>
    `<text x="${(PAD.left-5).toFixed(1)}" y="${(yOf(v)+3).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--muted)" font-family="DM Mono,monospace">${Math.round(v)}</text>`
  ).join('');

  // X labels (max 5)
  const step = Math.max(1, Math.floor(allDates.length / 5));
  const xLabels = allDates
    .filter((_, i) => i % step === 0 || i === allDates.length - 1)
    .map(d => `<text x="${xOf(d).toFixed(1)}" y="${(H-4).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="DM Mono,monospace">${d.slice(5)}</text>`)
    .join('');

  // Series paths + dots
  const paths = withData.map(s => {
    const line = s.points.map((p, i) => `${i===0?'M':'L'}${xOf(p.date).toFixed(1)},${yOf(p.value).toFixed(1)}`).join(' ');
    const dots = s.points.map(p => {
      const tip = `${p.date}: ${Math.round(p.value*10)/10}kg — ${s.label}`;
      return `<circle cx="${xOf(p.date).toFixed(1)}" cy="${yOf(p.value).toFixed(1)}" r="3" fill="${s.color}" stroke="var(--bg)" stroke-width="1"><title>${tip}</title></circle>`;
    }).join('');
    return `<path d="${line}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>${dots}`;
  }).join('');

  // Legend
  const legend = withData.map(s =>
    `<span style="display:flex;align-items:center;gap:4px">
      <span style="width:14px;height:3px;background:${s.color};border-radius:2px;display:inline-block"></span>
      <span style="font-size:0.58rem;color:var(--muted-lt)">${escapeHtml(s.label.length>20?s.label.slice(0,19)+'…':s.label)}</span>
    </span>`
  ).join('');

  el.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    ${grids}${paths}${xLabels}${yLabels}
  </svg>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;justify-content:center">${legend}</div>`;
}

// Also call migrateWorkoutCardNamesOnce when exercise progress opens (idempotent)
function openExerciseProgressAndMigrate(name) {
  migrateWorkoutCardNamesOnce();
  openExerciseProgress(name);
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
