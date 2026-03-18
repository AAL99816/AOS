'use strict';

/* ══ PROJECTS ══ */
let projectF        = 'all';
let _activeProjectId = null;
let _pdTab           = 'tasks'; // 'tasks' | 'notes'

const PROJECT_STATUSES = ['Active','Planning','Paused','Complete','Dropped'];

function ensureProjects() {
  if (!Array.isArray(S.projects)) S.projects = [];
  return S.projects;
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
    const status   = p.status || 'Active';
    const pct      = calcProjectProgress(p);
    const tasks    = p.tasks || [];
    const doneCnt  = tasks.filter(t => t.done).length;
    const notesLog = Array.isArray(p.notesLog) ? [...p.notesLog].reverse().slice(0, 10) : [];

    const div = document.createElement('div');
    div.className = 'card prog-card';
    div.innerHTML = `
      <div class="prog-top" style="margin-bottom:8px">
        <div style="flex:1;min-width:0">
          <input class="editable prog-school-inp" value="${escapeAttr(p.title||'')}" onchange="updateProjectField(${p.id},'title',this.value)" placeholder="${t('project_title_ph')}">
          <input class="editable prog-name-inp" value="${escapeAttr(p.type||'')}" onchange="updateProjectField(${p.id},'type',this.value)" placeholder="${t('type_ph')}">
        </div>
        <span class="spill s-${status.toLowerCase()}" onclick="cycleProjectStatus(${p.id})" title="Click to change status" style="cursor:pointer">${escapeHtml(status)}</span>
      </div>

      <!-- Progress bar -->
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-size:0.55rem;color:var(--muted);font-family:'DM Mono',monospace;letter-spacing:0.08em;text-transform:uppercase">Progress</span>
          <span style="font-size:0.6rem;color:var(--blush);font-family:'DM Mono',monospace">${doneCnt}/${tasks.length} tasks · ${pct}%</span>
        </div>
        <div style="height:4px;background:var(--mid);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:var(--blush);border-radius:2px;transition:width 0.3s"></div>
        </div>
      </div>

      <!-- Daily notes log -->
      <div style="border-top:1px solid var(--border);padding-top:10px;margin-bottom:10px">
        <div style="font-size:0.52rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace;margin-bottom:6px">Notes</div>
        ${notesLog.length ? notesLog.map(n => `
          <div style="display:flex;align-items:flex-start;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0">
              <div style="font-size:0.52rem;color:var(--muted-lt);font-family:'DM Mono',monospace;margin-bottom:2px">${escapeHtml(n.date||'')}</div>
              <div style="font-size:0.76rem;color:var(--mist);line-height:1.4">${escapeHtml(n.text||'')}</div>
            </div>
            <button class="habit-del" style="opacity:0.4;flex-shrink:0" onclick="deleteProjectNote(${p.id},${n.id})">✕</button>
          </div>`).join('')
          : `<div style="font-size:0.68rem;color:var(--muted);padding:4px 0">No notes yet.</div>`}
        <div style="display:flex;gap:6px;margin-top:8px">
          <input class="add-inp" id="pNote-${p.id}" placeholder="Add a note for today…" style="flex:1;font-size:0.72rem" onkeydown="if(event.key==='Enter')addProjectNote(${p.id})">
          <button class="btn btn-g" style="font-size:0.62rem;padding:3px 8px;flex-shrink:0" onclick="addProjectNote(${p.id})">+ Note</button>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <button class="btn btn-d" style="font-size:0.66rem;padding:3px 9px" onclick="deleteProject(${p.id})">${t('remove')}</button>
        <button class="btn btn-p" style="font-size:0.68rem;padding:3px 12px" onclick="openProjectDetail(${p.id})">${t('open_detail')}</button>
      </div>
    `;

    c.appendChild(div);
  });
}

function addProjectNote(id) {
  const p = ensureProjects().find(x => x.id === id);
  if (!p) return;
  const inp = eid(`pNote-${id}`);
  const text = (inp && inp.value || '').trim();
  if (!text) return;
  if (!Array.isArray(p.notesLog)) p.notesLog = [];
  // Keep max 50 notes total
  if (p.notesLog.length >= 50) p.notesLog.shift();
  p.notesLog.push({ id: Date.now(), date: today(), text });
  if (inp) inp.value = '';
  scheduleSave();
  renderProjects();
}

function deleteProjectNote(id, noteId) {
  const p = ensureProjects().find(x => x.id === id);
  if (!p) return;
  p.notesLog = (p.notesLog || []).filter(n => n.id !== noteId);
  scheduleSave();
  renderProjects();
}

/* ══ PROJECT DETAIL MODAL (Tasks | Notes) ══ */
function openProjectDetail(id) {
  const p = ensureProjects().find(x => x.id === id);
  if (!p) return;
  _activeProjectId = id;
  _pdTab = 'tasks';

  eid('pdTitle').textContent  = p.title || '';
  eid('pdStatus').textContent = p.status || 'Active';

  renderPdTabs();
  openModal('mProjectDetail');
}

function renderPdTabs() {
  const p = _activeProjectId ? ensureProjects().find(x => x.id === _activeProjectId) : null;
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
  const tasks = p.tasks || [];
  const done  = tasks.filter(t => t.done).length;
  const pct   = tasks.length ? Math.round(done / tasks.length * 100) : 0;

  const list = eid('pdTasks');
  list.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:0.6rem;color:var(--muted);font-family:'DM Mono',monospace">${done}/${tasks.length} done · ${pct}%</span>
    </div>
    ${tasks.length ? tasks.map(tk => `
      <div style="padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:8px">
          <input type="checkbox" ${tk.done ? 'checked' : ''} onchange="toggleProjectTask(${p.id},${tk.id})">
          <span style="flex:1;font-size:0.8rem;color:var(--mist);${tk.done ? 'text-decoration:line-through;opacity:0.45' : ''}">${escapeHtml(tk.text||'')}</span>
          ${tk.dueDate ? `<span style="font-size:0.55rem;color:var(--muted-lt);font-family:'DM Mono',monospace;flex-shrink:0">${escapeHtml(tk.dueDate)}</span>` : ''}
          <button class="habit-del" style="opacity:0.4" onclick="deleteProjectTask(${p.id},${tk.id})">✕</button>
        </div>
        ${tk.taskNotes ? `<div style="font-size:0.68rem;color:var(--muted);margin-top:4px;padding-left:22px;font-style:italic">${escapeHtml(tk.taskNotes)}</div>` : ''}
      </div>`).join('')
    : `<div style="font-size:0.72rem;color:var(--muted);padding:8px 0">${t('no_tasks')}</div>`}
  `;
}

function renderPdNotes(p) {
  const notes = [...(p.notesLog || [])].reverse();
  const c = eid('pdNotesList');
  c.innerHTML = notes.length ? notes.map(n => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:0.52rem;color:var(--muted-lt);font-family:'DM Mono',monospace;margin-bottom:3px">${escapeHtml(n.date||'')}</div>
      <div style="font-size:0.78rem;color:var(--mist);line-height:1.5">${escapeHtml(n.text||'')}</div>
    </div>`).join('')
    : `<div style="font-size:0.72rem;color:var(--muted);padding:8px 0">No notes yet.</div>`;
}

function addProjectTask() {
  const text = (eid('pdNewTask').value || '').trim();
  if (!text || !_activeProjectId) return;
  const dueDate   = eid('pdNewTaskDate').value || '';
  const taskNotes = (eid('pdNewTaskNotes').value || '').trim();
  const p = ensureProjects().find(x => x.id === _activeProjectId);
  if (!p) return;
  if (!Array.isArray(p.tasks)) p.tasks = [];
  p.tasks.push({ id: Date.now(), text, done: false, dueDate, taskNotes });
  eid('pdNewTask').value      = '';
  eid('pdNewTaskDate').value  = '';
  eid('pdNewTaskNotes').value = '';
  scheduleSave();
  renderPdTasks(p);
}

function toggleProjectTask(id, taskId) {
  const p = ensureProjects().find(x => x.id === id);
  if (!p) return;
  const tk = (p.tasks || []).find(t => t.id === taskId);
  if (!tk) return;
  tk.done = !tk.done;
  scheduleSave();
  renderPdTasks(p);
  renderProjects();
}

function deleteProjectTask(id, taskId) {
  const p = ensureProjects().find(x => x.id === id);
  if (!p) return;
  p.tasks = (p.tasks || []).filter(t => t.id !== taskId);
  scheduleSave();
  renderPdTasks(p);
  renderProjects();
}

/* ══ PROJECT CRUD ══ */
function updateProjectField(id, field, value) {
  const p = ensureProjects().find(x => x.id === id);
  if (!p) return;
  p[field] = value;
  scheduleSave();
}

function setProjectF(f, btn) {
  projectF = f;
  document.querySelectorAll('#projectFilters .fpill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderProjects();
}

function cycleProjectStatus(id) {
  const p = ensureProjects().find(x => x.id === id);
  if (!p) return;
  const i = PROJECT_STATUSES.indexOf(p.status);
  p.status = PROJECT_STATUSES[(i + 1) % PROJECT_STATUSES.length];
  scheduleSave();
  renderProjects();
  toast(t('status_updated'));
}

function deleteProject(id) {
  if (!confirm(t('remove_project'))) return;
  S.projects = ensureProjects().filter(x => x.id !== id);
  scheduleSave();
  renderProjects();
}

function saveProject() {
  const title = eid('pTitle').value.trim();
  if (!title) return;
  ensureProjects().push(makeProject({
    id:       Date.now(),
    title,
    type:     eid('pType').value.trim(),
    context:  eid('pCtx').value.trim(),
    status:   eid('pStat').value,
    deadline: eid('pDl').value,
    tasks:    [],
    notesLog: []
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
