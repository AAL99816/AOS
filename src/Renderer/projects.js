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
          <input class="editable prog-school-inp" value="${escapeAttr(p.title||'')}" onchange="updateProjectField(${p.id},'title',this.value)" placeholder="Project title">
          <input class="editable prog-name-inp" value="${escapeAttr(p.type||'')}" onchange="updateProjectField(${p.id},'type',this.value)" placeholder="Type">
          ${p.deadline ? `<div style="font-size:0.6rem;color:var(--muted);margin-top:4px;font-family:'DM Mono',monospace">Target: ${escapeHtml(p.deadline)}</div>` : ''}
          ${linkedGoals > 0 ? `<div style="font-size:0.58rem;color:var(--gold-lt);font-family:'DM Mono',monospace;margin-top:3px;letter-spacing:0.06em">${linkedGoals} ${linkedGoals!==1?t('goals_linked'):t('goal_linked')}</div>` : ''}
        </div>
        <span class="spill s-${status.toLowerCase()}" onclick="cycleProjectStatus(${p.id})" title="Click to change">${escapeHtml(status)}</span>
      </div>

      <input class="editable prog-name-inp" value="${escapeAttr(p.context||'')}" onchange="updateProjectField(${p.id},'context',this.value)" placeholder="Context" style="margin-bottom:6px;">

      <textarea class="editable-area prog-notes-inp" placeholder="Notes, next steps, sub-focus..." onchange="updateProjectField(${p.id},'notes',this.value)" rows="3" style="font-size:0.72rem;color:var(--muted);line-height:1.55;">${escapeHtml(p.notes||'')}</textarea>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:8px;">
        <input class="editable goal-dl-inp" type="date" value="${escapeAttr(p.deadline||'')}" onchange="updateProjectField(${p.id},'deadline',this.value)">
        <button class="btn btn-d" style="font-size:0.68rem;padding:3px 9px" onclick="deleteProject(${p.id})">${t('remove')}</button>
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
