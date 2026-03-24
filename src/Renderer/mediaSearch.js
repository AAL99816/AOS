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
  eid('bkT').value = '';
  eid('bkA').value = '';
  hideMediaDropdown();
  _autofillData = {};
  _ddResults    = [];
  updateSearchPlaceholder();
  const lbl = eid('bkCreatorLabel');
  if (lbl && typeof mediaCreatorLabel === 'function') lbl.textContent = mediaCreatorLabel(eid('bkType').value);
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
    else if (type === 'show')                        results = await searchShows(q);
    else if (type === 'anime')                       results = await searchAnime(q);
    else if (type === 'game')                        results = await searchGames(q);
    else if (type === 'album')                       results = await searchAlbums(q);
  } catch (e) { console.warn('[mediaSearch]', e); }
  showMediaDropdown(results);
}

// ── API search functions ──────────────────────────────────────────────────────
async function searchBooks(q) {
  const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=title,author_name,number_of_pages_median,cover_i,cover_edition_key,isbn,first_publish_year`);
  const d = await r.json();
  return (d.docs || []).filter(item => item.title).slice(0, 6).map(item => {
    let coverUrl = '';
    if (item.cover_i)             coverUrl = `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg`;
    else if (item.cover_edition_key) coverUrl = `https://covers.openlibrary.org/b/olid/${item.cover_edition_key}-L.jpg`;
    else if (item.isbn?.[0])      coverUrl = `https://covers.openlibrary.org/b/isbn/${item.isbn[0]}-L.jpg`;
    return {
      title:      item.title || '',
      creator:    (item.author_name || []).slice(0, 2).join(', '),
      coverUrl,
      totalPages: item.number_of_pages_median || 0,
      year:       item.first_publish_year ? String(item.first_publish_year) : ''
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
    platform: (g.platforms || []).map(p => p.platform.name).slice(0, 2).join(', '),
    rawgId:   g.id
  }));
}

async function searchAlbums(q) {
  const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=8`);
  const d = await r.json();
  return (d.results || []).slice(0, 6).map(item => ({
    title:     item.collectionName || '',
    creator:   item.artistName    || '',
    coverUrl:  (item.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
    year:      item.releaseDate ? item.releaseDate.slice(0, 4) : '',
    itunesId:  item.collectionId
  }));
}

async function searchAnime(q) {
  const r = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=6&sfw`);
  const d = await r.json();
  return (d.data || []).map(item => ({
    title:         item.title_english || item.title || '',
    creator:       (item.studios || []).map(s => s.name).slice(0, 1).join(''),
    coverUrl:      item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
    year:          item.year ? String(item.year) : '',
    totalEpisodes: item.episodes || 0,
    totalSeasons:  1,
    jikanId:       item.mal_id
  }));
}

// ── Dropdown UI ───────────────────────────────────────────────────────────────
function getAttributionHtml(type) {
  if (type === 'book')
    return `<div style="padding:6px 12px;font-size:0.58rem;color:var(--muted);border-top:1px solid var(--border);text-align:right">Data from <a href="https://openlibrary.org" target="_blank" style="color:var(--muted);text-decoration:underline">Open Library</a></div>`;
  if (type === 'film' || type === 'show' || type === 'anime')
    return `<div style="padding:6px 12px;font-size:0.58rem;color:var(--muted);border-top:1px solid var(--border)">Data from <a href="https://www.themoviedb.org" target="_blank" style="color:var(--muted);text-decoration:underline">TMDB</a> — not endorsed or certified by TMDB</div>`;
  if (type === 'game')
    return `<div style="padding:6px 12px;font-size:0.58rem;color:var(--muted);border-top:1px solid var(--border);text-align:right">Powered by <a href="https://rawg.io" target="_blank" style="color:var(--muted);text-decoration:underline">RAWG</a></div>`;
  if (type === 'album')
    return `<div style="padding:6px 12px;font-size:0.58rem;color:var(--muted);border-top:1px solid var(--border);text-align:right">Data from <a href="https://music.apple.com" target="_blank" style="color:var(--muted);text-decoration:underline">iTunes</a></div>`;
  if (type === 'anime')
    return `<div style="padding:6px 12px;font-size:0.58rem;color:var(--muted);border-top:1px solid var(--border);text-align:right">Data from <a href="https://myanimelist.net" target="_blank" style="color:var(--muted);text-decoration:underline">MyAnimeList</a> via Jikan</div>`;
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

// ── Upload external cover to Supabase storage ─────────────────────────────────
async function uploadExternalCover(url) {
  if (!url || typeof uploadAsset !== 'function' || typeof currentUser === 'undefined' || !currentUser) return url;
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) return url;
    const blob = await resp.blob();
    const file = new File([blob], 'cover', { type: blob.type || 'image/jpeg' });
    return await uploadAsset(`covers/${Date.now()}`, file);
  } catch (e) {
    return url; // fallback — external URL still shows in <img> tags
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtRuntime(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtMs(ms) {
  if (!ms) return '';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Selection ─────────────────────────────────────────────────────────────────
async function selectMediaResult(i) {
  const r = _ddResults[i];
  if (!r) return;
  _autofillData = { ...r };
  const type = eid('bkType').value;

  // Shows/anime — fetch season + episode totals
  if ((type === 'show' || type === 'anime') && r.tmdbId && TMDB_KEY) {
    try {
      const res    = await fetch(`https://api.themoviedb.org/3/tv/${r.tmdbId}?api_key=${TMDB_KEY}`);
      const detail = await res.json();
      _autofillData.totalSeasons  = detail.number_of_seasons  || 0;
      _autofillData.totalEpisodes = detail.number_of_episodes || 0;
      _autofillData.creator = (detail.created_by || []).map(p => p.name).join(', ');
    } catch (e) { /* silently skip */ }
  }

  // Films — fetch runtime + director
  if (type === 'film' && r.tmdbId && TMDB_KEY) {
    try {
      const res    = await fetch(`https://api.themoviedb.org/3/movie/${r.tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits`);
      const detail = await res.json();
      _autofillData.runtime = fmtRuntime(detail.runtime);
      const director = (detail.credits?.crew || []).find(c => c.job === 'Director');
      if (director) _autofillData.creator = director.name;
    } catch (e) { /* silently skip */ }
  }

  // Games — fetch developer from RAWG detail endpoint
  if (type === 'game' && r.rawgId && RAWG_KEY) {
    try {
      const res    = await fetch(`https://api.rawg.io/api/games/${r.rawgId}?key=${RAWG_KEY}`);
      const detail = await res.json();
      const dev    = (detail.developers || [])[0]?.name || '';
      if (dev) _autofillData.creator = dev;
    } catch (e) { /* silently skip */ }
  }

  // Albums — fetch tracklist from iTunes
  if (type === 'album' && r.itunesId) {
    try {
      const trkRes  = await fetch(`https://itunes.apple.com/lookup?id=${r.itunesId}&entity=song`);
      const trkData = await trkRes.json();
      const tracks  = (trkData.results || []).filter(t => t.wrapperType === 'track');
      if (tracks.length) {
        _autofillData.tracks = tracks.map(tr => ({
          id:       Date.now() + Math.random(),
          title:    tr.trackName    || '',
          duration: fmtMs(tr.trackTimeMillis),
          rating:   0,
          review:   ''
        }));
      }
    } catch (e) { /* silently skip */ }
  }

  eid('bkT').value = r.title                        || '';
  eid('bkA').value = _autofillData.creator || r.creator || '';
  hideMediaDropdown();

  // Upload cover to Supabase — disable Save until done so cover is always stored
  if (_autofillData.coverUrl) {
    const saveBtn = document.querySelector('#mBook .btn-p');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Uploading cover…'; }
    _autofillData.coverUrl = await uploadExternalCover(_autofillData.coverUrl);
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
  }
}

// Called by saveBook() to get autofill data, then reset
function consumeAutofillData() {
  const data = { ..._autofillData };
  _autofillData = {};
  _ddResults    = [];
  return data;
}
