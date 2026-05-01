'use strict';

let reviewWeekOffset  = parseInt(sessionStorage.getItem('reviewWeekOffset') || '0', 10);
let _selectedDayStr   = null; // currently selected day in detail panel

function weekStartFor(offsetWeeks) {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff + offsetWeeks * 7);
  return dStr(d);
}

function weekDaysFor(start) {
  const d = new Date(start + 'T00:00:00');
  return Array.from({length:7}, (_, i) => {
    const nd = new Date(d);
    nd.setDate(d.getDate() + i);
    return dStr(nd);
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

  /* ── Previous-week data for deltas (R1) ── */
  const prevStart = weekStartFor(reviewWeekOffset - 1);
  const prevDays  = weekDaysFor(prevStart);

  /* ── Prayer ── */
  const activePrayers = (typeof getActivePrayers === 'function') ? getActivePrayers() : PRAYERS;
  const prayerCounts = activePrayers.map(key => ({
    key,
    label: PRAYER_LABEL[key],
    count: days.filter(d => !!((S.prayerLog||{})[d]||{})[key]).length
  }));
  const fullDays = days.filter(d => activePrayers.every(k => !!((S.prayerLog||{})[d]||{})[k])).length;

  /* ── Habits ── */
  const habitStats = getVisibleHabits().map(h => ({
    name: h.name,
    count: days.filter(d => !!(h.days||{})[d]).length
  }));

  /* ── Gym ── */
  const gymDays     = days.filter(d => !!(S.gymLog||{})[d]).length;
  const prevGymDays = prevDays.filter(d => !!(S.gymLog||{})[d]).length;
  const gymSessions = (S.workoutHistory||[]).filter(s => days.includes(s.date));

  /* ── Cardio ── */
  const cardioTotal     = days.reduce((sum, d) => sum + ((S.cardioLog||{})[d]||0), 0);
  const prevCardioTotal = prevDays.reduce((sum, d) => sum + ((S.cardioLog||{})[d]||0), 0);

  /* ── Food / Calories ── */
  const foodDayKcals = days.map(d => ((S.foodLog||{})[d]||[]).reduce((s,e) => s+(e.kcal||0), 0));
  const foodLoggedDays = foodDayKcals.filter(v => v > 0).length;
  const foodAvgKcal = foodLoggedDays ? Math.round(foodDayKcals.reduce((s,v)=>s+v,0) / foodLoggedDays) : 0;
  const prevFoodKcals = prevDays.map(d => ((S.foodLog||{})[d]||[]).reduce((s,e) => s+(e.kcal||0), 0));
  const prevFoodLoggedDays = prevFoodKcals.filter(v => v > 0).length;
  const prevFoodAvgKcal = prevFoodLoggedDays ? Math.round(prevFoodKcals.reduce((s,v)=>s+v,0) / prevFoodLoggedDays) : 0;

  /* ── Mood sparkline (R6) ── */
  const moodLog = S.moodLog || {};
  const moodVals = days.map(d => moodLog[d] ? Number(moodLog[d]) : null);

  /* ── Media ── */
  const activeMedia = (S.media||[]).filter(m => m.status === 'reading');
  const finishedMedia = (S.media||[]).filter(m => m.status === 'done' && days.includes(m.finishedOn));

  /* ── Reflection ── */
  const reflection = (S.weeklyReflections||{})[start] || '';

  // Default selected day to today if in current week, else last day of shown week
  if (!_selectedDayStr || !days.includes(_selectedDayStr)) {
    _selectedDayStr = days.includes(today()) ? today() : days[days.length - 1];
  }

  wrap.innerHTML = `
    <div class="review-week-nav">
      <button class="btn btn-g" onclick="changeReviewWeek(-1)" style="padding:5px 14px">←</button>
      <div style="text-align:center">
        <div class="review-week-lbl">${fmt(start)} — ${fmt(end)}</div>
        ${isCurr ? `<div style="font-size:0.55rem;color:var(--blush);font-family:'DM Mono',monospace;letter-spacing:0.1em;text-transform:uppercase;margin-top:2px">${t('this_week')}</div>` : ''}
      </div>
      <button class="btn btn-g" onclick="changeReviewWeek(1)" style="padding:5px 14px"${isCurr?' disabled':''}>→</button>
    </div>

    <!-- Day selector -->
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:14px 0">
      ${days.map((d,i) => {
        const isSelected = d === _selectedDayStr;
        const isToday    = d === today();
        const future     = d > today();
        return `<button
          ${future ? 'disabled' : `onclick="selectDayDetail('${d}')"`}
          style="padding:10px 2px;border-radius:var(--r-sm);font-size:0.62rem;font-family:'DM Mono',monospace;letter-spacing:0.04em;
            min-height:44px;-webkit-tap-highlight-color:transparent;
            background:${isSelected?'var(--blush)':'var(--mid)'};
            color:${isSelected?'var(--cream)':'var(--muted)'};
            border:${isToday?'1px solid var(--blush)':'1px solid transparent'};
            cursor:${future?'default':'pointer'};opacity:${future?'0.3':'1'};
            text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px">
          <span>${DAY_SHORT[i].slice(0,2)}</span>
          <span style="font-size:0.52rem;opacity:0.7">${d.slice(8)}</span>
        </button>`;
      }).join('')}
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
          <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px">
            ${t('gym')} · ${gymDays} ${t('day_s')}
            ${prevGymDays > 0 ? `<span style="color:${gymDays>=prevGymDays?'var(--gold-lt)':'var(--petal)'};margin-left:6px">${gymDays>=prevGymDays?'↑':'↓'}${Math.abs(gymDays-prevGymDays)} vs prev</span>` : ''}
          </div>
          ${gymSessions.length
            ? gymSessions.map(s=>`<div style="font-size:0.76rem;color:var(--mist);padding:3px 0;border-bottom:1px solid var(--blush-dim);cursor:pointer" onclick="openSessionDetail('${s.id}')">${escapeHtml(s.date.slice(5))} · ${escapeHtml(s.title)}</div>`).join('')
            : `<div style="font-size:0.7rem;color:var(--muted)">${t('no_sessions_logged')}</div>`}
        </div>
        <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">${t('cardio')}</div>
        <div style="font-size:0.9rem;color:${cardioTotal>0?'var(--gold-lt)':'var(--muted)'};font-family:'DM Mono',monospace">
          ${cardioTotal>0?cardioTotal+' min':'—'}
          ${cardioTotal>0 && prevCardioTotal>0 ? `<span style="font-size:0.62rem;color:${cardioTotal>=prevCardioTotal?'var(--gold-lt)':'var(--petal)'};margin-left:6px">${cardioTotal>=prevCardioTotal?'↑':'↓'}${Math.abs(cardioTotal-prevCardioTotal)} min</span>` : ''}
        </div>
      </div>

      ${foodLoggedDays > 0 ? `
      <div class="review-block">
        <div class="review-kicker">Nutrition</div>
        <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Daily avg · ${foodLoggedDays} day${foodLoggedDays!==1?'s':''} logged</div>
        <div style="font-size:1.4rem;color:var(--gold-lt);font-family:'DM Mono',monospace;font-weight:500">
          ${foodAvgKcal.toLocaleString()} <span style="font-size:0.7rem;color:var(--muted)">kcal</span>
          ${prevFoodAvgKcal > 0 ? `<span style="font-size:0.62rem;color:${foodAvgKcal>=prevFoodAvgKcal?'var(--gold-lt)':'var(--petal)'};margin-left:8px">${foodAvgKcal>=prevFoodAvgKcal?'↑':'↓'}${Math.abs(foodAvgKcal-prevFoodAvgKcal)} vs prev</span>` : ''}
        </div>
        <div style="margin-top:8px;display:flex;gap:14px;font-size:0.68rem;font-family:'DM Mono',monospace">
          ${['protein','carbs','fat'].map(m => {
            const total = days.reduce((s,d) => s+((S.foodLog?.[d]||[]).reduce((ss,e)=>ss+(e[m]||0),0)),0);
            const avg = foodLoggedDays ? Math.round(total/foodLoggedDays) : 0;
            const colors = {protein:'var(--gold)',carbs:'var(--petal)',fat:'var(--muted-lt)'};
            return `<span style="color:${colors[m]}">${avg}g <span style="color:var(--muted);font-size:0.58rem">${m}</span></span>`;
          }).join('')}
        </div>
      </div>` : ''}

    </div>

    <div class="review-block" style="margin-bottom:16px">
      <div class="review-kicker">${t('habits')}</div>
      ${habitStats.length
        ? habitStats.map(h => {
            const pct = Math.round(h.count / 7 * 100);
            return `<div class="review-habit-row">
              <div class="review-habit-name">${escapeHtml(h.name)}</div>
              <div class="review-habit-bar"><div class="review-habit-fill" style="transform:scaleX(${pct/100})"></div></div>
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

    ${moodVals.some(v => v !== null) ? `
    <div class="review-block" style="margin-bottom:16px">
      <div class="review-kicker">Mood</div>
      <div style="display:flex;align-items:flex-end;gap:3px;height:32px;margin-top:4px">
        ${days.map((d, i) => {
          const v = moodVals[i];
          const h = v !== null ? Math.round((v / 10) * 32) : 2;
          const col = v === null ? 'var(--mid)' : v >= 7 ? 'var(--gold-lt)' : v >= 4 ? 'var(--petal)' : 'var(--rose)';
          return `<div style="flex:1;height:${h}px;background:${col};border-radius:2px;min-height:2px" title="${d}${v!==null?' · '+v+'/10':''}"></div>`;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:2px;font-size:0.45rem;color:var(--muted);font-family:'DM Mono',monospace">
        ${days.map((_, i) => `<span>${DAY_SHORT[i].slice(0,2)}</span>`).join('')}
      </div>
    </div>` : ''}

    ${(() => {
      const todayStr = today();
      const cutoff = new Date(todayStr + 'T00:00:00');
      cutoff.setDate(cutoff.getDate() + 14);
      const cutoffStr = dStr(cutoff);
      const upcoming = (S.projects || [])
        .filter(p => p.deadline && p.status !== 'Done' && p.deadline <= cutoffStr)
        .sort((a, b) => a.deadline.localeCompare(b.deadline));
      if (!upcoming.length) return '';
      function daysUntil(dl) {
        const diff = new Date(dl + 'T00:00:00') - new Date(todayStr + 'T00:00:00');
        return Math.round(diff / 86400000);
      }
      return `<div class="review-block">
        <div class="review-kicker">Upcoming Deadlines · next 14 days</div>
        ${upcoming.map(p => {
          const du = daysUntil(p.deadline);
          const col = du < 0 ? 'var(--petal)' : du <= 3 ? 'var(--gold)' : 'var(--muted-lt)';
          const label = du < 0 ? `${Math.abs(du)}d overdue` : du === 0 ? 'today' : `${du}d`;
          return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border-lt)">
            <span style="font-size:0.62rem;font-family:'DM Mono',monospace;color:${col};flex-shrink:0;min-width:60px">${label}</span>
            <span style="font-size:0.75rem;color:var(--mist);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.title)}</span>
            <span style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${p.deadline}</span>
          </div>`;
        }).join('')}
      </div>`;
    })()}

    <div class="review-block">
      <div class="review-kicker">${t('reflection')}</div>
      <textarea class="editable-area" rows="5"
        placeholder="${t('reflection_ph')}"
        oninput="saveReflection(this.value)"
        style="font-size:0.8rem;color:var(--mist);line-height:1.65;"
      >${escapeHtml(reflection)}</textarea>
      ${(() => {
        const pastReflections = Object.entries(S.weeklyReflections||{})
          .filter(([k,v]) => k !== start && v)
          .sort(([a],[b]) => b.localeCompare(a))
          .slice(0, 3);
        if (!pastReflections.length) return '';
        return `<div style="margin-top:14px">
          <div style="font-size:0.54rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:8px">Past Reflections</div>
          ${pastReflections.map(([k,v]) => `
            <details style="margin-bottom:6px">
              <summary style="font-size:0.62rem;color:var(--muted-lt);cursor:pointer;font-family:'DM Mono',monospace;list-style:none;padding:4px 0">
                ▸ ${new Date(k+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
              </summary>
              <div style="margin-top:6px;padding:8px 10px;background:var(--blush-dim);border-radius:7px;font-size:0.75rem;color:var(--mist);line-height:1.65">${renderMd(v)}</div>
            </details>`).join('')}
        </div>`;
      })()}
    </div>
  `;

  // Render day detail for selected day
  renderDayDetail(_selectedDayStr);
}

/* ══ DAY DETAIL ══ */
function selectDayDetail(dateStr) {
  _selectedDayStr = dateStr;
  // Re-highlight day buttons
  document.querySelectorAll('#reviewContent button[onclick^="selectDayDetail"]').forEach(btn => {
    const d = btn.getAttribute('onclick').match(/'([^']+)'/)?.[1];
    const isSelected = d === dateStr;
    btn.style.background = isSelected ? 'var(--blush)' : 'var(--mid)';
    btn.style.color       = isSelected ? 'var(--cream)' : 'var(--muted)';
  });
  renderDayDetail(dateStr);
}

function renderDayDetail(dateStr) {
  const panel = eid('dayDetailPanel');
  if (!panel) return;
  if (!dateStr) { panel.style.display = 'none'; return; }

  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'});

  /* Prayers */
  const pLog  = (S.prayerLog || {})[dateStr] || {};
  const donePrayers = PRAYERS.filter(p => !!pLog[p]);
  const allPrayers  = donePrayers.length === 5;

  /* Habits */
  const habitsDone = (S.habits || []).filter(h => !!(h.days || {})[dateStr]);

  /* Gym / workout sessions */
  const gymDone     = !!(S.gymLog || {})[dateStr];
  const gymSessions = (S.workoutHistory || []).filter(s => s.date === dateStr);

  /* Cardio */
  const cardioSessions = (S.cardioHistory || []).filter(s => s.date === dateStr);

  /* Calories — prefer foodLog diary, fall back to calorieHistory tracker */
  const foodDiaryEntries = (S.foodLog || {})[dateStr] || [];
  const calEntries       = (S.calorieHistory || []).filter(s => s.date === dateStr);
  const foodDiaryTotal   = foodDiaryEntries.reduce((s, e) => s + (e.kcal || 0), 0);
  const calTotal         = foodDiaryTotal || calEntries.reduce((sum, e) => sum + (e.calories || 0), 0);
  const foodDiaryMacros  = foodDiaryEntries.length ? {
    protein: foodDiaryEntries.reduce((s, e) => s + (e.protein || 0), 0),
    carbs:   foodDiaryEntries.reduce((s, e) => s + (e.carbs   || 0), 0),
    fat:     foodDiaryEntries.reduce((s, e) => s + (e.fat     || 0), 0),
  } : null;

  /* Daily reflection/notes */
  const dailyNote = (S.notes || {})[dateStr] || '';

  /* Project tasks completed on this day */
  const tasksCompleted = [];
  (S.projects || []).forEach(p => {
    (p.tasks || []).filter(t => t.done).forEach(t => {
      // We don't store completion date on tasks yet — skip for now
    });
    getNotes()
      .filter(n => n.entityId === p._uuid && (n.updatedAt || '').slice(0, 10) === dateStr)
      .forEach(n => { tasksCompleted.push({ project: p.title, note: n.body || n.title || '' }); });
  });

  const row = (label, content) => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:0.52rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace;margin-bottom:5px">${label}</div>
      ${content}
    </div>`;

  const empty = `<span style="font-size:0.72rem;color:var(--muted)">—</span>`;

  panel.style.display = '';
  panel.innerHTML = `
    <div class="card">
      <div style="font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:var(--mist);margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border)">
        ${fmt(dateStr)}
      </div>

      ${row('Prayer', PRAYERS.length ? `
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${PRAYERS.map(p => `
            <span style="font-size:0.65rem;padding:2px 8px;border-radius:20px;
              background:${pLog[p]?'var(--blush)':'var(--mid)'};
              color:${pLog[p]?'var(--cream)':'var(--muted)'}">
              ${escapeHtml(PRAYER_LABEL[p])}
            </span>`).join('')}
        </div>
        ${allPrayers ? `<div style="font-size:0.65rem;color:var(--gold-lt);margin-top:6px;font-family:'Cormorant Garamond',serif;font-style:italic">${t('all_five_complete')}</div>` : ''}
      ` : empty)}

      ${row(t('habits'), habitsDone.length
        ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${habitsDone.map(h => `<span style="font-size:0.68rem;padding:2px 8px;border-radius:20px;background:var(--mid);color:var(--mist)">${escapeHtml(h.name)}</span>`).join('')}</div>`
        : empty)}

      ${row(t('gym'), gymDone
        ? gymSessions.length
          ? gymSessions.map(s => `<div style="font-size:0.78rem;color:var(--mist);cursor:pointer" onclick="openSessionDetail('${s.id}')">${escapeHtml(s.title)} <span style="color:var(--muted);font-size:0.65rem">${escapeHtml(s.summary||'')}</span></div>`).join('')
          : `<span style="font-size:0.72rem;color:var(--mist)">✓ Logged</span>`
        : empty)}

      ${row(t('cardio'), cardioSessions.length
        ? cardioSessions.map(s => `<div style="font-size:0.78rem;color:var(--mist)">${escapeHtml(s.activity||'Cardio')}${s.duration?` · <span style="color:var(--muted)">${escapeHtml(s.duration)}</span>`:''}</div>`).join('')
        : empty)}

      ${row(t('calories'), (foodDiaryEntries.length || calEntries.length)
        ? `<div style="font-size:0.78rem;color:var(--gold-lt);font-family:'DM Mono',monospace">${Math.round(calTotal)} kcal</div>
           ${foodDiaryMacros ? `<div style="display:flex;gap:10px;font-size:0.66rem;font-family:'DM Mono',monospace;color:var(--muted);margin-top:3px"><span>P <span style="color:var(--gold)">${Math.round(foodDiaryMacros.protein)}g</span></span><span>C <span style="color:var(--petal)">${Math.round(foodDiaryMacros.carbs)}g</span></span><span>F <span style="color:var(--muted-lt)">${Math.round(foodDiaryMacros.fat)}g</span></span><span style="margin-left:auto">${foodDiaryEntries.length} item${foodDiaryEntries.length!==1?'s':''}</span></div>` : ''}
           ${!foodDiaryEntries.length ? calEntries.map(e => `<div style="font-size:0.68rem;color:var(--muted);padding-top:2px">${escapeHtml(e.description||'')} · ${e.calories} kcal</div>`).join('') : ''}`
        : empty)}

      ${tasksCompleted.length ? row('Project Notes', tasksCompleted.map(n =>
        `<div style="font-size:0.75rem;color:var(--mist)">${escapeHtml(n.project)}: ${escapeHtml(n.note)}</div>`
      ).join('')) : ''}

      ${row('Daily Notes', dailyNote
        ? `<div style="font-size:0.76rem;color:var(--mist);line-height:1.6;white-space:pre-wrap">${escapeHtml(dailyNote)}</div>`
        : empty)}
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// WINS LOG
// ─────────────────────────────────────────────────────────────────────────────

function renderWinsLog() {
  const listEl  = eid('winsList');
  const countEl = eid('winsCount');
  if (!listEl) return;

  const wins = [...(S.winsLog || [])].reverse();
  if (countEl) countEl.textContent = wins.length ? `${wins.length} total` : '';

  if (!wins.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:24px;font-size:0.72rem;color:var(--muted)">No wins yet — record your first one above.</div>`;
    return;
  }

  // Group by month
  const grouped = {};
  wins.forEach(w => {
    const month = (w.date || today()).slice(0, 7);
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(w);
  });

  listEl.innerHTML = Object.keys(grouped).sort().reverse().map(month => {
    const d = new Date(month + '-02');
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `
      <div style="font-size:0.58rem;color:var(--blush);letter-spacing:0.12em;text-transform:uppercase;font-family:'DM Mono',monospace;padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:6px">${label}</div>
      ${grouped[month].map(w => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid var(--border-lt)">
          <span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0;margin-top:2px">${w.date || ''}</span>
          <span style="flex:1;font-size:0.8rem;color:var(--mist);line-height:1.5">${escapeHtml(w.text)}</span>
          <button onclick="deleteWin('${w.id}')" class="icon-del" title="Delete">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 3.5h10M5.5 3.5V2.5h3v1M5.5 6v4.5M8.5 6v4.5M3 3.5l.7 7h6.6l.7-7"/></svg>
          </button>
        </div>`).join('')}`;
  }).join('');
}

function addWin() {
  const inp = eid('winsInput');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  if (!Array.isArray(S.winsLog)) S.winsLog = [];
  S.winsLog.push({ id: uid(), text, date: today() });
  inp.value = '';
  scheduleSave();
  renderWinsLog();
}

function addWinToday() {
  const inp = eid('todayWinInput');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  if (!Array.isArray(S.winsLog)) S.winsLog = [];
  S.winsLog.push({ id: uid(), text, date: today() });
  inp.value = '';
  scheduleSave();
  toast('Win logged!');
}

function deleteWin(id) {
  if (!Array.isArray(S.winsLog)) return;
  const backup = S.winsLog.find(w => w.id === id);
  S.winsLog = S.winsLog.filter(w => w.id !== id);
  scheduleSave();
  renderWinsLog();
  if (backup) {
    toastUndo(`Win removed`, () => {
      if (!Array.isArray(S.winsLog)) S.winsLog = [];
      S.winsLog.push(backup);
      scheduleSave();
      renderWinsLog();
    });
  }
}
