'use strict';

/* ══ MEDIA ══ */
function renderStars(rating) {
  if (!rating) return '';
  let html = '';
  for (let i = 1; i <= 10; i++) {
    if (rating >= i) html += '★';
    else if (rating >= i - 0.5) html += '⯨';
    else html += '☆';
  }
  return html;
}
let bookF      = 'all';
let mediaTypeF = 'book';   // default tab — no more 'all'
let activeBookId = null;

/* removed: MEDIA_TYPES array — no longer needed */

function mediaStatusLabel(status, mediaType) {
  if (mediaType === 'film')  return { unread: t('queued'), reading: '—', done: t('watched') }[status] || t('queued');
  if (mediaType === 'book')  return { unread: t('to_read'), reading: t('reading'), done: t('finished') }[status] || t('to_read');
  if (mediaType === 'album') return { unread: t('not_started'), reading: t('listening'), done: t('finished') }[status] || t('not_started');
  if (mediaType === 'game')  return { unread: t('backlog'), reading: t('playing_status'), done: t('completed_status') }[status] || t('backlog');
  return { unread: t('queued'), reading: t('watching'), done: t('finished') }[status] || t('queued');
}

function mediaCreatorLabel(mt) {
  return mt === 'film' ? t('director') : mt === 'album' ? t('artist') : mt === 'book' ? t('author') : mt === 'game' ? t('developer') : t('creator');
}

function mediaUnitLabel(mt) {
  return (mt === 'show' || mt === 'anime') ? t('episode') : t('page');
}

function mediaNotesLabel(mt) {
  return (mt === 'show' || mt === 'anime') ? t('episode_notes') : mt === 'film' ? t('notes') : t('chapter_notes');
}

function getBookPct(item) {
  if (item.mediaType === 'show' || item.mediaType === 'anime') {
    if (!item.totalEpisodes) return 0;
    const watched = ((item.currentSeason - 1) * (item.totalEpisodes / Math.max(item.totalSeasons, 1))) + item.currentEpisode;
    return Math.max(0, Math.min(100, Math.round((watched / item.totalEpisodes) * 100)));
  }
  const total = parseInt(item.totalPages) || 0;
  const current = parseInt(item.currentPage) || 0;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
}

function getAlbumRating(item) {
  const rated = (item.tracks || []).filter(tr => tr.rating > 0);
  if (!rated.length) return item.rating || 0;
  const avg = rated.reduce((s, tr) => s + tr.rating, 0) / rated.length;
  return Math.round(avg * 10) / 10;
}

function getActiveBook() {
  return (S.media || []).find(b => b.id === activeBookId);
}

/* ══ MAIN RENDER ══ */
function renderBooks() {
  /* render the currently active type tab */
  renderMediaSection(mediaTypeF);
}

function renderMediaSection(type) {
  const c = eid('mediaGrid');
  c.innerHTML = '';

  let list = (S.media || []).filter(b => b.mediaType === type);
  if (bookF !== 'all') list = list.filter(b => b.status === bookF);

  /* Update status filter labels for current type */
  updateStatusFilterLabels(type);

  if (!list.length) {
    c.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 24px"><div style="font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--border-lt);margin-bottom:10px">◆</div><div style="font-size:0.66rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace">${t('nothing_here')}</div></div>`;
    return;
  }

  if (type === 'book')  list.forEach((b, i) => c.appendChild(buildBookCard(b, i)));
  if (type === 'film')  list.forEach((b, i) => c.appendChild(buildFilmCard(b, i)));
  if (type === 'show' || type === 'anime') list.forEach((b, i) => c.appendChild(buildShowCard(b, i)));
  if (type === 'album') list.forEach((b, i) => c.appendChild(buildAlbumCard(b, i)));
  if (type === 'game')  list.forEach((b, i) => c.appendChild(buildGameCard(b, i)));
}

function updateStatusFilterLabels(type) {
  const filters = document.querySelectorAll('.book-status-filters .fpill[data-status]');
  filters.forEach(btn => {
    const status = btn.dataset.status;
    if (status === 'all') return;
    btn.textContent = mediaStatusLabel(status, type);
  });
}

/* ══ BOOK CARD ══ */
function buildBookCard(b, idx) {
  const div = document.createElement('div');
  div.className = 'book-card';
  div.onclick = () => openBookDetails(b.id);

  const pal = PALS[idx % PALS.length];
  const stars = renderStars(b.rating);
  const slbl = mediaStatusLabel(b.status, 'book');
  const pct = getBookPct(b);
  const progressText = (b.totalPages || b.currentPage)
    ? `<div style="font-size:0.58rem;color:var(--gold-lt);margin-top:4px;font-family:'DM Mono',monospace">${b.currentPage||0}/${b.totalPages||0} · ${pct}%</div>`
    : '';

  div.innerHTML = `
    <div class="book-cover" style="background:${pal}">
      ${b.coverUrl
        ? `<img src="${escapeAttr(b.coverUrl)}" alt="">`
        : `<div class="book-cover-ph"><div class="ph-icon">◆</div><div>${escapeHtml(b.title)}</div></div>`}
      <div class="book-cover-overlay" onclick="event.stopPropagation()">
        <span>${t('add_cover')}</span>
        <input type="file" accept="image/*" onchange="event.stopPropagation();uploadCover(${b.id},this)">
      </div>
    </div>
    <div class="book-info">
      <input class="editable book-title-inp" value="${escapeAttr(b.title)}" onchange="event.stopPropagation();updateBF(${b.id},'title',this.value)">
      <input class="editable book-author-inp" value="${escapeAttr(b.author)}" onchange="event.stopPropagation();updateBF(${b.id},'author',this.value)">
      ${progressText}
      <div class="book-row" style="margin-top:6px">
        <span class="bstatus bs-${b.status}" onclick="event.stopPropagation();cycleBook(${b.id})" title="Click to change">${slbl}</span>
        ${stars ? `<span class="b-stars">${stars}</span>` : ''}
      </div>
    </div>
    <button class="book-del" onclick="event.stopPropagation();delBook(${b.id})">✕</button>
  `;
  return div;
}

/* ══ FILM CARD ══ */
function buildFilmCard(b, idx) {
  const div = document.createElement('div');
  div.className = 'book-card media-film-card';
  div.onclick = () => openBookDetails(b.id);

  const pal = PALS[idx % PALS.length];
  const watched = b.status === 'done';
  const stars = renderStars(b.rating);

  div.innerHTML = `
    <div class="book-cover" style="background:${pal}; height:130px">
      ${b.coverUrl
        ? `<img src="${escapeAttr(b.coverUrl)}" alt="">`
        : `<div class="book-cover-ph"><div class="ph-icon">▶</div><div>${escapeHtml(b.title)}</div></div>`}
      <div class="book-cover-overlay" onclick="event.stopPropagation()">
        <span>${t('add_cover')}</span>
        <input type="file" accept="image/*" onchange="event.stopPropagation();uploadCover(${b.id},this)">
      </div>
    </div>
    <div class="book-info">
      <input class="editable book-title-inp" value="${escapeAttr(b.title)}" onchange="event.stopPropagation();updateBF(${b.id},'title',this.value)">
      <input class="editable book-author-inp" value="${escapeAttr(b.author)}" onchange="event.stopPropagation();updateBF(${b.id},'author',this.value)" placeholder="${t('director')}">
      ${b.runtime ? `<div style="font-size:0.58rem;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px">${escapeHtml(b.runtime)}</div>` : ''}
      <div class="book-row" style="margin-top:6px">
        <span class="bstatus bs-${b.status}" onclick="event.stopPropagation();cycleBook(${b.id})">${watched ? t('watched') : t('queued')}</span>
        ${stars ? `<span class="b-stars">${stars}</span>` : ''}
      </div>
      ${b.watchCount > 1 ? `<div style="font-size:0.55rem;color:var(--muted);margin-top:3px;font-family:'DM Mono',monospace">${b.watchCount}× ${t('watched').toLowerCase()}</div>` : ''}
    </div>
    <button class="book-del" onclick="event.stopPropagation();delBook(${b.id})">✕</button>
  `;
  return div;
}

/* ══ SHOW / ANIME CARD ══ */
function buildShowCard(b, idx) {
  const div = document.createElement('div');
  div.className = 'book-card media-show-card';
  div.onclick = () => openBookDetails(b.id);

  const pal = PALS[idx % PALS.length];
  const slbl = mediaStatusLabel(b.status, b.mediaType);
  const stars = renderStars(b.rating);
  const seBadge = `S${b.currentSeason} E${b.currentEpisode}`;
  const pct = getBookPct(b);
  const progressBar = b.totalEpisodes
    ? `<div style="height:2px;background:var(--border);border-radius:1px;margin-top:5px"><div style="height:2px;width:${pct}%;background:var(--blush);border-radius:1px;transition:width 0.3s"></div></div>`
    : '';

  div.innerHTML = `
    <div class="book-cover" style="background:${pal}; height:130px">
      ${b.coverUrl
        ? `<img src="${escapeAttr(b.coverUrl)}" alt="">`
        : `<div class="book-cover-ph"><div class="ph-icon">▶</div><div>${escapeHtml(b.title)}</div></div>`}
      <div class="book-cover-overlay" onclick="event.stopPropagation()">
        <span>${t('add_cover')}</span>
        <input type="file" accept="image/*" onchange="event.stopPropagation();uploadCover(${b.id},this)">
      </div>
      <div style="position:absolute;top:7px;left:7px;background:var(--ink-glass);border-radius:5px;padding:2px 7px;font-size:0.58rem;font-family:'DM Mono',monospace;color:var(--petal)">${seBadge}</div>
    </div>
    <div class="book-info">
      <input class="editable book-title-inp" value="${escapeAttr(b.title)}" onchange="event.stopPropagation();updateBF(${b.id},'title',this.value)">
      <input class="editable book-author-inp" value="${escapeAttr(b.author)}" onchange="event.stopPropagation();updateBF(${b.id},'author',this.value)" placeholder="${t('creator')}">
      ${progressBar}
      <div class="book-row" style="margin-top:6px">
        <span class="bstatus bs-${b.status}" onclick="event.stopPropagation();cycleBook(${b.id})">${slbl}</span>
        <button class="btn btn-g" style="font-size:0.55rem;padding:2px 7px" onclick="event.stopPropagation();incrementEpisode(${b.id})">+1 EP</button>
      </div>
      ${stars ? `<div class="b-stars" style="margin-top:3px">${stars}</div>` : ''}
    </div>
    <button class="book-del" onclick="event.stopPropagation();delBook(${b.id})">✕</button>
  `;
  return div;
}

/* ══ ALBUM CARD ══ */
function buildAlbumCard(b, idx) {
  const div = document.createElement('div');
  div.className = 'book-card media-album-card';
  div.onclick = () => openAlbumDetail(b.id);

  const pal = PALS[idx % PALS.length];
  const avgRating = getAlbumRating(b);
  const stars = renderStars(avgRating);
  const trackCount = (b.tracks || []).length;

  div.innerHTML = `
    <div class="book-cover" style="background:${pal}; height:140px">
      ${b.coverUrl
        ? `<img src="${escapeAttr(b.coverUrl)}" alt="">`
        : `<div class="book-cover-ph"><div class="ph-icon">♪</div><div>${escapeHtml(b.title)}</div></div>`}
      <div class="book-cover-overlay" onclick="event.stopPropagation()">
        <span>${t('add_cover')}</span>
        <input type="file" accept="image/*" onchange="event.stopPropagation();uploadCover(${b.id},this)">
      </div>
    </div>
    <div class="book-info">
      <input class="editable book-title-inp" value="${escapeAttr(b.title)}" onchange="event.stopPropagation();updateBF(${b.id},'title',this.value)">
      <input class="editable book-author-inp" value="${escapeAttr(b.author)}" onchange="event.stopPropagation();updateBF(${b.id},'author',this.value)" placeholder="${t('artist')}">
      ${trackCount > 0 ? `<div style="font-size:0.56rem;color:var(--muted);font-family:'DM Mono',monospace;margin-top:2px">${trackCount} ${t('tracks')}</div>` : ''}
      <div class="book-row" style="margin-top:6px">
        <span class="bstatus bs-${b.status}" onclick="event.stopPropagation();cycleBook(${b.id})">${mediaStatusLabel(b.status,'album')}</span>
        ${stars ? `<span class="b-stars">${stars}</span>` : ''}
      </div>
    </div>
    <button class="book-del" onclick="event.stopPropagation();delBook(${b.id})">✕</button>
  `;
  return div;
}

/* ══ GAME CARD ══ */
function buildGameCard(b, idx) {
  const div = document.createElement('div');
  div.className = 'book-card media-game-card';
  div.onclick = () => openBookDetails(b.id);

  const pal = PALS[idx % PALS.length];
  const slbl = mediaStatusLabel(b.status, 'game');
  const stars = renderStars(b.rating);

  div.innerHTML = `
    <div class="book-cover" style="background:${pal}; height:130px">
      ${b.coverUrl
        ? `<img src="${escapeAttr(b.coverUrl)}" alt="">`
        : `<div class="book-cover-ph"><div class="ph-icon">◈</div><div>${escapeHtml(b.title)}</div></div>`}
      <div class="book-cover-overlay" onclick="event.stopPropagation()">
        <span>${t('add_cover')}</span>
        <input type="file" accept="image/*" onchange="event.stopPropagation();uploadCover(${b.id},this)">
      </div>
      ${b.platform ? `<div style="position:absolute;top:7px;left:7px;background:var(--ink-glass);border-radius:5px;padding:2px 7px;font-size:0.56rem;font-family:'DM Mono',monospace;color:var(--petal)">${escapeHtml(b.platform)}</div>` : ''}
    </div>
    <div class="book-info">
      <input class="editable book-title-inp" value="${escapeAttr(b.title)}" onchange="event.stopPropagation();updateBF(${b.id},'title',this.value)">
      <input class="editable book-author-inp" value="${escapeAttr(b.author)}" onchange="event.stopPropagation();updateBF(${b.id},'author',this.value)" placeholder="${t('developer')}">
      ${b.hoursPlayed > 0 ? `<div style="font-size:0.58rem;color:var(--gold-lt);margin-top:4px;font-family:'DM Mono',monospace">${b.hoursPlayed}h ${t('hours_played').toLowerCase()}</div>` : ''}
      <div class="book-row" style="margin-top:6px">
        <span class="bstatus bs-${b.status}" onclick="event.stopPropagation();cycleBook(${b.id})">${slbl}</span>
        ${stars ? `<span class="b-stars">${stars}</span>` : ''}
      </div>
    </div>
    <button class="book-del" onclick="event.stopPropagation();delBook(${b.id})">✕</button>
  `;
  return div;
}

/* ══ TYPE / STATUS FILTERS ══ */
function setMediaTypeF(f, btn) {
  mediaTypeF = f;
  bookF = 'all'; // reset status filter when switching type
  document.querySelectorAll('.book-type-filters .fpill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // Reset status filter active state
  document.querySelectorAll('.book-status-filters .fpill').forEach((b, i) => b.classList.toggle('active', i === 0));
  renderBooks();
}

function setBookF(f, btn) {
  bookF = f;
  document.querySelectorAll('.book-status-filters .fpill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBooks();
}

/* ══ SHOW / ANIME EPISODE TRACKING ══ */
function incrementEpisode(id) {
  const b = (S.media||[]).find(b => b.id === id);
  if (!b) return;
  b.currentEpisode = (b.currentEpisode || 0) + 1;
  // Auto-advance season if totalEpisodes per season known
  if (b.totalEpisodes && b.totalSeasons > 1) {
    const epsPerSeason = Math.round(b.totalEpisodes / b.totalSeasons);
    if (epsPerSeason > 0 && b.currentEpisode > epsPerSeason) {
      b.currentSeason = (b.currentSeason || 1) + 1;
      b.currentEpisode = 1;
    }
  }
  // Auto-complete
  if (b.totalEpisodes && b.currentEpisode >= b.totalEpisodes) {
    b.status = 'done';
    if (!b.finishedOn) b.finishedOn = today();
  } else if (b.status === 'unread') {
    b.status = 'reading';
  }
  scheduleSave();
  renderBooks();
}

/* ══ CYCLE STATUS ══ */
function cycleBook(id) {
  const b = (S.media||[]).find(b => b.id === id);
  if (!b) return;

  if (b.mediaType === 'film') {
    if (b.status === 'done') {
      b.watchCount = (b.watchCount || 1) + 1;
      // stays done, just increments rewatch
    } else {
      b.status = 'done';
      b.finishedOn = today();
      b.watchCount = 1;
    }
  } else {
    const cyc = ['unread','reading','done'];
    b.status = cyc[(cyc.indexOf(b.status) + 1) % cyc.length];
    if (b.status === 'reading') {
      if (b.mediaType === 'book') {
        const rh = hfind('read','reading','book');
        if (rh) rh.days[today()] = true;
      }
    }
    if (b.status === 'done' && !b.finishedOn) b.finishedOn = today();
    if (b.status !== 'done') b.finishedOn = null;
  }

  scheduleSave();
  renderBooks();
  renderHabits();
  if (activeBookId === id) renderBookDetails();
}

function updateBF(id, f, v) {
  const b = (S.media||[]).find(b => b.id === id);
  if (!b) return;
  b[f] = v;
  scheduleSave();
  renderBooks();
  if (activeBookId === id) renderBookDetails();
}

async function uploadCover(id, input) {
  const f = input.files[0];
  if (!f) return;
  const b = (S.media||[]).find(b => b.id === id);
  if (!b) return;
  try {
    b.coverUrl = await uploadAsset(`covers/${id}`, f);
  } catch {
    b.coverUrl = await new Promise(res => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.readAsDataURL(f);
    });
  }
  scheduleSave();
  renderBooks();
  if (activeBookId === id) renderBookDetails();
}

function delBook(id) {
  if (!confirm(t('remove_item'))) return;
  S.media = (S.media||[]).filter(b => b.id !== id);
  if (activeBookId === id) { activeBookId = null; closeModal('mBookDetails'); closeModal('mAlbumDetail'); }
  scheduleSave();
  renderBooks();
}

function openAddMedia() {
  openModal('mBook');
  const sel = eid('bkType');
  if (sel) {
    sel.value = mediaTypeF || 'book';
    if (typeof onMediaTypeChange === 'function') onMediaTypeChange();
  }
}

function saveBook() {
  const title = eid('bkT').value.trim();
  if (!title) return;
  if (!Array.isArray(S.media)) S.media = [];
  const type = eid('bkType').value;
  const af = typeof consumeAutofillData === 'function' ? consumeAutofillData() : {};
  S.media.push(makeMedia({
    id: Date.now(),
    mediaType: type,
    title,
    author:        eid('bkA').value.trim(),
    status:        eid('bkS').value,
    rating:        parseFloat(eid('bkR').value) || null,
    notes:         eid('bkN').value.trim(),
    coverUrl:      af.coverUrl      || '',
    totalPages:    af.totalPages    || 0,
    totalSeasons:  af.totalSeasons  || 0,
    totalEpisodes: af.totalEpisodes || 0,
    runtime:       af.runtime       || '',
    platform:      af.platform      || '',
    tracks:        af.tracks        || []
  }));
  eid('bkT').value=''; eid('bkA').value=''; eid('bkN').value=''; eid('bkR').value='';
  if (eid('bkSearch')) eid('bkSearch').value = '';
  scheduleSave();
  // Switch to the type tab of what was just added
  mediaTypeF = (type === 'other') ? 'book' : type;
  document.querySelectorAll('.book-type-filters .fpill').forEach(b => b.classList.toggle('active', b.dataset.type === mediaTypeF));
  renderBooks();
  closeModal('mBook');
  toast(`"${title}" ${t('added')}`);
}

/* ══ BOOK / SHOW / FILM DETAIL MODAL ══ */
function openBookDetails(id) {
  activeBookId = id;
  const b = (S.media||[]).find(x => x.id === id);
  if (!b) return;
  if (b.mediaType === 'album') { openAlbumDetail(id); return; }
  renderBookDetails();
  openModal('mBookDetails');
}

function renderBookDetails() {
  const b = getActiveBook();
  if (!b) return;

  if (!Array.isArray(b.chapterNotes)) b.chapterNotes = [];
  if (typeof b.notes !== 'string') b.notes = '';
  b.currentPage = parseInt(b.currentPage) || 0;
  b.totalPages  = parseInt(b.totalPages)  || 0;

  eid('bdTitle').value       = b.title  || '';
  eid('bdAuthor').value      = b.author || '';
  eid('bdStatus').value      = b.status || 'unread';
  eid('bdRating').value      = b.rating || '';
  eid('bdNotes').value       = b.notes  || '';

  eid('bdCreatorLabel').textContent = mediaCreatorLabel(b.mediaType);

  /* Show type-specific progress block */
  const isShow = b.mediaType === 'show' || b.mediaType === 'anime';
  const isFilm = b.mediaType === 'film';
  const isBook = b.mediaType === 'book';
  const isGame = b.mediaType === 'game';

  eid('bdProgressBlock').style.display  = isBook ? '' : 'none';
  eid('bdFilmBlock').style.display      = isFilm ? '' : 'none';
  eid('bdChapterBlock').style.display   = isBook ? '' : 'none';
  eid('bdShowBlock').style.display      = isShow ? '' : 'none';
  eid('bdGameBlock').style.display      = isGame ? '' : 'none';

  if (isBook) {
    eid('bdCurrentPage').value = b.currentPage;
    eid('bdTotalPages').value  = b.totalPages;
    eid('bdCurrentPageLabel').textContent = `Current ${mediaUnitLabel(b.mediaType)}`;
    eid('bdTotalPagesLabel').textContent  = `Total ${mediaUnitLabel(b.mediaType)}s`;
    const pct = getBookPct(b);
    eid('bdProgressFill').style.width = `${pct}%`;
    eid('bdProgressText').textContent = b.totalPages > 0
      ? `${b.currentPage} / ${b.totalPages} · ${pct}%`
      : t('set_total_pages');
    eid('bdChapterNotesLabel').textContent = mediaNotesLabel(b.mediaType);
    renderChapterNotes();
  }

  if (isShow) {
    eid('bdCurrentSeason').value  = b.currentSeason  || 1;
    eid('bdCurrentEpisode').value = b.currentEpisode || 0;
    eid('bdTotalSeasons').value   = b.totalSeasons   || '';
    eid('bdTotalEpisodes').value  = b.totalEpisodes  || '';
    const pct = getBookPct(b);
    eid('bdShowProgress').textContent = b.totalEpisodes
      ? `S${b.currentSeason} E${b.currentEpisode} · ${pct}%`
      : `S${b.currentSeason} E${b.currentEpisode}`;
  }

  if (isFilm) {
    eid('bdRuntime').value    = b.runtime    || '';
    eid('bdWatchCount').value = b.watchCount || 0;
  }

  if (isGame) {
    eid('bdGamePlatform').value    = b.platform    || '';
    eid('bdGameHours').value       = b.hoursPlayed || '';
  }

  const statusSel = eid('bdStatus');
  const opts = statusSel.options;
  const labels = isFilm
    ? [t('queued'), '—', t('watched')]
    : b.mediaType === 'book'
    ? [t('to_read'), t('reading'), t('finished')]
    : b.mediaType === 'album'
    ? [t('not_started'), t('listening'), t('finished')]
    : b.mediaType === 'game'
    ? [t('backlog'), t('playing_status'), t('completed_status')]
    : [t('queued'), t('watching'), t('finished')];
  for (let i = 0; i < opts.length; i++) opts[i].text = labels[i];
}

function renderChapterNotes() {
  const b = getActiveBook();
  if (!b) return;
  const wrap = eid('bdChapterNotes');
  wrap.innerHTML = '';
  if (!b.chapterNotes.length) {
    wrap.innerHTML = `<div style="color:var(--muted);font-size:0.76rem">${t('no_notes_yet')}</div>`;
    return;
  }
  b.chapterNotes.forEach(n => {
    const card = document.createElement('div');
    card.className = 'chapter-note-card';
    card.innerHTML = `
      <div class="chapter-note-top">
        <input class="editable" value="${escapeAttr(n.label||'')}" onchange="updateChapterLabel(${n.id},this.value)">
        <button class="chapter-note-del" onclick="deleteChapterNote(${n.id})">✕</button>
      </div>
      <textarea class="editable-area" rows="4" placeholder="${t('notes_ph')}" oninput="updateChapterNote(${n.id},this.value)">${escapeHtml(n.note||'')}</textarea>
    `;
    wrap.appendChild(card);
  });
}

function updateActiveBookField(field, value) {
  const b = getActiveBook(); if (!b) return;
  b[field] = value;
  scheduleSave(); renderBooks();
}

function updateActiveBookStatus(value) {
  const b = getActiveBook(); if (!b) return;
  b.status = value;
  if (b.status === 'reading' && b.mediaType === 'book') {
    const rh = hfind('read','reading','book');
    if (rh) rh.days[today()] = true;
    renderHabits();
  }
  if (b.status === 'done' && !b.finishedOn) b.finishedOn = today();
  if (b.status !== 'done') b.finishedOn = null;
  scheduleSave(); renderBooks(); renderBookDetails();
}

function updateActiveBookRating(value) {
  const b = getActiveBook(); if (!b) return;
  const n = parseFloat(value);
  b.rating = n >= 0.5 && n <= 10 ? n : null;
  scheduleSave(); renderBooks(); renderBookDetails();
}

function updateActiveBookPages() {
  const b = getActiveBook(); if (!b) return;
  b.currentPage = Math.max(0, parseInt(eid('bdCurrentPage').value) || 0);
  b.totalPages  = Math.max(0, parseInt(eid('bdTotalPages').value)  || 0);
  if (b.totalPages > 0 && b.currentPage > b.totalPages) b.currentPage = b.totalPages;
  eid('bdCurrentPage').value = b.currentPage;
  eid('bdTotalPages').value  = b.totalPages;
  if (b.currentPage > 0 && b.status === 'unread') b.status = 'reading';
  if (b.totalPages > 0 && b.currentPage >= b.totalPages) {
    if (b.status !== 'done') b.finishedOn = today();
    b.status = 'done';
  }
  if (b.status === 'reading') {
    const rh = hfind('read','reading','book');
    if (rh) rh.days[today()] = true;
    renderHabits();
  }
  scheduleSave(); renderBooks(); renderBookDetails();
}

function updateShowProgress() {
  const b = getActiveBook(); if (!b) return;
  b.currentSeason  = Math.max(1, parseInt(eid('bdCurrentSeason').value)  || 1);
  b.currentEpisode = Math.max(0, parseInt(eid('bdCurrentEpisode').value) || 0);
  b.totalSeasons   = Math.max(0, parseInt(eid('bdTotalSeasons').value)   || 0);
  b.totalEpisodes  = Math.max(0, parseInt(eid('bdTotalEpisodes').value)  || 0);
  if (b.status === 'unread' && b.currentEpisode > 0) b.status = 'reading';
  scheduleSave(); renderBooks(); renderBookDetails();
}

function updateFilmDetails() {
  const b = getActiveBook(); if (!b) return;
  b.runtime    = eid('bdRuntime').value.trim();
  b.watchCount = Math.max(0, parseInt(eid('bdWatchCount').value) || 0);
  scheduleSave(); renderBooks();
}

function updateGameDetails() {
  const b = getActiveBook(); if (!b) return;
  b.platform    = eid('bdGamePlatform').value.trim();
  b.hoursPlayed = Math.max(0, parseFloat(eid('bdGameHours').value) || 0);
  if (b.hoursPlayed > 0 && b.status === 'unread') b.status = 'reading';
  scheduleSave(); renderBooks(); renderBookDetails();
}

function updateActiveBookNotes(value) {
  const b = getActiveBook(); if (!b) return;
  b.notes = value; scheduleSave();
}

function addChapterNote() {
  const b = getActiveBook(); if (!b) return;
  if (!Array.isArray(b.chapterNotes)) b.chapterNotes = [];
  const unitLbl = mediaUnitLabel(b.mediaType);
  b.chapterNotes.push({ id: Date.now(), label: `${unitLbl} ${b.chapterNotes.length + 1}`, note: '' });
  scheduleSave(); renderChapterNotes();
}

function updateChapterLabel(noteId, value) {
  const b = getActiveBook(); if (!b) return;
  const n = b.chapterNotes.find(n => n.id === noteId);
  if (n) { n.label = value; scheduleSave(); }
}

function updateChapterNote(noteId, value) {
  const b = getActiveBook(); if (!b) return;
  const n = b.chapterNotes.find(n => n.id === noteId);
  if (n) { n.note = value; scheduleSave(); }
}

function deleteChapterNote(noteId) {
  const b = getActiveBook(); if (!b) return;
  b.chapterNotes = b.chapterNotes.filter(n => n.id !== noteId);
  scheduleSave(); renderChapterNotes();
}

/* ══ ALBUM DETAIL ══ */
function openAlbumDetail(id) {
  activeBookId = id;
  renderAlbumDetail();
  openModal('mAlbumDetail');
}

function renderAlbumDetail() {
  const b = getActiveBook();
  if (!b) return;

  eid('adTitle').value  = b.title  || '';
  eid('adArtist').value = b.author || '';
  eid('adRating').value = b.rating || '';
  eid('adNotes').value  = b.notes  || '';
  eid('adStatus').value = b.status || 'unread';

  const avgRating = getAlbumRating(b);
  eid('adAvgRating').textContent = avgRating
    ? `${avgRating} ★ avg`
    : '';

  const wrap = eid('adTracks');
  wrap.innerHTML = '';

  if (!(b.tracks || []).length) {
    wrap.innerHTML = `<div style="color:var(--muted);font-size:0.76rem;padding:12px 0">${t('no_tracks_yet')}</div>`;
    return;
  }

  b.tracks.forEach((tr, idx) => {
    const row = document.createElement('div');
    row.className = 'track-row';
    row.innerHTML = `
      <div class="track-num">${idx + 1}</div>
      <input class="editable track-title-inp" value="${escapeAttr(tr.title)}" placeholder="${t('track_title_ph')}" oninput="updateTrack(${b.id},${tr.id},'title',this.value)">
      <input class="editable track-dur-inp" value="${escapeAttr(tr.duration)}" placeholder="0:00" oninput="updateTrack(${b.id},${tr.id},'duration',this.value)">
      <div class="track-stars">
        ${[1,2,3,4,5,6,7,8,9,10].map(n => `<span class="track-star${tr.rating>=n?' lit':''}" onclick="rateTrack(${b.id},${tr.id},${n})">${tr.rating>=n?'★':'☆'}</span>`).join('')}
      </div>
      <button class="habit-del" onclick="deleteTrack(${b.id},${tr.id})">✕</button>
      <textarea class="editable-area track-review-inp" rows="2" placeholder="${t('track_review_ph')}" oninput="updateTrack(${b.id},${tr.id},'review',this.value)">${escapeHtml(tr.review||'')}</textarea>
    `;
    wrap.appendChild(row);
  });
}

function addTrack(albumId) {
  const b = (S.media||[]).find(x => x.id === albumId);
  if (!b) return;
  if (!Array.isArray(b.tracks)) b.tracks = [];
  b.tracks.push({ id: Date.now(), title: '', duration: '', rating: 0, review: '' });
  scheduleSave(); renderAlbumDetail();
}

function updateTrack(albumId, trackId, field, value) {
  const b = (S.media||[]).find(x => x.id === albumId);
  if (!b) return;
  const tr = (b.tracks||[]).find(t => t.id === trackId);
  if (!tr) return;
  tr[field] = value;
  scheduleSave();
  if (field === 'rating') renderAlbumDetail();
}

function rateTrack(albumId, trackId, rating) {
  const b = (S.media||[]).find(x => x.id === albumId);
  if (!b) return;
  const tr = (b.tracks||[]).find(t => t.id === trackId);
  if (!tr) return;
  tr.rating = tr.rating === rating ? 0 : rating; // toggle off if same
  scheduleSave(); renderAlbumDetail();
}

function deleteTrack(albumId, trackId) {
  const b = (S.media||[]).find(x => x.id === albumId);
  if (!b) return;
  b.tracks = (b.tracks||[]).filter(t => t.id !== trackId);
  scheduleSave(); renderAlbumDetail();
}

function saveAlbumDetails() {
  const b = getActiveBook(); if (!b) return;
  b.title  = eid('adTitle').value.trim()  || b.title;
  b.author = eid('adArtist').value.trim() || b.author;
  b.notes  = eid('adNotes').value;
  b.status = eid('adStatus').value;
  const r  = parseFloat(eid('adRating').value);
  b.rating = r >= 0.5 && r <= 10 ? r : null;
  if (b.status === 'done' && !b.finishedOn) b.finishedOn = today();
  scheduleSave(); renderBooks(); renderAlbumDetail();
  toast(t('settings_saved'));
}

/* ══ BOOK DETAIL FILTER (status) ══ */
function setBookDetailStatus(value) {
  updateActiveBookStatus(value);
}
