'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// community.js — Community tab: Feed, Discover, My Profile
// ─────────────────────────────────────────────────────────────────────────────

let _communityView    = 'feed';
let _communityNotes   = [];
let _communityFeed    = [];
let _communityFollowing = [];
let _communityLoaded  = false;
let _discoverResults  = [];
let _discoverSearchT  = null;
let _editingCommunityNoteId = null;

// ── Markdown renderer ─────────────────────────────────────────────────────────
function _renderMarkdown(text) {
  if (!text) return '';
  if (typeof marked !== 'undefined') {
    try { return marked.parse(text, { breaks: true, gfm: true }); } catch(e) {}
  }
  // Fallback: basic inline markdown
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="font-family:\'DM Mono\',monospace;background:var(--mid);padding:1px 4px;border-radius:3px">$1</code>')
    .replace(/^#{3}\s(.+)/gm, '<h3 style="font-size:0.84rem;color:var(--cream);margin:10px 0 4px">$1</h3>')
    .replace(/^#{2}\s(.+)/gm, '<h2 style="font-size:0.94rem;color:var(--cream);margin:12px 0 6px">$1</h2>')
    .replace(/^#{1}\s(.+)/gm, '<h1 style="font-size:1.05rem;color:var(--cream);margin:14px 0 6px">$1</h1>')
    .replace(/\n/g, '<br>');
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function renderCommunity() {
  const panel = eid('panel-community');
  if (!panel) return;

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;color:var(--cream);font-weight:600;margin:0;letter-spacing:0.02em">Community</h2>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:20px;overflow-x:auto;scrollbar-width:none">
      <button class="fpill${_communityView==='feed'?' active':''}" onclick="switchCommunityView('feed')">Feed</button>
      <button class="fpill${_communityView==='discover'?' active':''}" onclick="switchCommunityView('discover')">Discover</button>
      <button class="fpill${_communityView==='my-profile'?' active':''}" onclick="switchCommunityView('my-profile')">My Profile</button>
    </div>
    <div id="communityContent"></div>
  `;

  if (!_communityLoaded) {
    _communityLoaded = true;
    const el = eid('communityContent');
    if (el) el.innerHTML = _buildLoadingState();
    _communityFollowing = await loadFollowing();
    _communityFeed      = await loadCommunityFeed(_communityFollowing);
    _communityNotes     = await loadCommunityNotes();
  }

  _renderCommunityContent();
}

function switchCommunityView(v) {
  _communityView = v;
  // Re-render just the subnav + content without re-fetching
  document.querySelectorAll('#panel-community .fpill').forEach(btn => {
    const map = { feed: 'feed', discover: 'discover', 'my-profile': 'my-profile' };
    btn.classList.toggle('active', btn.textContent.toLowerCase().replace(' ', '-') === v ||
      (v === 'my-profile' && btn.textContent === 'My Profile') ||
      (v === 'discover'   && btn.textContent === 'Discover') ||
      (v === 'feed'       && btn.textContent === 'Feed'));
  });
  _renderCommunityContent();
}

function _renderCommunityContent() {
  const el = eid('communityContent');
  if (!el) return;
  if (_communityView === 'feed')         el.innerHTML = _buildFeedView();
  else if (_communityView === 'discover') el.innerHTML = _buildDiscoverView();
  else if (_communityView === 'my-profile') el.innerHTML = _buildMyProfileView();
}

function _buildLoadingState() {
  return `<div style="text-align:center;padding:48px 0;color:var(--muted);font-size:0.78rem">Loading…</div>`;
}

// ── Feed view ─────────────────────────────────────────────────────────────────
function _buildFeedView() {
  if (!_communityFollowing.length) {
    return `
      <div style="text-align:center;padding:56px 0">
        <div style="font-size:2.2rem;margin-bottom:14px">👋</div>
        <div style="font-size:0.86rem;color:var(--cream);margin-bottom:6px;font-family:'Cormorant Garamond',serif;font-size:1.05rem">Your feed is empty</div>
        <div style="font-size:0.72rem;color:var(--muted);line-height:1.6;max-width:260px;margin:0 auto 20px">Follow people to see their workouts, food, projects and media here</div>
        <button class="btn btn-p" style="font-size:0.76rem" onclick="switchCommunityView('discover')">Discover People</button>
      </div>`;
  }
  if (!_communityFeed.length) {
    return `<div style="text-align:center;padding:48px 0;color:var(--muted);font-size:0.78rem">No recent activity from people you follow</div>`;
  }
  return _communityFeed.map(ev => _buildFeedCard(ev)).join('');
}

function _buildFeedCard(ev) {
  const profile = ev.profiles || {};
  const name    = profile.display_name || profile.username || 'Anonymous';
  const initial = (name[0] || '?').toUpperCase();
  const avatar  = profile.avatar_url
    ? `<img src="${escapeAttr(profile.avatar_url)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0">`
    : `<div style="width:36px;height:36px;border-radius:50%;background:var(--border-lt);display:flex;align-items:center;justify-content:center;font-size:0.82rem;color:var(--muted);flex-shrink:0;font-weight:600">${escapeHtml(initial)}</div>`;

  const dateStr = ev.event_date
    ? new Date(ev.event_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  const summary = ev.summary || {};
  const MEDIA_ICONS = { book: '📖', film: '🎬', show: '📺', album: '🎵', game: '🎮' };

  let icon, typeLabel, detail;
  switch (ev.event_type) {
    case 'workout':
      icon = '🏋️';
      typeLabel = 'logged a workout';
      detail = `<div style="font-size:0.70rem;color:var(--muted);margin-top:2px">${escapeHtml(summary.title || 'Workout')}${summary.exercises ? ` · ${summary.exercises} exercise${summary.exercises !== 1 ? 's' : ''}` : ''}</div>`;
      break;
    case 'cardio':
      icon = '🏃';
      typeLabel = 'did cardio';
      detail = `<div style="font-size:0.70rem;color:var(--muted);margin-top:2px">${escapeHtml(summary.activity || '')}${summary.duration ? ` · ${summary.duration}min` : ''}${summary.distance ? ` · ${summary.distance}km` : ''}</div>`;
      break;
    case 'food_day':
      icon = '🍽️';
      typeLabel = 'tracked their food';
      detail = `<div style="font-size:0.70rem;color:var(--muted);margin-top:2px">${summary.calories ? Math.round(summary.calories) + ' kcal' : ''}${summary.items ? ` · ${summary.items} item${summary.items !== 1 ? 's' : ''}` : ''}</div>`;
      break;
    case 'project_update':
      icon = '✅';
      typeLabel = 'completed a task';
      detail = `<div style="font-size:0.70rem;color:var(--muted);margin-top:2px">${escapeHtml(summary.projectTitle || '')}${summary.taskText ? ` — "${escapeHtml(summary.taskText.slice(0, 60))}${summary.taskText.length > 60 ? '…' : ''}"` : ''}</div>`;
      break;
    case 'media_finish':
      icon = MEDIA_ICONS[summary.mediaType] || '📖';
      typeLabel = 'finished';
      detail = `<div style="font-size:0.70rem;color:var(--muted);margin-top:2px">${escapeHtml(summary.title || '')}${summary.rating ? ` · ${'★'.repeat(Math.round(summary.rating))}` : ''}</div>`;
      break;
    case 'community_note':
      icon = '📝';
      typeLabel = 'shared a note';
      detail = summary.title ? `<div style="font-size:0.70rem;color:var(--muted);margin-top:2px;font-style:italic">"${escapeHtml(summary.title.slice(0, 70))}${summary.title.length > 70 ? '…' : ''}"</div>` : '';
      break;
    default:
      icon = '·'; typeLabel = ev.event_type; detail = '';
  }

  return `
    <div class="card" style="padding:12px 14px;margin-bottom:10px;cursor:pointer" onclick="openProfileOverlay('${escapeAttr(ev.user_id)}')">
      <div style="display:flex;align-items:center;gap:10px">
        ${avatar}
        <div style="flex:1;min-width:0">
          <div style="font-size:0.78rem;color:var(--cream);line-height:1.4">
            <span style="font-weight:600">${escapeHtml(name)}</span>
            <span style="color:var(--muted)"> ${typeLabel}</span>
            ${dateStr ? `<span style="font-size:0.62rem;color:var(--muted);margin-left:6px;font-family:'DM Mono',monospace">${dateStr}</span>` : ''}
          </div>
          ${detail}
        </div>
        <span style="font-size:1.1rem;flex-shrink:0">${icon}</span>
      </div>
    </div>`;
}

// ── Discover view ─────────────────────────────────────────────────────────────
function _buildDiscoverView() {
  const resultsHtml = _discoverResults.length
    ? _discoverResults.map(p => _buildProfileCard(p)).join('')
    : `<div style="color:var(--muted);font-size:0.76rem;text-align:center;padding:28px 0;line-height:1.6">Search for people by name or username</div>`;

  return `
    <div style="position:relative;margin-bottom:16px">
      <input id="discoverSearch" type="text" placeholder="Search by name or @username…"
        style="width:100%;box-sizing:border-box;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:0.82rem;color:var(--cream);outline:none;font-family:inherit"
        oninput="onDiscoverSearch(this.value)" autocomplete="off">
    </div>
    <div id="discoverResults">${resultsHtml}</div>`;
}

function _buildProfileCard(p) {
  const isFollowing = _communityFollowing.includes(p.id);
  const name    = p.display_name || p.username || 'Anonymous';
  const initial = (name[0] || '?').toUpperCase();
  const avatar  = p.avatar_url
    ? `<img src="${escapeAttr(p.avatar_url)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">`
    : `<div style="width:44px;height:44px;border-radius:50%;background:var(--border-lt);display:flex;align-items:center;justify-content:center;font-size:1rem;color:var(--muted);flex-shrink:0;font-weight:600">${escapeHtml(initial)}</div>`;

  const shares = [
    p.share_fitness  && 'Fitness',
    p.share_food     && 'Food',
    p.share_projects && 'Projects',
    p.share_media    && 'Media'
  ].filter(Boolean);

  return `
    <div class="card" style="padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px">
      <div style="flex:1;display:flex;align-items:center;gap:12px;cursor:pointer;min-width:0" onclick="openProfileOverlay('${escapeAttr(p.id)}')">
        ${avatar}
        <div style="min-width:0">
          <div style="font-size:0.84rem;color:var(--cream);font-weight:600;margin-bottom:2px">${escapeHtml(name)}</div>
          ${p.username ? `<div style="font-size:0.65rem;color:var(--muted);font-family:'DM Mono',monospace">@${escapeHtml(p.username)}</div>` : ''}
          ${p.bio ? `<div style="font-size:0.70rem;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(p.bio)}</div>` : ''}
          ${shares.length ? `<div style="font-size:0.60rem;color:var(--muted);margin-top:4px;font-family:'DM Mono',monospace">${shares.join(' · ')}</div>` : ''}
        </div>
      </div>
      <button class="btn ${isFollowing ? 'btn-g' : 'btn-p'}" style="font-size:0.68rem;padding:6px 14px;flex-shrink:0"
        onclick="toggleFollow('${escapeAttr(p.id)}',this)">${isFollowing ? 'Following' : 'Follow'}</button>
    </div>`;
}

async function onDiscoverSearch(q) {
  clearTimeout(_discoverSearchT);
  _discoverSearchT = setTimeout(async () => {
    const el = eid('discoverResults');
    if (!el) return;
    if (!q.trim()) {
      _discoverResults = [];
      el.innerHTML = `<div style="color:var(--muted);font-size:0.76rem;text-align:center;padding:28px 0">Search for people by name or @username</div>`;
      return;
    }
    el.innerHTML = `<div style="color:var(--muted);font-size:0.76rem;text-align:center;padding:16px 0">Searching…</div>`;
    _discoverResults = await searchCommunityProfiles(q.trim());
    el.innerHTML = _discoverResults.length
      ? _discoverResults.map(p => _buildProfileCard(p)).join('')
      : `<div style="color:var(--muted);font-size:0.76rem;text-align:center;padding:28px 0">No results found</div>`;
  }, 400);
}

async function toggleFollow(userId, btn) {
  const isFollowing = _communityFollowing.includes(userId);
  btn.disabled = true;
  if (isFollowing) {
    await unfollowUser(userId);
    _communityFollowing = _communityFollowing.filter(id => id !== userId);
    btn.textContent = 'Follow';
    btn.className   = 'btn btn-p';
  } else {
    await followUser(userId);
    _communityFollowing = [..._communityFollowing, userId];
    btn.textContent = 'Following';
    btn.className   = 'btn btn-g';
  }
  btn.style.cssText = 'font-size:0.68rem;padding:6px 14px;flex-shrink:0';
  btn.disabled = false;
}

// ── My Profile view ───────────────────────────────────────────────────────────
function _buildMyProfileView() {
  const p = currentProfile || {};
  if (!p.is_public) {
    return `
      <div style="text-align:center;padding:56px 0">
        <div style="font-size:2.2rem;margin-bottom:14px">🔒</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:1.05rem;color:var(--cream);margin-bottom:8px">Your profile is private</div>
        <div style="font-size:0.72rem;color:var(--muted);line-height:1.6;max-width:260px;margin:0 auto 20px">Enable your community profile in Settings → Profile to share your activity with others</div>
        <button class="btn btn-p" style="font-size:0.76rem" onclick="openSettings()">Open Settings</button>
      </div>`;
  }

  const name    = p.display_name || p.username || 'You';
  const initial = (name[0] || '?').toUpperCase();
  const avatar  = p.avatar_url
    ? `<img src="${escapeAttr(p.avatar_url)}" style="width:68px;height:68px;border-radius:50%;object-fit:cover">`
    : `<div style="width:68px;height:68px;border-radius:50%;background:var(--border-lt);display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:var(--muted);font-weight:600">${escapeHtml(initial)}</div>`;

  const shares = [
    p.share_fitness  && 'Fitness',
    p.share_food     && 'Food',
    p.share_projects && 'Projects',
    p.share_media    && 'Media'
  ].filter(Boolean);

  return `
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:flex;justify-content:center;margin-bottom:12px">${avatar}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:1.15rem;color:var(--cream);font-weight:600">${escapeHtml(name)}</div>
      ${p.username ? `<div style="font-size:0.68rem;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px">@${escapeHtml(p.username)}</div>` : ''}
      ${p.bio ? `<div style="font-size:0.76rem;color:var(--muted);margin-top:10px;line-height:1.6;max-width:300px;margin-left:auto;margin-right:auto">${escapeHtml(p.bio)}</div>` : ''}
      ${shares.length ? `
        <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:12px">
          ${shares.map(s => `<span class="fpill">${s}</span>`).join('')}
        </div>` : ''}
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-size:0.68rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace">Community Notes</div>
      <button class="btn btn-p" style="font-size:0.66rem;padding:5px 14px" onclick="openCommunityNoteEditor()">+ New Note</button>
    </div>
    ${_buildCommunityNotesList()}`;
}

function _buildCommunityNotesList() {
  if (!_communityNotes.length) {
    return `<div style="text-align:center;padding:28px 0;color:var(--muted);font-size:0.74rem;line-height:1.6">No community notes yet.<br>Write your first public note!</div>`;
  }
  return _communityNotes.map(n => `
    <div class="card" style="padding:14px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
        <div style="font-size:0.84rem;color:var(--cream);font-weight:600;line-height:1.3">${escapeHtml(n.title || 'Untitled')}</div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button style="background:none;border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:0.62rem;padding:2px 8px;border-radius:5px;font-family:'DM Mono',monospace"
            onclick="openCommunityNoteEditor('${escapeAttr(n.id)}')">Edit</button>
          <button class="icon-del" onclick="deleteCommunityNoteUI('${escapeAttr(n.id)}')">×</button>
        </div>
      </div>
      <div class="markdown-body" style="font-size:0.74rem;color:var(--muted);line-height:1.7">${_renderMarkdown(n.body || '')}</div>
      <div style="font-size:0.60rem;color:var(--muted);margin-top:8px;font-family:'DM Mono',monospace">
        ${n.updated_at ? new Date(n.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
      </div>
    </div>`).join('');
}

// ── Community note editor ─────────────────────────────────────────────────────
function openCommunityNoteEditor(id) {
  _editingCommunityNoteId = id || null;
  const note = id ? _communityNotes.find(n => n.id === id) : null;

  const overlay = document.createElement('div');
  overlay.id = 'communityNoteModal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.72);display:flex;align-items:flex-end;justify-content:center';
  overlay.innerHTML = `
    <div style="background:var(--panel);border:1px solid var(--border-lt);border-radius:18px 18px 0 0;padding:24px;width:100%;max-width:640px;max-height:85vh;overflow-y:auto;box-sizing:border-box">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div style="font-size:0.92rem;color:var(--cream);font-weight:600">${id ? 'Edit Note' : 'New Community Note'}</div>
        <button class="icon-del" onclick="closeCommunityNoteEditor()">×</button>
      </div>
      <div class="mf" style="margin-bottom:14px">
        <label>Title</label>
        <input id="cnTitle" placeholder="Note title…" value="${escapeAttr(note?.title || '')}" style="font-size:0.88rem">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="fpill active" id="cnTabWrite" onclick="toggleCnTab('write',this)">Write</button>
        <button class="fpill" id="cnTabPreview" onclick="toggleCnTab('preview',this)">Preview</button>
      </div>
      <div id="cnWriteArea" class="mf" style="margin-bottom:14px">
        <label style="display:flex;align-items:center;gap:6px">Body <span style="font-size:0.60rem;color:var(--muted);font-weight:400">Markdown supported</span></label>
        <textarea id="cnBody" placeholder="Write in markdown…" rows="12"
          style="font-family:'DM Mono',monospace;font-size:0.76rem;line-height:1.6;resize:vertical">${escapeHtml(note?.body || '')}</textarea>
      </div>
      <div id="cnPreviewArea" style="display:none;border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:14px;min-height:120px">
        <div id="cnPreviewContent" class="markdown-body" style="font-size:0.76rem;color:var(--muted);line-height:1.7"></div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-g" onclick="closeCommunityNoteEditor()">Cancel</button>
        <button class="btn btn-p" onclick="submitCommunityNote()">Save Note</button>
      </div>
    </div>`;

  overlay.addEventListener('click', e => { if (e.target === overlay) closeCommunityNoteEditor(); });
  document.body.appendChild(overlay);
}

function toggleCnTab(tab, btn) {
  eid('cnTabWrite')?.classList.toggle('active', tab === 'write');
  eid('cnTabPreview')?.classList.toggle('active', tab === 'preview');
  if (tab === 'preview') {
    const body = eid('cnBody')?.value || '';
    const pc = eid('cnPreviewContent');
    if (pc) pc.innerHTML = _renderMarkdown(body) || `<span style="color:var(--muted);font-style:italic">Nothing to preview</span>`;
    if (eid('cnWriteArea'))   eid('cnWriteArea').style.display   = 'none';
    if (eid('cnPreviewArea')) eid('cnPreviewArea').style.display = '';
  } else {
    if (eid('cnWriteArea'))   eid('cnWriteArea').style.display   = '';
    if (eid('cnPreviewArea')) eid('cnPreviewArea').style.display = 'none';
  }
}

function closeCommunityNoteEditor() {
  const el = eid('communityNoteModal');
  if (el) el.remove();
}

async function submitCommunityNote() {
  const title = eid('cnTitle')?.value.trim() || '';
  const body  = eid('cnBody')?.value.trim()  || '';
  if (!title && !body) { toast('Add a title or body'); return; }

  const saved = await saveCommunityNote({ id: _editingCommunityNoteId || undefined, title, body });
  if (!saved) { toast('Failed to save note'); return; }

  if (_editingCommunityNoteId) {
    const idx = _communityNotes.findIndex(n => n.id === _editingCommunityNoteId);
    if (idx >= 0) _communityNotes[idx] = saved; else _communityNotes.unshift(saved);
  } else {
    _communityNotes.unshift(saved);
    pushFeedEvent('community_note', saved.id, { title: saved.title });
  }

  closeCommunityNoteEditor();
  if (_communityView === 'my-profile') {
    const el = eid('communityContent');
    if (el) el.innerHTML = _buildMyProfileView();
  }
  toast('Note saved');
}

async function deleteCommunityNoteUI(id) {
  if (!confirm('Delete this community note? This cannot be undone.')) return;
  await deleteCommunityNote(id);
  _communityNotes = _communityNotes.filter(n => n.id !== id);
  if (_communityView === 'my-profile') {
    const el = eid('communityContent');
    if (el) el.innerHTML = _buildMyProfileView();
  }
}

// ── Profile overlay ───────────────────────────────────────────────────────────
async function openProfileOverlay(userId) {
  // Don't open overlay for own profile
  if (currentUser && userId === currentUser.id) {
    switchCommunityView('my-profile');
    return;
  }

  // Show skeleton while loading
  const overlay = document.createElement('div');
  overlay.id = 'profileOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.78);display:flex;align-items:flex-end;justify-content:center';
  overlay.innerHTML = `
    <div style="background:var(--ink);border:1px solid var(--border-lt);border-radius:18px 18px 0 0;width:100%;max-width:640px;max-height:90vh;overflow-y:auto;padding:24px;box-sizing:border-box">
      <div style="display:flex;justify-content:flex-start;margin-bottom:16px">
        <button class="btn btn-g" style="font-size:0.70rem;padding:6px 14px" onclick="closeProfileOverlay()">← Back</button>
      </div>
      <div style="text-align:center;padding:40px 0;color:var(--muted);font-size:0.76rem">Loading profile…</div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeProfileOverlay(); });
  document.body.appendChild(overlay);

  // Fetch data in parallel
  const [profile, feedData, notesRes, followerCount] = await Promise.all([
    fetchPublicProfileById(userId),
    loadCommunityFeedByUser(userId),
    sb.from('community_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    loadFollowersCount(userId)
  ]);

  if (!profile) {
    const inner = overlay.querySelector('div > div:last-child');
    if (inner) inner.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--muted);font-size:0.76rem">Profile not found or is private</div>`;
    return;
  }

  const isFollowing = _communityFollowing.includes(userId);
  const name    = profile.display_name || profile.username || 'Anonymous';
  const initial = (name[0] || '?').toUpperCase();
  const avatar  = profile.avatar_url
    ? `<img src="${escapeAttr(profile.avatar_url)}" style="width:72px;height:72px;border-radius:50%;object-fit:cover">`
    : `<div style="width:72px;height:72px;border-radius:50%;background:var(--border-lt);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--muted);font-weight:600">${escapeHtml(initial)}</div>`;

  const shares = [
    profile.share_fitness  && 'Fitness',
    profile.share_food     && 'Food',
    profile.share_projects && 'Projects',
    profile.share_media    && 'Media'
  ].filter(Boolean);

  const feedEvents = feedData || [];
  const notes      = notesRes?.data || [];

  const profileCtx = { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username };

  const inner = overlay.querySelector('[style*="border-radius:18px"]');
  if (inner) inner.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <button class="btn btn-g" style="font-size:0.70rem;padding:6px 14px" onclick="closeProfileOverlay()">← Back</button>
      <button id="overlayFollowBtn" class="btn ${isFollowing ? 'btn-g' : 'btn-p'}" style="font-size:0.72rem;padding:7px 18px"
        onclick="toggleFollowFromOverlay('${escapeAttr(userId)}',this)">${isFollowing ? 'Following' : 'Follow'}</button>
    </div>
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:flex;justify-content:center;margin-bottom:12px">${avatar}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:1.15rem;color:var(--cream);font-weight:600">${escapeHtml(name)}</div>
      ${profile.username ? `<div style="font-size:0.68rem;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px">@${escapeHtml(profile.username)}</div>` : ''}
      <div style="font-size:0.66rem;color:var(--muted);margin-top:4px;font-family:'DM Mono',monospace">${followerCount} follower${followerCount !== 1 ? 's' : ''}</div>
      ${profile.bio ? `<div style="font-size:0.76rem;color:var(--muted);margin-top:10px;line-height:1.6;max-width:300px;margin-left:auto;margin-right:auto">${escapeHtml(profile.bio)}</div>` : ''}
      ${shares.length ? `<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:12px">${shares.map(s => `<span class="fpill">${s}</span>`).join('')}</div>` : ''}
    </div>

    ${feedEvents.length ? `
      <div style="font-size:0.66rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:10px">Recent Activity</div>
      ${feedEvents.slice(0, 10).map(ev => _buildFeedCard({ ...ev, profiles: profileCtx })).join('')}
    ` : ''}

    ${notes.length ? `
      <div style="font-size:0.66rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin:20px 0 10px">Community Notes</div>
      ${notes.map(n => `
        <div class="card" style="padding:14px;margin-bottom:10px">
          <div style="font-size:0.84rem;color:var(--cream);font-weight:600;margin-bottom:8px">${escapeHtml(n.title || 'Untitled')}</div>
          <div class="markdown-body" style="font-size:0.74rem;color:var(--muted);line-height:1.7">${_renderMarkdown(n.body || '')}</div>
          <div style="font-size:0.60rem;color:var(--muted);margin-top:8px;font-family:'DM Mono',monospace">
            ${n.updated_at ? new Date(n.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
          </div>
        </div>`).join('')}
    ` : ''}
  `;
}

function closeProfileOverlay() {
  const el = eid('profileOverlay');
  if (el) el.remove();
}

async function toggleFollowFromOverlay(userId, btn) {
  btn.disabled = true;
  const isFollowing = _communityFollowing.includes(userId);
  if (isFollowing) {
    await unfollowUser(userId);
    _communityFollowing = _communityFollowing.filter(id => id !== userId);
    btn.textContent = 'Follow';
    btn.className   = 'btn btn-p';
  } else {
    await followUser(userId);
    _communityFollowing = [..._communityFollowing, userId];
    btn.textContent = 'Following';
    btn.className   = 'btn btn-g';
  }
  btn.style.cssText = 'font-size:0.72rem;padding:7px 18px';
  btn.disabled = false;
}

// ── Refresh feed after a feed event is pushed ─────────────────────────────────
async function refreshCommunityIfOpen() {
  if (!_communityLoaded) return;
  _communityFeed = await loadCommunityFeed(_communityFollowing);
  if (_communityView === 'feed') {
    const el = eid('communityContent');
    if (el) el.innerHTML = _buildFeedView();
  }
}
