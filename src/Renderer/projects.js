'use strict';

/* ══ PROJECTS / AREAS ══ */
let projectF = 'all';

const PROJECT_STATUSES = ['Active','Planning','Paused','Complete','Dropped'];

function ensureProjects() {
  if (!Array.isArray(S.projects)) S.projects = [];
  return S.projects;
}

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
    const status = p.status || 'Active';
    const linkedGoals = (S.goals||[]).filter(g => String(g.projectId) === String(p.id)).length;
    const div = document.createElement('div');
    div.className = 'card prog-card';

    div.innerHTML = `
      <div class="prog-top">
        <div style="flex:1">
          <input class="editable prog-school-inp" value="${escapeAttr(p.title||'')}" onchange="updateProjectField(${p.id},'title',this.value)" placeholder="${t('project_title_ph')}">
          <input class="editable prog-name-inp" value="${escapeAttr(p.type||'')}" onchange="updateProjectField(${p.id},'type',this.value)" placeholder="${t('type_ph')}">
          ${p.deadline ? `<div style="font-size:0.6rem;color:var(--muted);margin-top:4px;font-family:'DM Mono',monospace">${t('target_label')} ${escapeHtml(p.deadline)}</div>` : ''}
          ${linkedGoals > 0 ? `<div style="font-size:0.58rem;color:var(--gold-lt);font-family:'DM Mono',monospace;margin-top:3px;letter-spacing:0.06em">${linkedGoals} ${linkedGoals!==1?t('goals_linked'):t('goal_linked')}</div>` : ''}
        </div>
        <span class="spill s-${status.toLowerCase()}" onclick="cycleProjectStatus(${p.id})" title="Click to change">${escapeHtml(status)}</span>
      </div>

      <input class="editable prog-name-inp" value="${escapeAttr(p.context||'')}" onchange="updateProjectField(${p.id},'context',this.value)" placeholder="${t('context_ph')}" style="margin-bottom:6px;">

      <textarea class="editable-area prog-notes-inp" placeholder="${t('notes_next_steps')}" onchange="updateProjectField(${p.id},'notes',this.value)" rows="3" style="font-size:0.72rem;color:var(--muted);line-height:1.55;">${escapeHtml(p.notes||'')}</textarea>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:8px;">
        <input class="editable goal-dl-inp" type="date" value="${escapeAttr(p.deadline||'')}" onchange="updateProjectField(${p.id},'deadline',this.value)">
        <div style="display:flex;gap:6px">
          <button class="btn btn-g" style="font-size:0.68rem;padding:3px 9px" onclick="openProjectDetail(${p.id})">${t('open_detail')}</button>
          <button class="btn btn-d" style="font-size:0.68rem;padding:3px 9px" onclick="deleteProject(${p.id})">${t('remove')}</button>
        </div>
      </div>
    `;

    c.appendChild(div);
  });
}

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
    id: Date.now(),
    title,
    type: eid('pType').value.trim(),
    context: eid('pCtx').value.trim(),
    status: eid('pStat').value,
    deadline: eid('pDl').value,
    notes: eid('pNotes').value.trim()
  }));

  resetProjectModal();
  closeModal('mProject');
  scheduleSave();
  renderProjects();
  toast(t('project_added'));
}

function resetProjectModal() {
  eid('pTitle').value = '';
  eid('pType').value = '';
  eid('pCtx').value = '';
  eid('pStat').value = 'Active';
  eid('pDl').value = '';
  eid('pNotes').value = '';
}

/* ══ PROJECT DETAIL (life-session) ══ */
let _activeProjectId = null;

function openProjectDetail(id) {
  const p = ensureProjects().find(x => x.id === id);
  if (!p) return;
  _activeProjectId = id;

  eid('pdTitle').textContent = p.title || '';
  eid('pdStatus').textContent = p.status || 'Active';
  eid('pdNotes').value = p.richNotes || '';
  eid('pdNotesPreview').innerHTML = renderMd(p.richNotes || '');

  renderPdTasks(p);

  const linked = (S.goals || []).filter(g => String(g.projectId) === String(id));
  eid('pdLinkedGoals').innerHTML = linked.length
    ? linked.map(g => `<div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:0.8rem;color:var(--mist)">${escapeHtml(g.text||'')}</div>`).join('')
    : `<div style="font-size:0.72rem;color:var(--muted)">${t('no_linked_goals')}</div>`;

  openModal('mProjectDetail');
}

function renderPdTasks(p) {
  const tasks = p.tasks || [];
  eid('pdTasks').innerHTML = tasks.length
    ? tasks.map(tk => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
          <input type="checkbox" ${tk.done ? 'checked' : ''} onchange="toggleProjectTask(${p.id},${tk.id})">
          <span style="flex:1;font-size:0.8rem;color:var(--mist);${tk.done ? 'text-decoration:line-through;opacity:0.45' : ''}">${escapeHtml(tk.text||'')}</span>
          <button class="habit-del" style="opacity:0.4" onclick="deleteProjectTask(${p.id},${tk.id})">✕</button>
        </div>`).join('')
    : `<div style="font-size:0.72rem;color:var(--muted);padding:6px 0">${t('no_tasks')}</div>`;
}

function addProjectTask() {
  const text = (eid('pdNewTask').value || '').trim();
  if (!text || !_activeProjectId) return;
  const p = ensureProjects().find(x => x.id === _activeProjectId);
  if (!p) return;
  if (!Array.isArray(p.tasks)) p.tasks = [];
  p.tasks.push({ id: Date.now(), text, done: false });
  eid('pdNewTask').value = '';
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
}

function deleteProjectTask(id, taskId) {
  const p = ensureProjects().find(x => x.id === id);
  if (!p) return;
  p.tasks = (p.tasks || []).filter(t => t.id !== taskId);
  scheduleSave();
  renderPdTasks(p);
}

function previewProjectNotes() {
  const val = eid('pdNotes').value || '';
  eid('pdNotesPreview').innerHTML = renderMd(val);
  if (!_activeProjectId) return;
  const p = ensureProjects().find(x => x.id === _activeProjectId);
  if (p) { p.richNotes = val; scheduleSave(); }
}
