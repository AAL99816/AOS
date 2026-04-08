'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// notes.js — Topic-based note system
//
// Structure:
//   S.notesTopics = [
//     { id, title, icon, linkedTab, notes: [{ id, title, body, date, updatedAt }] }
//   ]
//
// UI:
//   panel-notes splits into:
//     #notesTopicList  — left sidebar (topic list)
//     #notesNoteList   — middle (notes in selected topic)
//     #notesEditor     — right (active note editor)
//   On mobile all three stack and slide with _notesView state.
// ─────────────────────────────────────────────────────────────────────────────

let _notesTopicId = null;  // currently selected topic id
let _notesNoteId  = null;  // currently selected note id
let _notesView    = 'topics'; // 'topics' | 'notelist' | 'editor'  (mobile nav state)
let _notesSaveTimer = null;

const LINKED_TAB_LABELS = {
  fitness:  '🏋️ Fitness',
  food:     '🥗 Food',
  projects: '📋 Projects',
  media:    '📚 Media',
  focus:    '🎯 Focus',
  today:    '📅 Today',
  review:   '🔄 Review',
};

function ensureNotes() {
  if (!Array.isArray(S.notesTopics)) S.notesTopics = [];
}

// ── Getters ──────────────────────────────────────────────────────────────────
function getActiveTopic() {
  return (S.notesTopics || []).find(t => t.id === _notesTopicId) || null;
}

function getActiveNote() {
  const topic = getActiveTopic();
  if (!topic) return null;
  return (topic.notes || []).find(n => n.id === _notesNoteId) || null;
}

// ── Main render ──────────────────────────────────────────────────────────────
function renderNotes() {
  ensureNotes();
  renderNotesTopicList();
  renderNotesNoteList();
  renderNotesEditor();
  _applyNotesView();
}

function _applyNotesView() {
  const topicsEl  = eid('notesTopicList');
  const noteListEl = eid('notesNoteList');
  const editorEl  = eid('notesEditor');
  if (!topicsEl) return;

  const isMobile = window.innerWidth < 700;
  if (!isMobile) {
    // Desktop: always show all three panes
    topicsEl.style.display  = '';
    noteListEl.style.display = '';
    editorEl.style.display  = '';
    return;
  }
  // Mobile: show one pane at a time
  topicsEl.style.display   = _notesView === 'topics'   ? '' : 'none';
  noteListEl.style.display = _notesView === 'notelist' ? '' : 'none';
  editorEl.style.display   = _notesView === 'editor'   ? '' : 'none';
}

// ── Topic list ───────────────────────────────────────────────────────────────
function renderNotesTopicList() {
  const el = eid('notesTopicList');
  if (!el) return;
  const topics = S.notesTopics || [];

  const rows = topics.map(t => {
    const active = t.id === _notesTopicId;
    const linkLabel = t.linkedTab ? LINKED_TAB_LABELS[t.linkedTab] || t.linkedTab : '';
    const count = (t.notes || []).length;
    return `<div onclick="notesSelectTopic('${t.id}')"
      style="padding:10px 12px;cursor:pointer;border-radius:8px;margin-bottom:3px;
        background:${active ? 'var(--mid)' : 'transparent'};
        border-left:3px solid ${active ? 'var(--blush)' : 'transparent'};
        transition:background 0.12s">
      <div style="display:flex;align-items:center;gap:6px">
        ${t.icon ? `<span style="font-size:1rem;flex-shrink:0">${escapeHtml(t.icon)}</span>` : ''}
        <span style="font-size:0.84rem;color:${active ? 'var(--cream)' : 'var(--mist)'};flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.title)}</span>
        <span style="font-size:0.56rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${count}</span>
      </div>
      ${linkLabel ? `<div style="font-size:0.58rem;color:var(--blush);margin-top:2px;margin-left:${t.icon ? '22px' : '0'}">${escapeHtml(linkLabel)}</div>` : ''}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="padding:0 4px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 8px">
        <div style="font-size:0.56rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace">Topics</div>
        <button onclick="notesAddTopic()" style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:1.1rem;line-height:1;padding:0 4px" title="New topic">+</button>
      </div>
      ${rows || `<div style="font-size:0.72rem;color:var(--muted);padding:20px 8px;text-align:center;line-height:1.7">No topics yet.<br>Tap + to create one.</div>`}
    </div>
  `;
}

// ── Note list ────────────────────────────────────────────────────────────────
function renderNotesNoteList() {
  const el = eid('notesNoteList');
  if (!el) return;
  const topic = getActiveTopic();

  if (!topic) {
    el.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--muted);font-size:0.76rem">Select a topic to see notes</div>`;
    return;
  }

  const notes = [...(topic.notes || [])].sort((a, b) => (b.updatedAt || b.date || '').localeCompare(a.updatedAt || a.date || ''));
  const isMobile = window.innerWidth < 700;

  el.innerHTML = `
    <div style="padding:0 4px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 8px">
        ${isMobile ? `<button onclick="_notesView='topics';_applyNotesView()" style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:0.7rem;padding:0;font-family:'DM Mono',monospace">‹ Topics</button>` : ''}
        <span style="font-size:0.56rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace;flex:1;padding:0 8px">${escapeHtml(topic.icon ? topic.icon + ' ' : '')}${escapeHtml(topic.title)}</span>
        <button onclick="notesAddNote('${topic.id}')" style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:1.1rem;line-height:1;padding:0 4px" title="New note">+</button>
      </div>
      ${notes.length ? notes.map(n => {
        const active = n.id === _notesNoteId;
        const preview = (n.body || '').replace(/\n/g, ' ').slice(0, 80);
        const dateStr = (n.updatedAt || n.date || '').slice(0, 10);
        return `<div onclick="notesSelectNote('${n.id}')"
          style="padding:10px 12px;cursor:pointer;border-radius:8px;margin-bottom:3px;
            background:${active ? 'var(--mid)' : 'transparent'};
            border-left:3px solid ${active ? 'var(--blush)' : 'transparent'};
            transition:background 0.12s">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px;margin-bottom:3px">
            <span style="font-size:0.8rem;color:${active ? 'var(--cream)' : 'var(--mist)'};font-weight:${active ? '500' : '400'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(n.title || 'Untitled')}</span>
            <span style="font-size:0.54rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${escapeHtml(dateStr)}</span>
          </div>
          ${preview ? `<div style="font-size:0.66rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(preview)}</div>` : ''}
        </div>`;
      }).join('') : `<div style="padding:24px 8px;text-align:center;font-size:0.72rem;color:var(--muted)">No notes — tap + to write one</div>`}
    </div>
  `;
}

// ── Note editor ───────────────────────────────────────────────────────────────
function renderNotesEditor() {
  const el = eid('notesEditor');
  if (!el) return;
  const note  = getActiveNote();
  const topic = getActiveTopic();
  const isMobile = window.innerWidth < 700;

  if (!note) {
    el.innerHTML = `<div style="padding:60px 24px;text-align:center;color:var(--muted);font-size:0.76rem;line-height:1.8">
      ${topic ? 'Select a note or tap + to write a new one' : 'Select a topic to get started'}
    </div>`;
    return;
  }

  const linkedTab = topic && topic.linkedTab;

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <!-- Editor toolbar -->
      <div style="display:flex;align-items:center;gap:8px;padding:0 0 12px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        ${isMobile ? `<button onclick="_notesView='notelist';_applyNotesView()" style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:0.7rem;padding:0;font-family:'DM Mono',monospace">‹ Back</button>` : ''}
        <input id="noteTitleInp" value="${escapeAttr(note.title)}"
          placeholder="Note title…"
          oninput="notesUpdateTitle(this.value)"
          style="flex:1;background:none;border:none;color:var(--cream);font-size:0.96rem;font-family:'Jost',sans-serif;padding:0;outline:none;min-width:100px">
        ${linkedTab ? `<a onclick="go('${escapeAttr(linkedTab)}')" style="font-size:0.6rem;color:var(--blush);cursor:pointer;font-family:'DM Mono',monospace;border:1px solid var(--border);border-radius:5px;padding:2px 8px;white-space:nowrap">${escapeHtml(LINKED_TAB_LABELS[linkedTab] || linkedTab)} ↗</a>` : ''}
        <button onclick="notesDeleteNote('${note.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.7rem;padding:0 4px;font-family:'DM Mono',monospace" title="Delete note">Delete</button>
      </div>
      <!-- Body -->
      <textarea id="noteBodyInp"
        placeholder="Write anything…"
        oninput="notesUpdateBody(this.value)"
        style="flex:1;background:none;border:none;color:var(--muted-lt);font-size:0.84rem;line-height:1.75;resize:none;outline:none;padding:14px 0;font-family:'Jost',sans-serif;width:100%;box-sizing:border-box">${escapeHtml(note.body || '')}</textarea>
      <!-- Footer -->
      <div style="font-size:0.56rem;color:var(--muted);font-family:'DM Mono',monospace;padding-top:8px;border-top:1px solid var(--border-lt);flex-shrink:0">
        ${(note.body||'').split(/\s+/).filter(Boolean).length} words · last updated ${escapeHtml((note.updatedAt || note.date || '').slice(0,10))}
      </div>
    </div>
  `;
}

// ── Actions ───────────────────────────────────────────────────────────────────
function notesSelectTopic(id) {
  _notesTopicId = id;
  _notesNoteId  = null;
  _notesView    = 'notelist';
  renderNotesTopicList();
  renderNotesNoteList();
  renderNotesEditor();
  _applyNotesView();
}

function notesSelectNote(id) {
  _notesNoteId = id;
  _notesView   = 'editor';
  renderNotesNoteList();
  renderNotesEditor();
  _applyNotesView();
  // Focus body
  setTimeout(() => { const b = eid('noteBodyInp'); if (b) b.focus(); }, 50);
}

function notesAddTopic() {
  ensureNotes();
  const title = (prompt('Topic name:') || '').trim();
  if (!title) return;
  const icon  = (prompt('Icon (emoji, optional — press Cancel to skip):') || '').trim();
  const tabs  = Object.keys(LINKED_TAB_LABELS);
  const linkChoice = (prompt(`Link to tab? Type one of: ${tabs.join(', ')}\n(or press Cancel to skip)`) || '').trim().toLowerCase();
  const linkedTab = linkChoice && tabs.includes(linkChoice) ? linkChoice : '';

  const newTopic = makeTopic({ title, icon: icon || '', linkedTab });
  S.notesTopics.push(newTopic);
  scheduleSave();
  _notesTopicId = newTopic.id;
  _notesNoteId  = null;
  _notesView    = 'notelist';
  renderNotes();
}

function notesEditTopicMeta(id) {
  const topic = (S.notesTopics || []).find(t => t.id === id);
  if (!topic) return;
  const newTitle = (prompt('Topic name:', topic.title) || '').trim();
  if (newTitle) topic.title = newTitle;
  const newIcon = prompt('Icon (emoji):', topic.icon || '');
  if (newIcon !== null) topic.icon = newIcon.trim();
  scheduleSave();
  renderNotesTopicList();
}

function notesDeleteTopic(id) {
  if (!confirm('Delete this topic and all its notes?')) return;
  S.notesTopics = (S.notesTopics || []).filter(t => t.id !== id);
  if (_notesTopicId === id) { _notesTopicId = null; _notesNoteId = null; _notesView = 'topics'; }
  scheduleSave();
  renderNotes();
}

function notesAddNote(topicId) {
  const topic = (S.notesTopics || []).find(t => t.id === topicId);
  if (!topic) return;
  if (!Array.isArray(topic.notes)) topic.notes = [];
  const n = makeNote({ title: '', body: '' });
  topic.notes.unshift(n);
  _notesNoteId = n.id;
  _notesView   = 'editor';
  scheduleSave();
  renderNotes();
  setTimeout(() => { const inp = eid('noteTitleInp'); if (inp) inp.focus(); }, 60);
}

function notesUpdateTitle(val) {
  const note = getActiveNote();
  if (!note) return;
  note.title     = val;
  note.updatedAt = today();
  _scheduleNotesSave();
}

function notesUpdateBody(val) {
  const note = getActiveNote();
  if (!note) return;
  note.body      = val;
  note.updatedAt = today();
  _scheduleNotesSave();
  // Update word count live
  const footer = eid('notesEditor')?.querySelector('div:last-child');
  if (footer) {
    const wc = val.split(/\s+/).filter(Boolean).length;
    footer.textContent = `${wc} words · last updated ${today()}`;
  }
}

function _scheduleNotesSave() {
  clearTimeout(_notesSaveTimer);
  _notesSaveTimer = setTimeout(() => scheduleSave(), 800);
}

function notesDeleteNote(id) {
  const topic = getActiveTopic();
  if (!topic) return;
  if (!confirm('Delete this note?')) return;
  topic.notes = (topic.notes || []).filter(n => n.id !== id);
  _notesNoteId = null;
  _notesView   = 'notelist';
  scheduleSave();
  renderNotes();
}

// ── Convenience: open notes tab on a specific linked tab ─────────────────────
function openNotesForTab(tabName) {
  go('notes', document.querySelector(".tab[onclick*=\"go('notes'\"]"));
  // Find the first topic linked to this tab
  const linked = (S.notesTopics || []).find(t => t.linkedTab === tabName);
  if (linked) notesSelectTopic(linked.id);
}
