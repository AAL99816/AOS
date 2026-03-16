'use strict';

const ACCENT_THEMES = {
  rose:     { '--blush':'#c0607a','--rose':'#8b3252','--petal':'#e8a0b0','--mist':'#f0ccd5','--cream':'#faf0f2','--gold':'#c9956a','--gold-lt':'#e8b990','--muted':'#8a5060','--muted-lt':'#b07888' },
  ocean:    { '--blush':'#5a9fbf','--rose':'#2d6a8a','--petal':'#a0d0e8','--mist':'#d0eaf5','--cream':'#f0f8fc','--gold':'#6ab0c9','--gold-lt':'#90cde8','--muted':'#4a7890','--muted-lt':'#70a0b8' },
  forest:   { '--blush':'#6aaa7a','--rose':'#3a7a4a','--petal':'#a0d0a8','--mist':'#d0ead5','--cream':'#f0f8f2','--gold':'#c9a96a','--gold-lt':'#e8c890','--muted':'#4a7858','--muted-lt':'#70a078' },
  midnight: { '--blush':'#9090b0','--rose':'#5a5a7a','--petal':'#c0c0d8','--mist':'#e0e0ec','--cream':'#f5f5fa','--gold':'#c9b06a','--gold-lt':'#e8cc90','--muted':'#606078','--muted-lt':'#909098' },
  ember:    { '--blush':'#c08040','--rose':'#8b5220','--petal':'#e8c0a0','--mist':'#f5e0d0','--cream':'#fdf5ef','--gold':'#c9956a','--gold-lt':'#e8b990','--muted':'#8a6040','--muted-lt':'#b09070' }
};
const APP_THEMES = {
  // Obsidian: deep wine-rose dark (default)
  obsidian: { '--ink':'#0d0408','--deep':'#160809','--panel':'#240e14','--mid':'#341520','--border':'rgba(192,96,122,0.20)','--border-lt':'rgba(232,160,176,0.32)' },
  // Slate: deep navy blue
  slate:    { '--ink':'#060c18','--deep':'#0a1322','--panel':'#0f1e35','--mid':'#162840','--border':'rgba(70,130,210,0.22)','--border-lt':'rgba(110,175,245,0.34)' },
  // Coffee: warm amber-brown
  coffee:   { '--ink':'#0e0803','--deep':'#180f05','--panel':'#261508','--mid':'#35200c','--border':'rgba(200,140,55,0.20)','--border-lt':'rgba(230,175,90,0.32)' },
  // Forest: deep emerald green
  forest:   { '--ink':'#050d07','--deep':'#08140a','--panel':'#0e2014','--mid':'#142c1c','--border':'rgba(65,165,90,0.20)','--border-lt':'rgba(100,200,120,0.32)' },
  // Void: pure cold black
  void:     { '--ink':'#070707','--deep':'#0d0d0d','--panel':'#141414','--mid':'#1e1e1e','--border':'rgba(150,150,165,0.16)','--border-lt':'rgba(205,205,215,0.24)' }
};
/* Keep BOX_THEMES alias for any legacy references */
const BOX_THEMES = APP_THEMES;
/* Keep THEMES alias for any legacy references */
const THEMES = {
  rose:     { ...ACCENT_THEMES.rose,     '--mid':'#4a1a28', '--deep':'#230d14', '--panel':'#2d1019', '--ink':'#1a0a0f' },
  ocean:    { ...ACCENT_THEMES.ocean,    '--mid':'#1a3a4a', '--deep':'#0d2030', '--panel':'#152838', '--ink':'#0a1520' },
  forest:   { ...ACCENT_THEMES.forest,   '--mid':'#1a3a22', '--deep':'#0d2014', '--panel':'#152818', '--ink':'#0a150c' },
  midnight: { ...ACCENT_THEMES.midnight, '--mid':'#2a2a3a', '--deep':'#151520', '--panel':'#1e1e2a', '--ink':'#0f0f18' },
  ember:    { ...ACCENT_THEMES.ember,    '--mid':'#4a2a10', '--deep':'#231508', '--panel':'#2d1c0a', '--ink':'#1a0f05' }
};

const FONTS = {
  elegant: { body: "'Jost', sans-serif", heading: "'Cormorant Garamond', serif", mono: "'DM Mono', monospace" },
  clean:   { body: "'Jost', sans-serif", heading: "'Jost', sans-serif",           mono: "'DM Mono', monospace" },
  sharp:   { body: "'DM Mono', monospace", heading: "'DM Mono', monospace",       mono: "'DM Mono', monospace" }
};

function applyAccentTheme(key) {
  const t2 = ACCENT_THEMES[key] || ACCENT_THEMES.rose;
  const root = document.documentElement;
  Object.entries(t2).forEach(([k, v]) => root.style.setProperty(k, v));
  document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === key));
}
function applyBoxTheme(key) {
  const t2 = APP_THEMES[key] || APP_THEMES.obsidian;
  const root = document.documentElement;
  Object.entries(t2).forEach(([k, v]) => root.style.setProperty(k, v));
  document.querySelectorAll('.box-theme-opt').forEach(b => b.classList.toggle('active', b.dataset.boxTheme === key));
}
/* Keep applyTheme as alias for accent (used in existing onclick handlers) */
function applyTheme(key) { applyAccentTheme(key); }

function applyFont(fontKey) {
  const font = FONTS[fontKey] || FONTS.elegant;
  const root = document.documentElement;
  root.style.setProperty('--font-body',    font.body);
  root.style.setProperty('--font-heading', font.heading);
  root.style.setProperty('--font-mono',    font.mono);
  document.querySelectorAll('.font-opt').forEach(b => b.classList.toggle('active', b.dataset.font === fontKey));
}

async function saveSettings() {
  if (!currentUser) return;
  const username    = eid('stUsername').value.trim().replace(/[^a-zA-Z0-9_]/g,'').slice(0,30);
  const country     = eid('stCountry').value.trim();
  const displayName = eid('stDisplayName').value.trim();
  const theme       = document.querySelector('.theme-opt.active')?.dataset.theme || 'rose';
  const font        = document.querySelector('.font-opt.active')?.dataset.font   || 'elegant';
  const boxTheme    = document.querySelector('.box-theme-opt.active')?.dataset.boxTheme || 'obsidian';

  const update = { id: currentUser.id, email: currentUser.email };
  if (username)    update.username     = username;
  if (country)     update.country      = country;
  if (displayName) update.display_name = displayName;
  update.theme = theme;
  update.font  = font;

  const { error } = await sb.from('profiles').upsert(update, { onConflict: 'id' });
  if (error) { toast('Save failed: ' + error.message); return; }

  if (!currentProfile) currentProfile = {};
  if (username)    currentProfile.username     = username;
  if (country)     currentProfile.country      = country;
  if (displayName) currentProfile.display_name = displayName;
  currentProfile.theme = theme;
  currentProfile.font  = font;

  // Save theme/font/box preference locally too for fast load
  localStorage.setItem('aos_theme', theme);
  localStorage.setItem('aos_font',  font);
  localStorage.setItem('aos_box_theme', boxTheme);

  renderHeroProfile();
  renderAll();
  toast(t('settings_saved'));
}

function openSettings() {
  if (!currentProfile) currentProfile = {};
  eid('stUsername').value    = currentProfile.username    || '';
  eid('stCountry').value     = currentProfile.country     || '';
  eid('stDisplayName').value = currentProfile.display_name || S.appTitle.replace(/'s OS$|'s نظام الحياة$/,'').trim() || '';

  // Populate avatar preview
  const av = eid('stAvatarPreview');
  const avatarUrl = currentProfile.avatar_url || '';
  const username  = currentProfile.username   || '';
  const initials  = (username || (typeof currentUser !== 'undefined' && currentUser?.email) || '?')[0].toUpperCase();
  av.innerHTML = avatarUrl
    ? `<img src="${escapeAttr(avatarUrl)}" alt="" style="width:100%;height:100%;object-fit:cover">`
    : `<span>${escapeHtml(initials)}</span>`;
  eid('stAvatarStatus').textContent = '';

  const savedTheme = currentProfile.theme || localStorage.getItem('aos_theme') || 'rose';
  const savedFont  = currentProfile.font  || localStorage.getItem('aos_font')  || 'elegant';
  const savedBox   = localStorage.getItem('aos_box_theme') || 'obsidian';
  applyTheme(savedTheme);
  applyFont(savedFont);
  applyBoxTheme(savedBox);

  const stRef = eid('st-reflection');
  if (stRef) stRef.checked = S.appPrefs?.showReflection !== false;

  eid('stLangToggle').textContent = currentLang === 'en' ? 'AR' : 'EN';
  openModal('mSettings');
}

async function uploadAvatarFromSettings(input) {
  const f = input.files[0];
  if (!f || !currentUser) return;
  const status = eid('stAvatarStatus');
  status.textContent = 'Uploading…';
  try {
    const url = await uploadAsset('avatar', f);
    const { error } = await sb.from('profiles').upsert({ id: currentUser.id, email: currentUser.email, avatar_url: url }, { onConflict: 'id' });
    if (error) throw error;
    if (!currentProfile) currentProfile = {};
    currentProfile.avatar_url = url;
    // Update preview
    const av = eid('stAvatarPreview');
    av.innerHTML = `<img src="${escapeAttr(url)}" alt="" style="width:100%;height:100%;object-fit:cover">`;
    status.textContent = 'Saved';
    renderHeroProfile();
  } catch (e) {
    status.textContent = 'Upload failed: ' + (e.message || e);
  }
}

function toggleReflection(on) {
  if (!S.appPrefs) S.appPrefs = {};
  S.appPrefs.showReflection = on;
  scheduleSave();
  applyReflectionVisibility();
}

function applyReflectionVisibility() {
  const el = eid('reflectionCard');
  if (el) el.style.display = (S.appPrefs && S.appPrefs.showReflection !== false) ? '' : 'none';
}

/* Called on app boot to restore saved theme/font */
function restoreAppearance() {
  const theme    = localStorage.getItem('aos_theme')     || 'rose';
  const font     = localStorage.getItem('aos_font')      || 'elegant';
  const boxTheme = localStorage.getItem('aos_box_theme') || 'obsidian';
  applyTheme(theme);
  applyFont(font);
  applyBoxTheme(boxTheme);
}
