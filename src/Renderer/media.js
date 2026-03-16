'use strict';

/* ══ MEDIA ══ */
let bookF = 'all';
let mediaTypeF = 'all';
let activeBookId = null;

const MEDIA_TYPES = ['book','show','anime','film','other'];

function mediaStatusLabel(status, mediaType) {
  if (mediaType === 'film') return {unread:t('queued'), reading:'—', done:t('watched')}[status] || t('queued');
  if (mediaType === 'book') return {unread:t('to_read'), reading:t('reading'), done:t('finished')}[status] || t('to_read');
  return {unread:t('queued'), reading:t('watching'), done:t('finished')}[status] || t('queued');
}

function mediaTypeLabel(mt) {
  return {book:t('book'), show:t('show'), anime:t('anime'), film:t('film'), other:t('other')}[mt] || t('other');
}

function mediaCreatorLabel(mt) {
  return mt === 'film' ? t('director') : mt === 'book' ? t('author') : t('creator');
}

function mediaUnitLabel(mt) {
  return (mt === 'show' || mt === 'anime') ? t('episode') : t('page');
}

function mediaNotesLabel(mt) {
  return (mt === 'show' || mt === 'anime') ? t('episode_notes') : mt === 'film' ? t('notes') : t('chapter_notes');
}

function getBookPct(item) {
  const total = parseInt(item.totalPages) || 0;
  const current = parseInt(item.currentPage) || 0;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
}

function getActiveBook() {
  return (S.media || []).find(b => b.id === activeBookId);
}

function renderBooks() {
  const c = eid('mediaGrid');
  c.innerHTML = '';

  let list = S.media || [];
  if (mediaTypeF !== 'all') list = list.filter(b => b.mediaType === mediaTypeF);
  if (bookF !== 'all') list = list.filter(b => b.status === bookF);

  if (!list.length) {
    c.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px 24px"><div style="font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--border-lt);margin-bottom:10px">◆</div><div style="font-size:0.66rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace">${t('nothing_here')}</div></div>`;
    return;
  }

  list.forEach((b, idx) => {
    const div = document.createElement('div');
    div.className = 'book-card';
    div.onclick = () => openBookDetails(b.id);

    const pal = PALS[idx % PALS.length];
    const stars = b.rating ? '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating) : '';
    const slbl = mediaStatusLabel(b.status, b.mediaType);
    const pct = getBookPct(b);
    const progressText = (b.totalPages || b.currentPage)
      ? `<div style="font-size:0.58rem;color:var(--gold-lt);margin-top:4px;font-family:'DM Mono',monospace">${b.currentPage||0}/${b.totalPages||0} · ${pct}%</div>`
      : '';
    const typePill = `<div style="font-size:0.5rem;font-family:'DM Mono',monospace;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);margin-bottom:3px">${mediaTypeLabel(b.mediaType)}</div>`;

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
        ${typePill}
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

    c.appendChild(div);
  });
}

function updateBF(id, f, v) {
  const b = (S.media||[]).find(b => b.id === id);
  if (!b) return;
  b[f] = v;
  scheduleSave();
  renderBooks();
  if (activeBookId === id) renderBookDetails();
}

function setBookF(f, btn) {
  bookF = f;
  document.querySelectorAll('.book-status-filters .fpill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBooks();
}

function setMediaTypeF(f, btn) {
  mediaTypeF = f;
  document.querySelectorAll('.book-type-filters .fpill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBooks();
}

function cycleBook(id) {
  const b = (S.media||[]).find(b => b.id === id);
  if (!b) return;
  const cyc = ['unread','reading','done'];
  b.status = cyc[(cyc.indexOf(b.status) + 1) % cyc.length];
  if (b.status === 'reading') {
    const rh = hfind('read','reading','book','watch');
    if (rh) rh.days[today()] = true;
  }
  if (b.status === 'done' && !b.finishedOn) b.finishedOn = today();
  if (b.status !== 'done') b.finishedOn = null;
  scheduleSave();
  renderBooks();
  renderHabits();
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
  if (activeBookId === id) { activeBookId = null; closeModal('mBookDetails'); }
  scheduleSave();
  renderBooks();
}

function saveBook() {
  const title = eid('bkT').value.trim();
  if (!title) return;
  if (!Array.isArray(S.media)) S.media = [];
  S.media.push(makeMedia({
    id: Date.now(),
    mediaType: eid('bkType').value,
    title,
    author: eid('bkA').value.trim(),
    status: eid('bkS').value,
    rating: parseInt(eid('bkR').value) || null,
    notes: eid('bkN').value.trim()
  }));
  eid('bkT').value=''; eid('bkA').value=''; eid('bkN').value=''; eid('bkR').value='';
  scheduleSave();
  renderBooks();
  closeModal('mBook');
  toast(`"${title}" ${t('added')}`);
}

/* ══ MEDIA DETAILS ══ */
function openBookDetails(id) {
  activeBookId = id;
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
  eid('bdCurrentPage').value = b.currentPage;
  eid('bdTotalPages').value  = b.totalPages;
  eid('bdNotes').value       = b.notes  || '';

  const unitLbl = mediaUnitLabel(b.mediaType);
  eid('bdCurrentPageLabel').textContent = `Current ${unitLbl}`;
  eid('bdTotalPagesLabel').textContent  = `Total ${unitLbl}s`;
  eid('bdChapterNotesLabel').textContent = mediaNotesLabel(b.mediaType);
  eid('bdCreatorLabel').textContent = mediaCreatorLabel(b.mediaType);

  const statusSel = eid('bdStatus');
  const opts = statusSel.options;
  const labels = b.mediaType === 'book'
    ? [t('to_read'), t('reading'), t('finished')]
    : b.mediaType === 'film'
    ? [t('queued'), '—', t('watched')]
    : [t('queued'), t('watching'), t('finished')];
  for (let i = 0; i < opts.length; i++) opts[i].text = labels[i];

  const pct = getBookPct(b);
  eid('bdProgressFill').style.width = `${pct}%`;
  eid('bdProgressText').textContent = b.totalPages > 0
    ? `${b.currentPage} / ${b.totalPages} ${unitLbl.toLowerCase()}s · ${pct}%`
    : t('set_total_pages');

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
  if (b.status === 'reading') {
    const rh = hfind('read','reading','book','watch');
    if (rh) rh.days[today()] = true;
    renderHabits();
  }
  if (b.status === 'done' && !b.finishedOn) b.finishedOn = today();
  if (b.status !== 'done') b.finishedOn = null;
  scheduleSave(); renderBooks(); renderBookDetails();
}

function updateActiveBookRating(value) {
  const b = getActiveBook(); if (!b) return;
  const n = parseInt(value);
  b.rating = n >= 1 && n <= 5 ? n : null;
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
    const rh = hfind('read','reading','book','watch');
    if (rh) rh.days[today()] = true;
    renderHabits();
  }
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
  scheduleSave(); renderBookDetails();
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
  scheduleSave(); renderBookDetails();
}
