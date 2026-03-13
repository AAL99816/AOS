'use strict';

/* ══ BOOKS ══ */
let bookF = 'all';
let activeBookId = null;

function bookStatusLabel(status){
  return {
    unread: 'To Read',
    reading: 'Reading',
    done: 'Finished'
  }[status] || 'To Read';
}

function getBookPct(book){
  const total = parseInt(book.totalPages) || 0;
  const current = parseInt(book.currentPage) || 0;
  if(total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
}

function getActiveBook(){
  return S.books.find(b => b.id === activeBookId);
}

function renderBooks(){
  const c = eid('booksGrid');
  c.innerHTML = '';

  const list = bookF === 'all'
    ? S.books
    : S.books.filter(b => b.status === bookF);

  if(!list.length){
    c.innerHTML = `<div style="color:var(--muted);font-size:0.8rem;padding:8px">None here.</div>`;
    return;
  }

  list.forEach((b, idx) => {
    const div = document.createElement('div');
    div.className = 'book-card';
    div.onclick = () => openBookDetails(b.id);

    const pal = PALS[idx % PALS.length];
    const stars = b.rating ? '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating) : '';
    const slbl = bookStatusLabel(b.status);
    const pct = getBookPct(b);
    const progressText = (b.totalPages || b.currentPage)
      ? `<div style="font-size:0.58rem;color:var(--gold-lt);margin-top:4px;font-family:'DM Mono',monospace">${b.currentPage || 0}/${b.totalPages || 0} · ${pct}%</div>`
      : '';

    div.innerHTML = `
      <div class="book-cover" style="background:${pal}">
        ${b.coverUrl
          ? `<img src="${b.coverUrl}" alt="">`
          : `<div class="book-cover-ph"><div class="ph-icon">◆</div><div>${b.title}</div></div>`
        }
        <div class="book-cover-overlay" onclick="event.stopPropagation()">
          <span>Add Cover</span>
          <input type="file" accept="image/*" onchange="event.stopPropagation();uploadCover(${b.id},this)">
        </div>
      </div>

      <div class="book-info">
        <input class="editable book-title-inp" value="${b.title}" onchange="event.stopPropagation();updateBF(${b.id},'title',this.value)">
        <input class="editable book-author-inp" value="${b.author}" onchange="event.stopPropagation();updateBF(${b.id},'author',this.value)">
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

function updateBF(id, f, v){
  const b = S.books.find(b => b.id === id);
  if(!b) return;
  b[f] = v;
  scheduleSave();
  renderBooks();
  if(activeBookId === id) renderBookDetails();
}

function setBookF(f, btn){
  bookF = f;
  document.querySelectorAll('.book-filters .fpill').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderBooks();
}

function cycleBook(id){
  const b = S.books.find(b => b.id === id);
  if(!b) return;

  const cyc = ['unread', 'reading', 'done'];
  b.status = cyc[(cyc.indexOf(b.status) + 1) % cyc.length];

  if(b.status === 'reading'){
    const rh = S.habits.find(h => h.id === 8);
    if(rh) rh.days[today()] = true;
  }

  scheduleSave();
  renderBooks();
  renderHabits();
  if(activeBookId === id) renderBookDetails();
}

function uploadCover(id, input){
  const f = input.files[0];
  if(!f) return;

  const r = new FileReader();
  r.onload = e => {
    const b = S.books.find(b => b.id === id);
    if(!b) return;
    b.coverUrl = e.target.result;
    scheduleSave();
    renderBooks();
    if(activeBookId === id) renderBookDetails();
  };
  r.readAsDataURL(f);
}

function delBook(id){
  if(!confirm('Remove book?')) return;

  S.books = S.books.filter(b => b.id !== id);

  if(activeBookId === id){
    activeBookId = null;
    closeModal('mBookDetails');
  }

  scheduleSave();
  renderBooks();
}

function saveBook(){
  const title=eid('bkT').value.trim();if(!title)return;
  S.books.push({id:Date.now(),title,author:eid('bkA').value.trim(),status:eid('bkS').value,rating:parseInt(eid('bkR').value)||null,notes:eid('bkN').value.trim(),coverUrl:'',currentPage:0,totalPages:0,chapterNotes:[]});
  scheduleSave();renderBooks();closeModal('mBook');toast(`"${title}" added`);
}
/* ══ BOOK DETAILS ══ */
function openBookDetails(id){
  activeBookId = id;
  renderBookDetails();
  openModal('mBookDetails');
}

function renderBookDetails(){
  const b = getActiveBook();
  if(!b) return;

  if(!Array.isArray(b.chapterNotes)) b.chapterNotes = [];
  if(typeof b.notes !== 'string') b.notes = '';
  if(typeof b.currentPage !== 'number') b.currentPage = parseInt(b.currentPage) || 0;
  if(typeof b.totalPages !== 'number') b.totalPages = parseInt(b.totalPages) || 0;

  eid('bdTitle').value = b.title || '';
  eid('bdAuthor').value = b.author || '';
  eid('bdStatus').value = b.status || 'unread';
  eid('bdRating').value = b.rating || '';
  eid('bdCurrentPage').value = b.currentPage || 0;
  eid('bdTotalPages').value = b.totalPages || 0;
  eid('bdNotes').value = b.notes || '';

  const pct = getBookPct(b);
  eid('bdProgressFill').style.width = `${pct}%`;
  eid('bdProgressText').textContent = b.totalPages > 0
    ? `${b.currentPage || 0} / ${b.totalPages} pages · ${pct}%`
    : 'Set total pages to track progress';

  const wrap = eid('bdChapterNotes');
  wrap.innerHTML = '';

  if(!b.chapterNotes.length){
    wrap.innerHTML = `<div style="color:var(--muted);font-size:0.76rem">No chapter notes yet.</div>`;
    return;
  }

  b.chapterNotes.forEach(n => {
    const card = document.createElement('div');
    card.className = 'chapter-note-card';
    card.innerHTML = `
      <div class="chapter-note-top">
        <input class="editable" value="${n.label || ''}" onchange="updateChapterLabel(${n.id},this.value)">
        <button class="chapter-note-del" onclick="deleteChapterNote(${n.id})">✕</button>
      </div>
      <textarea class="editable-area" rows="4" placeholder="Chapter notes…" oninput="updateChapterNote(${n.id},this.value)">${n.note || ''}</textarea>
    `;
    wrap.appendChild(card);
  });
}

function updateActiveBookField(field, value){
  const b = getActiveBook();
  if(!b) return;
  b[field] = value;
  scheduleSave();
  renderBooks();
}

function updateActiveBookStatus(value){
  const b = getActiveBook();
  if(!b) return;

  b.status = value;

  if(b.status === 'reading'){
    const rh = S.habits.find(h => h.id === 8);
    if(rh) rh.days[today()] = true;
    renderHabits();
  }

  scheduleSave();
  renderBooks();
  renderBookDetails();
}

function updateActiveBookRating(value){
  const b = getActiveBook();
  if(!b) return;

  const n = parseInt(value);
  b.rating = n >= 1 && n <= 5 ? n : null;

  scheduleSave();
  renderBooks();
  renderBookDetails();
}

function updateActiveBookPages(){
  const b = getActiveBook();
  if(!b) return;

  b.currentPage = Math.max(0, parseInt(eid('bdCurrentPage').value) || 0);
  b.totalPages = Math.max(0, parseInt(eid('bdTotalPages').value) || 0);

  if(b.totalPages > 0 && b.currentPage > b.totalPages){
    b.currentPage = b.totalPages;
  }

  eid('bdCurrentPage').value = b.currentPage;
  eid('bdTotalPages').value = b.totalPages;

  if(b.currentPage > 0 && b.status === 'unread'){
    b.status = 'reading';
  }
  if(b.totalPages > 0 && b.currentPage >= b.totalPages){
    b.status = 'done';
  }

  if(b.status === 'reading'){
    const rh = S.habits.find(h => h.id === 8);
    if(rh) rh.days[today()] = true;
    renderHabits();
  }

  scheduleSave();
  renderBooks();
  renderBookDetails();
}

function updateActiveBookNotes(value){
  const b = getActiveBook();
  if(!b) return;
  b.notes = value;
  scheduleSave();
}

function addChapterNote(){
  const b = getActiveBook();
  if(!b) return;

  if(!Array.isArray(b.chapterNotes)) b.chapterNotes = [];

  b.chapterNotes.push({
    id: Date.now(),
    label: `Chapter ${b.chapterNotes.length + 1}`,
    note: ''
  });

  scheduleSave();
  renderBookDetails();
}

function updateChapterLabel(noteId, value){
  const b = getActiveBook();
  if(!b || !Array.isArray(b.chapterNotes)) return;

  const n = b.chapterNotes.find(n => n.id === noteId);
  if(!n) return;

  n.label = value;
  scheduleSave();
}

function updateChapterNote(noteId, value){
  const b = getActiveBook();
  if(!b || !Array.isArray(b.chapterNotes)) return;

  const n = b.chapterNotes.find(n => n.id === noteId);
  if(!n) return;

  n.note = value;
  scheduleSave();
}

function deleteChapterNote(noteId){
  const b = getActiveBook();
  if(!b || !Array.isArray(b.chapterNotes)) return;

  b.chapterNotes = b.chapterNotes.filter(n => n.id !== noteId);
  scheduleSave();
  renderBookDetails();
}
