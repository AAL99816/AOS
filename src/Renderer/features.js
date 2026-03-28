'use strict';
// ─────────────────────────────────────────────────────────────
// features.js — Optional feature modules for AOS
//
// Each section is clearly delimited with START/END comments.
// To remove a feature entirely:
//   1. Delete its section here (between the START/END lines)
//   2. Remove its UI block from index.html (search the feature name)
//   3. Remove its key from DS.features in state.js
// ─────────────────────────────────────────────────────────────

function feat(key) { return !!(S.features && S.features[key]); }

function applyAllFeatures() {
  _applyVis('moodTrackingSection',  feat('moodTracking'));
  _applyVis('bodyWeightSection',    feat('bodyWeight'));
  _applyVis('annualGoalsSection',   feat('annualGoals'));
  _applyVis('pomodoroWidget',       feat('pomodoro') && !!_pomodoroTimer);
  _applyVis('globalSearchBtn',      feat('globalSearch'));
  _applyVis('exercisePbsSection',   feat('exercisePbs'));
}

function _applyVis(id, show) {
  const el = eid(id);
  if (el) el.style.display = show ? '' : 'none';
}

// ── FEATURE: Mood Tracking ────────────────────────────────────
// START — remove from here to END to disable mood tracking
// UI: card in Today tab  |  Data: S.moodLog = { 'YYYY-MM-DD': 1–10 }

function renderMoodSection() {
  if (!feat('moodTracking')) { _applyVis('moodTrackingSection', false); return; }
  _applyVis('moodTrackingSection', true);
  const el = eid('moodGrid');
  if (!el) return;
  const todayKey = today();
  const current = (S.moodLog || {})[todayKey] || 0;
  const moods = ['😞','😟','😕','😐','🙂','😊','😄','😁','🤩','🥳'];
  el.innerHTML = moods.map((em, i) => {
    const score = i + 1;
    const active = current === score;
    return `<button onclick="logMood(${score})" title="Mood ${score}/10"
      style="font-size:1.35rem;background:${active ? 'var(--blush-dim)' : 'transparent'};
      border:1px solid ${active ? 'var(--blush)' : 'transparent'};border-radius:8px;
      padding:4px 5px;cursor:pointer;transition:0.15s;line-height:1">${em}</button>`;
  }).join('');
  const scoreEl = eid('moodScore');
  if (scoreEl) scoreEl.textContent = current ? `${current}/10` : '—';
}

function logMood(score) {
  if (!S.moodLog) S.moodLog = {};
  const todayKey = today();
  S.moodLog[todayKey] = S.moodLog[todayKey] === score ? undefined : score;
  if (!S.moodLog[todayKey]) delete S.moodLog[todayKey];
  scheduleSave();
  renderMoodSection();
  if (navigator.vibrate) navigator.vibrate(30);
}
// END — Mood Tracking

// ── FEATURE: Body Weight Log ──────────────────────────────────
// START — remove from here to END to disable body weight log
// UI: card in Fitness tab  |  Data: S.weightLog = [{ date, weight }]

function renderBodyWeightSection() {
  if (!feat('bodyWeight')) { _applyVis('bodyWeightSection', false); return; }
  _applyVis('bodyWeightSection', true);
  const el = eid('bodyWeightList');
  if (!el) return;
  const log = (S.weightLog || []).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  if (!log.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.74rem;padding:4px 0">No entries yet — log your first weight above</div>`;
    return;
  }
  el.innerHTML = log.map(e => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.78rem">
      <span style="color:var(--muted);font-family:'DM Mono',monospace">${e.date}</span>
      <span style="color:var(--gold-lt);font-weight:500">${e.weight} kg</span>
      <button onclick="deleteWeightEntry('${e.date}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.68rem;padding:0 4px;line-height:1">✕</button>
    </div>`).join('');
}

function logWeight() {
  const input = eid('weightInput');
  const w = parseFloat(input?.value);
  if (!w || w < 10 || w > 500) { toast('Enter a valid weight (kg)'); return; }
  if (!S.weightLog) S.weightLog = [];
  const todayKey = today();
  S.weightLog = S.weightLog.filter(e => e.date !== todayKey);
  S.weightLog.push({ date: todayKey, weight: w });
  S.weightLog.sort((a, b) => a.date.localeCompare(b.date));
  if (input) input.value = '';
  scheduleSave();
  renderBodyWeightSection();
  toast('Weight logged');
  if (navigator.vibrate) navigator.vibrate(30);
}

function deleteWeightEntry(date) {
  S.weightLog = (S.weightLog || []).filter(e => e.date !== date);
  scheduleSave();
  renderBodyWeightSection();
}
// END — Body Weight Log

// ── FEATURE: Annual Goals ─────────────────────────────────────
// START — remove from here to END to disable annual goals
// UI: card in Summary tab  |  Data: S.annualGoals = { year, booksTarget, workoutsTarget }

function renderAnnualGoals() {
  if (!feat('annualGoals')) { _applyVis('annualGoalsSection', false); return; }
  _applyVis('annualGoalsSection', true);
  const yr = new Date().getFullYear();
  if (!S.annualGoals || S.annualGoals.year !== yr) {
    S.annualGoals = { year: yr, booksTarget: 12, workoutsTarget: 100 };
  }
  const ag = S.annualGoals;
  const booksRead = (S.media || []).filter(m =>
    m.mediaType === 'book' && m.status === 'done' &&
    m.finishedOn && m.finishedOn.startsWith(String(yr))
  ).length;
  const workoutsDone = (S.workoutHistory || []).filter(s =>
    s.date && s.date.startsWith(String(yr))
  ).length;
  const booksEl = eid('agBooksProgress');
  const workoutsEl = eid('agWorkoutsProgress');
  const bPct = Math.min(100, ag.booksTarget ? Math.round((booksRead / ag.booksTarget) * 100) : 0);
  const wPct = Math.min(100, ag.workoutsTarget ? Math.round((workoutsDone / ag.workoutsTarget) * 100) : 0);
  if (booksEl) booksEl.innerHTML = _goalBar('📚', 'Books', booksRead, ag.booksTarget, bPct, "setAnnualTarget('booksTarget',+this.value)", 'var(--blush)');
  if (workoutsEl) workoutsEl.innerHTML = _goalBar('🏋️', 'Workouts', workoutsDone, ag.workoutsTarget, wPct, "setAnnualTarget('workoutsTarget',+this.value)", 'var(--gold)');
}

function _goalBar(icon, label, done, target, pct, onchange, color) {
  return `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;font-size:0.76rem">
        <span style="color:var(--cream)">${icon} ${label}</span>
        <span style="color:var(--muted)">${done} / <input type="number" value="${target}" min="1" max="9999"
          onchange="${onchange}"
          style="width:42px;background:none;border:none;border-bottom:1px solid var(--border-lt);color:var(--gold-lt);text-align:center;font-size:0.74rem;outline:none"> this year</span>
      </div>
      <div style="height:6px;background:var(--mid);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width 0.4s"></div>
      </div>
      <div style="font-size:0.62rem;color:var(--muted);margin-top:3px">${pct}% · ${Math.max(0, target - done)} to go</div>
    </div>`;
}

function setAnnualTarget(key, val) {
  if (!S.annualGoals) S.annualGoals = { year: new Date().getFullYear() };
  if (val > 0) S.annualGoals[key] = val;
  scheduleSave();
  renderAnnualGoals();
}
// END — Annual Goals

// ── FEATURE: Pomodoro Timer ───────────────────────────────────
// START — remove from here to END to disable pomodoro
// UI: floating widget (global) + 🍅 button in project detail modal
// Data: in-memory only — no state persistence

let _pomodoroTimer   = null;
let _pomodoroSecsLeft = 0;
let _pomodoroPhase   = 'work';

function startPomodoro(projectId) {
  if (!feat('pomodoro')) return;
  if (_pomodoroTimer) clearInterval(_pomodoroTimer);
  _pomodoroPhase    = 'work';
  _pomodoroSecsLeft = 25 * 60;
  _applyVis('pomodoroWidget', true);
  _renderPomodoroWidget();
  _pomodoroTimer = setInterval(_tickPomodoro, 1000);
  if (navigator.vibrate) navigator.vibrate(30);
}

function _tickPomodoro() {
  _pomodoroSecsLeft--;
  if (_pomodoroSecsLeft <= 0) {
    if (_pomodoroPhase === 'work') {
      _pomodoroPhase    = 'break';
      _pomodoroSecsLeft = 5 * 60;
      toast('Pomodoro done! Take a 5-minute break 🎉');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } else {
      stopPomodoro();
      toast('Break over — ready for the next session?');
      return;
    }
  }
  _renderPomodoroWidget();
}

function _renderPomodoroWidget() {
  const mins = String(Math.floor(_pomodoroSecsLeft / 60)).padStart(2, '0');
  const secs = String(_pomodoroSecsLeft % 60).padStart(2, '0');
  const timeEl  = eid('pomodoroTime');
  const phaseEl = eid('pomodoroPhase');
  const widget  = eid('pomodoroWidget');
  if (timeEl)  timeEl.textContent  = `${mins}:${secs}`;
  if (phaseEl) phaseEl.textContent = _pomodoroPhase === 'work' ? 'Focus' : 'Break ☕';
  if (widget)  widget.style.borderColor = _pomodoroPhase === 'work' ? 'var(--blush)' : 'var(--gold)';
}

function stopPomodoro() {
  if (_pomodoroTimer) clearInterval(_pomodoroTimer);
  _pomodoroTimer = null;
  _applyVis('pomodoroWidget', false);
}
// END — Pomodoro Timer

// ── FEATURE: Global Search ────────────────────────────────────
// START — remove from here to END to disable global search
// UI: 🔍 button in nav + modal  |  Data: read-only, searches S

function openGlobalSearch() {
  if (!feat('globalSearch')) return;
  const modal = eid('mGlobalSearch');
  if (modal) {
    modal.classList.add('open');
    setTimeout(() => {
      const input = eid('gsInput');
      if (input) { input.value = ''; input.focus(); }
      renderSearchResults('');
    }, 80);
  }
}

function closeGlobalSearch() {
  const modal = eid('mGlobalSearch');
  if (modal) modal.classList.remove('open');
}

function renderSearchResults(q) {
  const el = eid('gsResults');
  if (!el) return;
  q = (q || '').toLowerCase().trim();
  if (!q) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:20px;text-align:center">Start typing to search everything…</div>`;
    return;
  }
  const results = [];

  (S.projects || []).forEach(p => {
    if (_matches(q, p.title, p.notes, p.context))
      results.push({ icon:'📋', title: p.title || '(untitled)', sub: `Project · ${p.status || ''}`, click:`closeGlobalSearch();go('projects',document.querySelector('[data-tab=projects]'))` });
    (p.tasks || []).forEach(tk => {
      if (_matches(q, tk.text))
        results.push({ icon:'✅', title: tk.text, sub: `Task in ${p.title}`, click:`closeGlobalSearch();go('projects',document.querySelector('[data-tab=projects]'))` });
    });
  });

  (S.media || []).forEach(m => {
    if (_matches(q, m.title, m.author, m.notes))
      results.push({ icon: _mediaIcon(m.mediaType), title: m.title || '(untitled)', sub: `${m.mediaType} · ${m.author || ''}`, click:`closeGlobalSearch();go('media',document.querySelector('[data-tab=media]'))` });
    (m.chapterNotes || []).forEach(n => {
      if (_matches(q, n.note, n.label))
        results.push({ icon:'📝', title: n.label || 'Note', sub: `Note in ${m.title}`, click:`closeGlobalSearch();go('media',document.querySelector('[data-tab=media]'))` });
    });
  });

  (S.habits || []).forEach(h => {
    if (_matches(q, h.name))
      results.push({ icon:'🔥', title: h.name, sub: 'Habit', click:`closeGlobalSearch();go('today',document.querySelector('[data-tab=today]'))` });
  });

  Object.entries(S.notes || {}).forEach(([date, text]) => {
    if (_matches(q, text))
      results.push({ icon:'📓', title: `Note — ${date}`, sub: (text || '').slice(0, 70) + (text.length > 70 ? '…' : ''), click:`closeGlobalSearch();go('today',document.querySelector('[data-tab=today]'))` });
  });

  if (!results.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.78rem;padding:20px;text-align:center">No results for "<b>${escapeHtml(q)}</b>"</div>`;
    return;
  }
  el.innerHTML = results.slice(0, 25).map(r => `
    <div onclick="${r.click}" style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s"
      onmouseenter="this.style.background='var(--blush-dim)'" onmouseleave="this.style.background=''">
      <span style="font-size:1.1rem;margin-top:1px">${r.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.83rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.title)}</div>
        <div style="font-size:0.66rem;color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.sub)}</div>
      </div>
    </div>`).join('');
}

function _matches(q, ...fields) {
  return fields.some(f => (f || '').toLowerCase().includes(q));
}

function _mediaIcon(type) {
  return { book:'📚', film:'🎬', show:'📺', anime:'⛩️', album:'🎵', game:'🎮' }[type] || '📚';
}
// END — Global Search

// ── FEATURE: Data Export ──────────────────────────────────────
// START — remove from here to END to disable data export
// UI: buttons in Settings → Features pane  |  Data: read-only

function exportCSV(type) {
  const configs = {
    media:    { headers:['Type','Title','Creator','Status','Rating','Finished'],
                rows: () => (S.media||[]).map(m=>[m.mediaType,m.title,m.author,m.status,m.rating||'',m.finishedOn||'']),
                file: 'aos-media.csv' },
    workouts: { headers:['Date','Title','Summary'],
                rows: () => (S.workoutHistory||[]).map(s=>[s.date,s.title||'Workout',s.summary||'']),
                file: 'aos-workouts.csv' },
    habits:   { headers:['Date','Habit','Done'],
                rows: () => {
                  const log=[];
                  (S.habits||[]).forEach(h=>Object.entries(h.days||{}).forEach(([d,v])=>{ if(v) log.push([d,h.name,'yes']); }));
                  return log.sort((a,b)=>b[0].localeCompare(a[0]));
                }, file: 'aos-habits.csv' },
    cardio:   { headers:['Date','Activity','Duration','Distance','Steps'],
                rows: () => (S.cardioHistory||[]).map(s=>[s.date,s.activity,s.duration,s.distance||'',s.steps||'']),
                file: 'aos-cardio.csv' },
    calories: { headers:['Date','Description','Calories','Meal'],
                rows: () => (S.calorieHistory||[]).map(e=>[e.date,e.description||'',e.calories||'',e.meal||'']),
                file: 'aos-calories.csv' },
    weight:   { headers:['Date','Weight (kg)'],
                rows: () => (S.weightLog||[]).map(e=>[e.date,e.weight]),
                file: 'aos-weight.csv' },
    projects: { headers:['Title','Type','Status','Deadline','Tasks'],
                rows: () => (S.projects||[]).map(p=>[p.title,p.type,p.status,p.deadline||'',(p.tasks||[]).length]),
                file: 'aos-projects.csv' },
  };
  const cfg = configs[type];
  if (!cfg) return;
  const rows = cfg.rows();
  if (!rows.length) { toast('No data to export'); return; }
  const escape = c => `"${String(c||'').replace(/"/g,'""')}"`;
  const csv = [cfg.headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = cfg.file; a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${rows.length} rows`);
}
// END — Data Export

// ── FEATURE: Exercise PBs ─────────────────────────────────────
// START — remove from here to END to disable exercise PBs
// UI: card in Fitness tab  |  Data: computed from S.exerciseHistory (read-only)

function renderExercisePbs() {
  if (!feat('exercisePbs')) { _applyVis('exercisePbsSection', false); return; }
  _applyVis('exercisePbsSection', true);
  const el = eid('exercisePbsList');
  if (!el) return;
  const hist = S.exerciseHistory || {};
  const names = Object.keys(hist);
  if (!names.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.74rem;padding:4px 0">Log workouts to see your personal bests here</div>`;
    return;
  }
  const pbs = names.map(name => {
    const sets = hist[name] || [];
    const best = sets.reduce((b, s) => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps)     || 0;
      if (!b) return s;
      const bw = parseFloat(b.weight) || 0;
      const br = parseInt(b.reps)     || 0;
      return (w > bw || (w === bw && r > br)) ? s : b;
    }, null);
    return { name, best };
  }).filter(e => e.best);
  pbs.sort((a, b) => a.name.localeCompare(b.name));
  el.innerHTML = pbs.map(e => {
    const w = e.best.weight ? `${e.best.weight}kg` : '';
    const r = e.best.reps   ? `${e.best.reps} reps` : '';
    const sep = w && r ? ' × ' : '';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:0.78rem">
      <span style="color:var(--cream)">${escapeHtml(e.name)}</span>
      <span style="color:var(--gold-lt);font-family:'DM Mono',monospace">${w}${sep}${r}</span>
    </div>`;
  }).join('');
}
// END — Exercise PBs

// ── Focus Tab ─────────────────────────────────────────────────
// Full dedicated tab with configurable work/break timer and focus items.
// Data: S.focusItems = [{ id, label, projectId, pomodorosDone, color }]

let _focusTimer    = null;
let _focusSecs     = 0;
let _focusPhase    = 'work';  // 'work' | 'break'
let _focusItemId   = null;
let _focusRunning  = false;

function renderFocusTab() {
  renderFocusItems();
  _renderFocusTimer();
}

function renderFocusItems() {
  const el = eid('focusItemsList');
  if (!el) return;
  const items = S.focusItems || [];
  if (!items.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.78rem;text-align:center;padding:24px">Add a focus item above — link a project or create a custom goal</div>`;
    return;
  }
  el.innerHTML = items.map(item => {
    const project = item.projectId ? (S.projects||[]).find(p => p.id == item.projectId) : null;
    const label   = item.label || project?.title || 'Focus';
    const done    = item.pomodorosDone || 0;
    const target  = item.pomodorosTarget || 0;
    const isActive = _focusItemId === item.id;
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--panel);border:1px solid ${isActive ? 'var(--blush)' : 'var(--border)'};border-radius:12px;margin-bottom:10px;transition:border-color 0.2s">
        <div style="flex:1;min-width:0">
          <div style="font-size:0.84rem;color:var(--cream);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(label)}</div>
          <div style="font-size:0.68rem;color:var(--muted)">
            🍅 ${done}${target ? ' / ' + target : ''} pomodoro${done !== 1 ? 's' : ''}
            ${project ? `<span style="margin-left:6px;color:var(--muted-lt)">· ${escapeHtml(project.title)}</span>` : ''}
          </div>
        </div>
        <button onclick="startFocusOn(${item.id})" class="btn ${isActive ? 'btn-p' : 'btn-g'}" style="font-size:0.68rem;flex-shrink:0">${isActive ? '▶ Active' : 'Focus'}</button>
        <button onclick="deleteFocusItem(${item.id})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.78rem;padding:0 4px;flex-shrink:0">✕</button>
      </div>`;
  }).join('');
}

function addFocusItem() {
  const projects = S.projects || [];
  const projOpts = projects.map(p => `<option value="${p.id}">${escapeHtml(p.title||'(untitled)')}</option>`).join('');
  const html = `
    <div class="mf"><label>Label</label><input id="fiLabel" class="add-inp" placeholder="e.g. Deep work, Study session…"></div>
    <div class="mf"><label>Link to project (optional)</label>
      <select id="fiProject" style="width:100%">
        <option value="">— none —</option>${projOpts}
      </select>
    </div>
    <div class="mf"><label>Target pomodoros</label><input id="fiTarget" type="number" class="add-inp" placeholder="e.g. 8" min="0"></div>
  `;
  const modal = eid('mFocusAdd');
  if (modal) { eid('focusAddBody').innerHTML = html; modal.classList.add('open'); }
}

function saveFocusItem() {
  const label   = eid('fiLabel')?.value.trim();
  const projId  = eid('fiProject')?.value || null;
  const target  = parseInt(eid('fiTarget')?.value) || 0;
  if (!label && !projId) { toast('Enter a label or select a project'); return; }
  const project = projId ? (S.projects||[]).find(p => p.id == projId) : null;
  if (!S.focusItems) S.focusItems = [];
  S.focusItems.push({
    id: Date.now(),
    label: label || project?.title || 'Focus',
    projectId: projId,
    pomodorosTarget: target,
    pomodorosDone: 0
  });
  scheduleSave();
  renderFocusItems();
  const modal = eid('mFocusAdd');
  if (modal) modal.classList.remove('open');
}

function deleteFocusItem(id) {
  S.focusItems = (S.focusItems||[]).filter(f => f.id !== id);
  if (_focusItemId === id) { _focusItemId = null; eid('focusActiveLabel').textContent = ''; }
  scheduleSave();
  renderFocusItems();
}

function startFocusOn(id) {
  _focusItemId = id;
  const item = (S.focusItems||[]).find(f => f.id === id);
  const lbl  = eid('focusActiveLabel');
  if (lbl && item) lbl.textContent = item.label;
  renderFocusItems();
  if (!_focusRunning) toggleFocusTimer();
}

function toggleFocusTimer() {
  if (_focusRunning) {
    // Pause
    clearInterval(_focusTimer);
    _focusTimer   = null;
    _focusRunning = false;
    const btn = eid('focusStartBtn');
    if (btn) btn.textContent = 'Resume';
  } else {
    // Start / Resume
    if (_focusSecs <= 0) {
      const workMins  = parseInt(eid('focusWorkMins')?.value)  || 25;
      _focusPhase = 'work';
      _focusSecs  = workMins * 60;
    }
    _focusRunning = true;
    const btn = eid('focusStartBtn');
    if (btn) btn.textContent = 'Pause';
    _focusTimer = setInterval(_tickFocusTimer, 1000);
    if (navigator.vibrate) navigator.vibrate(30);
  }
}

function resetFocusTimer() {
  clearInterval(_focusTimer);
  _focusTimer   = null;
  _focusRunning = false;
  _focusSecs    = 0;
  _focusPhase   = 'work';
  const btn = eid('focusStartBtn');
  if (btn) btn.textContent = 'Start';
  _renderFocusTimer();
}

function _tickFocusTimer() {
  _focusSecs--;
  if (_focusSecs <= 0) {
    clearInterval(_focusTimer);
    _focusTimer   = null;
    _focusRunning = false;
    if (_focusPhase === 'work') {
      // Count a pomodoro
      if (_focusItemId) {
        const item = (S.focusItems||[]).find(f => f.id === _focusItemId);
        if (item) { item.pomodorosDone = (item.pomodorosDone || 0) + 1; scheduleSave(); renderFocusItems(); }
      }
      // Switch to break
      const breakMins = parseInt(eid('focusBreakMins')?.value) || 5;
      _focusPhase = 'break';
      _focusSecs  = breakMins * 60;
      toast('Pomodoro complete! Take a break 🎉');
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      _focusRunning = true;
      const btn = eid('focusStartBtn');
      if (btn) btn.textContent = 'Pause';
      _focusTimer = setInterval(_tickFocusTimer, 1000);
    } else {
      _focusPhase = 'work';
      _focusSecs  = 0;
      const btn = eid('focusStartBtn');
      if (btn) btn.textContent = 'Start';
      toast('Break over — ready for the next session?');
    }
  }
  _renderFocusTimer();
}

function _renderFocusTimer() {
  const workMins = parseInt(eid('focusWorkMins')?.value) || 25;
  const secs = _focusSecs > 0 ? _focusSecs : workMins * 60;
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  const disp  = eid('focusTimerDisplay');
  const phase = eid('focusPhaseLabel');
  if (disp)  disp.textContent  = `${m}:${s}`;
  if (phase) phase.textContent = _focusPhase === 'work' ? 'Work session' : 'Break ☕';
}

// ── FEATURE: Streak Protection ────────────────────────────────
// START — remove from here to END to disable streak protection
// UI: toggle in Settings → Features  |  Data: S.features.streakProtection
// Effect: habit streak calculation in habits.js reads isStreakProtected()

function isStreakProtected() { return feat('streakProtection'); }
// END — Streak Protection
