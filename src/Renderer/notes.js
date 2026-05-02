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

function _allNotes() { return getNotes(); }

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
  const preview = _blockPreviewText(note.body).slice(0, 60);
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

// ── Block Editor Engine ───────────────────────────────────────────────────────

// Parse body string (markdown-ish) → array of block objects
function _parseBlocks(body) {
  if (!body || !body.trim()) return [{ type: 'p', text: '' }];
  return body.split('\n').map(line => {
    if (/^### (.*)/.test(line))        return { type: 'h3',     text: line.slice(4) };
    if (/^## (.*)/.test(line))         return { type: 'h2',     text: line.slice(3) };
    if (/^# (.*)/.test(line))          return { type: 'h1',     text: line.slice(2) };
    if (/^- \[x\] (.*)/i.test(line))  return { type: 'check',  text: line.slice(6), checked: true  };
    if (/^- \[ \] (.*)/.test(line))    return { type: 'check',  text: line.slice(6), checked: false };
    if (/^- (.*)/.test(line))          return { type: 'bullet', text: line.slice(2) };
    if (/^> (.*)/.test(line))          return { type: 'quote',  text: line.slice(2) };
    if (/^`(.*)`$/.test(line))         return { type: 'code',   text: line.slice(1, -1) };
    return { type: 'p', text: line };
  });
}

// Serialize block editor DOM → body string
function _serializeBlocks(editorEl) {
  return Array.from(editorEl.querySelectorAll('[data-block]')).map(bl => {
    const type    = bl.dataset.block;
    const checked = bl.dataset.checked === 'true';
    const textEl  = type === 'check' ? bl.querySelector('[data-block-text]') : bl;
    const text    = (textEl?.innerText || '').replace(/\n$/, '');
    switch (type) {
      case 'h1':     return '# '  + text;
      case 'h2':     return '## ' + text;
      case 'h3':     return '### '+ text;
      case 'bullet': return '- '  + text;
      case 'check':  return `- [${checked ? 'x' : ' '}] ` + text;
      case 'quote':  return '> '  + text;
      case 'code':   return '`'   + text + '`';
      default:       return text;
    }
  }).join('\n');
}

// Strip markdown syntax for plain-text sidebar preview / word count
function _blockPreviewText(body) {
  return (body || '').split('\n').map(l =>
    l.replace(/^#{1,3} /, '').replace(/^- \[[x ]\] /i, '').replace(/^- /, '')
     .replace(/^> /, '').replace(/^`(.*)`$/, '$1')
  ).join(' ').replace(/\s+/g, ' ').trim();
}

function _blockWordCount(body) {
  return _blockPreviewText(body).split(/\s+/).filter(Boolean).length;
}

// Render a single block as HTML string
function _blockHtml(block) {
  const text = escapeHtml(block.text || '');
  const type = block.type;
  switch (type) {
    case 'h1':
      return `<div data-block="h1" contenteditable="true" data-placeholder="Heading 1"
        style="font-family:'Cormorant Garamond',serif;font-size:1.6rem;color:var(--cream);
          line-height:1.25;margin:10px 0 4px;outline:none;min-height:1.3em">${text}</div>`;
    case 'h2':
      return `<div data-block="h2" contenteditable="true" data-placeholder="Heading 2"
        style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;color:var(--mist);
          line-height:1.3;margin:8px 0 3px;outline:none;min-height:1.3em">${text}</div>`;
    case 'h3':
      return `<div data-block="h3" contenteditable="true" data-placeholder="Heading 3"
        style="font-family:'DM Mono',monospace;font-size:0.78rem;color:var(--blush);
          text-transform:uppercase;letter-spacing:0.1em;margin:8px 0 3px;outline:none;min-height:1.3em">${text}</div>`;
    case 'bullet':
      return `<div data-block="bullet" contenteditable="true" data-placeholder="List item"
        style="color:var(--muted-lt);font-size:0.88rem;line-height:1.75;margin:1px 0;
          outline:none;min-height:1.75em">${text}</div>`;
    case 'check':
      return `<div data-block="check" data-checked="${!!block.checked}"
        style="display:flex;align-items:flex-start;gap:8px;margin:2px 0">
        <button onclick="notesToggleCheck(this)" contenteditable="false"
          style="width:16px;height:16px;border-radius:3px;flex-shrink:0;margin-top:3px;
            border:1.5px solid ${block.checked ? 'var(--blush)' : 'var(--border-lt)'};
            background:${block.checked ? 'var(--blush)' : 'transparent'};
            cursor:pointer;display:flex;align-items:center;justify-content:center;
            font-size:0.6rem;color:var(--cream);padding:0">${block.checked ? '✓' : ''}</button>
        <span data-block-text contenteditable="true" data-placeholder="To-do item"
          style="flex:1;outline:none;font-size:0.88rem;line-height:1.75;min-height:1.75em;
            color:${block.checked ? 'var(--muted)' : 'var(--mist)'};
            text-decoration:${block.checked ? 'line-through' : 'none'}">${text}</span>
      </div>`;
    case 'quote':
      return `<div data-block="quote" contenteditable="true" data-placeholder="Quote or callout"
        style="border-left:3px solid var(--blush-dim);padding:4px 0 4px 12px;
          color:var(--muted-lt);font-style:italic;font-size:0.88rem;line-height:1.75;
          margin:4px 0;outline:none;min-height:1.75em">${text}</div>`;
    case 'code':
      return `<div data-block="code" contenteditable="true" data-placeholder="Code"
        style="font-family:'DM Mono',monospace;font-size:0.78rem;color:var(--gold-lt);
          background:color-mix(in srgb,var(--mid) 60%,transparent);border-radius:6px;
          padding:8px 12px;margin:4px 0;outline:none;white-space:pre-wrap;min-height:1.5em">${text}</div>`;
    default:
      return `<div data-block="p" contenteditable="true" data-placeholder="Write anything..."
        style="color:var(--muted-lt);font-size:0.88rem;line-height:1.75;margin:1px 0;
          outline:none;min-height:1.75em">${text}</div>`;
  }
}

// Attach keyboard + input event listeners to every block in an editor container
function _attachBlockHandlers(editorEl) {
  editorEl.querySelectorAll('[data-block]').forEach(bl => {
    const type   = bl.dataset.block;
    const target = type === 'check' ? bl.querySelector('[data-block-text]') : bl;
    if (!target) return;
    target.addEventListener('keydown', _onBlockKeydown);
    target.addEventListener('input',   _onBlockInput);
  });
}

function _onBlockKeydown(e) {
  const target  = e.currentTarget;
  const isCheck = target.hasAttribute('data-block-text');
  const block   = isCheck ? target.closest('[data-block]') : target;
  const type    = block.dataset.block;

  // Wiki-link dropdown keyboard navigation
  if (_wikiDropdown) {
    if (e.key === 'Escape')    { e.preventDefault(); _closeWikiDropdown(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); _wikiDropdownMove(1);  return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); _wikiDropdownMove(-1); return; }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const active = _wikiDropdown.querySelector('[data-active="true"]')
                  || _wikiDropdown.firstElementChild;
      if (active) { const t = active.dataset.title; _insertWikiLink(t, target); }
      return;
    }
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const newType = (type === 'h1' || type === 'h2' || type === 'h3') ? 'p' : type;
    _insertBlockAfter(block, { type: newType, text: '', checked: false });
    return;
  }

  if (e.key === 'Backspace') {
    const textEl = isCheck ? target : block;
    if ((textEl.innerText || '') === '') {
      e.preventDefault();
      if (type !== 'p') _convertBlock(block, 'p', '');
      else              _removeBlock(block);
    }
  }
}

function _onBlockInput(e) {
  const target  = e.currentTarget;
  const isCheck = target.hasAttribute('data-block-text');
  const block   = isCheck ? target.closest('[data-block]') : target;
  const type    = block.dataset.block;
  const raw     = (isCheck ? target : block).innerText || '';

  // Markdown shortcut detection (paragraph blocks only)
  if (type === 'p') {
    if      (/^# $/.test(raw))      { _convertBlock(block, 'h1',    ''); return; }
    else if (/^## $/.test(raw))     { _convertBlock(block, 'h2',    ''); return; }
    else if (/^### $/.test(raw))    { _convertBlock(block, 'h3',    ''); return; }
    else if (/^[*-] $/.test(raw))   { _convertBlock(block, 'bullet',''); return; }
    else if (/^> $/.test(raw))      { _convertBlock(block, 'quote', ''); return; }
    else if (/^\[\] $/.test(raw))   { _convertBlock(block, 'check', ''); return; }
    else if (/^\[x\] $/i.test(raw)) { _convertBlock(block, 'check', '', true); return; }
  }

  // Wiki-link autocomplete
  _checkWikiLink(target);
  _notesAutoSaveFromEditor();
}

function _insertBlockAfter(refBlock, newBlock) {
  const tmp  = document.createElement('div');
  tmp.innerHTML = _blockHtml(newBlock);
  const newEl = tmp.firstElementChild;
  refBlock.insertAdjacentElement('afterend', newEl);

  const target = newBlock.type === 'check' ? newEl.querySelector('[data-block-text]') : newEl;
  if (target) {
    target.addEventListener('keydown', _onBlockKeydown);
    target.addEventListener('input',   _onBlockInput);
    setTimeout(() => {
      target.focus();
      const range = document.createRange();
      range.setStart(target, 0);
      range.collapse(true);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }, 0);
  }
  _notesAutoSaveFromEditor();
}

function _convertBlock(block, newType, newText, checked) {
  const tmp   = document.createElement('div');
  tmp.innerHTML = _blockHtml({ type: newType, text: newText ?? '', checked: !!checked });
  const newEl = tmp.firstElementChild;
  block.replaceWith(newEl);

  const target = newType === 'check' ? newEl.querySelector('[data-block-text]') : newEl;
  if (target) {
    target.addEventListener('keydown', _onBlockKeydown);
    target.addEventListener('input',   _onBlockInput);
    setTimeout(() => {
      target.focus();
      const range = document.createRange();
      range.setStart(target, 0);
      range.collapse(true);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }, 0);
  }
  _notesAutoSaveFromEditor();
}

function _removeBlock(block) {
  const editor = block.closest('#noteBlockEditor');
  if (!editor) return;
  const all = editor.querySelectorAll('[data-block]');
  if (all.length <= 1) {
    const target = block.dataset.block === 'check'
      ? block.querySelector('[data-block-text]') : block;
    if (target) { target.innerText = ''; target.focus(); }
    return;
  }
  let prev = null;
  for (let i = 0; i < all.length; i++) {
    if (all[i] === block) { prev = all[i - 1] || null; break; }
  }
  block.remove();
  if (prev) {
    const t = prev.dataset.block === 'check'
      ? prev.querySelector('[data-block-text]') : prev;
    if (t) {
      t.focus();
      const range = document.createRange();
      range.selectNodeContents(t);
      range.collapse(false);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  }
  _notesAutoSaveFromEditor();
}

function notesToggleCheck(btn) {
  const block   = btn.closest('[data-block="check"]');
  if (!block) return;
  const next    = block.dataset.checked !== 'true';
  block.dataset.checked          = String(next);
  btn.style.borderColor          = next ? 'var(--blush)' : 'var(--border-lt)';
  btn.style.background           = next ? 'var(--blush)' : 'transparent';
  btn.textContent                = next ? '✓' : '';
  const textEl = block.querySelector('[data-block-text]');
  if (textEl) {
    textEl.style.color          = next ? 'var(--muted)' : 'var(--mist)';
    textEl.style.textDecoration = next ? 'line-through' : 'none';
  }
  _notesAutoSaveFromEditor();
}

// Insert a new block at the cursor position (used by toolbar buttons)
function notesInsertBlock(type) {
  const editorEl = eid('noteBlockEditor');
  if (!editorEl) return;
  const focused  = document.activeElement;
  const refBlock = focused?.closest('[data-block]') || editorEl.lastElementChild;
  if (refBlock) _insertBlockAfter(refBlock, { type, text: '', checked: false });
  else {
    editorEl.innerHTML += _blockHtml({ type, text: '', checked: false });
    _attachBlockHandlers(editorEl);
  }
}

let _notesEditorSaveT = null;
function _notesAutoSaveFromEditor() {
  const editorEl = eid('noteBlockEditor');
  if (!editorEl) return;
  const note = _getNote(_notesSelectedId);
  if (!note) return;
  clearTimeout(_notesEditorSaveT);
  _notesEditorSaveT = setTimeout(() => {
    note.body      = _serializeBlocks(editorEl);
    note.updatedAt = new Date().toISOString();
    const footer   = eid('noteFooter');
    if (footer) footer.textContent =
      `${_blockWordCount(note.body)} words · updated ${note.updatedAt.slice(0, 10)}`;
    const bl = eid('noteBacklinks');
    if (bl) bl.innerHTML = _renderBacklinksPanel(note.id);
    _scheduleNotesSave(note);
    renderNotesTopicList();   // refresh sidebar preview
  }, 600);
}

// ── Wiki-links: [[NoteTitle]] autocomplete + backlinks ────────────────────────

let _wikiDropdown = null;

// Detect [[ before cursor and show autocomplete dropdown
function _checkWikiLink(target) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range  = sel.getRangeAt(0);
  const before = (range.startContainer.textContent || '').slice(0, range.startOffset);
  const match  = before.match(/\[\[([^\]]*)$/);
  if (!match) { _closeWikiDropdown(); return; }

  const query   = match[1].toLowerCase();
  const matches = _allNotes()
    .filter(n => n.id !== _notesSelectedId && n.title &&
                 n.title.toLowerCase().includes(query))
    .slice(0, 8);

  if (!matches.length) { _closeWikiDropdown(); return; }
  _showWikiDropdown(matches, target, range);
}

function _showWikiDropdown(matches, target, range) {
  _closeWikiDropdown();
  const rect = range.getBoundingClientRect();

  const dd = document.createElement('div');
  dd.id = 'notesWikiDropdown';
  dd.style.cssText =
    `position:fixed;z-index:9999;top:${rect.bottom + 4}px;left:${rect.left}px;
     background:var(--panel);border:1px solid var(--border-lt);border-radius:8px;
     padding:4px;min-width:200px;max-width:320px;
     box-shadow:0 8px 24px rgba(0,0,0,0.45)`;

  matches.forEach((note, i) => {
    const item = document.createElement('div');
    item.dataset.title = note.title;
    if (i === 0) item.dataset.active = 'true';
    item.style.cssText =
      `padding:7px 10px;border-radius:5px;cursor:pointer;font-size:0.82rem;
       color:var(--mist);transition:background 0.1s;
       background:${i === 0 ? 'var(--mid)' : ''}`;
    item.textContent = note.title;
    item.onmouseenter = () => { _wikiDropdownSetActive(item); };
    item.onmousedown  = e => { e.preventDefault(); _insertWikiLink(note.title, target); };
    dd.appendChild(item);
  });

  document.body.appendChild(dd);
  _wikiDropdown = dd;
}

function _wikiDropdownSetActive(item) {
  if (!_wikiDropdown) return;
  _wikiDropdown.querySelectorAll('[data-title]').forEach(el => {
    el.dataset.active  = '';
    el.style.background = '';
  });
  item.dataset.active  = 'true';
  item.style.background = 'var(--mid)';
}

function _wikiDropdownMove(dir) {
  if (!_wikiDropdown) return;
  const items = Array.from(_wikiDropdown.querySelectorAll('[data-title]'));
  const cur   = items.findIndex(el => el.dataset.active === 'true');
  const next  = Math.max(0, Math.min(items.length - 1, cur + dir));
  _wikiDropdownSetActive(items[next]);
}

function _closeWikiDropdown() {
  if (_wikiDropdown) { _wikiDropdown.remove(); _wikiDropdown = null; }
}

// Replace [[partial text before cursor with [[title]]
function _insertWikiLink(title, target) {
  _closeWikiDropdown();
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range  = sel.getRangeAt(0);
  const node   = range.startContainer;
  const offset = range.startOffset;
  const text   = node.textContent || '';
  const before = text.slice(0, offset);
  const after  = text.slice(offset);
  const braceIdx = before.lastIndexOf('[[');
  if (braceIdx === -1) return;

  node.textContent = before.slice(0, braceIdx) + '[[' + title + ']]' + after;
  const newOffset  = braceIdx + title.length + 4;
  const r2 = document.createRange();
  r2.setStart(node, Math.min(newOffset, node.textContent.length));
  r2.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r2);
  _notesAutoSaveFromEditor();
}

// Navigate to a linked note by title (called from rendered link spans)
function notesFollowLink(title) {
  const note = _allNotes().find(n => n.title === title);
  if (note) notesSelectNote(note.id);
  else if (typeof toast === 'function') toast(`Note "${title}" not found`);
}

// Build reverse index: notes whose body contains [[this note's title]]
function _buildBacklinks(noteId) {
  const note = _getNote(noteId);
  if (!note || !note.title) return [];
  const escaped = note.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('\\[\\[' + escaped + '\\]\\]', 'i');
  return _allNotes().filter(n => n.id !== noteId && pattern.test(n.body || ''));
}

function _renderBacklinksPanel(noteId) {
  const links = _buildBacklinks(noteId);
  if (!links.length) return '';
  return `<div style="border-top:1px solid var(--border);padding:14px 2px 4px;margin-top:4px">
    <div style="font-size:0.54rem;color:var(--muted);font-family:'DM Mono',monospace;
      text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">
      Linked from ${links.length} note${links.length !== 1 ? 's' : ''}
    </div>
    ${links.map(n => `<div onclick="notesSelectNote('${n.id}')"
      style="font-size:0.78rem;color:var(--blush);cursor:pointer;padding:3px 0;
        text-decoration:underline;text-underline-offset:2px">
      ${escapeHtml(n.title || 'Untitled')}</div>`).join('')}
  </div>`;
}

// Close wiki dropdown when clicking outside the editor
document.addEventListener('click', e => {
  if (_wikiDropdown && !_wikiDropdown.contains(e.target) &&
      !e.target.closest('#noteBlockEditor')) {
    _closeWikiDropdown();
  }
});

// ── Editor ────────────────────────────────────────────────────────────────────

const _TOOLBAR_TYPES = [
  { type: 'p',      label: 'Text' },
  { type: 'h1',     label: 'H1'   },
  { type: 'h2',     label: 'H2'   },
  { type: 'h3',     label: 'H3'   },
  { type: 'bullet', label: 'List' },
  { type: 'check',  label: 'Todo' },
  { type: 'quote',  label: 'Quote'},
  { type: 'code',   label: 'Code' },
];

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
      const sub   = MEDIA_SUBTYPES.find(s => s.key === mtype);
      if (sub) crumbs.push(sub.label);
    }
    crumbs.push(_entityTitle(note.entityType, note.entityId));
  }
  const breadcrumb = crumbs.length > 1
    ? `<div style="font-size:0.57rem;color:var(--muted);font-family:'DM Mono',monospace;
        margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        letter-spacing:0.03em">${crumbs.map(escapeHtml).join(' > ')}</div>`
    : '';

  // Jump-to-source button
  let sourceLink = '';
  if (note.entityId && note.entityType === 'media_item') {
    sourceLink = `<button onclick="notesJumpToEntity('${note.entityType}','${note.entityId}')"
      style="background:none;border:1px solid var(--border);color:var(--muted);cursor:pointer;
        font-size:0.62rem;padding:1px 7px;border-radius:4px;font-family:'DM Mono',monospace;flex-shrink:0">
      View in Media &rarr;</button>`;
  } else if (note.entityId && note.entityType === 'project') {
    sourceLink = `<button onclick="notesJumpToEntity('${note.entityType}','${note.entityId}')"
      style="background:none;border:1px solid var(--border);color:var(--muted);cursor:pointer;
        font-size:0.62rem;padding:1px 7px;border-radius:4px;font-family:'DM Mono',monospace;flex-shrink:0">
      View in Projects &rarr;</button>`;
  }

  // Build block editor HTML from note body
  const blocks     = _parseBlocks(note.body);
  const blocksHtml = blocks.map(_blockHtml).join('');

  // Toolbar
  const toolbarHtml = _TOOLBAR_TYPES.map(({ type, label }) => `
    <button onclick="notesInsertBlock('${type}')" title="Insert ${label}"
      style="background:none;border:1px solid var(--border);border-radius:4px;color:var(--muted);
        cursor:pointer;font-size:0.62rem;padding:2px 8px;font-family:'DM Mono',monospace;
        transition:border-color 0.12s,color 0.12s"
      onmouseover="this.style.borderColor='var(--blush)';this.style.color='var(--blush)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">
      ${escapeHtml(label)}</button>`).join('');

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
            padding:0 4px;font-family:'DM Mono',monospace">Delete</button>` : ''}
      </div>
      ${breadcrumb}
      <div style="display:flex;gap:5px;flex-wrap:wrap;padding:6px 0 8px;
          border-bottom:1px solid var(--border-lt);flex-shrink:0">
        ${toolbarHtml}
      </div>
      <div id="noteBlockEditor"
        style="flex:1;overflow-y:auto;padding:14px 2px 24px;box-sizing:border-box">
        ${blocksHtml}
      </div>
      <div id="noteFooter" style="font-size:0.56rem;color:var(--muted);font-family:'DM Mono',monospace;
          padding-top:6px;border-top:1px solid var(--border-lt);flex-shrink:0">
        ${_blockWordCount(note.body)} words &middot; updated ${(note.updatedAt||'').slice(0,10)}
      </div>
      <div id="noteBacklinks">${_renderBacklinksPanel(note.id)}</div>
    </div>
  `;

  _attachBlockHandlers(eid('noteBlockEditor'));
}

function renderNotesNoteList() {
  // Sidebar handles the note list. Stub kept for compatibility.
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
  setTimeout(() => {
    const editor = eid('noteBlockEditor');
    if (editor) {
      const first = editor.querySelector('[data-block]');
      const target = first
        ? (first.dataset.block === 'check' ? first.querySelector('[data-block-text]') : first)
        : null;
      if (target) { target.focus(); const r = document.createRange(); r.selectNodeContents(target); r.collapse(false); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    }
  }, 50);
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
  // Legacy no-op: block editor handles body updates via _notesAutoSaveFromEditor
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
