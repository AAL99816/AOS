'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// notes.js — Hierarchical note system
//
// S.notesTopics = [{ id, title, icon, linkedTab, linkedEntityId, linkedEntityType, notes:[...] }]
//
// Sidebar tree:
//   My Notes          ← manual user-created topics
//   ─────────
//   Media
//     Books
//       📖 Critique of Pure Reason
//     Films
//       🎬 Inception
//     Shows / Albums / Games …
//   Fitness
//     🏋️ Push Day
//   Projects
//     📋 My Project
// ─────────────────────────────────────────────────────────────────────────────

let _notesTopicId   = null;
let _notesNoteId    = null;
let _notesView      = 'topics'; // 'topics' | 'notelist' | 'editor'  (mobile)
let _notesSaveTimer = null;

// Which tree groups are expanded — open common sections by default
let _expandedGroups = new Set(['Manual', 'Media', 'Media/Books', 'Fitness', 'Projects']);

const ENTITY_ICONS = {
  workout: '🏋️',
  project: '📋',
  book:    '📖',
  film:    '🎬',
  show:    '📺',
  anime:   '📺',
  album:   '🎵',
  game:    '🎮',
};

// Defines the tree path for each entity type
const ENTITY_PATH = {
  book:    ['Media', 'Books'],
  film:    ['Media', 'Films'],
  show:    ['Media', 'Shows'],
  anime:   ['Media', 'Anime'],
  album:   ['Media', 'Albums'],
  game:    ['Media', 'Games'],
  workout: ['Fitness'],
  project: ['Projects'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function ensureNotes() {
  if (!Array.isArray(S.notesTopics)) S.notesTopics = [];
}

function getActiveTopic() {
  return (S.notesTopics || []).find(t => t.id === _notesTopicId) || null;
}

function getActiveNote() {
  const topic = getActiveTopic();
  if (!topic) return null;
  return (topic.notes || []).find(n => n.id === _notesNoteId) || null;
}

// ── Main render ───────────────────────────────────────────────────────────────
function renderNotes() {
  ensureNotes();
  renderNotesTopicList();
  renderNotesNoteList();
  renderNotesEditor();
  _applyNotesView();
}

function _applyNotesView() {
  const topicsEl   = eid('notesTopicList');
  const noteListEl = eid('notesNoteList');
  const editorEl   = eid('notesEditor');
  if (!topicsEl) return;
  const isMobile = window.innerWidth < 700;
  if (!isMobile) {
    topicsEl.style.display   = '';
    noteListEl.style.display = '';
    editorEl.style.display   = '';
    return;
  }
  topicsEl.style.display   = _notesView === 'topics'   ? '' : 'none';
  noteListEl.style.display = _notesView === 'notelist' ? '' : 'none';
  editorEl.style.display   = _notesView === 'editor'   ? '' : 'none';
}

// ── Tree builders ─────────────────────────────────────────────────────────────

// Build a nested object from linked topics, keyed by ENTITY_PATH segments.
// e.g. { Media: { _topics:[], Books: { _topics:[topic1,topic2] } }, Fitness: { _topics:[topic3] } }
function _buildTopicTree(linked) {
  const tree = {};
  linked.forEach(t => {
    const path = ENTITY_PATH[t.linkedEntityType] || ['Other'];
    let node = tree;
    for (let i = 0; i < path.length; i++) {
      const seg = path[i];
      if (!node[seg]) node[seg] = { _topics: [] };
      if (i === path.length - 1) {
        node[seg]._topics.push(t);
      } else {
        node = node[seg];
      }
    }
  });
  return tree;
}

function _countTopicsInNode(node) {
  let n = (node._topics || []).length;
  Object.keys(node).forEach(k => {
    if (k !== '_topics') n += _countTopicsInNode(node[k]);
  });
  return n;
}

// Render a single clickable topic leaf item
function _renderTopicLeaf(t, depth) {
  const active = t.id === _notesTopicId;
  const count  = (t.notes || []).length;
  const icon   = t.icon || ENTITY_ICONS[t.linkedEntityType] || '📝';
  const indent = 8 + depth * 14;
  return `<div onclick="notesSelectTopic('${t.id}')"
    style="display:flex;align-items:center;gap:6px;padding:6px 8px 6px ${indent}px;cursor:pointer;border-radius:7px;margin-bottom:2px;
      background:${active ? 'var(--mid)' : 'transparent'};
      border-left:2px solid ${active ? 'var(--blush)' : 'transparent'};
      transition:background 0.12s">
    <span style="font-size:0.82rem;flex-shrink:0">${icon}</span>
    <span style="font-size:0.78rem;color:${active ? 'var(--cream)' : 'var(--mist)'};flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.title)}</span>
    ${count ? `<span style="font-size:0.52rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${count}</span>` : ''}
  </div>`;
}

// Recursively render tree nodes (groups + their children)
function _renderTreeNode(node, depth, parentKey) {
  let html = '';
  const keys = Object.keys(node).filter(k => k !== '_topics').sort();
  keys.forEach(key => {
    const child   = node[key];
    const fullKey = parentKey ? parentKey + '/' + key : key;
    const expanded = _expandedGroups.has(fullKey);
    const total    = _countTopicsInNode(child);
    if (!total) return; // skip empty groups
    const indent = 4 + depth * 14;

    html += `<div>
      <div onclick="notesToggleGroup('${fullKey}')"
        style="display:flex;align-items:center;gap:5px;padding:5px 8px 5px ${indent}px;cursor:pointer;border-radius:6px;
          color:var(--muted-lt);font-size:0.72rem;font-family:'DM Mono',monospace;letter-spacing:0.04em;user-select:none;
          transition:background 0.1s" onmouseover="this.style.background='var(--mid)'" onmouseout="this.style.background=''">
        <span style="font-size:0.55rem;display:inline-block;transform:${expanded ? 'rotate(90deg)' : 'rotate(0)'};transition:transform 0.15s;flex-shrink:0">▶</span>
        <span style="flex:1">${escapeHtml(key)}</span>
        <span style="font-size:0.52rem;color:var(--muted)">${total}</span>
      </div>
      ${expanded ? `<div>
        ${(child._topics || []).map(t => _renderTopicLeaf(t, depth + 1)).join('')}
        ${_renderTreeNode(child, depth + 1, fullKey)}
      </div>` : ''}
    </div>`;
  });
  return html;
}

// ── Topic list (left sidebar) ─────────────────────────────────────────────────
function renderNotesTopicList() {
  const el = eid('notesTopicList');
  if (!el) return;

  const all    = S.notesTopics || [];
  const manual = all.filter(t => !t.linkedEntityId);
  const linked = all.filter(t =>  t.linkedEntityId);
  const tree   = _buildTopicTree(linked);

  const manualExpanded = _expandedGroups.has('Manual');

  el.innerHTML = `
    <div style="padding:0 4px;overflow-y:auto;height:100%">

      <!-- My Notes (manual topics) -->
      <div style="margin-bottom:2px">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;border-radius:6px">
          <div onclick="notesToggleGroup('Manual')"
            style="display:flex;align-items:center;gap:5px;cursor:pointer;flex:1;
              color:var(--muted-lt);font-size:0.72rem;font-family:'DM Mono',monospace;letter-spacing:0.04em;user-select:none">
            <span style="font-size:0.55rem;display:inline-block;transform:${manualExpanded ? 'rotate(90deg)' : 'rotate(0)'};transition:transform 0.15s">▶</span>
            <span>My Notes</span>
            ${manual.length ? `<span style="font-size:0.52rem;color:var(--muted);margin-left:2px">${manual.length}</span>` : ''}
          </div>
          <button onclick="notesAddTopic()" title="New topic"
            style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:1.2rem;line-height:1;padding:0 2px;flex-shrink:0">+</button>
        </div>
        ${manualExpanded ? `<div>
          ${manual.length
            ? manual.map(t => _renderTopicLeaf(t, 1)).join('')
            : `<div style="font-size:0.68rem;color:var(--muted);padding:6px 22px;line-height:1.6">No notes yet.<br>Tap + to create one.</div>`}
        </div>` : ''}
      </div>

      <!-- Linked entity tree -->
      ${linked.length ? `
        <div style="height:1px;background:var(--border);margin:8px 4px"></div>
        ${_renderTreeNode(tree, 0, '')}
      ` : ''}

    </div>
  `;
}

function notesToggleGroup(key) {
  if (_expandedGroups.has(key)) _expandedGroups.delete(key);
  else _expandedGroups.add(key);
  renderNotesTopicList();
}

// ── Note list (middle pane) ───────────────────────────────────────────────────
function renderNotesNoteList() {
  const el = eid('notesNoteList');
  if (!el) return;
  const topic    = getActiveTopic();
  const isMobile = window.innerWidth < 700;

  if (!topic) {
    el.innerHTML = `<div style="padding:40px 16px;text-align:center;color:var(--muted);font-size:0.76rem;line-height:1.8">Select a topic<br>to see its notes</div>`;
    return;
  }

  const notes = [...(topic.notes || [])].sort((a, b) =>
    (b.updatedAt || b.date || '').localeCompare(a.updatedAt || a.date || ''));

  el.innerHTML = `
    <div style="padding:0 4px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 8px">
        ${isMobile ? `<button onclick="_notesView='topics';_applyNotesView()"
          style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:0.7rem;padding:0;font-family:'DM Mono',monospace">‹ Topics</button>` : ''}
        <span style="font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted-lt);
          font-family:'DM Mono',monospace;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${topic.icon ? escapeHtml(topic.icon) + ' ' : ''}${escapeHtml(topic.title)}
        </span>
        <button onclick="notesAddNote('${topic.id}')" title="New note"
          style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:1.2rem;line-height:1;padding:0 4px;flex-shrink:0">+</button>
      </div>
      ${notes.length ? notes.map(n => {
        const active  = n.id === _notesNoteId;
        const preview = (n.body || '').replace(/\n/g, ' ').slice(0, 80);
        const dateStr = (n.updatedAt || n.date || '').slice(0, 10);
        return `<div onclick="notesSelectNote('${n.id}')"
          style="padding:9px 12px;cursor:pointer;border-radius:8px;margin-bottom:3px;
            background:${active ? 'var(--mid)' : 'transparent'};
            border-left:2px solid ${active ? 'var(--blush)' : 'transparent'};
            transition:background 0.12s">
          <div style="display:flex;align-items:baseline;justify-content:space-between;gap:6px;margin-bottom:2px">
            <span style="font-size:0.8rem;color:${active ? 'var(--cream)' : 'var(--mist)'};
              font-weight:${active ? '500' : '400'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${escapeHtml(n.title || 'Untitled')}
            </span>
            <span style="font-size:0.52rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${escapeHtml(dateStr)}</span>
          </div>
          ${preview ? `<div style="font-size:0.65rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(preview)}</div>` : ''}
        </div>`;
      }).join('') : `<div style="padding:24px 8px;text-align:center;font-size:0.72rem;color:var(--muted)">No notes yet — tap + to write one</div>`}
    </div>
  `;
}

// ── Note editor (right pane) ──────────────────────────────────────────────────
function renderNotesEditor() {
  const el = eid('notesEditor');
  if (!el) return;
  const note     = getActiveNote();
  const topic    = getActiveTopic();
  const isMobile = window.innerWidth < 700;

  if (!note) {
    el.innerHTML = `<div style="padding:60px 24px;text-align:center;color:var(--muted);font-size:0.76rem;line-height:1.8">
      ${topic ? 'Select a note or tap + to write a new one' : 'Select a topic to get started'}
    </div>`;
    return;
  }

  // Breadcrumb for entity-linked topics (e.g.  Notes › Media › Books › Critique of Pure Reason)
  let breadcrumb = '';
  if (topic?.linkedEntityType) {
    const path   = ENTITY_PATH[topic.linkedEntityType] || [];
    const crumbs = ['Notes', ...path, topic.title];
    breadcrumb = `
      <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;
        margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.03em">
        ${crumbs.map(escapeHtml).join(' › ')}
      </div>`;
  }

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">

      <!-- Toolbar -->
      <div style="display:flex;align-items:center;gap:8px;padding:0 0 10px;border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        ${isMobile ? `<button onclick="_notesView='notelist';_applyNotesView()"
          style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:0.7rem;padding:0;font-family:'DM Mono',monospace">‹ Back</button>` : ''}
        <input id="noteTitleInp" value="${escapeAttr(note.title)}"
          placeholder="Note title…"
          oninput="notesUpdateTitle(this.value)"
          style="flex:1;background:none;border:none;color:var(--cream);font-size:0.96rem;
            font-family:'Jost',sans-serif;padding:0;outline:none;min-width:100px">
        <button onclick="notesDeleteNote('${note.id}')" title="Delete note"
          style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.7rem;
            padding:0 4px;font-family:'DM Mono',monospace">Delete</button>
      </div>

      ${breadcrumb}

      <!-- Body -->
      <textarea id="noteBodyInp"
        placeholder="Write anything…"
        oninput="notesUpdateBody(this.value)"
        style="flex:1;background:none;border:none;color:var(--muted-lt);font-size:0.84rem;
          line-height:1.75;resize:none;outline:none;padding:12px 0;
          font-family:'Jost',sans-serif;width:100%;box-sizing:border-box">${escapeHtml(note.body || '')}</textarea>

      <!-- Footer -->
      <div style="font-size:0.56rem;color:var(--muted);font-family:'DM Mono',monospace;
        padding-top:8px;border-top:1px solid var(--border-lt);flex-shrink:0">
        ${(note.body||'').split(/\s+/).filter(Boolean).length} words · updated ${escapeHtml((note.updatedAt || note.date || '').slice(0,10))}
      </div>
    </div>
  `;
}

// ── Topic actions ─────────────────────────────────────────────────────────────
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
  setTimeout(() => { const b = eid('noteBodyInp'); if (b) b.focus(); }, 50);
}

function notesAddTopic() {
  ensureNotes();
  const title = (prompt('Topic name:') || '').trim();
  if (!title) return;
  const icon  = (prompt('Icon (emoji, optional):') || '').trim();
  const newTopic = makeTopic({ title, icon: icon || '' });
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
  const topic = (S.notesTopics || []).find(t => t.id === id);
  if (!topic) return;
  const msg = topic.linkedEntityId
    ? `Delete notes linked to "${topic.title}"?`
    : 'Delete this topic and all its notes?';
  if (!confirm(msg)) return;
  S.notesTopics = S.notesTopics.filter(t => t.id !== id);
  if (_notesTopicId === id) { _notesTopicId = null; _notesNoteId = null; _notesView = 'topics'; }
  scheduleSave();
  renderNotes();
}

// ── Note actions ──────────────────────────────────────────────────────────────
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
  // Live word count update
  const footer = eid('notesEditor')?.querySelector('div:last-child');
  if (footer) {
    footer.textContent = `${val.split(/\s+/).filter(Boolean).length} words · updated ${today()}`;
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

// ── Entity note entry point (called from 📝 buttons on other tabs) ────────────
// entityType: 'workout' | 'project' | 'book' | 'film' | 'show' | 'album' | 'game'
// entityId:   the entity's id
// entityTitle: display name (JSON.stringify string, decoded here)
function openEntityNote(entityType, entityId, entityTitle) {
  ensureNotes();

  // entityTitle arrives as a JSON string (e.g. "\"Critique of Pure Reason\"")
  let title = entityTitle;
  try { title = JSON.parse(entityTitle); } catch(_) {}
  title = String(title || entityType);

  // Find existing topic or create one
  let topic = S.notesTopics.find(t => t.linkedEntityId === entityId);
  if (!topic) {
    topic = makeTopic({
      title,
      icon: ENTITY_ICONS[entityType] || '📝',
      linkedEntityType: entityType,
      linkedEntityId:   entityId,
      linkedTab:
        entityType === 'workout'                                          ? 'fitness'
        : entityType === 'project'                                        ? 'projects'
        : ['book','film','show','anime','album','game'].includes(entityType) ? 'media'
        : '',
    });
    S.notesTopics.push(topic);
    scheduleSave();
  }

  // Auto-create first note if empty
  if (!Array.isArray(topic.notes)) topic.notes = [];
  if (topic.notes.length === 0) {
    const n = makeNote({ title: 'Notes', body: '' });
    topic.notes.push(n);
    _notesNoteId = n.id;
    scheduleSave();
  } else {
    const sorted = [...topic.notes].sort((a, b) =>
      (b.updatedAt || b.date || '').localeCompare(a.updatedAt || a.date || ''));
    _notesNoteId = sorted[0].id;
  }

  _notesTopicId = topic.id;
  _notesView    = 'editor';

  // Ensure the relevant tree path is expanded so the user can see it in the sidebar
  const path = ENTITY_PATH[entityType] || [];
  let key = '';
  path.forEach(seg => {
    key = key ? key + '/' + seg : seg;
    _expandedGroups.add(key);
  });

  // Navigate to Notes tab
  const notesBtn = document.querySelector(".tab[onclick*=\"go('notes')\"]");
  go('notes', notesBtn);
}

// ── Quick jump from tab-level notes buttons ───────────────────────────────────
function openNotesForTab(tabName) {
  const notesBtn = document.querySelector(".tab[onclick*=\"go('notes')\"]");
  go('notes', notesBtn);
  const linked = (S.notesTopics || []).find(t => t.linkedTab === tabName && !t.linkedEntityId);
  if (linked) notesSelectTopic(linked.id);
}
