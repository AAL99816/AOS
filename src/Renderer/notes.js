'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// notes.js — Unified notes system
//
// S.notesDB is the single source of truth (loaded from / saved to Supabase).
// Each note: { id, section, entityType, entityId, title, body, orderIndex, updatedAt }
//
// Sidebar tree (example):
//   MY NOTES  [+]
//     My Topic
//   ──────────────────────────────
//   Fitness
//     Push Day A
//   Projects
//     My App
//   Media
//     Books
//       Critique of Pure Reason
//         Chapter 1
//         Chapter 2
//     Films
//       Inception
// ─────────────────────────────────────────────────────────────────────────────

let _notesSelectedId  = null;   // currently selected note id
let _notesView        = 'topics'; // 'topics' | 'notelist' | 'editor'
let _notesSaveTimer   = null;

let _expandedGroups = new Set(['__custom', '__section__fitness', '__section__projects', '__section__media']);

// ── Section / entity-type config ─────────────────────────────────────────────

const NOTES_SECTIONS = [
  { section: 'fitness',  label: 'Fitness',  modId: 'tab.fitness'  },
  { section: 'projects', label: 'Projects', modId: 'tab.projects' },
  { section: 'media',    label: 'Media',    modId: 'tab.media'    },
  { section: 'food',     label: 'Food',     modId: 'tab.food'     },
  { section: 'focus',    label: 'Focus',    modId: 'tab.focus'    },
];

const MEDIA_SUBTYPES = [
  { key: 'book',  label: 'Books'  },
  { key: 'film',  label: 'Films'  },
  { key: 'show',  label: 'Shows'  },
  { key: 'anime', label: 'Anime'  },
  { key: 'album', label: 'Albums' },
  { key: 'game',  label: 'Games'  },
];

function _isSectionEnabled(modId) {
  if (!modId) return true;
  if (typeof modOn === 'function') return modOn(modId);
  return true;
}

// ── Data helpers ─────────────────────────────────────────────────────────────

function _allNotes() {
  return Array.isArray(S.notesDB) ? S.notesDB : [];
}

function _getNote(id) {
  return _allNotes().find(n => n.id === id) || null;
}

// Notes for a specific entity (entity notes = chapter notes, project notes, etc.)
function _entityNotes(entityId) {
  return _allNotes()
    .filter(n => n.entityId === entityId)
    .sort((a, b) => (a.orderIndex - b.orderIndex) || a.createdAt.localeCompare(b.createdAt));
}

// Resolve entity display title from S state
function _entityTitle(entityType, entityId) {
  if (entityType === 'media_item') {
    const m = (S.media || []).find(m => m._uuid === entityId);
    return m ? m.title : 'Untitled';
  }
  if (entityType === 'project') {
    const p = (S.projects || []).find(p => p._uuid === entityId);
    return p ? p.title : 'Untitled';
  }
  if (entityType === 'workout_session') {
    const w = (S.workoutHistory || []).find(w => w._uuid === entityId);
    return w ? (w.title || w.date || 'Workout') : 'Workout';
  }
  if (entityType === 'workout_template') {
    const w = (S.workoutCards || []).find(w => w._uuid === entityId);
    return w ? (w.title || 'Workout') : 'Workout';
  }
  return 'Untitled';
}

function _entityMediaType(entityId) {
  const m = (S.media || []).find(m => m._uuid === entityId);
  return m ? m.mediaType : null;
}

// Section that an entity_type belongs to
function _sectionForEntityType(entityType) {
  if (entityType === 'media_item') return 'media';
  if (entityType === 'project')    return 'projects';
  if (entityType === 'workout_session')  return 'fitness';
  if (entityType === 'workout_template') return 'fitness';
  return 'custom';
}

// ── Main render ───────────────────────────────────────────────────────────────

function renderNotes() {
  renderNotesTopicList();
  renderNotesEditor();
  _applyNotesView();
}

function _applyNotesView() {
  const topicsEl = eid('notesTopicList');
  const editorEl = eid('notesEditor');
  if (!topicsEl || !editorEl) return;

  const isMobile = window.innerWidth < 700;

  if (!isMobile) {
    // Desktop: both panes always visible side-by-side
    topicsEl.style.display = '';
    topicsEl.style.width   = '200px';
    editorEl.style.display = '';
    return;
  }

  // Mobile: drill-down — one pane at a time, full width
  if (_notesView === 'editor' && _notesSelectedId) {
    topicsEl.style.display = 'none';
    topicsEl.style.width   = '';
    editorEl.style.display = '';
  } else {
    _notesView             = 'topics';
    topicsEl.style.display = '';
    topicsEl.style.width   = '100%';
    editorEl.style.display = 'none';
  }
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function renderNotesTopicList() {
  const el = eid('notesTopicList');
  if (!el) return;

  const all = _allNotes();
  const customNotes = all.filter(n => n.section === 'custom' && !n.entityId);

  let html = `<div style="padding:0 4px;height:100%;overflow-y:auto;box-sizing:border-box">`;

  // ── MY NOTES ─────────────────────────────────────────────────────────────
  const custExp = _expandedGroups.has('__custom');
  html += `
    <div style="margin-bottom:2px">
      <div style="display:flex;align-items:center;padding:6px 6px 5px">
        <div onclick="notesToggleGroup('__custom')"
          style="display:flex;align-items:center;gap:6px;flex:1;cursor:pointer;user-select:none;color:var(--muted-lt)">
          <span style="font-size:0.5rem;display:inline-block;flex-shrink:0;
            transform:${custExp ? 'rotate(90deg)' : 'rotate(0deg)'};transition:transform 0.15s">&#9658;</span>
          <span style="font-size:0.65rem;font-family:'DM Mono',monospace;letter-spacing:0.1em;font-weight:600;text-transform:uppercase">My Notes</span>
          ${customNotes.length ? `<span style="font-size:0.52rem;color:var(--muted)">${customNotes.length}</span>` : ''}
        </div>
        <button onclick="notesAddCustomNote()" title="New note"
          style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:1.3rem;line-height:1;padding:0 3px;flex-shrink:0">+</button>
      </div>
      ${custExp ? `<div>
        ${customNotes.length
          ? customNotes.map(n => _renderNoteLeaf(n, 1)).join('')
          : `<div style="font-size:0.67rem;color:var(--muted);padding:3px 4px 3px 24px;line-height:1.7">
              Tap <strong style="color:var(--blush)">+</strong> to add a personal note
            </div>`}
      </div>` : ''}
    </div>
  `;

  // ── SECTION GROUPS ────────────────────────────────────────────────────────
  const enabledSections = NOTES_SECTIONS.filter(s => _isSectionEnabled(s.modId));
  if (enabledSections.length) {
    html += `<div style="height:1px;background:var(--border);margin:6px 6px 8px"></div>`;
  }

  enabledSections.forEach(({ section, label }) => {
    const secKey = '__section__' + section;
    const exp    = _expandedGroups.has(secKey);

    // All unique entities in this section
    const sectionNotes   = all.filter(n => n.section === section && n.entityId);
    const entityIds      = [...new Set(sectionNotes.map(n => n.entityId))];
    const entityCount    = entityIds.length;

    html += `<div style="margin-bottom:2px">`;
    html += _renderGroupHeader({ key: secKey, label, count: entityCount || null, depth: 0 });

    if (exp) {
      html += `<div>`;

      if (section === 'media') {
        let anyShown = false;
        MEDIA_SUBTYPES.forEach(({ key: mtype, label: subLabel }) => {
          const subEntityIds = entityIds.filter(eid => _entityMediaType(eid) === mtype);
          if (!subEntityIds.length) return;
          anyShown = true;
          const subKey = '__media__' + mtype;
          const subExp = _expandedGroups.has(subKey);
          html += `<div>
            ${_renderGroupHeader({ key: subKey, label: subLabel, count: subEntityIds.length, depth: 1 })}
            ${subExp ? subEntityIds.map(eid => _renderEntityGroup(eid, 'media_item', 2)).join('') : ''}
          </div>`;
        });
        if (!anyShown) {
          html += `<div style="font-size:0.66rem;color:var(--muted);padding:4px 4px 4px 28px;line-height:1.6">
            Notes appear here when you add them from media items
          </div>`;
        }
      } else if (section === 'fitness') {
        if (!entityIds.length) {
          html += `<div style="font-size:0.66rem;color:var(--muted);padding:4px 4px 4px 24px;line-height:1.6">
            Notes appear here when you add them from workouts
          </div>`;
        } else {
          entityIds.forEach(eid => {
            const eType = (S.workoutCards || []).some(w => w._uuid === eid) ? 'workout_template' : 'workout_session';
            html += _renderEntityGroup(eid, eType, 1);
          });
        }
      } else if (section === 'projects') {
        if (!entityIds.length) {
          html += `<div style="font-size:0.66rem;color:var(--muted);padding:4px 4px 4px 24px;line-height:1.6">
            Notes appear here when you add them from projects
          </div>`;
        } else {
          entityIds.forEach(eid => { html += _renderEntityGroup(eid, 'project', 1); });
        }
      } else {
        // Generic section
        all.filter(n => n.section === section && !n.entityId)
          .forEach(n => { html += _renderNoteLeaf(n, 1); });
      }

      html += `</div>`;
    }

    html += `</div>`;
  });

  html += `</div>`;
  el.innerHTML = html;
}

// Renders an entity header + its notes nested beneath it
function _renderEntityGroup(entityId, entityType, depth) {
  const notes    = _entityNotes(entityId);
  const title    = _entityTitle(entityType, entityId);
  const entityKey = '__entity__' + entityId;
  const exp      = _expandedGroups.has(entityKey);
  const pad      = 4 + depth * 14;

  let html = `
    <div onclick="notesToggleGroup('${entityKey}')"
      style="display:flex;align-items:center;gap:5px;padding:6px 8px 6px ${pad}px;
        border-radius:7px;cursor:pointer;user-select:none;color:var(--mist);transition:background 0.12s"
      onmouseover="this.style.background='rgba(255,255,255,0.03)'"
      onmouseout="this.style.background=''">
      <span style="font-size:0.5rem;display:inline-block;flex-shrink:0;color:var(--muted);
        transition:transform 0.15s;transform:${exp ? 'rotate(90deg)' : 'rotate(0deg)'}">&#9658;</span>
      <span style="font-size:0.78rem;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${escapeHtml(title)}
      </span>
      <span style="font-size:0.52rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${notes.length}</span>
    </div>
  `;

  if (exp) {
    html += notes.map(n => _renderNoteLeaf(n, depth + 1)).join('');
  }
  return html;
}

function _renderGroupHeader({ key, label, count, depth }) {
  const exp = _expandedGroups.has(key);
  const pad = 4 + depth * 14;
  return `<div style="display:flex;align-items:center;gap:5px;padding:6px 8px 6px ${pad}px;border-radius:7px;
      cursor:pointer;user-select:none;color:var(--mist);transition:background 0.12s"
    onclick="notesToggleGroup('${key}')"
    onmouseover="this.style.background='rgba(255,255,255,0.03)'"
    onmouseout="this.style.background=''">
    <span style="font-size:0.5rem;display:inline-block;flex-shrink:0;color:var(--muted);
      transition:transform 0.15s;transform:${exp ? 'rotate(90deg)' : 'rotate(0deg)'}">&#9658;</span>
    <span style="font-size:0.8rem;font-weight:500;flex:1">${escapeHtml(label)}</span>
    ${count ? `<span style="font-size:0.52rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${count}</span>` : ''}
  </div>`;
}

function _renderNoteLeaf(note, depth) {
  const active = note.id === _notesSelectedId;
  const pad    = 10 + depth * 14;
  const preview = (note.body || '').replace(/\n/g, ' ').slice(0, 60);
  return `<div onclick="notesSelectNote('${note.id}')"
    style="display:flex;align-items:center;gap:7px;
      padding:6px 8px 6px ${pad}px;cursor:pointer;border-radius:7px;margin-bottom:1px;
      background:${active ? 'var(--mid)' : 'transparent'};
      border-left:2px solid ${active ? 'var(--blush)' : 'transparent'};
      transition:background 0.12s">
    <div style="flex:1;min-width:0">
      <div style="font-size:0.78rem;color:${active ? 'var(--cream)' : 'var(--mist)'};
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${escapeHtml(note.title || 'Untitled')}
      </div>
      ${preview ? `<div style="font-size:0.62rem;color:var(--muted);white-space:nowrap;
        overflow:hidden;text-overflow:ellipsis;margin-top:1px">${escapeHtml(preview)}</div>` : ''}
    </div>
    <span style="font-size:0.5rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">
      ${(note.updatedAt || '').slice(0, 10)}
    </span>
  </div>`;
}

// ── Editor ────────────────────────────────────────────────────────────────────

function renderNotesEditor() {
  const el = eid('notesEditor');
  if (!el) return;
  const note     = _getNote(_notesSelectedId);
  const isMobile = window.innerWidth < 700;

  if (!note) {
    el.innerHTML = `<div style="padding:60px 24px;text-align:center;color:var(--muted-lt);
      font-size:0.76rem;line-height:1.9;font-family:'DM Mono',monospace">
      Select a note from the sidebar, or tap <strong style="color:var(--blush)">+</strong> next to My Notes to write one.
    </div>`;
    return;
  }

  // Breadcrumb
  const crumbs = ['Notes'];
  if (note.section && note.section !== 'custom') {
    const sec = NOTES_SECTIONS.find(s => s.section === note.section);
    if (sec) crumbs.push(sec.label);
  }
  if (note.entityId) {
    if (note.entityType === 'media_item') {
      const mtype = _entityMediaType(note.entityId);
      const sub = MEDIA_SUBTYPES.find(s => s.key === mtype);
      if (sub) crumbs.push(sub.label);
    }
    crumbs.push(_entityTitle(note.entityType, note.entityId));
  }

  const breadcrumb = crumbs.length > 1
    ? `<div style="font-size:0.57rem;color:var(--muted);font-family:'DM Mono',monospace;
        margin-bottom:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        letter-spacing:0.03em">${crumbs.map(escapeHtml).join(' > ')}</div>`
    : '';

  // Jump-to-source link for entity notes
  let sourceLink = '';
  if (note.entityId && note.entityType === 'media_item') {
    const m = (S.media || []).find(m => m._uuid === note.entityId);
    if (m) sourceLink = `<button onclick="notesJumpToEntity('${note.entityType}','${note.entityId}')"
      title="Go to source"
      style="background:none;border:1px solid var(--border);color:var(--muted);cursor:pointer;
        font-size:0.62rem;padding:1px 7px;border-radius:4px;font-family:'DM Mono',monospace;flex-shrink:0">
      View in Media &rarr;
    </button>`;
  } else if (note.entityId && note.entityType === 'project') {
    sourceLink = `<button onclick="notesJumpToEntity('${note.entityType}','${note.entityId}')"
      title="Go to source"
      style="background:none;border:1px solid var(--border);color:var(--muted);cursor:pointer;
        font-size:0.62rem;padding:1px 7px;border-radius:4px;font-family:'DM Mono',monospace;flex-shrink:0">
      View in Projects &rarr;
    </button>`;
  }

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div style="display:flex;align-items:center;gap:8px;padding:0 0 10px;
          border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap">
        ${isMobile ? `<button onclick="_notesView='topics';_applyNotesView()"
          style="background:none;border:none;color:var(--blush);cursor:pointer;font-size:0.7rem;
            padding:0;font-family:'DM Mono',monospace">Back</button>` : ''}
        <input id="noteTitleInp" value="${escapeAttr(note.title)}"
          placeholder="Note title..."
          oninput="notesUpdateTitle(this.value)"
          style="flex:1;background:none;border:none;color:var(--cream);font-size:0.96rem;
            font-family:'Jost',sans-serif;padding:0;outline:none;min-width:100px">
        ${sourceLink}
        ${!note.entityId ? `<button onclick="notesDeleteNote('${note.id}')"
          style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.7rem;
            padding:0 4px;font-family:'DM Mono',monospace" title="Delete note">Delete</button>` : ''}
      </div>
      ${breadcrumb}
      <textarea id="noteBodyInp"
        placeholder="Write anything..."
        oninput="notesUpdateBody(this.value)"
        style="flex:1;background:none;border:none;color:var(--muted-lt);font-size:0.84rem;
          line-height:1.75;resize:none;outline:none;padding:12px 0;
          font-family:'Jost',sans-serif;width:100%;box-sizing:border-box">${escapeHtml(note.body || '')}</textarea>
      <div id="noteFooter" style="font-size:0.56rem;color:var(--muted);font-family:'DM Mono',monospace;
          padding-top:8px;border-top:1px solid var(--border-lt);flex-shrink:0">
        ${(note.body||'').split(/\s+/).filter(Boolean).length} words &middot; updated ${(note.updatedAt||'').slice(0,10)}
      </div>
    </div>
  `;
}

// Also need the note list pane (middle column) — shows notes for the selected entity/section group
function renderNotesNoteList() {
  // In this redesign the note list is the sidebar itself (leaf nodes).
  // This stub exists for compatibility with mobile view logic.
}

// ── Actions ───────────────────────────────────────────────────────────────────

function notesToggleGroup(key) {
  if (_expandedGroups.has(key)) _expandedGroups.delete(key);
  else _expandedGroups.add(key);
  renderNotesTopicList();
}

function notesSelectNote(id) {
  _notesSelectedId = id;
  _notesView = 'editor';
  renderNotesTopicList();
  renderNotesEditor();
  _applyNotesView();
  setTimeout(() => { const b = eid('noteBodyInp'); if (b) b.focus(); }, 50);
}

function notesAddCustomNote() {
  const note = {
    id:          uid(),
    section:     'custom',
    entityType:  null,
    entityId:    null,
    title:       '',
    body:        '',
    orderIndex:  0,
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString()
  };
  if (!Array.isArray(S.notesDB)) S.notesDB = [];
  S.notesDB.unshift(note);
  _notesSelectedId = note.id;
  _notesView = 'editor';
  _expandedGroups.add('__custom');
  saveNoteDB(note);
  renderNotes();
  setTimeout(() => { const inp = eid('noteTitleInp'); if (inp) inp.focus(); }, 60);
}

function notesUpdateTitle(val) {
  const note = _getNote(_notesSelectedId);
  if (!note) return;
  note.title     = val;
  note.updatedAt = new Date().toISOString();
  _scheduleNotesSave(note);
  const footer = eid('noteFooter');
  if (footer) footer.textContent = `${(note.body||'').split(/\s+/).filter(Boolean).length} words · updated ${note.updatedAt.slice(0,10)}`;
}

function notesUpdateBody(val) {
  const note = _getNote(_notesSelectedId);
  if (!note) return;
  note.body      = val;
  note.updatedAt = new Date().toISOString();
  _scheduleNotesSave(note);
  const footer = eid('noteFooter');
  if (footer) footer.textContent = `${val.split(/\s+/).filter(Boolean).length} words · updated ${note.updatedAt.slice(0,10)}`;
}

function _scheduleNotesSave(note) {
  clearTimeout(_notesSaveTimer);
  _notesSaveTimer = setTimeout(() => saveNoteDB(note), 800);
}

function notesDeleteNote(id) {
  if (!confirm('Delete this note?')) return;
  deleteNoteDB(id);
  if (_notesSelectedId === id) { _notesSelectedId = null; _notesView = 'topics'; }
  renderNotes();
}

// Navigate from Notes tab back to the source entity
function notesJumpToEntity(entityType, entityId) {
  if (entityType === 'media_item') {
    const m = (S.media || []).find(m => m._uuid === entityId);
    if (m) {
      const btn = document.querySelector('.tab[onclick*="go(\'media\')"]');
      go('media', btn);
      // open the book detail modal
      setTimeout(() => { if (typeof openBookDetails === 'function') openBookDetails(m.id); }, 120);
    }
  } else if (entityType === 'project') {
    const p = (S.projects || []).find(p => p._uuid === entityId);
    if (p) {
      const btn = document.querySelector('.tab[onclick*="go(\'projects\')"]');
      go('projects', btn);
      setTimeout(() => { if (typeof openProjectDetails === 'function') openProjectDetails(p.id); }, 120);
    }
  }
}

// ── Entry point called from entity cards (arrow button) ───────────────────────
// Navigates to Notes tab and selects the first note for that entity.
// If no notes exist yet for this entity, a first note is auto-created.
function openNotesForEntity(entityType, entityId) {
  if (!Array.isArray(S.notesDB)) S.notesDB = [];

  const section = _sectionForEntityType(entityType);
  let notes = _entityNotes(entityId);

  if (!notes.length) {
    // auto-create a starter note
    const note = {
      id:         uid(),
      section,
      entityType,
      entityId,
      title:      'Notes',
      body:       '',
      orderIndex: 0,
      createdAt:  new Date().toISOString(),
      updatedAt:  new Date().toISOString()
    };
    S.notesDB.push(note);
    saveNoteDB(note);
    notes = [note];
  }

  _notesSelectedId = notes[0].id;
  _notesView = 'editor';

  // Expand the tree path
  _expandedGroups.add('__section__' + section);
  if (entityType === 'media_item') {
    const mtype = _entityMediaType(entityId);
    if (mtype) _expandedGroups.add('__media__' + mtype);
  }
  _expandedGroups.add('__entity__' + entityId);

  const notesBtn = document.querySelector(".tab[onclick*=\"go('notes')\"]");
  go('notes', notesBtn);
}
