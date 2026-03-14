'use strict';

/* ══ GOALS / AREAS ══ */

function renderGoals() {
  const c = eid('goalsGrid');
  c.innerHTML = '';

  if (!Array.isArray(S.goals)) S.goals = [];

  const grouped = {};
  S.goals.forEach(g => {
    const cat = (g.category || 'Unsorted').trim() || 'Unsorted';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(g);
  });

  const cats = Object.keys(grouped);

  if (!cats.length) {
    c.innerHTML = `<div style="grid-column:span 2;text-align:center;padding:48px 24px"><div style="font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--border-lt);margin-bottom:10px">◆</div><div style="font-size:0.66rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace">No goals yet</div></div>`;
    return;
  }

  cats.forEach(cat => {
    const col = document.createElement('div');
    col.className = 'goal-cat';

    col.innerHTML = `<h3>${escapeHtml(cat)}</h3>`;

    grouped[cat].forEach(g => {
      const pct = clampPct(g.progress);
      const statusClass = pct >= 100 ? 'done' : pct > 0 ? 'inprog' : '';
      const dateText = g.deadline || '';

      const card = document.createElement('div');
      card.className = 'goal-item';

      card.innerHTML = `
        <button class="goal-del" onclick="delGoal(${g.id})">✕</button>

        <div class="goal-head">
          <div class="goal-circle ${statusClass}" onclick="nudgeGoal(${g.id})" title="Advance progress">
            ${pct >= 100 ? '✓' : ''}
          </div>
          <input
            class="editable goal-txt-inp"
            value="${escapeAttr(g.text || '')}"
            onchange="updateGoalField(${g.id}, 'text', this.value)"
            title="Edit title"
          >
        </div>

        <div style="display:flex;gap:6px;margin-bottom:4px">
          <input class="editable" style="font-size:0.62rem;color:var(--blush);font-family:'DM Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;width:50%" value="${escapeAttr(g.type||'')}" placeholder="type" onchange="updateGoalField(${g.id},'type',this.value)">
          <input class="editable" style="font-size:0.62rem;color:var(--blush);font-family:'DM Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;width:50%" value="${escapeAttr(g.context||'')}" placeholder="context" onchange="updateGoalField(${g.id},'context',this.value)">
        </div>

        ${
          g.notes
            ? `<div style="font-size:0.72rem;color:var(--muted);margin-bottom:7px;line-height:1.55;">
                ${escapeHtml(g.notes)}
               </div>`
            : ''
        }

        <div class="goal-bar">
          <div class="goal-fill" style="width:${pct}%"></div>
        </div>

        <div class="goal-footer">
          <input
            class="editable goal-dl-inp"
            type="date"
            value="${escapeAttr(dateText)}"
            onchange="updateGoalField(${g.id}, 'deadline', this.value)"
          >
          <input
            class="goal-pct-inp"
            type="number"
            min="0"
            max="100"
            value="${pct}"
            onchange="setGoalPct(${g.id}, this.value)"
            title="Edit progress"
          >
        </div>
      `;

      col.appendChild(card);
    });

    const add = document.createElement('button');
    add.className = 'btn-dash';
    add.textContent = `+ ${cat}`;
    add.onclick = () => {
      eid('gCat').value = cat;
      openModal('mGoal');
    };

    col.appendChild(add);
    c.appendChild(col);
  });
}

function updateGoalField(id, field, value) {
  const g = S.goals.find(x => x.id === id);
  if (!g) return;

  g[field] = value;
  scheduleSave();

  if (field === 'notes' || field === 'type' || field === 'context' || field === 'category') {
    renderGoals();
  }
}

function nudgeGoal(id) {
  const g = S.goals.find(x => x.id === id);
  if (!g) return;

  const steps = [0, 25, 50, 75, 100];
  const snapped = steps.reduce((best, cur) => {
    return Math.abs(cur - clampPct(g.progress)) < Math.abs(best - clampPct(g.progress)) ? cur : best;
  }, 0);

  const idx = steps.indexOf(snapped);
  g.progress = steps[(idx + 1) % steps.length];

  scheduleSave();
  renderGoals();
}

function setGoalPct(id, value) {
  const g = S.goals.find(x => x.id === id);
  if (!g) return;

  g.progress = clampPct(value);
  scheduleSave();
  renderGoals();
}

function delGoal(id) {
  if (!confirm('Delete this project/goal?')) return;

  S.goals = S.goals.filter(x => x.id !== id);
  scheduleSave();
  renderGoals();
}

function saveGoal() {
  const text = eid('gText').value.trim();
  if (!text) return;

  if (!Array.isArray(S.goals)) S.goals = [];

  S.goals.push(makeGoal({
    id: Date.now(),
    text,
    category: eid('gCat').value.trim() || 'Unsorted',
    type: eid('gType').value.trim(),
    context: eid('gCtx').value.trim(),
    deadline: eid('gDl').value,
    progress: clampPct(eid('gPct').value),
    notes: eid('gNotes').value.trim()
  }));

  resetGoalModal();
  closeModal('mGoal');
  scheduleSave();
  renderGoals();
  toast('Goal added');
}

function resetGoalModal() {
  eid('gText').value = '';
  eid('gCat').value = 'Academic';
  eid('gType').value = '';
  eid('gCtx').value = '';
  eid('gDl').value = '';
  eid('gPct').value = 0;
  eid('gPLbl').textContent = '0';
  eid('gNotes').value = '';
}

function clampPct(v) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

