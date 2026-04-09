'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// notes.js — Hierarchical note system
//
// Sidebar tree (example):
//   MY NOTES  [+]
//     My Topic
//   ─────────────────────
//   🏋️ Fitness
//     🏋️ Push Day          ← entity topic from 📝 button
//   📋 Projects
//     📋 My App
//   📚 Media
//     📖 Books
//       📖 Critique of Pure Reason
//     🎬 Films
//       🎬 Inception
// ─────────────────────────────────────────────────────────────────────────────

let _notesTopicId   = null;
let _notesNoteId    = null;
let _notesView      = 'topics'; // 'topics' | 'notelist' | 'editor'  (mobile)
let _notesSaveTimer = null;

// Groups open by default
let _expandedGroups = new Set(['__manual', '__tab__fitness', '__tab__projects', '__tab__media']);

// ── Constants ─────────────────────────────────────────────────────────────────
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

// All tabs that can have notes sections (in display order)
const TAB_PRESETS = [
  { tab: 'today',    label: 'Today',    icon: '📅', modId: null         },
  { tab: 'fitness',  label: 'Fitness',  icon: '🏋️', modId: 'tab.fitness'  },
  { tab: 'food',     label: 'Food',     icon: '🥗', modId: 'tab.food'     },
  { tab: 'projects', label: 'Projects', icon: '📋', modId: 'tab.projects' },
  { tab: 'media',    label: 'Media',    icon: '📚', modId: 'tab.media'    },
  { tab: 'focus',    label: 'Focus',    icon: '🎯', modId: 'tab.focus'    },
  { tab: 'review',   label: 'Review',   icon: '🔄', modId: null           },
];

// Media entity sub-types (order matters for display)
const MEDIA_SUBTYPES = [
  { key: 'book',  label: 'Books',  icon: '📖' },
  { key: 'film',  label: 'Films',  icon: '🎬' },
  { key: 'show',  label: 'Shows',  icon: '📺' },
  { key: 'anime', label: 'Anime',  icon: '📺' },
  { key: 'album', label: 'Albums', icon: '🎵' },
  { key: 'game',  label: 'Games',  icon: '🎮' },
];

// ── State helpers ─────────────────────────────────────────────────────────────
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

// Which tab does an entity type belong to?
function _entityTab(entityType) {
  if (['book', 'film', 'show', 'anime', 'album', 'game'].includes(entityType)) return 'media';
  if (entityType === 'workout') return 'fitness';
  if (entityType === 'project') return 'projects';
  return null;
}

// Is a tab currently enabled (on by default, or not disabled via modules)?
function _isTabEnabled(modId) {
  if (!modId) return true; // no module gate = always on
  if (typeof modOn === 'function') return modOn(modId);
  return true;
}

// Ensure one general tab-linked topic exists per enabled tab
function _ensureTabTopics() {
  let changed = false;
  TAB_PRESETS.forEach(({ tab, label, icon, modId }) => {
    if (!_isTabEnabled(modId)) return;
    const exists = S.notesTopics.find(t => t.linkedTab === tab && !t.linkedEntityId);
    if (!exists) {
      S.notesTopics.push(makeTopic({ title: label, icon, linkedTab: tab }));
      changed = true;
    }
  });
  if (changed) scheduleSave();
}

// ── Main render ───────────────────────────────────────────────────────────────
function renderNotes() {
  ensureNotes();
  _ensureTabTopics();
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
    topicsEl.style.display = noteListEl.style.display = editorEl.style.display = '';
    return;
  }
  topicsEl.style.display   = _notesView === 'topics'   ? '' : 'none';
  noteListEl.style.display = _notesView === 'notelist' ? '' : 'none';
  editorEl.style.display   = _notesView === 'editor'   ? '' : 'none';
}

// ── Sidebar building blocks ───────────────────────────────────────────────────

// A clickable leaf row for a topic
function _renderLeaf(t, depth) {
  const active = t.id === _notesTopicId;
  const count  = (t.notes || []).length;
  const icon   = t.icon || ENTITY_ICONS[t.linkedEntityType] || '📝';
  const pad    = 10 + depth * 14;
  return `<div onclick="notesSelectTopic('${t.id}')"
    style="display:flex;align-items:center;gap:7px;
      padding:6px 8px 6px ${pad}px;cursor:pointer;border-radius:7px;margin-bottom:1px;
      background:${active ? 'var(--mid)' : 'transparent'};
      border-left:2px solid ${active ? 'var(--blush)' : 'transparent'};
      transition:background 0.12s">
    <span style="font-size:0.85rem;flex-shrink:0">${icon}</span>
    <span style="font-size:0.78rem;color:${active ? 'var(--cream)' : 'var(--mist)'};
      flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.title)}</span>
    ${count ? `<span style="font-size:0.52rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${count}</span>` : ''}
  </div>`;
}

// A collapsible group header (arrow + icon + label + count)
function _renderGroupHeader({ key, icon, label, count, depth, selectId, selectLabel }) {
  const exp = _expandedGroups.has(key);
  const pad  = 4 + depth * 14;
  return `<div style="display:flex;align-items:center;gap:5px;padding:6px 8px 6px ${pad}px;border-radius:7px;
      cursor:pointer;user-select:none;color:var(--mist);transition:background 0.12s"
    onclick="notesToggleGroup('${key}')"
    onmouseover="this.style.background='rgba(255,255,255,0.03)'"
    onmouseout="this.style.background=''">
    <span style="font-size:0.5rem;display:inline-block;flex-shrink:0;color:var(--muted);
      transition:transform 0.15s;transform:${exp ? 'rotate(90deg)' : 'rotate(0deg)'}">▶</span>
    <span style="font-size:0.88rem;flex-shrink:0">${icon}</span>
    <span style="font-size:0.8rem;font-weight:500;flex:1">${escapeHtml(label)}</span>
    ${count ? `<span style="font-size:0.52rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${count}</span>` : ''}
    ${selectId ? `<button onclick="event.stopPropagation();notesSelectTopic('${selectId}')"
      title="${escapeAttr(selectLabel || 'General notes')}"
      style="background:none;border:none;color:var(--muted);cursor:pointer;
        font-size:0.62rem;padding:1px 5px;line-height:1.4;border-radius:4px;
        font-family:'DM Mono',monospace;flex-shrink:0;
        border:1px solid var(--border)">notes</button>` : ''}
  </div>`;
}

// ── Topic list (left sidebar) ─────────────────────────────────────────────────
function renderNotesTopicList() {
  const el = eid('notesTopicList');
  if (!el) return;

  const all    = S.notesTopics || [];
  const manual = all.filter(t => !t.linkedTab && !t.linkedEntityId);
  const manualExp = _expandedGroups.has('__manual');

  let html = `<div style="padding:0 4px;height:100%;overflow-y:auto;box-sizing:border-box">`;

  // ── MY NOTES ─────────────────────────────────────────────────────────────
  html += `
    <div style="margin-bottom:2px">
      <div style="display:flex;align-items:center;padding:6px 6px 5px">
        <div onclick="notesToggleGroup('__manual')"
          style="display:flex;align-items:center;gap:6px;flex:1;cursor:pointer;user-select:none;color:var(--muted-lt)">
          <span style="font-size:0.5rem;display:inline-block;flex-shrink:0;
            transform:${manualExp ? 'rotate(90deg)' : 'rotate(0deg)'};transition:transform 0.15s">▶</span>
          <span style="font-size:0.65rem;font-family:'DM Mono',monospace;letter-spacing:0.1em;font-weight:600;text-transform:uppercase">My Notes</span>
          ${manual.length ? `<span style="font-size:0.52rem;color:var(--muted)">${manual.length}</span>` : ''}
        </div>
        <button onclick="notesAddTopic()" title="New topic"
          style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:1.3rem;line-height:1;padding:0 3px;flex-shrink:0">+</button>
      </div>
      ${manualExp ? `<div>
        ${manual.length
          ? manual.map(t => _renderLeaf(t, 1)).join('')
          : `<div style="font-size:0.67rem;color:var(--muted);padding:3px 4px 3px 24px;line-height:1.7">
              Tap <strong style="color:var(--blush)">+</strong> to add a personal topic
            </div>`}
      </div>` : ''}
    </div>
  `;

  // ── TAB SECTIONS ─────────────────────────────────────────────────────────
  const enabledTabs = TAB_PRESETS.filter(p => _isTabEnabled(p.modId));

  if (enabledTabs.length) {
    html += `<div style="height:1px;background:var(--border);margin:6px 6px 8px"></div>`;
  }

  enabledTabs.forEach(({ tab, label, icon, modId }) => {
    const tabTopic    = all.find(t => t.linkedTab === tab && !t.linkedEntityId);
    const entityItems = all.filter(t => t.linkedEntityId && _entityTab(t.linkedEntityType) === tab);
    const sectionKey  = '__tab__' + tab;
    const expanded    = _expandedGroups.has(sectionKey);

    html += `<div style="margin-bottom:2px">`;
    html += _renderGroupHeader({
      key: sectionKey, icon, label,
      count: entityItems.length || null,
      depth: 0,
      selectId:    tabTopic?.id,
      selectLabel: `General ${label} notes`,
    });

    if (expanded) {
      html += `<div>`;

      if (tab === 'media') {
        // Media: sub-grouped by entity type
        let anySubItems = false;
        MEDIA_SUBTYPES.forEach(({ key, label: subLabel, icon: subIcon }) => {
          const items = entityItems.filter(t => t.linkedEntityType === key);
          if (!items.length) return;
          anySubItems = true;
          const subKey = '__media__' + key;
          const subExp = _expandedGroups.has(subKey);
          html += `
            <div>
              ${_renderGroupHeader({ key: subKey, icon: subIcon, label: subLabel, count: items.length, depth: 1 })}
              ${subExp ? items.map(t => _renderLeaf(t, 2)).join('') : ''}
            </div>
          `;
        });
        if (!anySubItems) {
          html += `<div style="font-size:0.66rem;color:var(--muted);padding:4px 4px 4px 28px;line-height:1.6">
            Tap 📝 on any book, film, or show to link a note here
          </div>`;
        }
      } else {
        // All other tabs: flat entity list
        if (entityItems.length) {
          html += entityItems.map(t => _renderLeaf(t, 1)).join('');
        } else {
          const hint = tab === 'fitness' ? 'workouts' : tab === 'projects' ? 'projects' : 'items';
          html += `<div style="font-size:0.66rem;color:var(--muted);padding:4px 4px 4px 24px;line-height:1.6">
            Tap 📝 on ${hint} to link notes here
          </div>`;
        }
      }

      html += `</div>`;
    }

    html += `</div>`;
  });

  html += `</div>`;
  el.innerHTML = html;
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
    el.innerHTML = `<div style="padding:40px 16px;text-align:center;color:var(--muted);
      font-size:0.76rem;line-height:1.9">Select a topic<br>to see its notes</div>`;
    return;
  }

  const notes = [...(topic.notes || [])].sort((a, b) =>
    (b.updatedAt || b.date || '').localeCompare(a.updatedAt || a.date || ''));

  el.innerHTML = `
    <div style="padding:0 4px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:0 8px">
        ${isMobile ? `<button onclick="_notesView='topics';_applyNotesView()"
          style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:0.7rem;
            padding:0;font-family:'DM Mono',monospace;flex-shrink:0">‹ Back</button>` : ''}
        <span style="font-size:0.6rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted-lt);
          font-family:'DM Mono',monospace;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
          ${isMobile ? 'margin:0 8px' : ''}">
          ${topic.icon ? escapeHtml(topic.icon) + ' ' : ''}${escapeHtml(topic.title)}
        </span>
        <button onclick="notesAddNote('${topic.id}')" title="New note"
          style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:1.2rem;
            line-height:1;padding:0 4px;flex-shrink:0">+</button>
      </div>
      ${notes.length ? notes.map(n => {
        const active  = n.id === _notesNoteId;
        const preview = (n.body || '').replace(/\n/g, ' ').slice(0, 90);
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
          ${preview ? `<div style="font-size:0.64rem;color:var(--muted);white-space:nowrap;
            overflow:hidden;text-overflow:ellipsis">${escapeHtml(preview)}</div>` : ''}
        </div>`;
      }).join('') : `<div style="padding:28px 8px;text-align:center;font-size:0.72rem;color:var(--muted)">
        No notes yet — tap <strong style="color:var(--blush)">+</strong> to write one
      </div>`}
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
    el.innerHTML = `<div style="padding:60px 24px;text-align:center;color:var(--muted);
      font-size:0.76rem;line-height:1.9">
      ${topic ? 'Select a note or tap <strong style="color:var(--blush)">+</strong> to write one'
              : 'Select a topic to get started'}
    </div>`;
    return;
  }

  // Build breadcrumb path
  let crumbs = ['Notes'];
  if (topic?.linkedEntityType) {
    if (topic.linkedEntityType === 'workout')  crumbs.push('Fitness');
    else if (topic.linkedEntityType === 'project') crumbs.push('Projects');
    else if (['book','film','show','anime','album','game'].includes(topic.linkedEntityType)) {
      const sub = MEDIA_SUBTYPES.find(s => s.key === topic.linkedEntityType);
      crumbs.push('Media', sub ? sub.label : 'Media');
    }
    crumbs.push(topic.title);
  } else if (topic?.linkedTab) {
    const preset = TAB_PRESETS.find(p => p.tab === topic.linkedTab);
    if (preset) crumbs.push(preset.label);
  }

  const breadcrumb = crumbs.length > 1
    ? `<div style="font-size:0.57rem;color:var(--muted);font-family:'DM Mono',monospace;
        margin-bottom:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        letter-spacing:0.03em">${crumbs.map(escapeHtml).join(' › ')}</div>`
    : '';

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <!-- Toolbar -->
      <div style="display:flex;align-items:center;gap:8px;padding:0 0 10px;
          border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        ${isMobile ? `<button onclick="_notesView='notelist';_applyNotesView()"
          style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:0.7rem;
            padding:0;font-family:'DM Mono',monospace">‹ Back</button>` : ''}
        <input id="noteTitleInp" value="${escapeAttr(note.title)}"
          placeholder="Note title…"
          oninput="notesUpdateTitle(this.value)"
          style="flex:1;background:none;border:none;color:var(--cream);font-size:0.96rem;
            font-family:'Jost',sans-serif;padding:0;outline:none;min-width:100px">
        <button onclick="notesDeleteNote('${note.id}')"
          style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.7rem;
            padding:0 4px;font-family:'DM Mono',monospace" title="Delete note">Delete</button>
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
      <div id="noteFooter" style="font-size:0.56rem;color:var(--muted);font-family:'DM Mono',monospace;
          padding-top:8px;border-top:1px solid var(--border-lt);flex-shrink:0">
        ${(note.body||'').split(/\s+/).filter(Boolean).length} words · updated ${escapeHtml((note.updatedAt||note.date||'').slice(0,10))}
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

function notesToggleGroup(key) {
  if (_expandedGroups.has(key)) _expandedGroups.delete(key);
  else _expandedGroups.add(key);
  renderNotesTopicList();
}

function notesAddTopic() {
  ensureNotes();
  const title = (prompt('Topic name:') || '').trim();
  if (!title) return;
  const icon  = (prompt('Icon (emoji, optional):') || '').trim();
  const t = makeTopic({ title, icon: icon || '' });
  S.notesTopics.push(t);
  scheduleSave();
  _notesTopicId = t.id;
  _notesNoteId  = null;
  _notesView    = 'notelist';
  _expandedGroups.add('__manual');
  renderNotes();
}

function notesEditTopicMeta(id) {
  const topic = (S.notesTopics || []).find(t => t.id === id);
  if (!topic) return;
  const newTitle = (prompt('Topic name:', topic.title) || '').trim();
  if (newTitle) topic.title = newTitle;
  const newIcon  = prompt('Icon (emoji):', topic.icon || '');
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
  const footer = eid('noteFooter');
  if (footer) footer.textContent =
    `${val.split(/\s+/).filter(Boolean).length} words · updated ${today()}`;
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

// ── Entity note entry point — called from 📝 buttons on other tabs ────────────
// entityType: 'workout' | 'project' | 'book' | 'film' | 'show' | 'anime' | 'album' | 'game'
// entityId:   the entity's id field (string)
// entityTitle: JSON.stringify'd string, decoded here
function openEntityNote(entityType, entityId, entityTitle) {
  ensureNotes();
  _ensureTabTopics();

  // Decode JSON-stringified title (arrives as "\"Book Title\"" from onclick attr)
  let title = entityTitle;
  try { title = JSON.parse(entityTitle); } catch(_) {}
  title = String(title || entityType);

  // Find or create entity topic
  let topic = S.notesTopics.find(t => t.linkedEntityId === entityId);
  if (!topic) {
    const linkedTab = _entityTab(entityType) === 'fitness'  ? 'fitness'
                    : _entityTab(entityType) === 'projects' ? 'projects'
                    : _entityTab(entityType) === 'media'    ? 'media'
                    : '';
    topic = makeTopic({
      title,
      icon:             ENTITY_ICONS[entityType] || '📝',
      linkedEntityType: entityType,
      linkedEntityId:   entityId,
      linkedTab,
    });
    S.notesTopics.push(topic);
    scheduleSave();
  }

  // Ensure notes array is valid
  if (!Array.isArray(topic.notes)) topic.notes = [];

  // Auto-create first note if empty so the editor opens immediately
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

  // Auto-expand the correct tree path so user can see the note in the sidebar
  const tab = _entityTab(entityType);
  if (tab) _expandedGroups.add('__tab__' + tab);
  if (tab === 'media') _expandedGroups.add('__media__' + entityType);

  // Navigate to Notes tab
  const notesBtn = document.querySelector(".tab[onclick*=\"go('notes')\"]");
  go('notes', notesBtn);
}

// Quick jump to Notes and select the first topic linked to a tab
function openNotesForTab(tabName) {
  const notesBtn = document.querySelector(".tab[onclick*=\"go('notes')\"]");
  go('notes', notesBtn);
  const linked = (S.notesTopics || []).find(t => t.linkedTab === tabName && !t.linkedEntityId);
  if (linked) notesSelectTopic(linked.id);
}
