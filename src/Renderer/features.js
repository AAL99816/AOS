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
// UI handled by fitness.js renderWeightLog() / logWeightEntry()
// Feature flag controls visibility of #bodyWeightSection

function renderBodyWeightSection() {
  _applyVis('bodyWeightSection', feat('bodyWeight'));
  if (feat('bodyWeight') && typeof renderWeightLog === 'function') renderWeightLog();
}
// END — Body Weight Log

// ── FEATURE: Annual Goals ─────────────────────────────────────
// START — remove from here to END to disable annual goals
// UI: card in Summary tab  |  Data: S.annualGoals = { year, booksTarget, workoutsTarget }

let _annualGoalYear = new Date().getFullYear();

function changeAnnualGoalYear(delta) {
  const currentYear = new Date().getFullYear();
  _annualGoalYear = Math.min(currentYear, _annualGoalYear + delta);
  renderAnnualGoals();
}

function renderAnnualGoals() {
  if (!feat('annualGoals')) { _applyVis('annualGoalsSection', false); return; }
  _applyVis('annualGoalsSection', true);
  const currentYear = new Date().getFullYear();
  const yr = _annualGoalYear;

  // Ensure annualGoals is a map keyed by year
  if (!S.annualGoals || typeof S.annualGoals !== 'object') S.annualGoals = {};
  // Migrate old single-year format { year, booksTarget, workoutsTarget }
  if (S.annualGoals.year && !S.annualGoals[S.annualGoals.year]) {
    const old = S.annualGoals;
    S.annualGoals = { [old.year]: { booksTarget: old.booksTarget || 12, workoutsTarget: old.workoutsTarget || 100 } };
  }
  if (!S.annualGoals[yr]) S.annualGoals[yr] = { booksTarget: 12, workoutsTarget: 100 };
  const ag = S.annualGoals[yr];

  const booksRead = (S.media || []).filter(m =>
    m.mediaType === 'book' && m.status === 'done' &&
    m.finishedOn && m.finishedOn.startsWith(String(yr))
  ).length;
  const workoutsDone = (S.workoutHistory || []).filter(s =>
    s.date && s.date.startsWith(String(yr))
  ).length;

  const agYearEl = eid('agYear');
  if (agYearEl) agYearEl.textContent = yr;
  const nextBtn = eid('agYearNext');
  if (nextBtn) nextBtn.disabled = yr >= currentYear;

  const booksEl = eid('agBooksProgress');
  const workoutsEl = eid('agWorkoutsProgress');
  const bPct = Math.min(100, ag.booksTarget ? Math.round((booksRead / ag.booksTarget) * 100) : 0);
  const wPct = Math.min(100, ag.workoutsTarget ? Math.round((workoutsDone / ag.workoutsTarget) * 100) : 0);
  if (booksEl) booksEl.innerHTML = _goalBar('Books', booksRead, ag.booksTarget, bPct, "setAnnualTarget('booksTarget',+this.value)", 'var(--blush)');
  if (workoutsEl) workoutsEl.innerHTML = _goalBar('Workouts', workoutsDone, ag.workoutsTarget, wPct, "setAnnualTarget('workoutsTarget',+this.value)", 'var(--gold)');
}

function _goalBar(label, done, target, pct, onchange, color) {
  return `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;font-size:0.76rem">
        <span style="color:var(--cream)">${label}</span>
        <span style="color:var(--muted)">${done} / <input type="number" value="${target}" min="1" max="9999"
          onchange="${onchange}"
          style="width:48px;background:rgba(255,255,255,0.06);border:1px solid var(--border-lt);border-radius:4px;color:var(--gold-lt);text-align:center;font-size:0.74rem;outline:none;padding:1px 4px"> in ${_annualGoalYear}</span>
      </div>
      <div style="height:6px;background:var(--mid);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width 0.4s"></div>
      </div>
      <div style="font-size:0.62rem;color:var(--muted);margin-top:3px">${pct}% · ${Math.max(0, target - done)} to go</div>
    </div>`;
}

function setAnnualTarget(key, val) {
  if (!S.annualGoals || typeof S.annualGoals !== 'object') S.annualGoals = {};
  if (!S.annualGoals[_annualGoalYear]) S.annualGoals[_annualGoalYear] = { booksTarget: 12, workoutsTarget: 100 };
  if (val > 0) S.annualGoals[_annualGoalYear][key] = val;
  scheduleSave();
  renderAnnualGoals();
}
// END — Annual Goals

// ── FEATURE: Pomodoro Timer ───────────────────────────────────
// START — remove from here to END to disable pomodoro
// UI: floating widget (global) + button in project detail modal
// Data: sessionStorage for persistence across refreshes

let _pomodoroTimer    = null;
let _pomodoroSecsLeft = 0;
let _pomodoroPhase    = 'work';   // 'work' | 'break' | 'long-break'
let _pomodoroCount    = 0;        // completed work sessions this cycle

const POMO_WORK       = 25 * 60;
const POMO_BREAK      = 5  * 60;
const POMO_LONG_BREAK = 20 * 60;
const POMO_CYCLE      = 4;        // sessions before long break

function _playChime() {
  let played = false;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 528;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
    played = true;
  } catch {}
  // Visual flash fallback if audio is blocked or fails
  if (!played) {
    const w = eid('pomodoroWidget');
    if (w) { w.style.outline = '2px solid var(--blush)'; setTimeout(() => { w.style.outline = ''; }, 800); }
  }
}

function _savePomodoroState() {
  sessionStorage.setItem('pomo', JSON.stringify({
    secsLeft: _pomodoroSecsLeft,
    phase:    _pomodoroPhase,
    count:    _pomodoroCount,
    at:       Date.now()
  }));
}

function _restorePomodoroState() {
  try {
    const raw = sessionStorage.getItem('pomo');
    if (!raw) return false;
    const saved = JSON.parse(raw);
    const elapsed = Math.floor((Date.now() - saved.at) / 1000);
    const remaining = saved.secsLeft - elapsed;
    if (remaining > 0) {
      _pomodoroSecsLeft = remaining;
      _pomodoroPhase    = saved.phase;
      _pomodoroCount    = saved.count || 0;
      return true;
    }
    sessionStorage.removeItem('pomo');
  } catch {}
  return false;
}

function startPomodoro() {
  if (!feat('pomodoro')) return;
  if (_pomodoroTimer) clearInterval(_pomodoroTimer);
  _pomodoroPhase    = 'work';
  _pomodoroSecsLeft = POMO_WORK;
  _applyVis('pomodoroWidget', true);
  _renderPomodoroWidget();
  _pomodoroTimer = setInterval(_tickPomodoro, 1000);
  _savePomodoroState();
  if (navigator.vibrate) navigator.vibrate(30);
}

function _tickPomodoro() {
  _pomodoroSecsLeft--;
  _savePomodoroState();
  if (_pomodoroSecsLeft <= 0) {
    if (_pomodoroPhase === 'work') {
      _pomodoroCount++;
      // Record pomodoro in history
      if (!S.focusHistory) S.focusHistory = [];
      S.focusHistory.push({ date: today(), mins: 25, at: new Date().toISOString() });
      // Increment count on active focus item
      if (_focusItemId) {
        const item = (S.focusItems || []).find(i => i.id === _focusItemId);
        if (item) { item.pomodorosDone = (item.pomodorosDone || 0) + 1; }
      }
      scheduleSave();
      if (typeof renderFocusItems === 'function') renderFocusItems();
      _playChime();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      // FC7: Prompt for session note
      _showSessionNotePrompt(_pomodoroCount);
      if (_pomodoroCount % POMO_CYCLE === 0) {
        _pomodoroPhase    = 'long-break';
        _pomodoroSecsLeft = (parseInt(eid('focusLongBreakMins')?.value) || 20) * 60;
      } else {
        _pomodoroPhase    = 'break';
        _pomodoroSecsLeft = POMO_BREAK;
      }
    } else {
      _playChime();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      stopPomodoro();
      toastUndo('Break over — start the next session?', () => startPomodoro(), 'Start');
      return;
    }
  }
  _renderPomodoroWidget();
}

function _renderPomodoroWidget() {
  const mins   = String(Math.floor(_pomodoroSecsLeft / 60)).padStart(2, '0');
  const secs   = String(_pomodoroSecsLeft % 60).padStart(2, '0');
  const timeEl  = eid('pomodoroTime');
  const phaseEl = eid('pomodoroPhase');
  const widget  = eid('pomodoroWidget');
  const countEl = eid('pomodoroCount');
  if (timeEl)  timeEl.textContent  = `${mins}:${secs}`;
  if (phaseEl) phaseEl.textContent = _pomodoroPhase === 'work' ? 'Focus' : _pomodoroPhase === 'long-break' ? 'Long Break' : 'Break';
  if (countEl) countEl.textContent = _pomodoroCount > 0 ? `${_pomodoroCount} done` : '';
  if (widget)  widget.style.borderColor = _pomodoroPhase === 'work' ? 'var(--blush)' : _pomodoroPhase === 'long-break' ? 'var(--gold-lt)' : 'var(--gold)';
}

function _showSessionNotePrompt(sessionNum) {
  // FC7: Show a floating note prompt overlay after each work session
  let overlay = eid('pomoNoteOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pomoNoteOverlay';
    overlay.style.cssText = 'position:fixed;bottom:100px;right:16px;z-index:200;background:var(--panel);border:1px solid var(--border-lt);border-radius:14px;padding:14px 16px;min-width:220px;max-width:280px;box-shadow:0 8px 32px rgba(0,0,0,0.6)';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div style="font-size:0.58rem;color:var(--blush);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:6px">Session ${sessionNum} complete</div>
    <textarea id="pomoNoteText" placeholder="Quick note (optional)…" rows="2"
      style="width:100%;background:var(--mid);border:1px solid var(--border);border-radius:8px;padding:6px 8px;font-size:0.76rem;color:var(--mist);resize:none;font-family:inherit;outline:none"></textarea>
    <div style="display:flex;gap:6px;margin-top:8px">
      <button class="btn btn-p" style="flex:1;font-size:0.66rem;padding:4px" onclick="_saveSessionNote()">Save</button>
      <button class="btn btn-g" style="font-size:0.66rem;padding:4px 10px" onclick="_dismissSessionNote()">Skip</button>
    </div>
  `;
  overlay.style.display = '';
  setTimeout(() => eid('pomoNoteText')?.focus(), 80);
}

function _saveSessionNote() {
  const text = eid('pomoNoteText')?.value.trim();
  if (text) {
    if (!S.focusHistory) S.focusHistory = [];
    const last = S.focusHistory[S.focusHistory.length - 1];
    if (last) last.note = text;
    scheduleSave();
  }
  _closeSessionNoteOverlay();
}

function _dismissSessionNote() {
  _closeSessionNoteOverlay();
}

function _closeSessionNoteOverlay() {
  const overlay = eid('pomoNoteOverlay');
  if (overlay) overlay.style.display = 'none';
  const isLong = _pomodoroCount % POMO_CYCLE === 0;
  toast(isLong ? `Session ${_pomodoroCount} done — long break (20 min)` : `Pomodoro done — short break (${_pomodoroCount % POMO_CYCLE}/${POMO_CYCLE})`);
}

function stopPomodoro() {
  if (_pomodoroTimer) clearInterval(_pomodoroTimer);
  _pomodoroTimer = null;
  sessionStorage.removeItem('pomo');
  _applyVis('pomodoroWidget', false);
}

// Restore timer state on boot (handles page refresh mid-session)
function _initPomodoroRestore() {
  if (!feat('pomodoro')) return;
  if (_restorePomodoroState()) {
    _applyVis('pomodoroWidget', true);
    _renderPomodoroWidget();
    _pomodoroTimer = setInterval(_tickPomodoro, 1000);
  }
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

let _pbExpanded = false;

function renderExercisePbs() {
  if (!feat('exercisePbs')) { _applyVis('exercisePbsSection', false); return; }
  _applyVis('exercisePbsSection', true);
  const el = eid('exercisePbsList');
  if (!el) return;
  const hist = S.exerciseHistory || {};
  const names = Object.keys(hist).filter(n => n && n.trim());
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

  const pbRow = e => {
    const w   = e.best.weight ? `${e.best.weight}kg` : '';
    const r   = e.best.reps   ? `${e.best.reps} reps` : '';
    const sep = w && r ? ' × ' : '';
    const orm = e.best.weight && e.best.reps > 1
      ? Math.round(parseFloat(e.best.weight) * (1 + parseInt(e.best.reps) / 30))
      : null;
    return `<div onclick="openExerciseProgress('${escapeAttr(e.name)}')" style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:0.78rem;cursor:pointer" title="View progress chart">
      <span style="color:var(--cream)">${escapeHtml(e.name)}</span>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="text-align:right">
          <div style="color:var(--gold-lt);font-family:'DM Mono',monospace">${w}${sep}${r}</div>
          ${orm ? `<div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace">~${orm}kg 1RM</div>` : ''}
        </div>
        <span style="font-size:0.6rem;color:var(--blush);opacity:0.7">▸</span>
      </div>
    </div>`;
  };

  const header = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
    <span style="font-size:0.65rem;color:var(--muted);font-family:'DM Mono',monospace">${pbs.length} exercise${pbs.length!==1?'s':''} tracked</span>
    <div style="display:flex;gap:8px;align-items:center">
      <button onclick="epSetMode('compare');openModal('mExerciseProgress')" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--blush);cursor:pointer;font-size:0.62rem;padding:2px 8px;font-family:'DM Mono',monospace">Compare ⇌</button>
      <button onclick="_pbExpanded=!_pbExpanded;renderExercisePbs()" style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:0.72rem;padding:0">${_pbExpanded ? 'Collapse ▴' : 'View all ▾'}</button>
    </div>
  </div>`;

  if (_pbExpanded) {
    el.innerHTML = header + pbs.map(pbRow).join('');
  } else {
    // Collapsed: top 3 by weight
    const top3 = [...pbs].sort((a, b) => (parseFloat(b.best.weight)||0) - (parseFloat(a.best.weight)||0)).slice(0, 3);
    el.innerHTML = header + top3.map(pbRow).join('');
  }
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
  const items   = S.focusItems || [];
  const active  = items.filter(i => !i.completed);
  const archived = items.filter(i => i.completed);

  if (!active.length && !archived.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:0.78rem;text-align:center;padding:24px">Add a focus item above — link a project or create a custom goal</div>`;
    return;
  }

  const renderItem = item => {
    const project  = item.projectId ? (S.projects||[]).find(p => p.id == item.projectId) : null;
    const label    = item.label || project?.title || 'Focus';
    const done     = item.pomodorosDone || 0;
    const target   = item.pomodorosTarget || 0;
    const isActive = _focusItemId === item.id;
    const pct      = target ? Math.min(100, Math.round(done / target * 100)) : 0;
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--panel);border:1px solid ${isActive ? 'var(--blush)' : 'var(--border)'};border-radius:12px;margin-bottom:10px;transition:border-color 0.2s;${item.completed?'opacity:0.5':''}">
        <input type="checkbox" ${item.completed?'checked':''} onchange="toggleFocusItemDone('${item.id}')" title="Mark complete" style="flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div style="font-size:0.84rem;color:var(--cream);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${item.completed?'text-decoration:line-through;opacity:0.6':''}">${escapeHtml(label)}</div>
          <div style="font-size:0.68rem;color:var(--muted)">
            ${done}${target ? ' / ' + target : ''} pomodoro${done !== 1 ? 's' : ''}
            ${target ? `<span style="margin-left:6px;color:var(--blush)">${pct}%</span>` : ''}
            ${project ? `<span style="margin-left:6px;color:var(--muted-lt)">· ${escapeHtml(project.title)}</span>` : ''}
          </div>
          ${target ? `<div style="height:2px;background:var(--mid);border-radius:2px;margin-top:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--blush);border-radius:2px"></div></div>` : ''}
        </div>
        ${!item.completed ? `<button onclick="startFocusOn('${item.id}')" class="btn ${isActive ? 'btn-p' : 'btn-g'}" style="font-size:0.68rem;flex-shrink:0">${isActive ? '▶ Active' : 'Focus'}</button>` : ''}
        <button onclick="deleteFocusItem('${item.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.78rem;padding:0 4px;flex-shrink:0">✕</button>
      </div>`;
  };

  let html = active.map(renderItem).join('');
  if (archived.length) {
    html += `<div style="font-size:0.58rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin:12px 0 6px">Completed (${archived.length})</div>`;
    html += archived.map(renderItem).join('');
  }
  el.innerHTML = html;
}

function toggleFocusItemDone(id) {
  const item = (S.focusItems || []).find(i => String(i.id) === String(id));
  if (!item) return;
  item.completed = !item.completed;
  if (item.completed && _focusItemId === id) _focusItemId = null;
  scheduleSave();
  renderFocusItems();
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
    id: uid(),
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
  S.focusItems = (S.focusItems||[]).filter(f => String(f.id) !== String(id));
  if (String(_focusItemId) === String(id)) { _focusItemId = null; eid('focusActiveLabel').textContent = ''; }
  scheduleSave();
  renderFocusItems();
}

function startFocusOn(id) {
  _focusItemId = id;
  const item = (S.focusItems||[]).find(f => String(f.id) === String(id));
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
      toast('Pomodoro complete — take a break.');
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
  if (phase) phase.textContent = _focusPhase === 'work' ? 'Work session' : 'Break';
}

// ── FEATURE: Streak Protection ────────────────────────────────
// START — remove from here to END to disable streak protection
// UI: toggle in Settings → Features  |  Data: S.features.streakProtection
// Effect: habit streak calculation in habits.js reads isStreakProtected()

function isStreakProtected() { return feat('streakProtection'); }
// END — Streak Protection

// ── Focus from Project ─────────────────────────────────────────
// Called from project cards — navigates to Focus tab and activates
// an existing focus item for the project, or creates one on the fly.

function focusOnProject(projectId) {
  if (!S.focusItems) S.focusItems = [];
  const project = (S.projects || []).find(p => p.id == projectId);
  if (!project) return;

  // Reuse an existing item linked to this project, else create one
  let item = S.focusItems.find(f => f.projectId == projectId);
  if (!item) {
    item = {
      id: uid(),
      label: project.title || 'Focus',
      projectId,
      pomodorosTarget: 0,
      pomodorosDone: 0
    };
    S.focusItems.push(item);
    scheduleSave();
  }

  // Navigate to Focus tab
  const focusBtn = document.querySelector('.tab[onclick*="focus"]');
  go('focus', focusBtn);

  // Activate the item
  startFocusOn(item.id);
}
