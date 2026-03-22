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
  const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=title,author_name,number_of_pages_median,cover_i,first_publish_year`);
  const d = await r.json();
  return (d.docs || []).map(item => ({
    title:      item.title || '',
    creator:    (item.author_name || []).slice(0, 2).join(', '),
    coverUrl:   item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : '',
    totalPages: item.number_of_pages_median || 0,
    year:       item.first_publish_year ? String(item.first_publish_year) : ''
  }));
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
    return `<div style="padding:6px 12px;font-size:0.58rem;color:var(--muted);border-top:1px solid var(--border);text-align:right">Data from <a href="https://openlibrary.org" target="_blank" style="color:var(--muted);text-decoration:underline">Open Library</a></div>`;
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

  // Albums — fetch tracklist from MusicBrainz
  if (type === 'album' && r.mbid) {
    try {
      const relRes = await fetch(
        `https://musicbrainz.org/ws/2/release?release-group=${r.mbid}&limit=1&fmt=json`,
        { headers: { 'User-Agent': 'AOS/1.0 (aoshome.app)' } }
      );
      const relData = await relRes.json();
      const releaseId = relData.releases?.[0]?.id;
      if (releaseId) {
        const trkRes = await fetch(
          `https://musicbrainz.org/ws/2/release/${releaseId}?inc=recordings&fmt=json`,
          { headers: { 'User-Agent': 'AOS/1.0 (aoshome.app)' } }
        );
        const trkData = await trkRes.json();
        const media   = trkData.media?.[0];
        if (media?.tracks?.length) {
          _autofillData.tracks = media.tracks.map(tr => ({
            id:       Date.now() + Math.random(),
            title:    tr.title || '',
            duration: fmtMs(tr.length),
            rating:   0,
            review:   ''
          }));
        }
      }
    } catch (e) { /* silently skip */ }
  }

  eid('bkT').value = r.title                   || '';
  eid('bkA').value = _autofillData.creator || r.creator || '';
  hideMediaDropdown();
}

// Called by saveBook() to get autofill data, then reset
function consumeAutofillData() {
  const data = { ..._autofillData };
  _autofillData = {};
  _ddResults    = [];
  return data;
}
