'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// today.js — Today Dashboard (replaces the old Daily tab)
// Renders to #todayDashboard
// ─────────────────────────────────────────────────────────────────────────────

/* ══ WATER TRACKER ══ */
const WATER_GLASS_ML = 250; // ml per glass

function getTodayWater() {
  const d = today();
  return (S.waterLog && S.waterLog[d]) || 0;
}

function addWater(glasses) {
  if (!S.waterLog) S.waterLog = {};
  const d = today();
  S.waterLog[d] = Math.max(0, (S.waterLog[d] || 0) + glasses);
  scheduleSave();
  renderToday();
}

function setWaterTarget(glasses) {
  if (!S.appPrefs) S.appPrefs = {};
  S.appPrefs.waterTarget = Math.max(1, parseInt(glasses) || 8);
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
  const habits      = S.habits || [];
  const habitsDone  = habits.filter(h => h.days && h.days[d]).length;
  const habitsTotal = habits.length;

  const prayerLog   = (S.prayerLog && S.prayerLog[d]) || {};
  const prayersDone = (typeof PRAYERS !== 'undefined') ? PRAYERS.filter(p => !!prayerLog[p]).length : 0;
  const prayersTotal = (typeof PRAYERS !== 'undefined') ? PRAYERS.length : 5;

  const gymDone    = !!(S.gymLog && S.gymLog[d]);
  const cardioMins = (S.cardioLog && S.cardioLog[d]) || 0;

  const foodEntries = (S.foodLog && S.foodLog[d]) || [];
  const foodKcal    = foodEntries.reduce((s, e) => s + (e.kcal || 0), 0);
  const foodTarget  = (S.foodTargets && S.foodTargets.kcal) || 2000;
  const foodPct     = Math.min(100, Math.round((foodKcal / foodTarget) * 100));

  const waterGlasses = getTodayWater();
  const waterTarget  = (S.appPrefs && S.appPrefs.waterTarget) || 8;
  const waterPct     = Math.min(100, Math.round((waterGlasses / waterTarget) * 100));

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

  // ── Day score (0-100) ──
  let score = 0;
  if (habitsTotal) score += Math.round((habitsDone / habitsTotal) * 40);
  if (prayersTotal) score += Math.round((prayersDone / prayersTotal) * 20);
  if (gymDone || cardioMins >= 20) score += 15;
  if (foodKcal > 0) score += 10;
  if (waterGlasses >= waterTarget) score += 15;
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
  const prayerRowHtml = (typeof PRAYERS !== 'undefined') ? PRAYERS.map(p => {
    const done = !!prayerLog[p];
    return `<button onclick="togglePrayer('${p}')" style="flex:1;padding:8px 2px;border-radius:8px;border:none;background:${done ? 'var(--blush)' : 'var(--mid)'};color:${done ? 'var(--cream)' : 'var(--muted)'};font-size:0.58rem;font-family:'DM Mono',monospace;cursor:pointer;transition:all 0.15s;letter-spacing:0.04em">
      ${escapeHtml(p.charAt(0).toUpperCase() + p.slice(1))}
    </button>`;
  }).join('') : '';

  // ── Water bubbles ──
  const waterBubbles = Array.from({length: waterTarget}, (_, i) => {
    const filled = i < waterGlasses;
    return `<div onclick="addWater(${filled ? -1 : 1})" style="width:28px;height:28px;border-radius:50%;background:${filled ? 'var(--blush)' : 'var(--mid)'};border:1.5px solid ${filled ? 'var(--blush)' : 'var(--border)'};cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center" title="${filled ? 'Remove glass' : 'Add glass'}">
      ${filled ? `<svg width="10" height="13" viewBox="0 0 10 13"><path d="M5 1 C5 1 9 5 9 8 A4 4 0 0 1 1 8 C1 5 5 1 5 1Z" fill="var(--cream)" opacity="0.8"/></svg>` : ''}
    </div>`;
  }).join('');

  c.innerHTML = `
    <!-- Greeting + day score -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
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
    <div class="card" style="margin-bottom:16px;padding:14px 18px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center">

        <!-- Habits ring -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer" onclick="document.getElementById('todayHabitsSection').scrollIntoView({behavior:'smooth'})">
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
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer" onclick="document.getElementById('todayWaterSection').scrollIntoView({behavior:'smooth'})">
          <div style="position:relative;width:54px;height:54px">
            ${ring(waterPct, 'var(--blush)', 54)}
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.72rem;color:var(--cream);font-family:'DM Mono',monospace">${waterGlasses}/${waterTarget}</div>
          </div>
          <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em">Water</div>
        </div>

        <!-- Prayer ring -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer" onclick="document.getElementById('todayPrayerSection').scrollIntoView({behavior:'smooth'})">
          <div style="position:relative;width:54px;height:54px">
            ${ring(Math.round((prayersDone/prayersTotal)*100), 'var(--gold)', 54)}
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.72rem;color:var(--cream);font-family:'DM Mono',monospace">${prayersDone}/${prayersTotal}</div>
          </div>
          <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em">Prayer</div>
        </div>

      </div>
    </div>

    ${focusItem ? `
    <!-- Active focus item -->
    <div class="card" style="margin-bottom:16px;padding:12px 16px;border-left:3px solid var(--blush);cursor:pointer" onclick="go('focus')">
      <div style="font-size:0.52rem;color:var(--blush);text-transform:uppercase;letter-spacing:0.12em;font-family:'DM Mono',monospace;margin-bottom:5px">Current Focus</div>
      <div style="font-size:0.88rem;color:var(--mist)">${escapeHtml(focusItem.label)}</div>
      ${focusItem.pomodorosDone ? `<div style="font-size:0.6rem;color:var(--muted);margin-top:3px;font-family:'DM Mono',monospace">${focusItem.pomodorosDone} pomodoro${focusItem.pomodorosDone !== 1 ? 's' : ''} done</div>` : ''}
    </div>` : ''}

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

    <!-- Prayer -->
    <div id="todayPrayerSection" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="sec" style="margin:0;font-size:0.66rem">Prayer</div>
        <span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace">${prayersDone}/${prayersTotal}</span>
      </div>
      <div style="display:flex;gap:6px">
        ${prayerRowHtml}
      </div>
    </div>

    <!-- Water tracker -->
    <div id="todayWaterSection" class="card" style="margin-bottom:16px;padding:12px 16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.12em;font-family:'DM Mono',monospace">Water · ${waterGlasses}/${waterTarget} glasses (${waterGlasses * WATER_GLASS_ML}ml)</div>
        <div style="display:flex;align-items:center;gap:6px">
          <button onclick="addWater(-1)" style="background:var(--mid);border:none;color:var(--muted);cursor:pointer;width:22px;height:22px;border-radius:50%;font-size:1rem;line-height:1;display:flex;align-items:center;justify-content:center">−</button>
          <button onclick="addWater(1)" style="background:var(--blush);border:none;color:var(--cream);cursor:pointer;width:22px;height:22px;border-radius:50%;font-size:1rem;line-height:1;display:flex;align-items:center;justify-content:center">+</button>
        </div>
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        ${waterBubbles}
      </div>
      <div style="margin-top:8px;display:flex;align-items:center;gap:6px">
        <span style="font-size:0.58rem;color:var(--muted)">Target:</span>
        <input type="number" min="1" max="20" value="${waterTarget}" onchange="setWaterTarget(this.value)"
          style="width:32px;background:var(--mid);border:1px solid var(--border);border-radius:4px;color:var(--gold-lt);font-size:0.62rem;text-align:center;padding:1px 3px;font-family:'DM Mono',monospace">
        <span style="font-size:0.58rem;color:var(--muted)">glasses/day</span>
      </div>
    </div>

    <!-- Habits -->
    <div id="todayHabitsSection" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="sec" style="margin:0;font-size:0.66rem">Habits</div>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace">${habitsDone}/${habitsTotal}</span>
          <button class="btn btn-g" style="font-size:0.6rem;padding:2px 8px" onclick="openAddHabitModal()">+ Add</button>
        </div>
      </div>
      <div class="card" style="padding:8px 14px">
        ${habitRows || `<div style="font-size:0.72rem;color:var(--muted);padding:12px 0;text-align:center">No habits yet — add one above</div>`}
      </div>
    </div>

    ${activeMedia.length ? `
    <!-- In progress media -->
    <div class="card" style="margin-bottom:16px;padding:12px 16px">
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

    <!-- Daily note -->
    <div style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="sec" style="margin:0;font-size:0.66rem">Daily Note</div>
        <button class="btn btn-g" style="font-size:0.6rem;padding:2px 8px" onclick="openPastNotes()">Past</button>
      </div>
      <div class="card">
        <textarea id="todayNoteArea" class="editable-area" rows="4" placeholder="Write anything…"
          oninput="S.notes[today()]=this.value;scheduleSave()"
          style="font-size:0.8rem">${escapeHtml(todayNote)}</textarea>
      </div>
    </div>

    <!-- Reflection / quote -->
    <div id="reflectionCard" class="card quote-card" style="margin-bottom:18px">
      <div class="q-label">Reflection</div>
      <textarea id="quoteText" class="editable-area" rows="3" placeholder="Write your quote or reflection…" oninput="S.quote.text=this.value;scheduleSave()">${escapeHtml(S.quote && S.quote.text || '')}</textarea>
      <input id="quoteAuthor" class="editable" placeholder="— Author" value="${escapeAttr(S.quote && S.quote.author || '')}" oninput="S.quote.author=this.value;scheduleSave()">
    </div>

    <!-- Mood (feature-flagged) -->
    ${typeof feat === 'function' && feat('moodTracking') ? `
    <div class="card" style="margin-bottom:16px;padding:12px 16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:0.52rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.12em;font-family:'DM Mono',monospace">Today's Mood</span>
        <span id="moodScore" style="font-size:0.78rem;color:var(--gold-lt);font-family:'DM Mono',monospace">${S.moodLog && S.moodLog[d] ? S.moodLog[d] + '/10' : '—'}</span>
      </div>
      <div id="moodGrid" style="display:flex;gap:3px;flex-wrap:wrap"></div>
    </div>` : ''}
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

/* ── Add habit mini-modal ────────────────────────────────────── */
function openAddHabitModal() {
  const name = prompt('Habit name:');
  if (!name || !name.trim()) return;
  if (!Array.isArray(S.habits)) S.habits = [];
  const { makeHabit } = (typeof window !== 'undefined' && typeof makeHabit === 'function')
    ? { makeHabit } : { makeHabit: h => ({ id: uid(), name: h.name || '', days: {} }) };
  S.habits.push(typeof makeHabit === 'function' ? makeHabit({ id: uid(), name: name.trim() }) : { id: uid(), name: name.trim(), days: {} });
  scheduleSave();
  renderToday();
  if (typeof renderHabits === 'function') renderHabits();
}

/* ── renderTodaySummary shim (keeps old call sites working) ── */
function renderTodaySummary() {
  renderToday();
}
