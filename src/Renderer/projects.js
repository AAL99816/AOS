'use strict';

/* ══ PROJECTS / AREAS ══ */
let projectF = 'all';

function ensureProjects() {
  if (!Array.isArray(S.projects)) S.projects = [];
  return S.projects;
}

function renderProjects() {
  const c = eid('projectsGrid');
  c.innerHTML = '';

  const projects = ensureProjects();

  const list = projectF === 'all'
    ? projects
    : projects.filter(p => (p.status || '') === projectF);

  if (!list.length) {
    c.innerHTML = `<div style="color:var(--muted);font-size:0.8rem">No projects here yet.</div>`;
    return;
  }

  list.forEach(p => {
    const title = p.school || '';
    const type = p.name || '';
    const context = p.location || '';
    const notes = p.notes || '';
    const deadline = p.deadline || '';
    const status = p.status || 'Wishlist';

    const div = document.createElement('div');
    div.className = 'card prog-card';

    div.innerHTML = `
      <div class="prog-top">
        <div style="flex:1">
          <input
            class="editable prog-school-inp"
            value="${escapeAttr(title)}"
            onchange="updateProjectField(${p.id}, 'school', this.value)"
            placeholder="Project title"
          >

          <input
            class="editable prog-name-inp"
            value="${escapeAttr(type)}"
            onchange="updateProjectField(${p.id}, 'name', this.value)"
            placeholder="Type"
          >

          ${
            context
              ? `<div style="font-size:0.62rem;color:var(--blush);margin-top:4px;font-family:'DM Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;">
                  ${escapeHtml(context)}
                 </div>`
              : ''
          }

          ${
            deadline
              ? `<div style="font-size:0.6rem;color:var(--muted);margin-top:4px;font-family:'DM Mono',monospace">
                  Target: ${escapeHtml(deadline)}
                 </div>`
              : ''
          }
        </div>

        <span class="spill s-${status.toLowerCase()}" onclick="cycleProjectStatus(${p.id})" title="Click to change">
          ${escapeHtml(status)}
        </span>
      </div>

      <input
        class="editable prog-name-inp"
        value="${escapeAttr(context)}"
        onchange="updateProjectField(${p.id}, 'location', this.value)"
        placeholder="Context"
        style="margin-bottom:6px;"
      >

      <textarea
        class="editable-area prog-notes-inp"
        placeholder="Notes, next steps, sub-focus..."
        onchange="updateProjectField(${p.id}, 'notes', this.value)"
        rows="3"
        style="font-size:0.72rem;color:var(--muted);line-height:1.55;"
      >${escapeHtml(notes)}</textarea>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:8px;">
        <input
          class="editable goal-dl-inp"
          type="date"
          value="${escapeAttr(deadline)}"
          onchange="updateProjectField(${p.id}, 'deadline', this.value)"
        >
        <button class="btn btn-d" style="font-size:0.68rem;padding:3px 9px" onclick="deleteProject(${p.id})">
          Remove
        </button>
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

  const pills = document.querySelectorAll('#projectFilters .fpill');
  pills.forEach(b => b.classList.remove('active'));

  if (btn) btn.classList.add('active');

  renderProjects();
}

function cycleProjectStatus(id) {
  const p = ensureProjects().find(x => x.id === id);
  if (!p) return;

  const statuses = ['Wishlist', 'Applied', 'Pending', 'Admitted', 'Rejected'];
  const current = statuses.indexOf(p.status);
  p.status = statuses[(current + 1) % statuses.length];

  scheduleSave();
  renderProjects();
  toast('Status updated');
}

function deleteProject(id) {
  if (!confirm('Remove this project?')) return;

  S.projects = ensureProjects().filter(x => x.id !== id);
  scheduleSave();
  renderProjects();
}

function saveProject() {
  const title = eid('pSchool').value.trim();
  if (!title) return;

  ensureProjects().push(makeProject({
    id: Date.now(),
    school: title,
    name: eid('pName').value.trim(),
    location: eid('pLoc').value.trim(),
    status: eid('pStat').value,
    deadline: eid('pDl').value,
    notes: eid('pNotes').value.trim()
  }));

  resetProjectModal();
  closeModal('mProject');
  scheduleSave();
  renderProjects();
  toast('Project added');
}

function resetProjectModal() {
  eid('pSchool').value = '';
  eid('pName').value = '';
  eid('pLoc').value = '';
  eid('pStat').value = 'Wishlist';
  eid('pDl').value = '';
  eid('pNotes').value = '';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch];
  });
}

function escapeAttr(str) {
  return escapeHtml(str);
}
