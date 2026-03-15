'use strict';

let reviewWeekOffset = 0;

function weekStartFor(offsetWeeks) {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff + offsetWeeks * 7);
  return d.toISOString().slice(0, 10);
}

function weekDaysFor(start) {
  const d = new Date(start + 'T00:00:00');
  return Array.from({length:7}, (_, i) => {
    const nd = new Date(d);
    nd.setDate(d.getDate() + i);
    return nd.toISOString().slice(0, 10);
  });
}

function changeReviewWeek(delta) {
  reviewWeekOffset += delta;
  if (reviewWeekOffset > 0) reviewWeekOffset = 0;
  renderWeeklyReview();
}

function saveReflection(text) {
  const start = weekStartFor(reviewWeekOffset);
  if (!S.weeklyReflections) S.weeklyReflections = {};
  S.weeklyReflections[start] = text;
  scheduleSave();
}

function renderWeeklyReview() {
  const wrap = eid('reviewContent');
  if (!wrap) return;

  const start  = weekStartFor(reviewWeekOffset);
  const days   = weekDaysFor(start);
  const end    = days[6];
  const fmt    = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric'});
  const isCurr = reviewWeekOffset === 0;

  /* ── Prayer ── */
  const prayerCounts = PRAYERS.map(key => ({
    key,
    label: PRAYER_LABEL[key],
    count: days.filter(d => !!((S.prayerLog||{})[d]||{})[key]).length
  }));
  const fullDays = days.filter(d => PRAYERS.every(k => !!((S.prayerLog||{})[d]||{})[k])).length;

  /* ── Habits ── */
  const habitStats = (S.habits||[]).map(h => ({
    name: h.name,
    count: days.filter(d => !!(h.days||{})[d]).length
  }));

  /* ── Gym ── */
  const gymDays     = days.filter(d => !!(S.gymLog||{})[d]).length;
  const gymSessions = (S.workoutHistory||[]).filter(s => days.includes(s.date));

  /* ── Cardio ── */
  const cardioTotal = days.reduce((sum, d) => sum + ((S.cardioLog||{})[d]||0), 0);

  /* ── Media ── */
  const activeMedia = (S.media||[]).filter(m => m.status === 'reading');

  /* ── Reflection ── */
  const reflection = (S.weeklyReflections||{})[start] || '';

  wrap.innerHTML = `
    <div class="review-week-nav">
      <button class="btn btn-g" onclick="changeReviewWeek(-1)" style="padding:5px 14px">←</button>
      <div style="text-align:center">
        <div class="review-week-lbl">${fmt(start)} — ${fmt(end)}</div>
        ${isCurr ? `<div style="font-size:0.55rem;color:var(--blush);font-family:'DM Mono',monospace;letter-spacing:0.1em;text-transform:uppercase;margin-top:2px">This Week</div>` : ''}
      </div>
      <button class="btn btn-g" onclick="changeReviewWeek(1)" style="padding:5px 14px"${isCurr?' disabled':''}>→</button>
    </div>

    <div class="review-grid">

      <div class="review-block">
        <div class="review-kicker">Prayer · ${fullDays}/7 complete days</div>
        ${prayerCounts.map(p => `
          <div class="review-prayer-row">
            <div class="review-prayer-name">${escapeHtml(p.label)}</div>
            ${days.map(d => `<div class="review-dot${((S.prayerLog||{})[d]||{})[p.key]?' done':''}"></div>`).join('')}
            <div style="font-family:'DM Mono',monospace;font-size:0.56rem;color:var(--muted-lt);margin-left:5px">${p.count}/7</div>
          </div>`).join('')}
      </div>

      <div class="review-block">
        <div class="review-kicker">Fitness</div>
        <div style="margin-bottom:12px">
          <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px">Gym · ${gymDays} day${gymDays!==1?'s':''}</div>
          ${gymSessions.length
            ? gymSessions.map(s=>`<div style="font-size:0.76rem;color:var(--mist);padding:3px 0;border-bottom:1px solid rgba(192,96,122,0.07);cursor:pointer" onclick="openSessionDetail(${s.id})">${escapeHtml(s.date.slice(5))} · ${escapeHtml(s.title)}</div>`).join('')
            : `<div style="font-size:0.7rem;color:var(--muted)">No sessions logged</div>`}
        </div>
        <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Cardio</div>
        <div style="font-size:0.9rem;color:${cardioTotal>0?'var(--gold-lt)':'var(--muted)'};font-family:'DM Mono',monospace">${cardioTotal>0?cardioTotal+' min':'—'}</div>
      </div>

    </div>

    <div class="review-block" style="margin-bottom:16px">
      <div class="review-kicker">Habits</div>
      ${habitStats.length
        ? habitStats.map(h => {
            const pct = Math.round(h.count / 7 * 100);
            return `<div class="review-habit-row">
              <div class="review-habit-name">${escapeHtml(h.name)}</div>
              <div class="review-habit-bar"><div class="review-habit-fill" style="width:${pct}%"></div></div>
              <div class="review-pct">${h.count}/7</div>
            </div>`;
          }).join('')
        : `<div style="font-size:0.72rem;color:var(--muted)">No habits set</div>`}
    </div>

    ${activeMedia.length ? `
    <div class="review-block" style="margin-bottom:16px">
      <div class="review-kicker">In Progress</div>
      ${activeMedia.map(m=>`<div style="font-size:0.8rem;color:var(--mist);padding:3px 0">${escapeHtml(m.title)}<span style="color:var(--muted);font-size:0.65rem"> — ${escapeHtml(m.author||'')}</span></div>`).join('')}
    </div>` : ''}

    <div class="review-block">
      <div class="review-kicker">Reflection</div>
      <textarea class="editable-area" rows="5"
        placeholder="How was this week? What worked, what didn't, what carries forward…"
        onchange="saveReflection(this.value)"
        style="font-size:0.8rem;color:var(--mist);line-height:1.65;"
      >${escapeHtml(reflection)}</textarea>
    </div>
  `;
}
