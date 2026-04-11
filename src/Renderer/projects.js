'use strict';

/* ══ PROJECTS ══ */
let projectF        = 'all';
let _activeProjectId = null;
let _pdTab           = 'tasks'; // 'tasks' | 'notes'

const PROJECT_STATUSES = ['Active','Planning','Paused','Complete','Dropped','Archived'];

function ensureProjects() {
  if (!Array.isArray(S.projects)) S.projects = [];
  return S.projects;
}

/* ── Notes helpers ── */
function _projectEntityNotes(p) {
  if (!p || !p._uuid) return [];
  return (Array.isArray(S.notesDB) ? S.notesDB : [])
    .filter(n => n.entityId === p._uuid)
    .sort((a, b) => (a.orderIndex - b.orderIndex) || (a.createdAt || '').localeCompare(b.createdAt || ''));
}

function _projectOpenNotes(appId) {
  const p = ensureProjects().find(x => String(x.id) === String(appId));
  if (!p || !p._uuid) return;
  if (typeof openNotesForEntity === 'function') openNotesForEntity('project', p._uuid);
}

function calcProjectProgress(p) {
  const tasks = p.tasks || [];
  if (!tasks.length) return 0;
  return Math.round(tasks.filter(t => t.done).length / tasks.length * 100);
}

/* ══ PROJECT LIST VIEW ══ */
function renderProjects() {
  const c = eid('projectsGrid');
  c.innerHTML = '';

  const projects = ensureProjects();
  const list = projectF === 'all' ? projects : projects.filter(p => p.status === projectF);

  if (!list.length) {
    c.innerHTML = `<div style="text-align:center;padding:48px 24px"><div style="font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--border-lt);margin-bottom:10px">◆</div><div style="font-size:0.66rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace">${t('no_projects')}</div></div>`;
    return;
  }

  list.forEach(p => {
    const status    = p.status || 'Active';
    const pct       = calcProjectProgress(p);
    const tasks     = p.tasks || [];
    const doneCnt   = tasks.filter(t => t.done).length;
    const overdueCnt = tasks.filter(t => !t.done && t.dueDate && t.dueDate < today()).length;
    const projNotes = _projectEntityNotes(p);
    const notesLog  = projNotes.slice(0, 3);
    const noteTotal = projNotes.length;

    // Deadline warning — within 7 days and not complete/dropped/archived
    const dl = p.deadline;
    const daysUntilDl = dl ? Math.ceil((new Date(dl + 'T00:00:00') - new Date()) / 86400000) : null;
    const dlWarn = dl && !['Complete','Dropped','Archived'].includes(status)
      && daysUntilDl !== null && daysUntilDl <= 7;

    const div = document.createElement('div');
    div.className = 'card prog-card';
    div.innerHTML = `
      <div class="prog-top" style="margin-bottom:8px">
        <div style="flex:1;min-width:0">
          <input class="editable prog-school-inp" value="${escapeAttr(p.title||'')}" onchange="updateProjectField('${p.id}','title',this.value)" placeholder="${t('project_title_ph')}">
          <input class="editable prog-name-inp" value="${escapeAttr(p.type||'')}" onchange="updateProjectField('${p.id}','type',this.value)" placeholder="${t('type_ph')}">
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <button onclick="_projectOpenNotes('${p.id}')"
            style="background:none;border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:0.62rem;padding:2px 7px;border-radius:4px;font-family:'DM Mono',monospace;line-height:1" title="Open notes">&rarr;</button>
          <span class="spill s-${status.toLowerCase()}" onclick="cycleProjectStatus('${p.id}')" title="Click to change status" style="cursor:pointer">${escapeHtml(status)}</span>
        </div>
      </div>

      ${dlWarn ? `<div style="font-size:0.62rem;color:var(--petal);font-family:'DM Mono',monospace;margin-bottom:8px;padding:4px 8px;background:rgba(232,160,176,0.08);border-radius:6px;border:1px solid rgba(232,160,176,0.2)">
        ${daysUntilDl <= 0 ? 'Deadline passed' : daysUntilDl === 1 ? 'Due tomorrow' : `Due in ${daysUntilDl} days`} · ${dl}
      </div>` : ''}

      <!-- Progress bar -->
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-size:0.55rem;color:var(--muted);font-family:'DM Mono',monospace;letter-spacing:0.08em;text-transform:uppercase">Progress</span>
          <div style="display:flex;align-items:center;gap:8px">
            ${overdueCnt > 0 ? `<span style="font-size:0.58rem;color:var(--petal);font-family:'DM Mono',monospace">${overdueCnt} overdue</span>` : ''}
            <span style="font-size:0.6rem;color:var(--blush);font-family:'DM Mono',monospace">${doneCnt}/${tasks.length} · ${pct}%</span>
          </div>
        </div>
        <div style="height:4px;background:var(--mid);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:var(--blush);border-radius:2px;transition:width 0.3s"></div>
        </div>
      </div>

      <!-- Notes preview -->
      <div style="border-top:1px solid var(--border);padding-top:10px;margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="font-size:0.52rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace">Notes</div>
          ${noteTotal ? `<span style="font-size:0.52rem;color:var(--muted);font-family:'DM Mono',monospace">${noteTotal}</span>` : ''}
        </div>
        ${notesLog.length ? notesLog.map(n => `
          <div style="padding:4px 0;border-bottom:1px solid var(--border)">
            <div style="font-size:0.62rem;color:var(--muted-lt);font-family:'DM Mono',monospace;margin-bottom:1px">${escapeHtml(n.title||'')}</div>
            <div style="font-size:0.72rem;color:var(--mist);line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml((n.body||'').slice(0,80))}</div>
          </div>`).join('')
          : `<div style="font-size:0.68rem;color:var(--muted);padding:4px 0">No notes yet.</div>`}
        <div style="margin-top:8px">
          <button class="btn btn-g" style="font-size:0.62rem;padding:3px 10px" onclick="_projectOpenNotes('${p.id}')">Open Notes</button>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <button class="btn btn-d" style="font-size:0.66rem;padding:3px 9px" onclick="deleteProject('${p.id}')">${t('remove')}</button>
          ${p.updatedOn ? `<span style="font-size:0.52rem;color:var(--muted);font-family:'DM Mono',monospace" title="Last updated">↻ ${p.updatedOn}</span>` : ''}
        </div>
        <div style="display:flex;gap:6px">
          ${typeof feat === 'function' && feat('pomodoro') ? `<button class="btn btn-g" style="font-size:0.66rem;padding:3px 9px" onclick="focusOnProject('${p.id}')">Focus</button>` : ''}
          <button class="btn btn-p" style="font-size:0.68rem;padding:3px 12px" onclick="openProjectDetail('${p.id}')">${t('open_detail')}</button>
        </div>
      </div>
    `;

    c.appendChild(div);
  });
}

function addProjectNote(id) {
  const p = ensureProjects().find(x => String(x.id) === String(id));
  if (!p || !p._uuid) return;
  const inp = eid(`pNote-${id}`);
  const text = (inp && inp.value || '').trim();
  if (!text) return;
  const existing = _projectEntityNotes(p);
  const note = {
    section:    'projects',
    entityType: 'project',
    entityId:   p._uuid,
    title:      '',
    body:       text,
    orderIndex: existing.length
  };
  if (inp) inp.value = '';
  if (typeof saveNoteDB === 'function') saveNoteDB(note).then(() => { renderProjects(); renderPdNotes(p); });
}

function editProjectNote(noteId, val) {
  const n = (Array.isArray(S.notesDB) ? S.notesDB : []).find(x => String(x.id) === String(noteId));
  if (!n) return;
  n.body = val;
  if (typeof saveNoteDB === 'function') saveNoteDB(n);
}

function deleteProjectNote(noteId) {
  if (typeof deleteNoteDB === 'function') deleteNoteDB(noteId).then(() => {
    renderProjects();
    if (_activeProjectId) {
      const p = ensureProjects().find(x => String(x.id) === String(_activeProjectId));
      if (p) renderPdNotes(p);
    }
  });
}

/* ══ PROJECT DETAIL MODAL (Tasks | Notes) ══ */
function openProjectDetail(id) {
  const p = ensureProjects().find(x => String(x.id) === String(id));
  if (!p) return;
  _activeProjectId = id;
  _pdTab = 'tasks';

  eid('pdTitle').textContent  = p.title || '';
  eid('pdStatus').textContent = p.status || 'Active';

  renderPdTabs();
  openModal('mProjectDetail');
}

function renderPdTabs() {
  const p = _activeProjectId ? ensureProjects().find(x => String(x.id) === String(_activeProjectId)) : null;
  if (!p) return;

  // Tab buttons
  eid('pdTabTasks').classList.toggle('active', _pdTab === 'tasks');
  eid('pdTabNotes').classList.toggle('active', _pdTab === 'notes');

  eid('pdPaneTasks').style.display = _pdTab === 'tasks' ? '' : 'none';
  eid('pdPaneNotes').style.display = _pdTab === 'notes' ? '' : 'none';

  if (_pdTab === 'tasks') renderPdTasks(p);
  else renderPdNotes(p);
}

function switchPdTab(tab) {
  _pdTab = tab;
  renderPdTabs();
}

function renderPdTasks(p) {
  const tasks    = p.tasks || [];
  const done     = tasks.filter(t => t.done).length;
  const pct      = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const todayStr = today();

  // Total remaining time estimate
  const totalEstMins = tasks.filter(tk => !tk.done && tk.timeEst).reduce((s, tk) => s + (tk.timeEst || 0), 0);
  const estLabel = totalEstMins >= 60
    ? `${Math.floor(totalEstMins / 60)}h${totalEstMins % 60 ? ' ' + (totalEstMins % 60) + 'm' : ''}`
    : totalEstMins > 0 ? `${totalEstMins}m` : '';

  const list = eid('pdTasks');
  list.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace">${done}/${tasks.length} done · ${pct}%</span>
      ${estLabel ? `<span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace" title="Total remaining estimate">${estLabel} remaining</span>` : ''}
    </div>
    ${tasks.length ? tasks.map((tk, ti) => {
      const overdue = !tk.done && tk.dueDate && tk.dueDate < todayStr;
      return `
      <div style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:8px">
          <input type="checkbox" ${tk.done ? 'checked' : ''} onchange="toggleProjectTask('${p.id}','${tk.id}')">
          <input class="editable" style="flex:1;font-size:0.8rem;color:var(--mist);background:none;border:none;${tk.done?'text-decoration:line-through;opacity:0.45':''}"
            value="${escapeAttr(tk.text||'')}" onchange="updateProjectTask('${p.id}','${tk.id}','text',this.value)">
          ${tk.timeEst && !tk.done ? `<span style="font-size:0.52rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0" title="Time estimate">${tk.timeEst}m</span>` : ''}
          ${tk.dueDate ? `<span style="font-size:0.55rem;font-family:'DM Mono',monospace;flex-shrink:0;color:${overdue?'var(--petal)':'var(--muted-lt)'}${overdue?';font-weight:600':''}" title="${overdue?'Overdue':''}">${escapeHtml(tk.dueDate)}${overdue?' !':''}</span>` : ''}
          <div style="display:flex;flex-direction:column;gap:1px;flex-shrink:0">
            ${ti > 0 ? `<button onclick="reorderTask('${p.id}',${ti},-1)" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.6rem;padding:0;line-height:1" title="Move up">▲</button>` : '<div style="width:14px"></div>'}
            ${ti < tasks.length-1 ? `<button onclick="reorderTask('${p.id}',${ti},1)" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.6rem;padding:0;line-height:1" title="Move down">▼</button>` : '<div style="width:14px"></div>'}
          </div>
          <button class="habit-del" style="opacity:0.4" onclick="deleteProjectTask('${p.id}','${tk.id}')">✕</button>
        </div>
        ${tk.done && tk.completedOn ? `<div style="font-size:0.52rem;color:var(--muted);font-family:'DM Mono',monospace;padding-left:22px;margin-top:2px">Completed ${tk.completedOn}</div>` : ''}
        <input class="editable" style="width:100%;font-size:0.68rem;color:var(--muted);background:none;border:none;padding-left:22px;font-style:italic;margin-top:3px"
          placeholder="Task notes…" value="${escapeAttr(tk.taskNotes||'')}" onchange="updateProjectTask('${p.id}','${tk.id}','taskNotes',this.value)">
      </div>`;
    }).join('')
    : `<div style="font-size:0.72rem;color:var(--muted);padding:8px 0">${t('no_tasks')}</div>`}
  `;
}

function renderPdNotes(p) {
  const notes = _projectEntityNotes(p);
  const c = eid('pdNotesList');
  c.innerHTML = notes.length ? notes.map(n => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border)">
      ${n.title ? `<div style="font-size:0.52rem;color:var(--muted-lt);font-family:'DM Mono',monospace;margin-bottom:3px">${escapeHtml(n.title)}</div>` : ''}
      <textarea class="editable" style="width:100%;font-size:0.78rem;color:var(--mist);line-height:1.5;background:none;border:none;resize:vertical;min-height:48px"
        onchange="editProjectNote('${n.id}',this.value)">${escapeHtml(n.body||'')}</textarea>
      <button class="habit-del" style="opacity:0.4;font-size:0.6rem" onclick="deleteProjectNote('${n.id}')">&#10005;</button>
    </div>`).join('')
    : `<div style="font-size:0.72rem;color:var(--muted);padding:8px 0">No notes yet.</div>`;
}

function addProjectTask() {
  const text = (eid('pdNewTask').value || '').trim();
  if (!text || !_activeProjectId) return;
  const dueDate   = eid('pdNewTaskDate').value || '';
  const taskNotes = (eid('pdNewTaskNotes').value || '').trim();
  const timeEst   = parseInt(eid('pdNewTaskEst')?.value) || null;
  const p = ensureProjects().find(x => String(x.id) === String(_activeProjectId));
  if (!p) return;
  if (!Array.isArray(p.tasks)) p.tasks = [];
  p.tasks.push({ id: uid(), text, done: false, dueDate, taskNotes, timeEst });
  eid('pdNewTask').value      = '';
  eid('pdNewTaskDate').value  = '';
  eid('pdNewTaskNotes').value = '';
  if (eid('pdNewTaskEst')) eid('pdNewTaskEst').value = '';
  scheduleSave();
  renderPdTasks(p);
}

function updateProjectTask(id, taskId, field, value) {
  const p = ensureProjects().find(x => String(x.id) === String(id));
  if (!p) return;
  const tk = (p.tasks || []).find(t => String(t.id) === String(taskId));
  if (!tk) return;
  tk[field] = value;
  scheduleSave();
}

function toggleProjectTask(id, taskId) {
  const p = ensureProjects().find(x => String(x.id) === String(id));
  if (!p) return;
  const tk = (p.tasks || []).find(t => String(t.id) === String(taskId));
  if (!tk) return;
  tk.done = !tk.done;
  tk.completedOn = tk.done ? today() : null;
  p.updatedOn = today();
  scheduleSave();
  renderPdTasks(p);
  renderProjects();
}

function reorderTask(projectId, fromIdx, dir) {
  const p = ensureProjects().find(x => String(x.id) === String(projectId));
  if (!p || !Array.isArray(p.tasks)) return;
  const toIdx = fromIdx + dir;
  if (toIdx < 0 || toIdx >= p.tasks.length) return;
  [p.tasks[fromIdx], p.tasks[toIdx]] = [p.tasks[toIdx], p.tasks[fromIdx]];
  p.updatedOn = today();
  scheduleSave();
  renderPdTasks(p);
}

function deleteProjectTask(id, taskId) {
  const p = ensureProjects().find(x => String(x.id) === String(id));
  if (!p) return;
  const removed = (p.tasks || []).find(t => String(t.id) === String(taskId));
  p.tasks = (p.tasks || []).filter(t => String(t.id) !== String(taskId));
  scheduleSave();
  renderPdTasks(p);
  renderProjects();
  if (removed) toastUndo(`"${removed.text || 'Task'}" removed`, () => {
    const pp = ensureProjects().find(x => String(x.id) === String(id));
    if (pp) { if (!Array.isArray(pp.tasks)) pp.tasks = []; pp.tasks.push(removed); scheduleSave(); renderPdTasks(pp); renderProjects(); }
  });
}

/* ══ PROJECT CRUD ══ */
function updateProjectField(id, field, value) {
  const p = ensureProjects().find(x => String(x.id) === String(id));
  if (!p) return;
  p[field] = value;
  p.updatedOn = today();
  scheduleSave();
}

function setProjectF(f, btn) {
  projectF = f;
  document.querySelectorAll('#projectFilters .fpill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderProjects();
}

function cycleProjectStatus(id) {
  const p = ensureProjects().find(x => String(x.id) === String(id));
  if (!p) return;
  const i = PROJECT_STATUSES.indexOf(p.status);
  p.status = PROJECT_STATUSES[(i + 1) % PROJECT_STATUSES.length];
  p.updatedOn = today();
  scheduleSave();
  renderProjects();
  toast(t('status_updated'));
}

function deleteProject(id) {
  if (!confirm(t('remove_project'))) return;
  S.projects = ensureProjects().filter(x => String(x.id) !== String(id));
  scheduleSave();
  renderProjects();
}

function saveProject() {
  const title = eid('pTitle').value.trim();
  if (!title) return;
  ensureProjects().push(makeProject({
    title,
    type:     eid('pType').value.trim(),
    context:  eid('pCtx').value.trim(),
    status:   eid('pStat').value,
    deadline: eid('pDl').value,
    tasks:    []
  }));
  eid('pTitle').value = '';
  eid('pType').value  = '';
  eid('pCtx').value   = '';
  eid('pStat').value  = 'Active';
  eid('pDl').value    = '';
  closeModal('mProject');
  scheduleSave();
  renderProjects();
  toast(t('project_added'));
}
