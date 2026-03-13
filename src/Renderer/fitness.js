'use strict';

/* ══ FITNESS STATE HELPERS ══ */
function ensureFitnessState() {
  if (!Array.isArray(S.workout)) S.workout = [];
  if (!Array.isArray(S.workoutCards)) S.workoutCards = [];
  if (!S.gymLog || typeof S.gymLog !== 'object') S.gymLog = {};
  if (!S.cardioLog || typeof S.cardioLog !== 'object') S.cardioLog = {};
  if (!Array.isArray(S.workoutHistory)) S.workoutHistory = [];
  if (!S.exerciseHistory || typeof S.exerciseHistory !== 'object') S.exerciseHistory = {};
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

function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

    div.innerHTML = `
      <div class="dn">${DAY_SHORT[i]}</div>
      <input
        class="editable wt-inp"
        value="${escapeHtml(wd.type || '')}"
        onchange="updateWDay(${i},this.value)"
        onclick="event.stopPropagation()"
        title="Click to rename"
      >
      <div class="ck">${done ? '✓' : isRest ? '—' : '○'}</div>
    `;

    div.addEventListener('click', () => {
      if (isRest) return;

      S.gymLog[d] = !S.gymLog[d];

      if (S.gymLog[d]) {
        const gh = S.habits?.find(h => h.id === 7);
        if (gh) gh.days[d] = true;
      }

      scheduleSave();
      renderGymWeek();
      if (typeof renderHabits === 'function') renderHabits();
    });

    c.appendChild(div);
  });
}

function updateWDay(i, val) {
  ensureFitnessState();

  if (!S.workout[i]) S.workout[i] = { type: '', rest: false };
  S.workout[i].type = val;
  S.workout[i].rest = String(val).trim().toLowerCase() === 'rest';

  scheduleSave();
  renderGymWeek();
}

/* ══ WORKOUT CARDS ══ */
function renderWorkoutCards() {
  ensureFitnessState();

  const c = eid('workoutCards');
  c.innerHTML = '';

  S.workoutCards.forEach(wc => {
    const div = document.createElement('div');
    div.className = 'card';

    div.innerHTML = `
      <div class="wk-head">
        <input
          class="editable wk-title-inp"
          value="${escapeHtml(wc.title || '')}"
          onchange="updateWCF(${wc.id},'title',this.value)"
          title="Edit title"
        >
        <input
          class="editable wk-badge-inp"
          value="${escapeHtml(wc.subtitle || '')}"
          onchange="updateWCF(${wc.id},'subtitle',this.value)"
          title="Edit subtitle"
          style="background:var(--rose);padding:2px 7px;border-radius:20px;font-size:0.58rem;width:auto;"
        >
      </div>

      <div class="exlist">
        ${(wc.exercises || []).map(ex => {
          const last = getLastExerciseLog(ex.name);
          const prev = getPrevExerciseLog(ex.name);
          const pct = last && prev ? calcPctIncrease(prev.weight, last.weight) : null;

          return `
            <div class="ex-item" style="display:block;">
              <div style="display:flex;align-items:center;gap:7px;">
                <input
                  class="editable ex-name-inp"
                  value="${escapeHtml(ex.name || '')}"
                  onchange="updateEx(${wc.id},${ex.id},'name',this.value)"
                  title="Edit exercise"
                >
                <input
                  class="editable ex-sets-inp"
                  value="${escapeHtml(ex.sets || '')}"
                  onchange="updateEx(${wc.id},${ex.id},'sets',this.value)"
                  title="Edit sets/reps"
                >
                <button class="ex-del" onclick="delEx(${wc.id},${ex.id})">✕</button>
              </div>

              <div style="display:flex;align-items:center;gap:6px;margin-top:7px;padding-left:14px;">
                <input class="add-inp" id="logW-${ex.id}" type="number" step="0.5" placeholder="kg" style="width:78px;flex:none;">
                <input class="add-inp" id="logR-${ex.id}" type="number" placeholder="reps" style="width:78px;flex:none;">
                <button class="btn btn-g" style="font-size:0.66rem;padding:4px 9px" onclick="logExercise(${wc.id},${ex.id})">Log</button>
              </div>

              <div style="margin-top:6px;padding-left:14px;font-size:0.64rem;color:var(--muted-lt);font-family:'DM Mono',monospace;">
                ${
                  last
                    ? `Last: ${last.weight}kg × ${last.reps}${pct !== null ? ` <span style="color:var(--gold-lt)">${fmtPct(pct)}</span>` : ''}`
                    : 'No log yet'
                }
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="add-ex-row" style="margin-top:9px">
        <input class="add-inp" id="exN-${wc.id}" placeholder="Exercise…" style="flex:1">
        <input class="add-inp" id="exS-${wc.id}" placeholder="3×10" style="width:56px;flex:none">
        <button class="btn btn-g" style="font-size:0.68rem;padding:4px 9px" onclick="addEx(${wc.id})">+ Add</button>
      </div>

      <div style="margin-top:12px;display:flex;justify-content:flex-end;">
        <button class="btn btn-p" style="font-size:0.68rem;padding:5px 10px" onclick="logWorkoutSession(${wc.id})">Log Session</button>
      </div>
    `;

    c.appendChild(div);
  });

  c.appendChild(renderWorkoutHistoryCard());
}

function renderWorkoutHistoryCard() {
  const wrap = document.createElement('div');
  wrap.className = 'card';

  const hist = [...(S.workoutHistory || [])].slice(-8).reverse();

  wrap.innerHTML = `
    <div class="wk-head">
      <div class="wk-title-inp" style="border:none;">Recent Training Log</div>
      <div class="wk-badge-inp" style="background:rgba(192,96,122,0.12);color:var(--petal);border:1px solid var(--border);">
        History
      </div>
    </div>

    ${
      hist.length
        ? hist.map(item => `
            <div class="ex-item" style="display:block;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <div style="font-size:0.8rem;color:var(--mist);">${escapeHtml(item.title || 'Workout')}</div>
                <div style="font-size:0.62rem;color:var(--muted-lt);font-family:'DM Mono',monospace;">
                  ${escapeHtml(item.date || '')}
                </div>
              </div>
              <div style="margin-top:4px;font-size:0.68rem;color:var(--muted);line-height:1.5;">
                ${escapeHtml(item.summary || '')}
              </div>
            </div>
          `).join('')
        : `<div style="font-size:0.74rem;color:var(--muted);">No workout sessions logged yet.</div>`
    }
  `;

  return wrap;
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

  const sets = eid(`exS-${wcId}`).value.trim() || '3×10';
  const wc = S.workoutCards.find(w => w.id === wcId);
  if (!wc) return;

  if (!Array.isArray(wc.exercises)) wc.exercises = [];
  wc.exercises.push({
    id: Date.now(),
    name,
    sets
  });

  eid(`exN-${wcId}`).value = '';
  eid(`exS-${wcId}`).value = '';

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

  if (!weight || weight <= 0) {
    toast('Enter a weight first');
    return;
  }

  const entry = {
    date: today(),
    weight,
    reps: reps || 0
  };

  const hist = getExerciseHistory(ex.name);
  hist.push(entry);

  eid(`logW-${exId}`).value = '';
  eid(`logR-${exId}`).value = '';

  scheduleSave();
  renderWorkoutCards();

  const prev = hist.length >= 2 ? hist[hist.length - 2] : null;
  const pct = prev ? calcPctIncrease(prev.weight, entry.weight) : null;

  if (pct !== null && pct > 0) toast(`${ex.name}: ${fmtPct(pct)} from last log`);
  else toast(`${ex.name} logged`);
}

function logWorkoutSession(wcId) {
  ensureFitnessState();

  const wc = S.workoutCards.find(w => w.id === wcId);
  if (!wc) return;

  const summary = (wc.exercises || [])
    .map(ex => {
      const last = getLastExerciseLog(ex.name);
      return last ? `${ex.name} ${last.weight}kg×${last.reps}` : null;
    })
    .filter(Boolean)
    .slice(0, 5)
    .join(' · ');

  S.workoutHistory.push({
    id: Date.now(),
    title: wc.title || 'Workout',
    date: today(),
    summary: summary || 'Session completed'
  });

  const gh = S.habits?.find(h => h.id === 7);
  if (gh) gh.days[today()] = true;
  S.gymLog[today()] = true;

  scheduleSave();
  renderWorkoutCards();
  renderGymWeek();
  if (typeof renderHabits === 'function') renderHabits();

  toast(`${wc.title || 'Workout'} saved to history`);
}

/* ══ CARDIO ══ */
function logCardio() {
  ensureFitnessState();

  const mins = parseInt(eid('cardioMins').value, 10) || 0;
  if (mins <= 0) return;

  S.cardioLog[today()] = (S.cardioLog[today()] || 0) + mins;

  if (S.cardioLog[today()] >= 30) {
    const ch = S.habits?.find(h => h.id === 6);
    if (ch) ch.days[today()] = true;
  }

  scheduleSave();
  if (typeof renderHabits === 'function') renderHabits();
  updateCardioDisplay();

  eid('cardioMins').value = 0;
  toast(`${mins} min logged — total today: ${S.cardioLog[today()]} min`);
}

function updateCardioDisplay() {
  ensureFitnessState();
  const t = S.cardioLog[today()] || 0;
  eid('cardioToday').textContent = t > 0 ? `${t} min today` : '';
}
