'use strict';

// ── API Keys ──────────────────────────────────────────────────────────────────
// Get free keys at:
//   TMDB  → https://www.themoviedb.org/settings/api  (movies + TV shows)
//   RAWG  → https://rawg.io/apidocs                  (games)
const TMDB_KEY = '5402798e10de2bc6e4cc1e855bef54de';
const RAWG_KEY = '6c844977a1ee47f4bf8fd23373361a55';

// ── State ─────────────────────────────────────────────────────────────────────
let _ddResults    = [];
let _autofillData = {};
let _searchTimer  = null;

// ── Triggered when type selector changes ──────────────────────────────────────
function onMediaTypeChange() {
  const el = eid('bkSearch');
  if (el) el.value = '';
  hideMediaDropdown();
  _autofillData = {};
  _ddResults    = [];
  updateSearchPlaceholder();
}

function updateSearchPlaceholder() {
  const el = eid('bkSearch');
  if (!el) return;
  const ph = {
    book:  'Search books…',
    film:  'Search movies…',
    show:  'Search TV shows…',
    anime: 'Search anime…',
    album: 'Search albums…',
    game:  'Search games…'
  };
  el.placeholder = ph[eid('bkType').value] || 'Search…';
}

// ── Input handler (debounced) ─────────────────────────────────────────────────
function onMediaSearchInput() {
  clearTimeout(_searchTimer);
  const q = (eid('bkSearch').value || '').trim();
  if (q.length < 2) { hideMediaDropdown(); return; }
  _searchTimer = setTimeout(() => doMediaSearch(q), 400);
}

async function doMediaSearch(q) {
  const type = eid('bkType').value;
  let results = [];
  try {
    if      (type === 'book')                        results = await searchBooks(q);
    else if (type === 'film')                        results = await searchMovies(q);
    else if (type === 'show' || type === 'anime')    results = await searchShows(q);
    else if (type === 'game')                        results = await searchGames(q);
    else if (type === 'album')                       results = await searchAlbums(q);
  } catch (e) { console.warn('[mediaSearch]', e); }
  showMediaDropdown(results);
}

// ── API search functions ──────────────────────────────────────────────────────
async function searchBooks(q) {
  const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=6&orderBy=relevance`);
  const d = await r.json();
  return (d.items || []).map(item => {
    const v = item.volumeInfo;
    return {
      title:      v.title || '',
      creator:    (v.authors || []).join(', '),
      coverUrl:   (v.imageLinks?.thumbnail || '').replace('http:', 'https:').replace('&edge=curl', ''),
      totalPages: v.pageCount || 0,
      year:       (v.publishedDate || '').slice(0, 4)
    };
  });
}

async function searchMovies(q) {
  if (!TMDB_KEY) return [];
  const r = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`);
  const d = await r.json();
  return (d.results || []).slice(0, 6).map(m => ({
    title:    m.title || '',
    creator:  '',
    coverUrl: m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : '',
    year:     (m.release_date || '').slice(0, 4),
    tmdbId:   m.id
  }));
}

async function searchShows(q) {
  if (!TMDB_KEY) return [];
  const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&page=1`);
  const d = await r.json();
  return (d.results || []).slice(0, 6).map(s => ({
    title:    s.name || '',
    creator:  '',
    coverUrl: s.poster_path ? `https://image.tmdb.org/t/p/w200${s.poster_path}` : '',
    year:     (s.first_air_date || '').slice(0, 4),
    tmdbId:   s.id
  }));
}

async function searchGames(q) {
  if (!RAWG_KEY) return [];
  const r = await fetch(`https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(q)}&page_size=6`);
  const d = await r.json();
  return (d.results || []).map(g => ({
    title:    g.name || '',
    creator:  '',
    coverUrl: g.background_image || '',
    year:     (g.released || '').slice(0, 4),
    platform: (g.platforms || []).map(p => p.platform.name).slice(0, 2).join(', ')
  }));
}

async function searchAlbums(q) {
  const r = await fetch(
    `https://musicbrainz.org/ws/2/release-group?query=releasegroup:${encodeURIComponent(q)}&type=album&limit=6&fmt=json`,
    { headers: { 'User-Agent': 'AOS/1.0 (aoshome.app)' } }
  );
  const d = await r.json();
  return (d['release-groups'] || []).slice(0, 6).map(g => ({
    title:   g.title || '',
    creator: (g['artist-credit'] || []).map(a => a.name).filter(Boolean).join(', '),
    coverUrl: g.id ? `https://coverartarchive.org/release-group/${g.id}/front-250` : '',
    year:    (g['first-release-date'] || '').slice(0, 4),
    mbid:    g.id
  }));
}

// ── Dropdown UI ───────────────────────────────────────────────────────────────
function getAttributionHtml(type) {
  if (type === 'book')
    return `<div style="padding:6px 12px;font-size:0.58rem;color:var(--muted);border-top:1px solid var(--border);text-align:right">Powered by <a href="https://books.google.com" target="_blank" style="color:var(--muted);text-decoration:underline">Google Books</a></div>`;
  if (type === 'film' || type === 'show' || type === 'anime')
    return `<div style="padding:6px 12px;font-size:0.58rem;color:var(--muted);border-top:1px solid var(--border)">Data from <a href="https://www.themoviedb.org" target="_blank" style="color:var(--muted);text-decoration:underline">TMDB</a> — not endorsed or certified by TMDB</div>`;
  if (type === 'game')
    return `<div style="padding:6px 12px;font-size:0.58rem;color:var(--muted);border-top:1px solid var(--border);text-align:right">Powered by <a href="https://rawg.io" target="_blank" style="color:var(--muted);text-decoration:underline">RAWG</a></div>`;
  if (type === 'album')
    return `<div style="padding:6px 12px;font-size:0.58rem;color:var(--muted);border-top:1px solid var(--border);text-align:right">Data from <a href="https://musicbrainz.org" target="_blank" style="color:var(--muted);text-decoration:underline">MusicBrainz</a></div>`;
  return '';
}

function showMediaDropdown(results) {
  _ddResults = results;
  const dd = eid('bkDropdown');
  if (!dd) return;
  if (!results.length) { dd.style.display = 'none'; return; }
  const type = eid('bkType').value;
  dd.innerHTML = results.map((r, i) =>
    `<div class="media-dd-item" onclick="selectMediaResult(${i})">
      ${r.coverUrl
        ? `<img src="${escapeAttr(r.coverUrl)}" alt="" onerror="this.style.display='none'" style="width:34px;height:46px;object-fit:cover;border-radius:3px;flex-shrink:0">`
        : `<div style="width:34px;height:46px;background:var(--border);border-radius:3px;flex-shrink:0"></div>`}
      <div style="min-width:0;flex:1">
        <div style="font-size:0.8rem;color:var(--cream);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.title)}</div>
        <div style="font-size:0.63rem;color:var(--muted)">${escapeHtml(r.creator || '')}${r.year ? (r.creator ? ' · ' : '') + r.year : ''}</div>
      </div>
    </div>`
  ).join('') + getAttributionHtml(type);
  dd.style.display = 'block';
}

function hideMediaDropdown() {
  const dd = eid('bkDropdown');
  if (dd) dd.style.display = 'none';
}

// ── Selection ─────────────────────────────────────────────────────────────────
async function selectMediaResult(i) {
  const r = _ddResults[i];
  if (!r) return;
  _autofillData = { ...r };

  // For shows/anime, fetch full season+episode count
  const type = eid('bkType').value;
  if ((type === 'show' || type === 'anime') && r.tmdbId && TMDB_KEY) {
    try {
      const res    = await fetch(`https://api.themoviedb.org/3/tv/${r.tmdbId}?api_key=${TMDB_KEY}`);
      const detail = await res.json();
      _autofillData.totalSeasons  = detail.number_of_seasons  || 0;
      _autofillData.totalEpisodes = detail.number_of_episodes || 0;
    } catch (e) { /* silently skip */ }
  }

  eid('bkT').value = r.title   || '';
  eid('bkA').value = r.creator || '';
  hideMediaDropdown();
}

// Called by saveBook() to get autofill data, then reset
function consumeAutofillData() {
  const data = { ..._autofillData };
  _autofillData = {};
  _ddResults    = [];
  return data;
}
