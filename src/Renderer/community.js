'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// community.js — Community tab: Feed, Discover, My Profile
// ─────────────────────────────────────────────────────────────────────────────

let _communityView    = 'feed';
let _communityNotes   = [];
let _communityFeed    = [];
let _communityPosts   = [];
let _communityDiscoverPosts = [];
let _communityFollowing = [];
let _communityPendingFollows = [];
let _communityFollowRequests = [];
let _communityLoaded  = false;
let _discoverResults  = [];       // active search results (non-empty while searching)
let _discoverSearchT  = null;
let _discoverRanked   = [];       // scored + sorted profiles for ranked feed
let _discoverPage     = 0;        // pagination cursor for ranked feed
let _discoverLoading  = false;
let _editingCommunityNoteId = null;
let _postAttachment = null;
let _expandedPostId = null;
let _postComments = {};
let _postCommentsLoading = {};

const DISCOVER_PAGE_SIZE = 12;

// ── Interest scoring ──────────────────────────────────────────────────────────

// Derives viewer's interest weights from their local data (0–1 each, sums to 1)
function _computeViewerInterests() {
  const fitnessAct  = (S.workoutHistory || []).length + Object.keys(S.cardioLog   || {}).length;
  const foodAct     = Object.keys(S.foodLog    || {}).length;
  const mediaAct    = (S.media          || []).length;
  const projectsAct = (S.projects       || []).length;

  const fw = Math.min(fitnessAct  / 15, 1);
  const fo = Math.min(foodAct     / 20, 1);
  const mw = Math.min(mediaAct    / 10, 1);
  const pw = Math.min(projectsAct /  8, 1);

  const total = fw + fo + mw + pw || 1; // avoid /0
  return { fitness: fw / total, food: fo / total, media: mw / total, projects: pw / total };
}

// Dot product of candidate's share flags against viewer's interest weights
function _scoreProfile(p, interests) {
  return (p.share_fitness  ? interests.fitness  : 0)
       + (p.share_food     ? interests.food     : 0)
       + (p.share_media    ? interests.media    : 0)
       + (p.share_projects ? interests.projects : 0);
}

async function _loadDiscoverRanked() {
  if (_discoverLoading) return;
  _discoverLoading = true;
  const excludeIds = [currentUser?.id, ..._communityFollowing, ..._communityPendingFollows].filter(Boolean);
  const profiles   = await fetchDiscoverProfiles(excludeIds);
  const interests  = _computeViewerInterests();
  _discoverRanked  = profiles
    .map(p => ({ ...p, _score: _scoreProfile(p, interests) }))
    .sort((a, b) => b._score - a._score);
  _discoverPage   = 0;
  _discoverLoading = false;
}

function _discoverLoadMore() {
  _discoverPage++;
  const el = eid('discoverResults');
  if (el) el.innerHTML = _discoverResultsHtml();
}

function _discoverResultsHtml() {
  // Search active — show search results
  if (_discoverResults.length) {
    return _discoverResults.map(p => _buildProfileCard(p)).join('');
  }
  // Ranked feed
  if (_discoverLoading) {
    return `<div style="text-align:center;padding:36px 0;color:var(--muted);font-size:0.76rem">Loading…</div>`;
  }
  if (!_discoverRanked.length) {
    return `<div style="text-align:center;padding:36px 0;color:var(--muted);font-size:0.76rem;line-height:1.6">No public profiles to discover yet</div>`;
  }
  const end     = (_discoverPage + 1) * DISCOVER_PAGE_SIZE;
  const visible = _discoverRanked.slice(0, end);
  const hasMore = _discoverRanked.length > end;
  return visible.map(p => _buildProfileCard(p)).join('')
    + (hasMore ? `<button class="btn btn-g" style="width:100%;margin-top:6px;font-size:0.72rem" onclick="_discoverLoadMore()">Load more</button>` : '');
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function _renderMarkdown(text) {
  if (!text) return '';
  // Community notes are user-generated. Keep this renderer intentionally small
  // and escaped; marked would allow raw HTML without a sanitizer.
  return escapeHtml(text)
    .replace(/^###\s(.+)$/gm, '<h3 style="font-size:0.84rem;color:var(--cream);margin:10px 0 4px">$1</h3>')
    .replace(/^##\s(.+)$/gm, '<h2 style="font-size:0.94rem;color:var(--cream);margin:12px 0 6px">$1</h2>')
    .replace(/^#\s(.+)$/gm, '<h1 style="font-size:1.05rem;color:var(--cream);margin:14px 0 6px">$1</h1>')
    .replace(/`([^`]+?)`/g, '<code style="font-family:\'DM Mono\',monospace;background:var(--mid);padding:1px 4px;border-radius:3px">$1</code>')
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
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
    <div style="display:flex;gap:6px;margin-bottom:20px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding-bottom:2px">
      <button class="fpill${_communityView==='feed'?' active':''}" style="flex-shrink:0;min-height:34px;padding:6px 16px" onclick="switchCommunityView('feed')">Feed</button>
      <button class="fpill${_communityView==='discover'?' active':''}" style="flex-shrink:0;min-height:34px;padding:6px 16px" onclick="switchCommunityView('discover')">Discover</button>
      <button class="fpill${_communityView==='my-profile'?' active':''}" style="flex-shrink:0;min-height:34px;padding:6px 16px" onclick="switchCommunityView('my-profile')">My Profile</button>
    </div>
    <div id="communityContent"></div>
  `;

  if (!_communityLoaded) {
    _communityLoaded = true;
    const el = eid('communityContent');
    if (el) el.innerHTML = _buildLoadingState();
    _communityFollowing = await loadFollowing();
    _communityPendingFollows = await loadSentFollowRequests();
    _communityPosts     = await loadCommunityPostsHome(_communityFollowing);
    _communityFeed      = await loadCommunityFeed(_communityFollowing);
    _communityNotes     = await loadCommunityNotes();
    _communityFollowRequests = await loadFollowRequests();
    _communityDiscoverPosts = await loadCommunityPostsDiscover(_communityFollowing);
    // Reset ranked discover cache so it re-scores with the fresh follow list
    _discoverRanked  = [];
    _discoverPage    = 0;
    _discoverLoading = false;
    await _loadDiscoverRanked();
  }

  _renderCommunityContent();
}

function switchCommunityView(v) {
  _communityView = v;
  // Reset my-profile cache so data is fresh each time
  if (v === 'my-profile') {
    _myProfileCache = {};
    _myProfileTab   = 'notes';
  }
  // Update top-level nav pills
  document.querySelectorAll('#panel-community .fpill').forEach(btn => {
    btn.classList.toggle('active',
      btn.textContent === 'Feed'       && v === 'feed' ||
      btn.textContent === 'Discover'   && v === 'discover' ||
      btn.textContent === 'My Profile' && v === 'my-profile'
    );
  });
  _renderCommunityContent();
}

function _renderCommunityContent() {
  const el = eid('communityContent');
  if (!el) return;
  if (_communityView === 'feed')         el.innerHTML = _buildPostsFeedView();
  else if (_communityView === 'discover') el.innerHTML = _buildPostsDiscoverView();
  else if (_communityView === 'my-profile') el.innerHTML = _buildMyProfileView();
}

function _buildLoadingState() {
  return `<div style="text-align:center;padding:48px 0;color:var(--muted);font-size:0.78rem">Loading…</div>`;
}

// ── Feed view ─────────────────────────────────────────────────────────────────
function _buildPostsFeedView() {
  const composer = _buildPostComposer();
  if (!_communityPosts.length) {
    const suggestions = _buildSuggestedProfiles(5);
    return composer + `
      <div style="text-align:center;padding:40px 0">
        <div style="font-family:'Cormorant Garamond',serif;font-size:1.05rem;color:var(--cream);margin-bottom:6px">Your feed is empty</div>
        <div style="font-size:0.72rem;color:var(--muted);line-height:1.6;max-width:280px;margin:0 auto 18px">Follow people or publish your first accountability post.</div>
        <button class="btn btn-p" style="font-size:0.76rem" onclick="switchCommunityView('discover')">Discover Posts</button>
      </div>
      ${suggestions}`;
  }
  return composer + _communityPosts.map(p => _buildPostCard(p)).join('');
}

function _buildPostComposer() {
  if (!currentUser) return '';
  const att = _postAttachment;
  return `
    <div class="card" style="padding:14px;margin-bottom:14px">
      <textarea id="communityPostBody" maxlength="500" rows="3" placeholder="Share what you actually logged..."
        oninput="updatePostCharCount(this)"
        style="width:100%;box-sizing:border-box;background:var(--mid);border:1px solid var(--border);border-radius:8px;color:var(--cream);font:inherit;font-size:0.78rem;line-height:1.5;padding:10px;resize:vertical;outline:none"></textarea>
      <div id="postAttachmentPreview" style="margin-top:8px">${att ? _attachmentPreview(att) : ''}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-g" style="font-size:0.64rem;padding:5px 10px" onclick="openProgressPicker()">Add progress</button>
        <div style="display:flex;align-items:center;gap:10px">
          <span id="postCharCount" style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace">0/500</span>
          <button class="btn btn-p" style="font-size:0.68rem;padding:6px 14px" onclick="submitCommunityPost()">Post</button>
        </div>
      </div>
    </div>`;
}

function updatePostCharCount(el) {
  const cc = eid('postCharCount');
  if (cc) cc.textContent = `${(el?.value || '').length}/500`;
}

async function submitCommunityPost() {
  const post = await createCommunityPost(eid('communityPostBody')?.value || '', _postAttachment);
  if (!post) { toast('Write something or attach progress first'); return; }
  _postAttachment = null;
  _communityPosts = await loadCommunityPostsHome(_communityFollowing);
  _communityDiscoverPosts = await loadCommunityPostsDiscover(_communityFollowing);
  _renderCommunityContent();
  toast('Posted');
}

function _attachmentPreview(att) {
  const d = att?.data || {};
  const title = d.title || d.name || d.label || 'Progress';
  const meta = d.meta || d.date || '';
  return `<div style="border:1px solid var(--border);border-radius:8px;padding:9px 10px;background:var(--mid)">
    <div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.08em">${escapeHtml(String(att?.type || '').replace('_', ' '))}</div>
    <div style="font-size:0.78rem;color:var(--cream);margin-top:3px">${escapeHtml(title)}</div>
    ${meta ? `<div style="font-size:0.62rem;color:var(--muted);margin-top:2px">${escapeHtml(meta)}</div>` : ''}
  </div>`;
}

function _buildPostCard(post) {
  const profile = post.profiles || {};
  const name = profile.display_name || profile.username || 'Anonymous';
  const initial = (name[0] || '?').toUpperCase();
  const avatar = profile.avatar_url
    ? `<img src="${escapeAttr(profile.avatar_url)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0">`
    : `<div style="width:36px;height:36px;border-radius:50%;background:var(--border-lt);display:flex;align-items:center;justify-content:center;font-size:0.82rem;color:var(--muted);flex-shrink:0;font-weight:600">${escapeHtml(initial)}</div>`;
  const mine = currentUser && post.user_id === currentUser.id;
  const attachment = post.attachment_type ? _attachmentPreview({ type: post.attachment_type, data: post.attachment || {} }) : '';
  const dateStr = post.created_at ? new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const commentsOpen = _expandedPostId === post.id;
  const liked = !!post.likedByMe;
  return `<div class="card" style="padding:13px 14px;margin-bottom:10px">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <div onclick="openProfileOverlay('${escapeAttr(post.user_id)}')" style="cursor:pointer;flex-shrink:0">${avatar}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;gap:8px">
          <div><span style="font-size:0.78rem;color:var(--cream);font-weight:600">${escapeHtml(name)}</span>${dateStr ? `<span style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;margin-left:6px">${dateStr}</span>` : ''}</div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.62rem" onclick="reportPost('${post.id}')">Report</button>
            ${mine ? `<button style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.62rem" onclick="deletePost('${post.id}')">Delete</button>` : ''}
          </div>
        </div>
        ${post.body ? `<div style="font-size:0.78rem;color:var(--muted-lt);line-height:1.55;margin-top:7px;white-space:pre-wrap">${escapeHtml(post.body)}</div>` : ''}
        ${attachment ? `<div style="margin-top:9px">${attachment}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button class="btn ${liked ? 'btn-p' : 'btn-g'}" style="font-size:0.60rem;padding:4px 9px;min-height:28px" onclick="togglePostLike('${escapeAttr(post.id)}')">${liked ? 'Liked' : 'Like'} &middot; ${post.likeCount || 0}</button>
          <button class="btn ${commentsOpen ? 'btn-p' : 'btn-g'}" style="font-size:0.60rem;padding:4px 9px;min-height:28px" onclick="togglePostComments('${escapeAttr(post.id)}')">Comments &middot; ${post.commentCount || 0}</button>
        </div>
        ${commentsOpen ? _buildPostCommentsPanel(post) : ''}
      </div>
    </div>
  </div>`;
}

function _findPostById(id) {
  return [..._communityPosts, ..._communityDiscoverPosts].find(p => String(p.id) === String(id));
}

function _updatePostCaches(id, updater) {
  const update = p => String(p.id) === String(id) ? updater({ ...p }) : p;
  _communityPosts = _communityPosts.map(update);
  _communityDiscoverPosts = _communityDiscoverPosts.map(update);
}

function _buildPostCommentsPanel(post) {
  const postId = post.id;
  const loading = !!_postCommentsLoading[postId];
  const comments = _postComments[postId] || [];
  const rows = loading
    ? `<div style="font-size:0.68rem;color:var(--muted);padding:10px 0">Loading comments...</div>`
    : (comments.length ? comments.map(c => _buildCommentRow(postId, c)).join('') : `<div style="font-size:0.68rem;color:var(--muted);padding:8px 0">No comments yet</div>`);

  return `<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
    ${rows}
    <div style="display:flex;gap:8px;align-items:flex-start;margin-top:8px">
      <textarea id="commentInput-${escapeAttr(postId)}" maxlength="300" rows="2" placeholder="Add a comment..."
        style="flex:1;min-width:0;background:var(--mid);border:1px solid var(--border);border-radius:8px;color:var(--cream);font:inherit;font-size:0.74rem;line-height:1.45;padding:8px;resize:vertical;outline:none"></textarea>
      <button class="btn btn-p" style="font-size:0.62rem;padding:6px 10px;min-height:34px" onclick="submitPostComment('${escapeAttr(postId)}')">Send</button>
    </div>
  </div>`;
}

function _buildCommentRow(postId, comment) {
  const profile = comment.profiles || {};
  const name = profile.display_name || profile.username || 'User';
  const mine = currentUser && comment.user_id === currentUser.id;
  const dateStr = comment.created_at ? new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  return `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
      <div style="min-width:0">
        <span style="font-size:0.70rem;color:var(--cream);font-weight:600">${escapeHtml(name)}</span>
        ${dateStr ? `<span style="font-size:0.56rem;color:var(--muted);font-family:'DM Mono',monospace;margin-left:6px">${dateStr}</span>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.58rem;padding:0" onclick="reportPostComment('${escapeAttr(comment.id)}')">Report</button>
        ${mine ? `<button style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.58rem;padding:0" onclick="deletePostCommentUI('${escapeAttr(postId)}','${escapeAttr(comment.id)}')">Delete</button>` : ''}
      </div>
    </div>
    <div style="font-size:0.74rem;color:var(--muted-lt);line-height:1.5;white-space:pre-wrap;margin-top:4px">${escapeHtml(comment.body || '')}</div>
  </div>`;
}

async function togglePostLike(id) {
  const post = _findPostById(id);
  if (!post) return;
  const nextLiked = !post.likedByMe;
  _updatePostCaches(id, p => ({
    ...p,
    likedByMe: nextLiked,
    likeCount: Math.max(0, (p.likeCount || 0) + (nextLiked ? 1 : -1))
  }));
  _renderCommunityContent();
  const ok = await toggleCommunityPostLike(id, nextLiked);
  if (!ok) {
    _updatePostCaches(id, p => ({
      ...p,
      likedByMe: !nextLiked,
      likeCount: Math.max(0, (p.likeCount || 0) + (nextLiked ? -1 : 1))
    }));
    _renderCommunityContent();
    toast('Like failed');
  }
}

async function togglePostComments(id) {
  if (_expandedPostId === id) {
    _expandedPostId = null;
    _renderCommunityContent();
    return;
  }
  _expandedPostId = id;
  if (!_postComments[id]) {
    _postCommentsLoading[id] = true;
    _renderCommunityContent();
    _postComments[id] = await loadCommunityPostComments(id);
    _postCommentsLoading[id] = false;
  }
  _renderCommunityContent();
}

async function submitPostComment(postId) {
  const input = eid(`commentInput-${postId}`);
  const body = input?.value || '';
  const saved = await createCommunityPostComment(postId, body);
  if (!saved) { toast('Comment failed'); return; }
  if (!_postComments[postId]) _postComments[postId] = [];
  _postComments[postId].push(saved);
  _updatePostCaches(postId, p => ({ ...p, commentCount: (p.commentCount || 0) + 1 }));
  _renderCommunityContent();
}

async function deletePostCommentUI(postId, commentId) {
  if (!confirm('Delete this comment?')) return;
  const ok = await deleteCommunityPostComment(commentId);
  if (!ok) { toast('Delete failed'); return; }
  _postComments[postId] = (_postComments[postId] || []).filter(c => String(c.id) !== String(commentId));
  _updatePostCaches(postId, p => ({ ...p, commentCount: Math.max(0, (p.commentCount || 0) - 1) }));
  _renderCommunityContent();
}

async function reportPostComment(commentId) {
  const ok = await reportCommunityComment(commentId, prompt('Report reason (optional):') || '');
  toast(ok ? 'Report sent' : 'Report failed');
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  await deleteCommunityPost(id);
  _communityPosts = _communityPosts.filter(p => p.id !== id);
  _communityDiscoverPosts = _communityDiscoverPosts.filter(p => p.id !== id);
  _renderCommunityContent();
}

async function reportPost(id) {
  const ok = await reportCommunityPost(id, prompt('Report reason (optional):') || '');
  toast(ok ? 'Report sent' : 'Report failed');
}

function openProgressPicker() {
  const opts = [];
  const lastWorkout = (S.workoutHistory || [])[0];
  if (lastWorkout) opts.push({ type: 'workout', label: `Workout: ${lastWorkout.title || 'Workout'}`, data: { title: lastWorkout.title || 'Workout', meta: `${(lastWorkout.exercises || []).length} exercises` } });
  const fd = typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10);
  const foods = S.foodLog?.[fd] || [];
  if (foods.length) opts.push({ type: 'food_day', label: `Food day: ${foods.length} items`, data: { title: 'Food day', meta: `${Math.round(foods.reduce((s, f) => s + (f.kcal || 0), 0))} kcal` } });
  const finished = (S.media || []).find(m => ['done', 'finished'].includes(String(m.status || '').toLowerCase()));
  if (finished) opts.push({ type: 'media_finish', label: `Media: ${finished.title}`, data: { title: finished.title || 'Finished media', meta: finished.mediaType || finished.type || '' } });
  const project = (S.projects || []).find(p => String(p.status || '').toLowerCase() === 'complete');
  if (project) opts.push({ type: 'project_complete', label: `Project: ${project.title}`, data: { title: project.title || 'Completed project', meta: project.type || '' } });
  if (!opts.length) { toast('No recent progress to attach yet'); return; }
  const idx = parseInt(prompt(opts.map((o, i) => `${i + 1}. ${o.label}`).join('\n') + '\n\nChoose a number:'), 10) - 1;
  if (!Number.isInteger(idx) || !opts[idx]) return;
  _postAttachment = { type: opts[idx].type, data: opts[idx].data };
  _renderCommunityContent();
}

function _buildPostsDiscoverView() {
  const suggestions = _buildSuggestedProfiles(5);
  if (!_communityDiscoverPosts.length) {
    return `<div style="text-align:center;padding:32px 0;color:var(--muted);font-size:0.76rem;line-height:1.6">No public posts yet.</div>${suggestions}`;
  }
  return `
    <div style="font-size:0.56rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono',monospace;margin-bottom:10px">Public Posts</div>
    ${_communityDiscoverPosts.map(p => _buildPostCard(p)).join('')}
    ${suggestions}`;
}

function _buildSuggestedProfiles(limit = 5) {
  const rows = (_discoverRanked || []).slice(0, limit);
  if (!rows.length) return '';
  return `<div style="margin-top:16px">
    <div style="font-size:0.56rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono',monospace;margin-bottom:10px">People to follow</div>
    ${rows.map(p => _buildProfileCard(p)).join('')}
  </div>`;
}

function _buildFeedView() {
  if (!_communityFollowing.length) {
    return `
      <div style="text-align:center;padding:56px 0">
        <div style="font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--border-lt);margin-bottom:14px">◆</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:1.05rem;color:var(--cream);margin-bottom:6px">Your feed is empty</div>
        <div style="font-size:0.72rem;color:var(--muted);line-height:1.6;max-width:260px;margin:0 auto 20px">Follow people to see their workouts, food, projects and media here</div>
        <button class="btn btn-p" style="font-size:0.76rem" onclick="switchCommunityView('discover')">Discover People</button>
      </div>`;
  }
  if (!_communityFeed.length) {
    return `<div style="text-align:center;padding:48px 0"><div style="font-size:0.56rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace">No recent activity</div></div>`;
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
    case 'community_note': {
      icon = '◆';
      typeLabel = 'shared a note';
      const noteId = `note-body-${ev.id || Math.random().toString(36).slice(2)}`;
      const noteTitle = summary.title || '';
      const noteBody  = summary.body  || summary.content || '';
      detail = `
        <div style="margin-top:4px">
          ${noteTitle ? `<div style="font-size:0.78rem;color:var(--cream);font-family:'Cormorant Garamond',serif;line-height:1.4">${escapeHtml(noteTitle)}</div>` : ''}
          ${noteBody ? `
            <div id="${noteId}" style="display:none;font-size:0.74rem;color:var(--muted-lt);line-height:1.65;margin-top:6px;padding-top:6px;border-top:1px solid var(--border);white-space:pre-wrap">${escapeHtml(noteBody.slice(0,600))}${noteBody.length>600?'…':''}</div>
            <button onclick="event.stopPropagation();var el=document.getElementById('${noteId}');var expanded=el.style.display!=='none';el.style.display=expanded?'none':'block';this.textContent=expanded?'Read more':'Collapse';"
              style="margin-top:5px;background:none;border:none;color:var(--blush);font-size:0.62rem;font-family:'DM Mono',monospace;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;padding:0">Read more</button>
          ` : ''}
        </div>`;
      break;
    }
    default:
      icon = '·'; typeLabel = ev.event_type; detail = '';
  }

  const isNote = ev.event_type === 'community_note';
  const cardClick = isNote ? '' : `onclick="openProfileOverlay('${escapeAttr(ev.user_id)}')"`;
  const iconStyle = isNote
    ? `font-family:'Cormorant Garamond',serif;font-size:1rem;color:var(--blush);flex-shrink:0`
    : `font-size:1.1rem;flex-shrink:0`;
  return `
    <div class="card" style="padding:12px 14px;margin-bottom:10px;${isNote?'':'cursor:pointer'}" ${cardClick}>
      <div style="display:flex;align-items:center;gap:10px">
        <div onclick="openProfileOverlay('${escapeAttr(ev.user_id)}')" style="cursor:pointer;flex-shrink:0">${avatar}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.78rem;color:var(--cream);line-height:1.4">
            <span style="font-weight:600;cursor:pointer" onclick="openProfileOverlay('${escapeAttr(ev.user_id)}')">${escapeHtml(name)}</span>
            <span style="color:var(--muted)"> ${typeLabel}</span>
            ${dateStr ? `<span style="font-size:0.62rem;color:var(--muted);margin-left:6px;font-family:'DM Mono',monospace">${dateStr}</span>` : ''}
          </div>
          ${detail}
        </div>
        <span style="${iconStyle}">${icon}</span>
      </div>
    </div>`;
}

// ── Discover view ─────────────────────────────────────────────────────────────
function _buildDiscoverView() {
  // Kick off ranked load if not already done (fire-and-forget, renders inline)
  if (!_discoverRanked.length && !_discoverLoading) {
    _loadDiscoverRanked().then(() => {
      const el = eid('discoverResults');
      if (el && !_discoverResults.length) el.innerHTML = _discoverResultsHtml();
    });
  }

  const kicker = !_discoverResults.length && _discoverRanked.length
    ? `<div style="font-size:0.56rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono',monospace;margin-bottom:10px">Suggested for you</div>`
    : '';

  return `
    <div style="position:relative;margin-bottom:14px">
      <input id="discoverSearch" type="text" placeholder="Search by name or @username…"
        style="width:100%;box-sizing:border-box;background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:16px;color:var(--cream);outline:none;font-family:inherit"
        oninput="onDiscoverSearch(this.value)" autocomplete="off">
    </div>
    ${kicker}
    <div id="discoverResults">${_discoverResultsHtml()}</div>`;
}

function _buildProfileCard(p) {
  const isFollowing = _communityFollowing.includes(p.id);
  const isPending = _communityPendingFollows.includes(p.id);
  const isPrivate = p.is_public === false;
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
      <button class="btn ${isFollowing || isPending ? 'btn-g' : 'btn-p'}" style="font-size:0.68rem;padding:6px 14px;flex-shrink:0;min-height:36px;min-width:78px"
        onclick="toggleFollow('${escapeAttr(p.id)}',this)">${isFollowing ? 'Following' : (isPending ? 'Pending' : (isPrivate ? 'Request' : 'Follow'))}</button>
    </div>`;
}

async function onDiscoverSearch(q) {
  clearTimeout(_discoverSearchT);
  _discoverSearchT = setTimeout(async () => {
    const el = eid('discoverResults');
    if (!el) return;
    if (!q.trim()) {
      // Cleared — restore ranked feed
      _discoverResults = [];
      el.innerHTML = _discoverResultsHtml();
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
  const isPending = _communityPendingFollows.includes(userId);
  btn.disabled = true;
  if (isFollowing || isPending) {
    await unfollowUser(userId);
    _communityFollowing = _communityFollowing.filter(id => id !== userId);
    _communityPendingFollows = _communityPendingFollows.filter(id => id !== userId);
    btn.textContent = 'Follow';
    btn.className   = 'btn btn-p';
    // Re-add to ranked discover feed (re-score with current interests)
    const interests = _computeViewerInterests();
    const profile   = await fetchPublicProfileById(userId);
    if (profile) {
      _discoverRanked = [..._discoverRanked, { ...profile, _score: _scoreProfile(profile, interests) }]
        .sort((a, b) => b._score - a._score);
    }
  } else {
    const result = await followUser(userId);
    if (result === 'pending') {
      _communityPendingFollows = [...new Set([..._communityPendingFollows, userId])];
      btn.textContent = 'Pending';
      btn.className   = 'btn btn-g';
    } else if (result === 'following') {
      _communityFollowing = [..._communityFollowing, userId];
      btn.textContent = 'Following';
      btn.className   = 'btn btn-g';
      _discoverRanked = _discoverRanked.filter(p => p.id !== userId);
    } else {
      btn.textContent = 'Follow';
      btn.className   = 'btn btn-p';
      toast('Follow failed');
    }
  }
  btn.style.cssText = 'font-size:0.68rem;padding:6px 14px;flex-shrink:0;min-height:36px;min-width:78px';
  btn.disabled = false;
}

// ── My Profile view ───────────────────────────────────────────────────────────
let _myProfileTab   = 'notes';
let _myProfileCache = {};   // { fitness, food, projects, media, followers, following }
let _myFollowerCount = 0;
let _myFollowingCount = 0;

async function _initMyProfile() {
  if (!currentUser) return;
  // Fetch counts in parallel
  const [fCount, followingIds] = await Promise.all([
    loadFollowersCount(currentUser.id),
    loadFollowing()
  ]);
  _myFollowerCount  = fCount;
  _myFollowingCount = followingIds.length;
  // Re-render the header counts
  const cEl = eid('myProfileFollowCounts');
  if (cEl) cEl.innerHTML = _myProfileFollowCountsHtml();
}

function _myProfileFollowCountsHtml() {
  return `
    <button onclick="switchMyProfileTab('followers')"
      style="background:none;border:none;cursor:pointer;padding:0;text-align:center">
      <div style="font-size:0.92rem;color:var(--cream);font-family:'DM Mono',monospace;font-weight:600">${_myFollowerCount}</div>
      <div style="font-size:0.56rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em">Followers</div>
    </button>
    <button onclick="switchMyProfileTab('following')"
      style="background:none;border:none;cursor:pointer;padding:0;text-align:center">
      <div style="font-size:0.92rem;color:var(--cream);font-family:'DM Mono',monospace;font-weight:600">${_myFollowingCount}</div>
      <div style="font-size:0.56rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em">Following</div>
    </button>`;
}

function _buildMyProfileView() {
  const p = currentProfile || {};
  if (!p.is_public) {
    return `
      <div style="text-align:center;padding:56px 0">
        <div style="font-family:'Cormorant Garamond',serif;font-size:1.05rem;color:var(--cream);margin-bottom:8px">Your profile is private</div>
        <div style="font-size:0.72rem;color:var(--muted);line-height:1.6;max-width:280px;margin:0 auto 20px">Your posts are visible only to approved followers. Public profiles appear in Discover.</div>
        ${_buildFollowRequestsPanel()}
        <button class="btn btn-p" style="font-size:0.76rem" onclick="openSettings()">Open Settings</button>
      </div>`;
  }

  const name    = p.display_name || p.username || 'You';
  const initial = (name[0] || '?').toUpperCase();
  const avatar  = p.avatar_url
    ? `<img src="${escapeAttr(p.avatar_url)}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--border-lt)">`
    : `<div style="width:72px;height:72px;border-radius:50%;background:var(--border-lt);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--muted);font-weight:600">${escapeHtml(initial)}</div>`;

  // Build tab list — always show Notes; add data tabs only if user shares them
  const tabs = [
    { id: 'notes',     label: 'Notes' },
    p.share_fitness  && { id: 'fitness',  label: 'Fitness' },
    p.share_food     && { id: 'food',     label: 'Food' },
    p.share_projects && { id: 'projects', label: 'Projects' },
    p.share_media    && { id: 'media',    label: 'Media' },
    { id: 'followers', label: 'Followers' },
    { id: 'following', label: 'Following' },
  ].filter(Boolean);

  const tabStrip = tabs.map(t =>
    `<button class="fpill${_myProfileTab === t.id ? ' active' : ''}" data-mptab="${t.id}"
      onclick="switchMyProfileTab('${t.id}')"
      style="white-space:nowrap;flex-shrink:0;min-height:34px;padding:6px 14px">${t.label}</button>`
  ).join('');

  // Kick off counts async
  _initMyProfile();

  return `
    <div style="text-align:center;margin-bottom:20px">
      <div style="display:flex;justify-content:center;margin-bottom:12px">${avatar}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:1.15rem;color:var(--cream);font-weight:600">${escapeHtml(name)}</div>
      ${p.username ? `<div style="font-size:0.68rem;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px">@${escapeHtml(p.username)}</div>` : ''}
      ${p.bio ? `<div style="font-size:0.76rem;color:var(--muted);margin-top:8px;line-height:1.6;max-width:min(300px,100%);margin-left:auto;margin-right:auto;word-break:break-word">${escapeHtml(p.bio)}</div>` : ''}

      <!-- Followers / Following counts -->
      <div id="myProfileFollowCounts" style="display:flex;gap:28px;justify-content:center;margin-top:14px">
        ${_myProfileFollowCountsHtml()}
      </div>
    </div>

    <!-- Tab strip -->
    <div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin-bottom:18px;padding-bottom:4px">
      ${tabStrip}
    </div>

    <!-- Tab content -->
    <div id="myProfileTabContent">
      ${_buildMyProfileTabContent(_myProfileTab)}
    </div>`;
}

async function switchMyProfileTab(tab) {
  _myProfileTab = tab;

  // Update pill states
  document.querySelectorAll('[data-mptab]').forEach(b => {
    b.classList.toggle('active', b.dataset.mptab === tab);
  });

  const content = eid('myProfileTabContent');
  if (!content) return;

  // Lazy-load data on first visit
  if (!_myProfileCache[tab] && ['fitness','food','projects','media','followers','following'].includes(tab)) {
    content.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--muted);font-size:0.76rem">Loading…</div>`;
    const uid = currentUser?.id;
    if (tab === 'fitness')   _myProfileCache.fitness   = await fetchPublicFitness(uid);
    if (tab === 'projects')  _myProfileCache.projects  = await fetchPublicProjects(uid);
    if (tab === 'followers') _myProfileCache.followers = await fetchFollowersList(uid);
    if (tab === 'following') _myProfileCache.following = await fetchFollowingList(uid);

    // Use local state for food and media — avoids sync delay and RLS edge cases
    if (tab === 'food') {
      const foodLog = (typeof S !== 'undefined' && S.foodLog) ? S.foodLog : {};
      const entries = [];
      for (const [date, dayEntries] of Object.entries(foodLog)) {
        for (const e of (dayEntries || [])) {
          entries.push({
            log_date:  date,
            name:      e.name    || '',
            brand:     e.brand   || '',
            meal_type: e.meal    || 'other',
            calories:  e.kcal    || 0,
            protein_g: e.protein || 0,
            carbs_g:   e.carbs   || 0,
            fat_g:     e.fat     || 0,
            grams:     e.grams   || 0,
          });
        }
      }
      _myProfileCache.food = entries;
    }

    if (tab === 'media') {
      const media = (typeof S !== 'undefined' && S.media) ? S.media : [];
      _myProfileCache.media = media.map(m => ({
        id:           String(m.id),
        media_type:   m.mediaType   || 'book',
        title:        m.title       || '',
        creator:      m.author      || '',
        status:       m.status      || 'unread',
        rating:       m.rating      ?? null,
        cover_url:    m.coverUrl    || '',
        finished_on:  m.finishedOn  || null,
        current_page: m.currentPage || 0,
        total_pages:  m.totalPages  || 0,
      }));
    }
  }

  content.innerHTML = _buildMyProfileTabContent(tab);
}

function _buildMyProfileTabContent(tab) {
  if (tab === 'notes') {
    return `
      ${_buildFollowRequestsPanel()}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-size:0.56rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono',monospace">Community Notes</div>
        <button class="btn btn-p" style="font-size:0.66rem;padding:5px 14px" onclick="openCommunityNoteEditor()">+ New Note</button>
      </div>
      ${_buildCommunityNotesList()}`;
  }

  if (tab === 'fitness')  return _buildFitnessTab(_myProfileCache.fitness);
  if (tab === 'food')     return _buildFoodTab(_myProfileCache.food);
  if (tab === 'projects') return _buildProjectsTab(_myProfileCache.projects);
  if (tab === 'media')    return _buildMediaTab(_myProfileCache.media);

  if (tab === 'followers' || tab === 'following') {
    const list = _myProfileCache[tab];
    if (!list) return `<div style="text-align:center;padding:32px 0;color:var(--muted);font-size:0.76rem">Loading…</div>`;
    if (!list.length) {
      const empty = tab === 'followers' ? 'No followers yet' : 'Not following anyone yet';
      return `<div style="text-align:center;padding:32px 0;color:var(--muted);font-size:0.76rem">${empty}</div>`;
    }
    return list.map(u => {
      const uName    = u.display_name || u.username || 'Anonymous';
      const uInitial = (uName[0] || '?').toUpperCase();
      const uAvatar  = u.avatar_url
        ? `<img src="${escapeAttr(u.avatar_url)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0">`
        : `<div style="width:40px;height:40px;border-radius:50%;background:var(--border-lt);display:flex;align-items:center;justify-content:center;font-size:0.9rem;color:var(--muted);font-weight:600;flex-shrink:0">${escapeHtml(uInitial)}</div>`;
      const isFollowing = _communityFollowing.includes(u.id);
      const isPending = _communityPendingFollows.includes(u.id);
      const isPrivate = u.is_public === false;
      return `
        <div class="card" style="padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
          <div style="flex:1;display:flex;align-items:center;gap:12px;cursor:pointer;min-width:0" onclick="openProfileOverlay('${escapeAttr(u.id)}')">
            ${uAvatar}
            <div style="min-width:0">
              <div style="font-size:0.82rem;color:var(--cream);font-weight:600">${escapeHtml(uName)}</div>
              ${u.username ? `<div style="font-size:0.64rem;color:var(--muted);font-family:'DM Mono',monospace">@${escapeHtml(u.username)}</div>` : ''}
            </div>
          </div>
          <button class="btn ${isFollowing || isPending ? 'btn-g' : 'btn-p'}"
            style="font-size:0.68rem;padding:5px 12px;flex-shrink:0;min-height:34px"
            onclick="toggleFollow('${escapeAttr(u.id)}',this)">${isFollowing ? 'Following' : (isPending ? 'Pending' : (isPrivate ? 'Request' : 'Follow'))}</button>
        </div>`;
    }).join('');
  }

  return '';
}

function _buildFollowRequestsPanel() {
  const reqs = _communityFollowRequests || [];
  if (!reqs.length) return '';
  return `
    <div class="card" style="padding:12px 14px;margin-bottom:14px">
      <div style="font-size:0.56rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono',monospace;margin-bottom:8px">Follow Requests</div>
      ${reqs.map(r => {
        const p = r.profiles || {};
        const name = p.display_name || p.username || 'User';
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid var(--border);padding:8px 0">
          <div style="font-size:0.78rem;color:var(--cream)">${escapeHtml(name)}</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-p" style="font-size:0.62rem;padding:4px 8px" onclick="reviewFollowRequest('${r.requester_id}','approve')">Approve</button>
            <button class="btn btn-g" style="font-size:0.62rem;padding:4px 8px" onclick="reviewFollowRequest('${r.requester_id}','reject')">Reject</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

async function reviewFollowRequest(requesterId, action) {
  const ok = action === 'approve'
    ? await approveFollowRequest(requesterId)
    : await rejectFollowRequest(requesterId);
  if (!ok) { toast('Request update failed'); return; }
  _communityFollowRequests = await loadFollowRequests();
  _renderCommunityContent();
  toast(action === 'approve' ? 'Request approved' : 'Request rejected');
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
    <div style="background:var(--panel);border:1px solid var(--border-lt);border-radius:18px 18px 0 0;padding:16px;width:100%;max-width:640px;max-height:88vh;overflow-y:auto;box-sizing:border-box">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div style="font-size:0.92rem;color:var(--cream);font-weight:600">${id ? 'Edit Note' : 'New Community Note'}</div>
        <button class="icon-del" style="min-width:36px;min-height:36px" onclick="closeCommunityNoteEditor()">×</button>
      </div>
      <div class="mf" style="margin-bottom:14px">
        <label>Title</label>
        <input id="cnTitle" placeholder="Note title…" value="${escapeAttr(note?.title || '')}" style="font-size:16px">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="fpill active" id="cnTabWrite" onclick="toggleCnTab('write',this)">Write</button>
        <button class="fpill" id="cnTabPreview" onclick="toggleCnTab('preview',this)">Preview</button>
      </div>
      <div id="cnWriteArea" class="mf" style="margin-bottom:14px">
        <label style="display:flex;align-items:center;gap:6px">Body <span style="font-size:0.60rem;color:var(--muted);font-weight:400">Markdown supported</span></label>
        <textarea id="cnBody" placeholder="Write in markdown…" rows="10"
          style="font-family:'DM Mono',monospace;font-size:16px;line-height:1.6;resize:vertical">${escapeHtml(note?.body || '')}</textarea>
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

// ── Profile overlay — tabbed ──────────────────────────────────────────────────
let _profileCache         = {};   // { [userId]: { feedEvents, notes, profileCtx, fitness, food, projects, media } }
let _currentProfileUserId = null;
const _profileShowAll     = { fitness: false, food: false };

function _showMoreProfileTab(tab) {
  _profileShowAll[tab] = true;
  const content = eid('profileTabContent');
  if (!content) return;
  const cache = _profileCache[_currentProfileUserId];
  if (!cache) return;
  if (tab === 'fitness') content.innerHTML = _buildFitnessTab(cache.fitness, true);
  if (tab === 'food')    content.innerHTML = _buildFoodTab(cache.food, true);
}

async function openProfileOverlay(userId) {
  if (currentUser && userId === currentUser.id) { switchCommunityView('my-profile'); return; }

  _currentProfileUserId = userId;
  if (!_profileCache[userId]) _profileCache[userId] = {};
  _profileShowAll.fitness = false;
  _profileShowAll.food    = false;

  // Mount skeleton immediately
  const overlay = document.createElement('div');
  overlay.id = 'profileOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(0,0,0,0.78);display:flex;align-items:flex-end;justify-content:center';
  overlay.innerHTML = `
    <div id="profileOverlaySheet" style="background:var(--ink);border:1px solid var(--border-lt);border-radius:18px 18px 0 0;width:100%;max-width:640px;max-height:90vh;overflow-y:auto;padding:16px;box-sizing:border-box">
      <div style="display:flex;justify-content:flex-start;margin-bottom:16px">
        <button class="btn btn-g" style="font-size:0.70rem;padding:6px 14px;min-height:36px" onclick="closeProfileOverlay()">← Back</button>
      </div>
      <div style="text-align:center;padding:40px 0;color:var(--muted);font-size:0.76rem">Loading profile…</div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeProfileOverlay(); });
  document.body.appendChild(overlay);

  // Parallel fetch: profile + activity + follower count
  const [visibleProfile, requestableProfile, feedData, notesRes, followerCount] = await Promise.all([
    fetchVisibleProfileById(userId),
    fetchRequestableProfileById(userId),
    loadCommunityFeedByUser(userId),
    sb.from('community_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    loadFollowersCount(userId)
  ]);
  const profile = visibleProfile || requestableProfile;
  const canViewProfile = !!visibleProfile;

  const sheet = eid('profileOverlaySheet');
  if (!sheet) return;

  if (!profile) {
    sheet.innerHTML = `
      <div style="display:flex;justify-content:flex-start;margin-bottom:16px">
        <button class="btn btn-g" style="font-size:0.70rem;padding:6px 14px" onclick="closeProfileOverlay()">← Back</button>
      </div>
      <div style="text-align:center;padding:40px 0;color:var(--muted);font-size:0.76rem">Profile not found</div>`;
    return;
  }

  // Cache activity data
  const profileCtx = { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username };
  _profileCache[userId].feedEvents  = feedData || [];
  _profileCache[userId].notes       = notesRes?.data || [];
  _profileCache[userId].profileCtx  = profileCtx;

  // Build header
  const isFollowing = _communityFollowing.includes(userId);
  const isPending = _communityPendingFollows.includes(userId);
  const name    = profile.display_name || profile.username || 'Anonymous';
  const initial = (name[0] || '?').toUpperCase();
  const avatar  = profile.avatar_url
    ? `<img src="${escapeAttr(profile.avatar_url)}" style="width:68px;height:68px;border-radius:50%;object-fit:cover">`
    : `<div style="width:68px;height:68px;border-radius:50%;background:var(--border-lt);display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:var(--muted);font-weight:600">${escapeHtml(initial)}</div>`;

  // Build tab strip — only tabs for categories they share
  if (!canViewProfile) {
    sheet.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:18px">
        <button class="btn btn-g" style="font-size:0.70rem;padding:6px 12px;min-height:36px;flex-shrink:0" onclick="closeProfileOverlay()">Back</button>
        <button id="overlayFollowBtn" class="btn ${isPending ? 'btn-g' : 'btn-p'}" style="font-size:0.72rem;padding:7px 16px;min-height:36px;flex-shrink:0"
          onclick="toggleFollowFromOverlay('${escapeAttr(userId)}',this)">${isPending ? 'Pending' : 'Request'}</button>
      </div>
      <div style="text-align:center;padding:12px 0 24px">
        <div style="display:flex;justify-content:center;margin-bottom:10px">${avatar}</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:var(--cream);font-weight:600;word-break:break-word">${escapeHtml(name)}</div>
        ${profile.username ? `<div style="font-size:0.68rem;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px">@${escapeHtml(profile.username)}</div>` : ''}
        <div style="font-size:0.72rem;color:var(--muted);line-height:1.6;max-width:280px;margin:14px auto 0">This profile is private. Send a follow request to see their posts if they approve you.</div>
      </div>`;
    return;
  }

  const availTabs = [
    { id: 'activity', label: 'Activity' },
    profile.share_fitness  && { id: 'fitness',  label: 'Fitness' },
    profile.share_food     && { id: 'food',      label: 'Food' },
    profile.share_projects && { id: 'projects',  label: 'Projects' },
    profile.share_media    && { id: 'media',     label: 'Media' },
  ].filter(Boolean);

  const tabStrip = availTabs.map((t, i) =>
    `<button class="fpill${i === 0 ? ' active' : ''}" data-ptab="${t.id}" onclick="switchProfileTab('${t.id}')" style="white-space:nowrap;flex-shrink:0;min-height:34px;padding:6px 14px">${t.label}</button>`
  ).join('');

  sheet.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:18px">
      <button class="btn btn-g" style="font-size:0.70rem;padding:6px 12px;min-height:36px;flex-shrink:0" onclick="closeProfileOverlay()">← Back</button>
      <button id="overlayFollowBtn" class="btn ${isFollowing || isPending ? 'btn-g' : 'btn-p'}" style="font-size:0.72rem;padding:7px 16px;min-height:36px;flex-shrink:0"
        onclick="toggleFollowFromOverlay('${escapeAttr(userId)}',this)">${isFollowing ? 'Following' : (isPending ? 'Pending' : 'Follow')}</button>
    </div>

    <div style="text-align:center;margin-bottom:18px">
      <div style="display:flex;justify-content:center;margin-bottom:10px">${avatar}</div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:var(--cream);font-weight:600;word-break:break-word">${escapeHtml(name)}</div>
      ${profile.username ? `<div style="font-size:0.68rem;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px">@${escapeHtml(profile.username)}</div>` : ''}
      <div style="font-size:0.64rem;color:var(--muted);margin-top:3px;font-family:'DM Mono',monospace">${followerCount} follower${followerCount !== 1 ? 's' : ''}</div>
      ${profile.bio ? `<div style="font-size:0.74rem;color:var(--muted);margin-top:8px;line-height:1.6;padding:0 4px;word-break:break-word">${escapeHtml(profile.bio)}</div>` : ''}
    </div>

    <div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin-bottom:18px;padding-bottom:4px">
      ${tabStrip}
    </div>

    <div id="profileTabContent"></div>
  `;

  // Render default Activity tab
  const content = eid('profileTabContent');
  if (content) content.innerHTML = _buildActivityTab(userId);
}

function closeProfileOverlay() {
  const el = eid('profileOverlay');
  if (el) el.remove();
  _currentProfileUserId = null;
}

async function switchProfileTab(tab) {
  const userId = _currentProfileUserId;
  if (!userId) return;
  const cache = _profileCache[userId];
  if (!cache) return;

  // Update pill states
  document.querySelectorAll('#profileOverlay [data-ptab]').forEach(b => {
    b.classList.toggle('active', b.dataset.ptab === tab);
  });

  const content = eid('profileTabContent');
  if (!content) return;

  if (tab === 'activity') { content.innerHTML = _buildActivityTab(userId); return; }

  // Lazy-load on first visit
  if (!cache[tab]) {
    content.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--muted);font-size:0.76rem">Loading…</div>`;
    if (tab === 'fitness')  cache.fitness  = await fetchPublicFitness(userId);
    if (tab === 'food')     cache.food     = await fetchPublicFoodLog(userId);
    if (tab === 'projects') cache.projects = await fetchPublicProjects(userId);
    if (tab === 'media')    cache.media    = await fetchPublicMedia(userId);
  }

  if (tab === 'fitness')  content.innerHTML = _buildFitnessTab(cache.fitness, _profileShowAll.fitness);
  if (tab === 'food')     content.innerHTML = _buildFoodTab(cache.food, _profileShowAll.food);
  if (tab === 'projects') content.innerHTML = _buildProjectsTab(cache.projects);
  if (tab === 'media')    content.innerHTML = _buildMediaTab(cache.media);
}

async function toggleFollowFromOverlay(userId, btn) {
  btn.disabled = true;
  const isFollowing = _communityFollowing.includes(userId);
  const isPending = _communityPendingFollows.includes(userId);
  if (isFollowing || isPending) {
    await unfollowUser(userId);
    _communityFollowing = _communityFollowing.filter(id => id !== userId);
    _communityPendingFollows = _communityPendingFollows.filter(id => id !== userId);
    btn.textContent = 'Follow'; btn.className = 'btn btn-p';
  } else {
    const result = await followUser(userId);
    if (result === 'pending') {
      _communityPendingFollows = [...new Set([..._communityPendingFollows, userId])];
      btn.textContent = 'Pending'; btn.className = 'btn btn-g';
    } else if (result === 'following') {
      _communityFollowing = [..._communityFollowing, userId];
      btn.textContent = 'Following'; btn.className = 'btn btn-g';
    } else {
      btn.textContent = 'Follow'; btn.className = 'btn btn-p';
      toast('Follow failed');
    }
  }
  btn.style.cssText = 'font-size:0.72rem;padding:7px 18px';
  btn.disabled = false;
}

// ── Profile tab content builders ──────────────────────────────────────────────
function _buildActivityTab(userId) {
  const cache = _profileCache[userId] || {};
  const feedEvents = cache.feedEvents  || [];
  const notes      = cache.notes       || [];
  const ctx        = cache.profileCtx  || {};
  let html = '';

  if (feedEvents.length) {
    html += `<div style="font-size:0.64rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:10px">Recent Activity</div>`;
    html += feedEvents.slice(0, 15).map(ev => _buildFeedCard({ ...ev, profiles: ctx })).join('');
  }
  if (notes.length) {
    html += `<div style="font-size:0.64rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin:18px 0 10px">Community Notes</div>`;
    html += notes.map(n => `
      <div class="card" style="padding:14px;margin-bottom:10px">
        <div style="font-size:0.82rem;color:var(--cream);font-weight:600;margin-bottom:8px">${escapeHtml(n.title || 'Untitled')}</div>
        <div class="markdown-body" style="font-size:0.74rem;color:var(--muted);line-height:1.7">${_renderMarkdown(n.body || '')}</div>
        <div style="font-size:0.60rem;color:var(--muted);margin-top:8px;font-family:'DM Mono',monospace">
          ${n.updated_at ? new Date(n.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
        </div>
      </div>`).join('');
  }
  return html || `<div style="text-align:center;padding:40px 0;color:var(--muted);font-size:0.76rem">No activity yet</div>`;
}

function _buildFitnessTab(data, showAll) {
  if (!data) return _emptyTab();
  const { sessions, cardio } = data;
  const LIMIT = 5;
  let html = '';

  if (sessions.length) {
    const visible = showAll ? sessions : sessions.slice(0, LIMIT);
    html += `<div style="font-size:0.64rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:10px">Workouts</div>`;
    html += visible.map(s => {
      const exs = (s.workout_exercises || []).sort((a, b) => a.order_index - b.order_index);
      const exNames = exs.map(e => escapeHtml(e.name || '')).filter(Boolean);
      return `
        <div class="card" style="padding:13px;margin-bottom:9px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div style="font-size:0.84rem;color:var(--cream);font-weight:600">${escapeHtml(s.title || 'Workout')}</div>
            <div style="font-size:0.62rem;color:var(--muted);font-family:'DM Mono',monospace">${s.session_date || ''}</div>
          </div>
          ${s.summary ? `<div style="font-size:0.72rem;color:var(--muted);margin-bottom:6px">${escapeHtml(s.summary)}</div>` : ''}
          ${exNames.length ? `
            <div style="font-size:0.68rem;color:var(--muted);font-family:'DM Mono',monospace;line-height:1.6">
              ${exNames.slice(0, 6).join(' · ')}${exNames.length > 6 ? ` <span style="color:var(--muted)">+${exNames.length - 6} more</span>` : ''}
            </div>` : ''}
        </div>`;
    }).join('');
    if (!showAll && sessions.length > LIMIT) {
      html += `<button class="btn btn-g" onclick="_showMoreProfileTab('fitness')" style="width:100%;margin-bottom:14px;font-size:0.72rem">View more (${sessions.length - LIMIT} more)</button>`;
    }
  }

  if (cardio.length) {
    const visibleCardio = showAll ? cardio : cardio.slice(0, LIMIT);
    html += `<div style="font-size:0.64rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin:16px 0 10px">Cardio</div>`;
    html += visibleCardio.map(c => {
      const meta = [
        c.duration_minutes && `${c.duration_minutes}min`,
        c.distance_km      && `${c.distance_km}km`,
        c.steps            && `${Number(c.steps).toLocaleString()} steps`
      ].filter(Boolean).join(' · ');
      return `
        <div class="card" style="padding:13px;margin-bottom:9px;display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:0.82rem;color:var(--cream);font-weight:600;margin-bottom:3px">${escapeHtml(c.activity || 'Cardio')}</div>
            ${meta ? `<div style="font-size:0.66rem;color:var(--muted);font-family:'DM Mono',monospace">${meta}</div>` : ''}
          </div>
          <div style="font-size:0.62rem;color:var(--muted);font-family:'DM Mono',monospace">${c.session_date || ''}</div>
        </div>`;
    }).join('');
    if (!showAll && cardio.length > LIMIT) {
      html += `<button class="btn btn-g" onclick="_showMoreProfileTab('fitness')" style="width:100%;font-size:0.72rem">View more</button>`;
    }
  }

  return html || _emptyTab('No fitness data yet');
}

function _buildFoodTab(entries, showAll) {
  if (!entries || !entries.length) return _emptyTab('No food data yet');

  const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', other: 'Other' };
  const LIMIT = 5;

  // Group by date
  const byDate = {};
  for (const e of entries) {
    if (!byDate[e.log_date]) byDate[e.log_date] = [];
    byDate[e.log_date].push(e);
  }

  const allDates = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0]));
  const visibleDates = showAll ? allDates : allDates.slice(0, LIMIT);
  const hasMore = !showAll && allDates.length > LIMIT;

  const rows = visibleDates.map(([date, items]) => {
    const totalKcal = items.reduce((s, e) => s + (Number(e.calories) || 0), 0);
    const totalProt = items.reduce((s, e) => s + (Number(e.protein_g) || 0), 0);
    const dateStr   = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    // Group by meal
    const byMeal = {};
    for (const item of items) {
      const m = item.meal_type || 'other';
      if (!byMeal[m]) byMeal[m] = [];
      byMeal[m].push(item);
    }
    const MEAL_ORDER = ['breakfast','lunch','dinner','snack','other'];
    const sortedMeals = MEAL_ORDER.filter(m => byMeal[m]);

    return `
      <div class="card" style="padding:14px;margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:0.84rem;color:var(--cream);font-weight:600">${dateStr}</div>
          <div style="text-align:right">
            <div style="font-size:0.72rem;color:var(--blush);font-family:'DM Mono',monospace;font-weight:600">${Math.round(totalKcal)} kcal</div>
            ${totalProt > 0 ? `<div style="font-size:0.60rem;color:var(--muted);font-family:'DM Mono',monospace">${Math.round(totalProt)}g protein</div>` : ''}
          </div>
        </div>
        ${sortedMeals.map(meal => `
          <div style="margin-bottom:10px">
            <div style="font-size:0.58rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono',monospace;margin-bottom:5px">${MEAL_LABELS[meal] || meal}</div>
            ${byMeal[meal].map(item => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)">
                <div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">
                  <span style="font-size:0.76rem;color:var(--mist)">${escapeHtml(item.name || '')}</span>
                  ${item.brand ? `<span style="font-size:0.62rem;color:var(--muted);margin-left:5px">${escapeHtml(item.brand)}</span>` : ''}
                </div>
                <div style="flex-shrink:0;margin-left:12px;text-align:right">
                  <span style="font-size:0.68rem;color:var(--muted);font-family:'DM Mono',monospace">${Math.round(Number(item.calories) || 0)} kcal</span>
                  ${item.grams > 0 ? `<span style="font-size:0.60rem;color:var(--muted);font-family:'DM Mono',monospace;margin-left:6px">${item.grams}g</span>` : ''}
                </div>
              </div>`).join('')}
          </div>`).join('')}
      </div>`;
  }).join('');

  return rows + (hasMore
    ? `<button class="btn btn-g" onclick="_showMoreProfileTab('food')" style="width:100%;font-size:0.72rem">View more (${allDates.length - LIMIT} more days)</button>`
    : '');
}

function _buildProjectsTab(rows) {
  if (!rows || !rows.length) return _emptyTab('No public projects');

  return rows.map(p => {
    const tasks   = (p.project_tasks || []).sort((a, b) => a.order_index - b.order_index);
    const done    = tasks.filter(t => t.done).length;
    const pct     = calcPercent(done, tasks.length);
    const status  = p.status || 'Active';

    return `
      <div class="card" style="padding:14px;margin-bottom:10px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
          <div style="min-width:0;flex:1">
            <div style="font-size:0.88rem;color:var(--cream);font-weight:600;margin-bottom:2px">${escapeHtml(p.title || '')}</div>
            ${p.type ? `<div style="font-size:0.66rem;color:var(--muted)">${escapeHtml(p.type)}</div>` : ''}
          </div>
          <span class="spill s-${status.toLowerCase()}" style="flex-shrink:0;margin-left:8px">${escapeHtml(status)}</span>
        </div>
        ${tasks.length ? `
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px">
              <span style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:0.08em">Progress</span>
              <span style="font-size:0.60rem;color:var(--blush);font-family:'DM Mono',monospace">${done}/${tasks.length} · ${pct}%</span>
            </div>
            ${progressBarHtml(pct, 'var(--blush)', '3px')}
          </div>
          ${tasks.slice(0, 8).map(tk => `
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">
              <div style="width:13px;height:13px;border-radius:3px;border:1px solid var(--border-lt);flex-shrink:0;background:${tk.done ? 'var(--blush)' : 'transparent'};display:flex;align-items:center;justify-content:center">
                ${tk.done ? `<span style="font-size:8px;color:var(--ink);font-weight:700">✓</span>` : ''}
              </div>
              <div style="font-size:0.74rem;color:var(--mist);flex:1;${tk.done ? 'text-decoration:line-through;opacity:0.45' : ''}">${escapeHtml(tk.text || '')}</div>
              ${tk.due_date ? `<div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;flex-shrink:0">${tk.due_date}</div>` : ''}
            </div>`).join('')}
          ${tasks.length > 8 ? `<div style="font-size:0.62rem;color:var(--muted);padding-top:7px;font-family:'DM Mono',monospace">+${tasks.length - 8} more tasks</div>` : ''}
        ` : `<div style="font-size:0.72rem;color:var(--muted)">No tasks yet</div>`}
        ${p.deadline ? `<div style="font-size:0.62rem;color:var(--muted);margin-top:10px;font-family:'DM Mono',monospace">Due: ${p.deadline}</div>` : ''}
      </div>`;
  }).join('');
}

function _buildMediaTab(rows) {
  if (!rows || !rows.length) return _emptyTab('No media shared yet');

  const TYPE_ORDER  = ['book', 'film', 'show', 'album', 'game'];
  const TYPE_LABELS = { book: 'Books', film: 'Films', show: 'Shows', album: 'Albums', game: 'Games' };
  const TYPE_ICONS  = { book: '📖', film: '🎬', show: '📺', album: '🎵', game: '🎮' };
  const STATUS_MAP  = {
    book:  { unread: 'To Read',     reading: 'Reading',   done: 'Finished' },
    film:  { unread: 'Queued',      reading: 'Watching',  done: 'Watched' },
    show:  { unread: 'Queued',      reading: 'Watching',  done: 'Finished' },
    album: { unread: 'Not Started', reading: 'Listening', done: 'Finished' },
    game:  { unread: 'Backlog',     reading: 'Playing',   done: 'Completed' }
  };

  let html = '';
  for (const type of TYPE_ORDER) {
    const items = rows.filter(r => r.media_type === type);
    if (!items.length) continue;

    html += `<div style="font-size:0.64rem;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:10px">${TYPE_ICONS[type]} ${TYPE_LABELS[type]}</div>`;

    html += items.map(item => {
      const statusLabel = (STATUS_MAP[type] || {})[item.status] || item.status;
      const rating = item.rating ? Math.round(item.rating) : 0;
      const stars  = rating ? `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}` : '';
      const prog   = (type === 'book' && item.total_pages > 0)
        ? calcPercent(item.current_page, item.total_pages)
        : (item.status === 'done' ? 100 : 0);

      return `
        <div style="display:flex;align-items:center;gap:11px;padding:9px 0;border-bottom:1px solid var(--border)">
          ${item.cover_url
            ? `<img src="${escapeAttr(item.cover_url)}" style="width:38px;height:52px;object-fit:cover;border-radius:5px;flex-shrink:0">`
            : `<div style="width:38px;height:52px;background:var(--mid);border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.1rem">${TYPE_ICONS[type]}</div>`}
          <div style="flex:1;min-width:0">
            <div style="font-size:0.80rem;color:var(--cream);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px">${escapeHtml(item.title || '')}</div>
            ${item.creator ? `<div style="font-size:0.64rem;color:var(--muted);margin-bottom:4px">${escapeHtml(item.creator)}</div>` : ''}
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span class="bstatus bs-${item.status}" style="font-size:0.56rem">${statusLabel}</span>
              ${stars ? `<span style="font-size:0.64rem;color:var(--blush);letter-spacing:-0.5px">${stars}</span>` : ''}
              ${prog > 0 && prog < 100 ? `<span style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace">${prog}%</span>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    html += '<div style="margin-bottom:16px"></div>';
  }
  return html;
}

function _emptyTab(msg) {
  return `<div style="text-align:center;padding:40px 0;color:var(--muted);font-size:0.76rem">${escapeHtml(msg || 'Nothing here yet')}</div>`;
}

// ── Refresh feed after a feed event is pushed ─────────────────────────────────
async function refreshCommunityIfOpen() {
  if (!_communityLoaded) return;
  _communityFollowing = await loadFollowing();
  _communityPendingFollows = await loadSentFollowRequests();
  _communityPosts = await loadCommunityPostsHome(_communityFollowing);
  _communityDiscoverPosts = await loadCommunityPostsDiscover(_communityFollowing);
  _communityFeed = await loadCommunityFeed(_communityFollowing);
  if (_communityView === 'feed') {
    const el = eid('communityContent');
    if (el) el.innerHTML = _buildPostsFeedView();
  }
}
