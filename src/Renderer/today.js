'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// today.js — Today Dashboard (replaces the old Daily tab)
// Renders to #todayDashboard
// ─────────────────────────────────────────────────────────────────────────────

// Scroll to a section only if it's currently visible (not hidden by modules)
function scrollToSection(id) {
  const el = eid(id);
  if (el && el.style.display !== 'none') el.scrollIntoView({ behavior: 'smooth' });
}


/* ══ WATER TRACKER ══ */
// waterLog stores units (glasses/cups/litres/oz) — not raw ml —
// because changing units also changes the target, so relative progress is preserved.

const WATER_UNIT_LABELS = { glasses: 'glasses', litres: 'L', cups: 'cups', oz: 'fl oz' };
const WATER_UNIT_DEFAULTS = { glasses: 8, litres: 2, cups: 8, oz: 64 };
// ml equivalent per one unit (for display tooltip only)
const WATER_UNIT_ML = { glasses: 250, litres: 1000, cups: 240, oz: 30 };

function getWaterUnit() {
  return (S.appPrefs && S.appPrefs.waterUnit) || 'glasses';
}

function setWaterUnit(unit) {
  if (!S.appPrefs) S.appPrefs = {};
  S.appPrefs.waterUnit = unit;
  // Set a sensible default target for the new unit if not customised
  const currentTarget = S.appPrefs.waterTarget;
  const prevDefault = WATER_UNIT_DEFAULTS[(S.appPrefs._prevWaterUnit || 'glasses')];
  if (!currentTarget || currentTarget === prevDefault) {
    S.appPrefs.waterTarget = WATER_UNIT_DEFAULTS[unit];
  }
  S.appPrefs._prevWaterUnit = unit;
  scheduleSave();
  // Highlight the active button
  Object.keys(WATER_UNIT_LABELS).forEach(u => {
    const btn = eid('wuBtn-' + u);
    if (btn) btn.classList.toggle('active', u === unit);
  });
  renderToday();
}

function getTodayWater() {
  const d = today();
  return (S.waterLog && S.waterLog[d]) || 0;
}

function addWater(units) {
  if (!S.waterLog) S.waterLog = {};
  const d = today();
  S.waterLog[d] = Math.max(0, (S.waterLog[d] || 0) + units);
  scheduleSave();
  renderToday();
}

function setWaterTarget(val) {
  if (!S.appPrefs) S.appPrefs = {};
  S.appPrefs.waterTarget = Math.max(1, parseFloat(val) || WATER_UNIT_DEFAULTS[getWaterUnit()]);
  scheduleSave();
  renderToday();
}

/* ══ MAIN RENDER ══ */
function renderToday() {
  const c = eid('todayDashboard');
  if (!c) return;

  const d = today();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // ── Data gathering ──
  const habits      = (S.habits || []).filter(h => h && !h.hidden);
  const habitsDone  = habits.filter(h => h.days && h.days[d]).length;
  const habitsTotal = habits.length;

  const prayerLog    = (S.prayerLog && S.prayerLog[d]) || {};
  const showPrayer   = (typeof isPrayerTrackerOn === 'function') ? isPrayerTrackerOn() : true;
  const activePrays  = (typeof getActivePrayers === 'function') ? getActivePrayers() : (typeof PRAYERS !== 'undefined' ? PRAYERS : []);
  const prayersDone  = activePrays.filter(p => !!prayerLog[p]).length;
  const prayersTotal = activePrays.length;

  const gymDone    = !!(S.gymLog && S.gymLog[d]);
  const cardioMins = (S.cardioLog && S.cardioLog[d]) || 0;

  const foodEntries = (S.foodLog && S.foodLog[d]) || [];
  const foodKcal    = foodEntries.reduce((s, e) => s + (e.kcal || 0), 0);
  const foodTarget  = (S.foodTargets && S.foodTargets.kcal) || 2000;
  const foodPct     = Math.min(100, Math.round((foodKcal / foodTarget) * 100));

  const waterUnit    = getWaterUnit();
  const waterUnitLbl = WATER_UNIT_LABELS[waterUnit] || 'glasses';
  const waterCount   = getTodayWater();
  const waterTarget  = (S.appPrefs && S.appPrefs.waterTarget) || WATER_UNIT_DEFAULTS[waterUnit] || 8;
  const waterPct     = Math.min(100, Math.round((waterCount / waterTarget) * 100));
  // Legacy alias used further down
  const waterGlasses = waterCount;

  const focusItem   = (S.focusItems || []).find(f => !f.completed);
  const todayNote   = (S.notes && S.notes[d]) || '';

  // Upcoming deadlines (today + next 3 days)
  const soon = new Date(d + 'T00:00:00');
  soon.setDate(soon.getDate() + 3);
  const soonStr = soon.toISOString().slice(0, 10);
  const deadlines = (S.projects || [])
    .filter(p => p.deadline && p.status !== 'Done' && p.deadline <= soonStr)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3);

  const activeMedia = (S.media || []).filter(m => m.status === 'reading' || m.status === 'watching' || m.status === 'playing').slice(0, 3);

  // Next up: first incomplete task across all active projects (by priority)
  let nextUpTask = null;
  let nextUpProject = null;
  for (const proj of (S.projects || []).filter(p => p.status !== 'Done')) {
    const tasks = (proj.tasks || []).filter(tk => !tk.done);
    if (tasks.length) {
      nextUpTask = tasks[0];
      nextUpProject = proj;
      break;
    }
  }

  // ── Day score (0-100) ──
  let score = 0;
  if (habitsTotal) score += Math.round((habitsDone / habitsTotal) * 40);
  if (prayersTotal) score += Math.round((prayersDone / prayersTotal) * 20);
  if (gymDone || cardioMins >= 20) score += 15;
  if (foodKcal > 0) score += 10;
  if (waterCount >= waterTarget) score += 15;
  const scoreColor = score >= 80 ? 'var(--gold-lt)' : score >= 50 ? 'var(--blush)' : 'var(--muted-lt)';

  // ── Ring helper ──
  function ring(pct, color, size) {
    const r = (size / 2) - 4;
    const circ = 2 * Math.PI * r;
    const dash = (pct / 100) * circ;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--mid)" stroke-width="3.5"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="3.5"
        stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round"/>
    </svg>`;
  }

  // ── Habit rows ──
  const habitRows = habits.map(h => {
    const done = !!(h.days && h.days[d]);
    const streak = (typeof calcStreak === 'function') ? calcStreak(h.days || {}) : 0;
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border-lt);cursor:pointer" onclick="toggleHabit('${h.id}','${d}')">
      <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${done ? 'var(--blush)' : 'var(--border)'};background:${done ? 'var(--blush)' : 'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.15s">
        ${done ? `<svg width="10" height="8" viewBox="0 0 10 8"><polyline points="1,4 4,7 9,1" fill="none" stroke="var(--cream)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
      </div>
      <span style="flex:1;font-size:0.8rem;color:${done ? 'var(--muted)' : 'var(--mist)'};text-decoration:${done ? 'line-through' : 'none'}">${escapeHtml(h.name)}</span>
      ${streak >= 3 ? `<span style="font-size:0.56rem;color:var(--gold);font-family:'DM Mono',monospace">${streak}d</span>` : ''}
    </div>`;
  }).join('');

  // ── Prayer row ──
  const prayerRowHtml = activePrays.map(p => {
    const done = !!prayerLog[p];
    return `<button onclick="togglePrayer('${p}')" style="flex:1;padding:8px 2px;border-radius:8px;border:none;background:${done ? 'var(--blush)' : 'var(--mid)'};color:${done ? 'var(--cream)' : 'var(--muted)'};font-size:0.58rem;font-family:'DM Mono',monospace;cursor:pointer;transition:all 0.15s;letter-spacing:0.04em;min-height:36px;-webkit-tap-highlight-color:transparent">
      ${escapeHtml(p.charAt(0).toUpperCase() + p.slice(1))}
    </button>`;
  }).join('');

  // ── Water bubbles (cap at 20 bubbles; for litre/oz use numeric +/- only) ──
  const maxBubbles = Math.min(waterTarget, 20);
  const waterBubbles = waterUnit === 'litres' || waterUnit === 'oz'
    ? '' // numeric-only for these units (bubbles impractical)
    : Array.from({length: maxBubbles}, (_, i) => {
        const filled = i < waterCount;
        return `<div onclick="addWater(${filled ? -1 : 1})" style="width:36px;height:36px;border-radius:50%;background:${filled ? 'var(--blush)' : 'var(--mid)'};border:1.5px solid ${filled ? 'var(--blush)' : 'var(--border)'};cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent" title="${filled ? 'Remove' : 'Add'} 1 ${waterUnitLbl}">
          ${filled ? `<svg width="12" height="15" viewBox="0 0 10 13"><path d="M5 1 C5 1 9 5 9 8 A4 4 0 0 1 1 8 C1 5 5 1 5 1Z" fill="var(--cream)" opacity="0.8"/></svg>` : ''}
        </div>`;
      }).join('');

  // Helper: returns '' (hidden) or the html string based on module toggle
  const mod = (id, html) => (typeof modOn === 'function' && !modOn(id)) ? '' : html;

  c.innerHTML = `
    <!-- Greeting + day score -->
    <div id="todayScoreSection" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
      <div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:1.5rem;color:var(--cream);line-height:1.1">${greeting}</div>
        <div style="font-size:0.62rem;color:var(--muted);font-family:'DM Mono',monospace;margin-top:3px">${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:1.4rem;font-family:'DM Mono',monospace;color:${scoreColor};line-height:1">${score}</div>
        <div style="font-size:0.5rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em">Day Score</div>
      </div>
    </div>

    <!-- Progress rings row -->
    <div id="todayRingsRow" class="card" style="margin-bottom:16px;padding:14px 18px">
      <div style="display:grid;grid-template-columns:repeat(${showPrayer && prayersTotal > 0 ? 4 : 3},1fr);gap:8px;text-align:center">

        <!-- Habits ring -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer" onclick="scrollToSection('todayHabitsSection')">
          <div style="position:relative;width:54px;height:54px">
            ${ring(habitsTotal ? Math.round((habitsDone/habitsTotal)*100) : 0, 'var(--blush)', 54)}
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.72rem;color:var(--cream);font-family:'DM Mono',monospace">${habitsDone}/${habitsTotal}</div>
          </div>
          <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em">Habits</div>
        </div>

        <!-- Food ring -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer" onclick="go('food')">
          <div style="position:relative;width:54px;height:54px">
            ${ring(foodPct, foodPct >= 100 ? 'var(--petal)' : foodPct >= 80 ? 'var(--gold)' : 'var(--gold-lt)', 54)}
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.62rem;color:var(--cream);font-family:'DM Mono',monospace">${Math.round(foodKcal)}</div>
          </div>
          <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em">Kcal</div>
        </div>

        <!-- Water ring -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer" onclick="scrollToSection('todayWaterSection')">
          <div style="position:relative;width:54px;height:54px">
            ${ring(waterPct, 'var(--blush)', 54)}
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.72rem;color:var(--cream);font-family:'DM Mono',monospace">${waterCount}/${waterTarget}</div>
          </div>
          <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em">Water</div>
        </div>

        <!-- Prayer ring -->
        ${showPrayer && prayersTotal > 0 ? `
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer" onclick="scrollToSection('todayPrayerSection')">
          <div style="position:relative;width:54px;height:54px">
            ${ring(Math.round((prayersDone/prayersTotal)*100), 'var(--gold)', 54)}
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.72rem;color:var(--cream);font-family:'DM Mono',monospace">${prayersDone}/${prayersTotal}</div>
          </div>
          <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em">Prayer</div>
        </div>` : ''}

      </div>
    </div>

    ${deadlines.length ? `
    <!-- Upcoming deadlines -->
    <div class="card" style="margin-bottom:16px;padding:12px 16px">
      <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.12em;font-family:'DM Mono',monospace;margin-bottom:8px">Deadlines</div>
      ${deadlines.map(p => {
        const du = Math.round((new Date(p.deadline+'T00:00:00') - new Date(d+'T00:00:00')) / 86400000);
        const col = du <= 0 ? 'var(--petal)' : du <= 2 ? 'var(--gold)' : 'var(--muted-lt)';
        const lbl = du < 0 ? `${Math.abs(du)}d overdue` : du === 0 ? 'Today' : `${du}d`;
        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
          <span style="font-size:0.6rem;color:${col};font-family:'DM Mono',monospace;min-width:56px">${lbl}</span>
          <span style="font-size:0.78rem;color:var(--mist);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer" onclick="go('projects')">${escapeHtml(p.title)}</span>
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- Habits -->
    <div id="todayHabitsSection" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="sec" style="margin:0;font-size:0.66rem">Habits</div>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace">${habitsDone}/${habitsTotal}</span>
          <button class="btn btn-g" style="font-size:0.6rem;padding:2px 8px" onclick="openHabitManager()">Edit</button>
        </div>
      </div>
      <div class="card" style="padding:8px 14px">
        ${habitRows || `<div style="font-size:0.72rem;color:var(--muted);padding:16px 0;text-align:center;letter-spacing:0.04em">No habits yet — tap Edit to add one</div>`}
      </div>
    </div>

    <!-- Prayer -->
    ${showPrayer ? `
    <div id="todayPrayerSection" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="sec" style="margin:0;font-size:0.66rem">Prayer</div>
        <span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace">${prayersDone}/${prayersTotal}</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${prayerRowHtml}
      </div>
    </div>` : ''}

    <!-- Mood (feature-flagged) -->
    ${typeof feat === 'function' && feat('moodTracking') ? `
    <div class="card" style="margin-bottom:16px;padding:12px 16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.12em;font-family:'DM Mono',monospace">Today's Mood</span>
        <span id="moodScore" style="font-size:0.78rem;color:var(--gold-lt);font-family:'DM Mono',monospace">${S.moodLog && S.moodLog[d] ? S.moodLog[d] + '/10' : '—'}</span>
      </div>
      <div id="moodGrid" style="display:flex;gap:3px;flex-wrap:wrap"></div>
    </div>` : ''}

    <!-- Water tracker -->
    <div id="todayWaterSection" class="card" style="margin-bottom:16px;padding:12px 16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.12em;font-family:'DM Mono',monospace">Water · ${waterCount}/${waterTarget} ${waterUnitLbl}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <button onclick="addWater(-${waterUnit==='litres'?0.25:waterUnit==='oz'?8:1})" style="background:var(--mid);border:none;color:var(--muted);cursor:pointer;width:36px;height:36px;border-radius:50%;font-size:1.1rem;line-height:1;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent">−</button>
          <button onclick="addWater(${waterUnit==='litres'?0.25:waterUnit==='oz'?8:1})" style="background:var(--blush);border:none;color:var(--cream);cursor:pointer;width:36px;height:36px;border-radius:50%;font-size:1.1rem;line-height:1;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent">+</button>
        </div>
      </div>
      ${waterBubbles ? `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">${waterBubbles}</div>` : ''}
      ${(waterUnit === 'litres' || waterUnit === 'oz') ? `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <input type="range" min="0" max="${waterTarget}" step="${waterUnit==='litres'?0.25:8}" value="${waterCount}"
            oninput="addWater(parseFloat(this.value)-getTodayWater())"
            style="flex:1;accent-color:var(--blush)">
          <span style="font-size:0.7rem;color:var(--gold-lt);font-family:'DM Mono',monospace;min-width:32px;text-align:right">${waterCount}${waterUnit==='litres'?'L':'oz'}</span>
        </div>` : ''}
      <div style="margin-top:4px;display:flex;align-items:center;gap:6px">
        <span style="font-size:0.58rem;color:var(--muted)">Target:</span>
        <input type="number" min="0.25" max="${waterUnit==='litres'?10:waterUnit==='oz'?200:30}" step="${waterUnit==='litres'?0.25:waterUnit==='oz'?8:1}" value="${waterTarget}" onchange="setWaterTarget(this.value)"
          style="width:42px;background:var(--mid);border:1px solid var(--border);border-radius:4px;color:var(--gold-lt);font-size:0.62rem;text-align:center;padding:1px 3px;font-family:'DM Mono',monospace">
        <span style="font-size:0.58rem;color:var(--muted)">${waterUnitLbl}/day</span>
      </div>
    </div>

    ${focusItem ? `
    <!-- Active focus item -->
    <div class="card" style="margin-bottom:16px;padding:12px 16px;border-left:3px solid var(--blush);cursor:pointer" onclick="go('focus')">
      <div style="font-size:0.52rem;color:var(--blush);text-transform:uppercase;letter-spacing:0.12em;font-family:'DM Mono',monospace;margin-bottom:5px">Current Focus</div>
      <div style="font-size:0.88rem;color:var(--mist)">${escapeHtml(focusItem.label)}</div>
      ${focusItem.pomodorosDone ? `<div style="font-size:0.6rem;color:var(--muted);margin-top:3px;font-family:'DM Mono',monospace">${focusItem.pomodorosDone} pomodoro${focusItem.pomodorosDone !== 1 ? 's' : ''} done</div>` : ''}
    </div>` : ''}

    ${nextUpTask ? mod('today.nextup', `
    <!-- Next up task -->
    <div id="todayNextUpSection" class="card" style="margin-bottom:16px;padding:12px 16px;border-left:3px solid var(--gold);cursor:pointer" onclick="go('projects')">
      <div style="font-size:0.52rem;color:var(--gold);text-transform:uppercase;letter-spacing:0.12em;font-family:'DM Mono',monospace;margin-bottom:5px">Next Up · ${escapeHtml(nextUpProject.title || 'Project')}</div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:16px;height:16px;border-radius:50%;border:2px solid var(--gold);flex-shrink:0"></div>
        <span style="font-size:0.86rem;color:var(--mist);flex:1">${escapeHtml(nextUpTask.text || nextUpTask.label || '')}</span>
        ${nextUpTask.timeEst ? `<span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace">${nextUpTask.timeEst}m</span>` : ''}
      </div>
    </div>`) : ''}

    <!-- Quick exercise log strip -->
    ${(() => {
      const hist = S.exerciseHistory || {};
      // Top 4 exercises by most recent log date
      const entries = Object.entries(hist)
        .map(([key, logs]) => {
          if (!logs.length) return null;
          const last = logs[logs.length - 1];
          return { key, last, name: key.charAt(0).toUpperCase() + key.slice(1) };
        })
        .filter(Boolean)
        .sort((a, b) => (b.last.date || '').localeCompare(a.last.date || ''))
        .slice(0, 4);
      if (!entries.length) return '';
      return `<div id="todayQuickLogSection" class="card" style="margin-bottom:16px;padding:12px 16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.12em;font-family:'DM Mono',monospace">Quick Log</div>
          <button onclick="go('fitness')" style="background:none;border:none;color:var(--blush);font-size:0.62rem;cursor:pointer;font-family:'DM Mono',monospace">All →</button>
        </div>
        ${entries.map(e => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:0.74rem;color:var(--mist);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escapeAttr(e.name)}">${escapeHtml(e.name.length>20?e.name.slice(0,19)+'…':e.name)}</span>
            <input type="number" id="ql-w-${escapeAttr(e.key)}" step="0.5" placeholder="kg" value="${e.last.weight||''}"
              style="width:58px;background:var(--mid);border:1px solid var(--border);border-radius:6px;color:var(--gold-lt);font-size:0.7rem;text-align:center;padding:4px;font-family:'DM Mono',monospace;outline:none">
            <input type="number" id="ql-r-${escapeAttr(e.key)}" placeholder="reps" value="${e.last.reps||''}"
              style="width:48px;background:var(--mid);border:1px solid var(--border);border-radius:6px;color:var(--mist);font-size:0.7rem;text-align:center;padding:4px;font-family:'DM Mono',monospace;outline:none">
            <button onclick="quickLogExercise('${escapeAttr(e.key)}')"
              style="background:var(--blush);border:none;border-radius:6px;color:var(--cream);font-size:0.62rem;padding:4px 9px;cursor:pointer;font-family:'DM Mono',monospace;flex-shrink:0">Log</button>
          </div>
        `).join('')}
      </div>`;
    })()}

    ${activeMedia.length ? `
    <!-- In progress media -->
    <div id="todayMediaSection" class="card" style="margin-bottom:16px;padding:12px 16px">
      <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.12em;font-family:'DM Mono',monospace;margin-bottom:8px">In Progress</div>
      ${activeMedia.map(m => {
        const pct = typeof getBookPct === 'function' ? getBookPct(m) : 0;
        return `<div style="margin-bottom:7px;cursor:pointer" onclick="go('media')">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="font-size:0.78rem;color:var(--mist);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:78%">${escapeHtml(m.title)}</span>
            ${pct > 0 ? `<span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace">${pct}%</span>` : ''}
          </div>
          ${pct > 0 ? `<div style="height:2px;background:var(--mid);border-radius:2px"><div style="height:2px;width:${pct}%;background:var(--blush);border-radius:2px"></div></div>` : ''}
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- Quick win -->
    <div id="todayWinSection" class="card" style="margin-bottom:16px;padding:12px 16px">
      <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.12em;font-family:'DM Mono',monospace;margin-bottom:8px">Log a Win</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="todayWinInput" class="add-inp" placeholder="What did you accomplish today?" style="flex:1;font-size:0.78rem"
          onkeydown="if(event.key==='Enter')addWinToday()">
        <button class="btn btn-p" onclick="addWinToday()" style="font-size:0.72rem;flex-shrink:0">+ Win</button>
      </div>
    </div>

    <!-- Daily note -->
    <div id="todayNoteSection" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="sec" style="margin:0;font-size:0.66rem">Daily Note</div>
        <button class="btn btn-g" style="font-size:0.6rem;padding:2px 8px" onclick="openPastNotes()">Past</button>
      </div>
      <div class="card">
        <textarea id="todayNoteArea" class="editable-area" rows="4" placeholder="Write anything…"
          oninput="S.notes[today()]=this.value;clearTimeout(window._noteSaveT);window._noteSaveT=setTimeout(scheduleSave,800)"
          style="font-size:16px">${escapeHtml(todayNote)}</textarea>
      </div>
    </div>

    <!-- Reflection / quote -->
    <div id="reflectionCard" class="card quote-card" style="margin-bottom:18px">
      <div class="q-label">Reflection</div>
      <textarea id="quoteText" class="editable-area" rows="3" placeholder="Write your quote or reflection…" oninput="S.quote.text=this.value;clearTimeout(window._quoteSaveT);window._quoteSaveT=setTimeout(scheduleSave,800)">${escapeHtml(S.quote && S.quote.text || '')}</textarea>
      <input id="quoteAuthor" class="editable" placeholder="— Author" value="${escapeAttr(S.quote && S.quote.author || '')}" oninput="S.quote.author=this.value;clearTimeout(window._quoteSaveT);window._quoteSaveT=setTimeout(scheduleSave,800)">
    </div>
  `;

  // Sync hidden elements that other code still writes to
  const hiddenNote = eid('dailyNotes');
  if (hiddenNote) hiddenNote.value = todayNote;

  // Re-populate prayer row element used by renderPrayer()
  if (typeof renderPrayer === 'function') {
    // renderPrayer writes to #prayerRow; we rendered inline, so skip duplicate
  }

  // Render mood grid if visible
  if (typeof renderMoodSection === 'function' && typeof feat === 'function' && feat('moodTracking')) {
    renderMoodSection();
  }
}

/* ── Habit toggle from today dashboard ─────────────────────── */
function toggleHabit(id, dateStr) {
  const h = (S.habits || []).find(h => String(h.id) === String(id));
  if (!h) return;
  if (!h.days) h.days = {};
  h.days[dateStr] = !h.days[dateStr];
  if (!h.days[dateStr]) delete h.days[dateStr];
  scheduleSave();
  if (typeof renderHabits === 'function') renderHabits(); // keep habit list in sync
  renderToday();
}

/* ── Quick log exercise from Today ──────────────────────────── */
function quickLogExercise(key) {
  const wEl = eid('ql-w-' + key);
  const rEl = eid('ql-r-' + key);
  if (!wEl || !rEl) return;
  const weight = parseFloat(wEl.value);
  const reps   = parseInt(rEl.value);
  if (!weight || weight <= 0) { toast('Enter weight'); return; }
  if (!reps    || reps   <= 0) { toast('Enter reps');   return; }

  if (!S.exerciseHistory) S.exerciseHistory = {};
  if (!S.exerciseHistory[key]) S.exerciseHistory[key] = [];

  // PR check — use reduce so a single NaN entry doesn't corrupt the whole max
  const hist = S.exerciseHistory[key];
  const prevBest = hist.reduce((best, e) => {
    const sets = Array.isArray(e.loggedSets) ? e.loggedSets
      : (e.weight != null ? [{ weight: e.weight, reps: e.reps }] : []);
    const rm = (typeof epley1RM === 'function' ? epley1RM(sets[0]?.weight, sets[0]?.reps) : 0) || 0;
    return rm > best ? rm : best;
  }, 0);
  const newE1RM = typeof epley1RM === 'function' ? (epley1RM(weight, reps) || 0) : 0;
  const isPR = newE1RM > 0 && newE1RM > prevBest;

  hist.push({ date: today(), weight, reps, sets: 1 });
  scheduleSave();

  const displayName = key.charAt(0).toUpperCase() + key.slice(1);
  if (isPR) toast(`🏅 PR! ${displayName} — ${Math.round(newE1RM)}kg est. 1RM`);
  else toast(`${displayName} logged`);

  if (typeof startRestTimer === 'function') startRestTimer();
  renderToday();
}

/* ── Add habit mini-modal ────────────────────────────────────── */
function openAddHabitModal() {
  const name = prompt('Habit name:');
  if (!name || !name.trim()) return;
  if (!Array.isArray(S.habits)) S.habits = [];
  const _mkHabit = typeof makeHabit === 'function'
    ? makeHabit
    : h => ({ id: uid(), name: h.name || '', days: {} });
  S.habits.push(_mkHabit({ id: uid(), name: name.trim() }));
  scheduleSave();
  renderToday();
  if (typeof renderHabits === 'function') renderHabits();
}

/* ── renderTodaySummary shim (keeps old call sites working) ── */
function renderTodaySummary() {
  renderToday();
}
