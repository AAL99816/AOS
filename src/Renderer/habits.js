'use strict';

const PRAYERS = ['fajr','dhuhr','asr','maghrib','isha'];
const PRAYER_LABEL = new Proxy({}, {
  get(_, key) {
    if (typeof t === 'function' && PRAYERS.includes(key)) return t(key);
    return {fajr:'Fajr',dhuhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',isha:'Isha'}[key] || key;
  }
});

let habitWeekOffset = 0; // 0 = current week, -1 = last week, etc.

function weekDaysOffset(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({length: 7}, (_, i) => {
    const nd = new Date(mon);
    nd.setDate(mon.getDate() + i);
    return dStr(nd);
  });
}

function weekLabelForOffset(offset) {
  if (offset === 0) return 'This Week';
  if (offset === -1) return 'Last Week';
  const days = weekDaysOffset(offset);
  const start = new Date(days[0]);
  const end   = new Date(days[6]);
  return `${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${end.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;
}

/* ══ PRAYER ══ */
function haptic(ms) { if (navigator.vibrate) navigator.vibrate(ms || 10); }

function togglePrayer(name) {
  haptic(12);
  const d = today();
  if (!S.prayerLog) S.prayerLog = {};
  if (!S.prayerLog[d]) S.prayerLog[d] = {};
  S.prayerLog[d][name] = !S.prayerLog[d][name];

  // Auto-sync: if all 5 done, mark the prayer habit for today
  const allDone = PRAYERS.every(p => !!S.prayerLog[d][p]);
  const ph = hfind('prayer','salah','salat','صلاة','صلاه');
  if (ph) {
    if (!ph.days) ph.days = {};
    if (allDone) ph.days[d] = true;
    else delete ph.days[d];
  }

  scheduleSave();
  renderPrayer();
  renderHabits();
  if (typeof renderTodaySummary === 'function') renderTodaySummary();
}

function renderPrayer() {
  const c = eid('prayerRow');
  if (!c) return;
  const todayStr = today(), log = (S.prayerLog && S.prayerLog[todayStr]) || {};
  const allDone  = PRAYERS.every(p => !!log[p]);
  c.innerHTML = `
    <div class="prayer-grid">
      ${PRAYERS.map(p => {
        const done = !!log[p];
        return `<div class="prayer-slot${done?' done':''}" onclick="togglePrayer('${p}')">
          <div class="prayer-name">${PRAYER_LABEL[p]}</div>
          <div class="prayer-dot">${done ? '✓' : ''}</div>
        </div>`;
      }).join('')}
    </div>
    ${allDone ? `<div style="text-align:center;margin-top:12px;font-size:0.68rem;color:var(--gold-lt);font-family:'Cormorant Garamond',serif;font-style:italic;letter-spacing:0.04em;">${t('all_five_complete')}</div>` : ''}
  `;
}

/* ══ HABITS ══ */
function renderHabits() {
  const week     = weekDaysOffset(habitWeekOffset);
  const todayStr = today();
  const c        = eid('habitList');
  if (!c) return;
  c.innerHTML = '';

  // Week navigation header
  const nav = document.createElement('div');
  nav.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)';
  const atLimit = habitWeekOffset <= -52;
  nav.innerHTML = `
    <button class="btn btn-g" style="padding:2px 8px;font-size:0.62rem" onclick="if(habitWeekOffset>-52){habitWeekOffset--;renderHabits()}" ${atLimit ? 'disabled style="opacity:0.3"' : ''}>‹ Prev</button>
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
      <span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace;letter-spacing:0.06em">${escapeHtml(weekLabelForOffset(habitWeekOffset))}</span>
      ${habitWeekOffset !== 0 ? `<button class="btn btn-g" style="padding:1px 7px;font-size:0.54rem" onclick="habitWeekOffset=0;renderHabits()">Today</button>` : `<button class="btn btn-g" style="padding:1px 7px;font-size:0.54rem" onclick="markAllHabitsDone()">Mark All</button>`}
    </div>
    <button class="btn btn-g" style="padding:2px 8px;font-size:0.62rem" onclick="if(habitWeekOffset<0){habitWeekOffset++;renderHabits()}" ${habitWeekOffset >= 0 ? 'disabled style="opacity:0.3"' : ''}>Next ›</button>
  `;
  c.appendChild(nav);

  // Day-label header row
  const dayRow = document.createElement('div');
  dayRow.style.cssText = 'display:grid;grid-template-columns:1fr repeat(7,26px) 28px 24px;gap:4px;align-items:center;padding:0 0 4px';
  dayRow.innerHTML = `<div></div>${week.map((d,i) =>
    `<div style="text-align:center;font-size:0.48rem;color:${d===todayStr?'var(--blush)':'var(--muted)'};font-family:'DM Mono',monospace">${DAY_SHORT[i].slice(0,2)}</div>`
  ).join('')}<div></div><div></div>`;
  c.appendChild(dayRow);

  (S.habits || []).forEach(h => {
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1fr repeat(7,26px) 28px 24px;gap:4px;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)';
    row.innerHTML = `
      <input class="editable habit-name-inp" value="${escapeHtml(h.name)}" onchange="updateHabitName('${h.id}',this.value)" title="Click to rename" style="font-size:0.76rem;background:none;border:none;color:var(--mist);padding:0;min-width:0;width:100%">
      ${week.map(d => {
        const on      = !!(h.days && h.days[d]);
        const isToday = d === todayStr;
        const future  = d > todayStr;
        return `<div class="day-dot ${on ? (isToday ? 'today-on' : 'on') : ''}" title="${future ? '' : d}"
          onclick="${future ? '' : `toggleH('${h.id}','${d}')`}"
          style="${future ? 'visibility:hidden' : ''}${isToday && !on ? ';outline:1px solid var(--blush);outline-offset:1px' : ''}">
        </div>`;
      }).join('')}
      <button class="btn btn-g" style="padding:2px 5px;font-size:0.55rem" onclick="openHabitHistory('${h.id}')" title="History">📅</button>
      <button class="habit-del" onclick="delHabit('${h.id}')">✕</button>
    `;
    c.appendChild(row);
  });

  renderPrayer();
  if (typeof renderTodaySummary === 'function') renderTodaySummary();
}

/* ══ HABIT HISTORY MODAL ══ */
function openHabitHistory(id) {
  const h = (S.habits || []).find(h => String(h.id) === String(id));
  if (!h) return;
  eid('habitHistTitle').textContent = h.name;
  _renderHabitHistGrid(h);
  openModal('mHabitHistory');
}

let _habitHistWeeks = 52; // toggled between 12 and 52

function _renderHabitHistGrid(h) {
  const c = eid('habitHistGrid');
  if (!c) return;

  const weeks = _habitHistWeeks;
  const todayStr = today();
  const now = new Date();
  // Anchor end to current Sunday (week end)
  const dow = now.getDay(); // 0=Sun
  const endD = new Date(now);
  endD.setDate(now.getDate() + (dow === 0 ? 0 : 7 - dow));

  // Build array: weeks × 7 days, oldest-first row by row
  // Each row = one week (Mon–Sun)
  const cols = weeks; // number of week columns
  const grid = []; // [colIdx][dayIdx(0=Mon..6=Sun)] = dateStr
  for (let w = cols - 1; w >= 0; w--) {
    const col = [];
    for (let d = 6; d >= 0; d--) {
      const nd = new Date(endD);
      nd.setDate(endD.getDate() - w * 7 - d);
      col.push(dStr(nd));
    }
    grid.push(col); // col[0]=Mon … col[6]=Sun
  }

  // Flatten for stats
  const allDays = grid.flat();
  const done  = allDays.filter(d => d <= todayStr && h.days && h.days[d]).length;
  const total = allDays.filter(d => d <= todayStr).length;

  // Streak
  const streak = (typeof calcStreak === 'function') ? calcStreak(h.days || {}) : 0;

  // Month labels — detect first day of each month across the grid columns
  const monthLabels = weeks >= 24 ? (() => {
    const labels = new Array(cols).fill('');
    grid.forEach((col, ci) => {
      const monDay = col[0]; // Monday of this week column
      if (monDay.slice(8) <= '07') { // first week of month
        const d = new Date(monDay + 'T00:00:00');
        labels[ci] = d.toLocaleDateString('en-US', { month: 'short' });
      }
    });
    return labels;
  })() : [];

  // Render: columns = weeks, rows = days (Mon on top)
  const cellSize = weeks >= 24 ? 12 : 18; // px, smaller for year view
  const gap = 2;

  c.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px">
      <div style="font-size:0.62rem;color:var(--muted);font-family:'DM Mono',monospace">
        ${done}/${total} days · ${streak}d streak
      </div>
      <button class="btn btn-g" style="font-size:0.62rem;padding:2px 10px"
        onclick="_habitHistWeeks=(_habitHistWeeks===52?12:52);openHabitHistory('${escapeAttr(String(h.id))}')">
        ${weeks === 52 ? '12 weeks' : '1 year'}
      </button>
    </div>

    ${monthLabels.length ? `
    <div style="display:flex;gap:${gap}px;margin-bottom:2px;padding-left:${cellSize + gap}px">
      ${monthLabels.map(lbl => `<div style="width:${cellSize}px;flex-shrink:0;font-size:0.44rem;color:var(--muted);font-family:'DM Mono',monospace;overflow:hidden">${lbl}</div>`).join('')}
    </div>` : ''}

    <div style="display:flex;gap:${gap}px">
      <!-- Day-of-week labels -->
      <div style="display:flex;flex-direction:column;gap:${gap}px;flex-shrink:0">
        ${['M','T','W','T','F','S','S'].map(d =>
          `<div style="height:${cellSize}px;width:${cellSize}px;display:flex;align-items:center;justify-content:center;font-size:0.42rem;color:var(--muted);font-family:'DM Mono',monospace">${d}</div>`
        ).join('')}
      </div>
      <!-- Grid columns (weeks) -->
      <div style="display:flex;gap:${gap}px;overflow-x:auto">
        ${grid.map(col => `
          <div style="display:flex;flex-direction:column;gap:${gap}px;flex-shrink:0">
            ${col.map(d => {
              const on     = !!(h.days && h.days[d]);
              const future = d > todayStr;
              const isToday = d === todayStr;
              return `<div
                onclick="${future ? '' : `_habitHistToggle('${h.id}','${d}')`}"
                title="${d}"
                style="width:${cellSize}px;height:${cellSize}px;border-radius:2px;flex-shrink:0;cursor:${future?'default':'pointer'};
                  background:${on ? 'var(--blush)' : future ? 'transparent' : 'var(--mid)'};
                  opacity:${future ? '0.12' : '1'};
                  ${isToday ? `outline:1.5px solid var(--cream);outline-offset:1px;` : ''}">
              </div>`;
            }).join('')}
          </div>`).join('')}
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:4px;margin-top:8px;justify-content:flex-end">
      <span style="font-size:0.5rem;color:var(--muted)">None</span>
      <div style="width:10px;height:10px;border-radius:2px;background:var(--mid)"></div>
      <div style="width:10px;height:10px;border-radius:2px;background:var(--blush)"></div>
      <span style="font-size:0.5rem;color:var(--muted)">Done</span>
    </div>
  `;
}

function _habitHistToggle(id, date) {
  const h = (S.habits || []).find(h => String(h.id) === String(id));
  if (!h) return;
  if (!h.days) h.days = {};
  h.days[date] = !h.days[date];
  if (!h.days[date]) delete h.days[date];
  scheduleSave();
  _renderHabitHistGrid(h);
  renderHabits();
}

/* ══ HABIT CRUD ══ */
function updateHabitName(id, val) {
  const h = (S.habits || []).find(h => String(h.id) === String(id));
  if (h) { h.name = val.trim().slice(0, 80) || h.name; scheduleSave(); }
}

function toggleH(id, date) {
  haptic(10);
  const h = (S.habits || []).find(h => String(h.id) === String(id));
  if (!h) return;
  if (!h.days) h.days = {};
  h.days[date] = !h.days[date];
  if (!h.days[date]) delete h.days[date];

  // Sync gym log when toggling a gym-type habit
  if (hmatch(h, 'gym','lift','workout','training','weights')) {
    if (!S.gymLog) S.gymLog = {};
    S.gymLog[date] = !!h.days[date];
    if (typeof renderGymWeek === 'function') renderGymWeek();
  }

  scheduleSave();
  renderHabits();
}

function delHabit(id) {
  const h = (S.habits || []).find(h => String(h.id) === String(id));
  if (!h) return;
  const backup = JSON.parse(JSON.stringify(h));
  S.habits = (S.habits || []).filter(h => String(h.id) !== String(id));
  scheduleSave();
  renderHabits();
  toastUndo(`"${h.name}" removed`, () => {
    if (!Array.isArray(S.habits)) S.habits = [];
    S.habits.push(backup);
    scheduleSave();
    renderHabits();
  });
}

function addHabit() {
  const name = eid('newHabitName').value.trim().slice(0, 80);
  if (!name) return;
  if (!Array.isArray(S.habits)) S.habits = [];
  S.habits.push(makeHabit({ name }));
  eid('newHabitName').value = '';
  scheduleSave();
  renderHabits();
  toast(`"${name}" ${t('added')}`);
}

function markAllHabitsDone() {
  const d = today();
  if (!Array.isArray(S.habits) || !S.habits.length) return;
  const allDone = S.habits.every(h => h.days && h.days[d]);
  S.habits.forEach(h => {
    if (!h.days) h.days = {};
    if (allDone) delete h.days[d];
    else h.days[d] = true;
  });
  scheduleSave();
  renderHabits();
  toast(allDone ? 'All habits unmarked' : 'All habits marked done');
}

/* ══ HELPERS (used by weekly summary, fitness, etc.) ══ */
function hnorm(v) { return String(v || '').toLowerCase().trim(); }
function hmatch(h, ...keys) { const n = hnorm(h && h.name); return keys.some(k => n.includes(k)); }
function hfind(...keys) { return (S.habits || []).find(h => hmatch(h, ...keys)); }
function streakOf(h) { return h ? calcStreak(h.days || {}) : 0; }

function prayerStreak() {
  if (S.prayerLog && Object.keys(S.prayerLog).length) {
    const days = {};
    Object.entries(S.prayerLog).forEach(([d,p]) => {
      if (PRAYERS.every(name => p[name])) days[d] = true;
    });
    const s = calcStreak(days);
    if (s > 0) return s;
  }
  const prayers = PRAYERS.map(k => hfind(k)).filter(Boolean);
  if (prayers.length === 5) {
    const days = {}, all = [...new Set(prayers.flatMap(h => Object.keys(h.days || {})))];
    all.forEach(d => { if (prayers.every(h => h.days && h.days[d])) days[d] = true; });
    return calcStreak(days);
  }
  return streakOf(hfind('prayer','salah','salat','صلاة','صلاه'));
}

/* Schedule-aware gym streak — skips rest days, used by weekly summary */
function calcGymStreak() {
  if (!S.gymLog) return 0;
  let d = new Date();
  const todayStr  = dStr(d);
  const todayIdx  = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const todayWd   = S.workout && S.workout[todayIdx];
  if (!(todayWd && todayWd.rest) && !S.gymLog[todayStr]) d.setDate(d.getDate() - 1);
  let n = 0, guard = 365;
  while (guard-- > 0) {
    const dateStr = dStr(d);
    const idx     = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const wd      = S.workout && S.workout[idx];
    if (wd && wd.rest) { d.setDate(d.getDate() - 1); continue; }
    if (S.gymLog[dateStr]) { n++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return n;
}
