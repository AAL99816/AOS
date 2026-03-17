'use strict';

let reviewWeekOffset = parseInt(sessionStorage.getItem('reviewWeekOffset') || '0', 10);

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
  sessionStorage.setItem('reviewWeekOffset', reviewWeekOffset);
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
  const finishedMedia = (S.media||[]).filter(m => m.status === 'done' && days.includes(m.finishedOn));

  /* ── Reflection ── */
  const reflection = (S.weeklyReflections||{})[start] || '';

  wrap.innerHTML = `
    <div class="review-week-nav">
      <button class="btn btn-g" onclick="changeReviewWeek(-1)" style="padding:5px 14px">←</button>
      <div style="text-align:center">
        <div class="review-week-lbl">${fmt(start)} — ${fmt(end)}</div>
        ${isCurr ? `<div style="font-size:0.55rem;color:var(--blush);font-family:'DM Mono',monospace;letter-spacing:0.1em;text-transform:uppercase;margin-top:2px">${t('this_week')}</div>` : ''}
      </div>
      <button class="btn btn-g" onclick="changeReviewWeek(1)" style="padding:5px 14px"${isCurr?' disabled':''}>→</button>
    </div>

    <div class="review-grid">

      <div class="review-block">
        <div class="review-kicker">${t('prayer')} · ${fullDays}/7 ${t('complete_days')}</div>
        ${prayerCounts.map(p => `
          <div class="review-prayer-row">
            <div class="review-prayer-name">${escapeHtml(p.label)}</div>
            ${days.map(d => `<div class="review-dot${((S.prayerLog||{})[d]||{})[p.key]?' done':''}"></div>`).join('')}
            <div style="font-family:'DM Mono',monospace;font-size:0.56rem;color:var(--muted-lt);margin-left:5px">${p.count}/7</div>
          </div>`).join('')}
      </div>

      <div class="review-block">
        <div class="review-kicker">${t('nav_fitness')}</div>
        <div style="margin-bottom:12px">
          <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px">${t('gym')} · ${gymDays} ${t('day_s')}</div>
          ${gymSessions.length
            ? gymSessions.map(s=>`<div style="font-size:0.76rem;color:var(--mist);padding:3px 0;border-bottom:1px solid var(--blush-dim);cursor:pointer" onclick="openSessionDetail(${s.id})">${escapeHtml(s.date.slice(5))} · ${escapeHtml(s.title)}</div>`).join('')
            : `<div style="font-size:0.7rem;color:var(--muted)">${t('no_sessions_logged')}</div>`}
        </div>
        <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">${t('cardio')}</div>
        <div style="font-size:0.9rem;color:${cardioTotal>0?'var(--gold-lt)':'var(--muted)'};font-family:'DM Mono',monospace">${cardioTotal>0?cardioTotal+' min':'—'}</div>
      </div>

    </div>

    <div class="review-block" style="margin-bottom:16px">
      <div class="review-kicker">${t('habits')}</div>
      ${habitStats.length
        ? habitStats.map(h => {
            const pct = Math.round(h.count / 7 * 100);
            return `<div class="review-habit-row">
              <div class="review-habit-name">${escapeHtml(h.name)}</div>
              <div class="review-habit-bar"><div class="review-habit-fill" style="width:${pct}%"></div></div>
              <div class="review-pct">${h.count}/7</div>
            </div>`;
          }).join('')
        : `<div style="font-size:0.72rem;color:var(--muted)">${t('no_habits_set')}</div>`}
    </div>

    ${activeMedia.length ? `
    <div class="review-block" style="margin-bottom:16px">
      <div class="review-kicker">${t('in_progress')}</div>
      ${activeMedia.map(m=>`<div style="font-size:0.8rem;color:var(--mist);padding:3px 0">${escapeHtml(m.title)}<span style="color:var(--muted);font-size:0.65rem"> — ${escapeHtml(m.author||'')}</span></div>`).join('')}
    </div>` : ''}

    ${finishedMedia.length ? `
    <div class="review-block" style="margin-bottom:16px">
      <div class="review-kicker">${t('finished_this_week')}</div>
      ${finishedMedia.map(m=>`<div style="font-size:0.8rem;color:var(--gold-lt);padding:3px 0">✓ ${escapeHtml(m.title)}<span style="color:var(--muted);font-size:0.65rem"> — ${escapeHtml(m.author||'')}</span>${m.rating?`<span style="color:var(--gold);font-size:0.65rem;margin-left:6px">${'★'.repeat(m.rating)}</span>`:''}</div>`).join('')}
    </div>` : ''}

    <div class="review-block">
      <div class="review-kicker">${t('reflection')}</div>
      <textarea class="editable-area" rows="5"
        placeholder="${t('reflection_ph')}"
        oninput="saveReflection(this.value)"
        style="font-size:0.8rem;color:var(--mist);line-height:1.65;"
      >${escapeHtml(reflection)}</textarea>
      ${reflection ? `<div style="margin-top:8px;padding:10px 12px;background:var(--blush-dim);border-radius:7px;font-size:0.78rem;color:var(--mist);line-height:1.7;">${renderMd(reflection)}</div>` : ''}
    </div>
  `;
}
