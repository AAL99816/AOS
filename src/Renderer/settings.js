'use strict';

const ACCENT_THEMES = {
  rose:     { '--blush':'#c0607a','--rose':'#8b3252','--petal':'#e8a0b0','--mist':'#f0ccd5','--cream':'#faf0f2','--gold':'#c9956a','--gold-lt':'#e8b990','--muted':'#8a5060','--muted-lt':'#b07888','--blush-dim':'rgba(192,96,122,0.07)','--border-hi':'rgba(192,96,122,0.38)' },
  ocean:    { '--blush':'#5a9fbf','--rose':'#2d6a8a','--petal':'#a0d0e8','--mist':'#d0eaf5','--cream':'#f0f8fc','--gold':'#6ab0c9','--gold-lt':'#90cde8','--muted':'#4a7890','--muted-lt':'#70a0b8','--blush-dim':'rgba(70,140,190,0.07)','--border-hi':'rgba(70,140,190,0.38)' },
  forest:   { '--blush':'#6aaa7a','--rose':'#3a7a4a','--petal':'#a0d0a8','--mist':'#d0ead5','--cream':'#f0f8f2','--gold':'#c9a96a','--gold-lt':'#e8c890','--muted':'#4a7858','--muted-lt':'#70a078','--blush-dim':'rgba(90,160,100,0.07)','--border-hi':'rgba(90,160,100,0.38)' },
  midnight: { '--blush':'#9090b0','--rose':'#5a5a7a','--petal':'#c0c0d8','--mist':'#e0e0ec','--cream':'#f5f5fa','--gold':'#c9b06a','--gold-lt':'#e8cc90','--muted':'#606078','--muted-lt':'#909098','--blush-dim':'rgba(130,130,160,0.07)','--border-hi':'rgba(130,130,160,0.38)' },
  ember:    { '--blush':'#c08040','--rose':'#8b5220','--petal':'#e8c0a0','--mist':'#f5e0d0','--cream':'#fdf5ef','--gold':'#c9956a','--gold-lt':'#e8b990','--muted':'#8a6040','--muted-lt':'#b09070','--blush-dim':'rgba(180,110,50,0.07)','--border-hi':'rgba(180,110,50,0.38)' }
};
const APP_THEMES = {
  // Each theme bundles surfaces + matched accent colors as a full palette
  obsidian: {
    '--ink':'#0d0408','--deep':'#160809','--panel':'#240e14','--mid':'#341520',
    '--border':'rgba(192,96,122,0.20)','--border-lt':'rgba(232,160,176,0.32)',
    '--blush':'#c0607a','--rose':'#8b3252','--petal':'#e8a0b0','--mist':'#f0ccd5',
    '--cream':'#faf0f2','--gold':'#c9956a','--gold-lt':'#e8b990','--muted':'#8a5060','--muted-lt':'#b07888',
    '--blush-dim':'rgba(192,96,122,0.07)','--border-hi':'rgba(192,96,122,0.38)','--ink-glass':'rgba(13,4,8,0.85)'
  },
  slate: {
    '--ink':'#060c18','--deep':'#0a1322','--panel':'#0f1e35','--mid':'#162840',
    '--border':'rgba(70,130,210,0.22)','--border-lt':'rgba(110,175,245,0.34)',
    '--blush':'#5a9fd4','--rose':'#2d6a9a','--petal':'#a0cce8','--mist':'#d0e8f5',
    '--cream':'#f0f6fc','--gold':'#6aaac9','--gold-lt':'#90cce8','--muted':'#4a7898','--muted-lt':'#70a0b8',
    '--blush-dim':'rgba(70,130,210,0.07)','--border-hi':'rgba(70,130,210,0.38)','--ink-glass':'rgba(6,12,24,0.85)'
  },
  coffee: {
    '--ink':'#0e0803','--deep':'#180f05','--panel':'#261508','--mid':'#35200c',
    '--border':'rgba(200,140,55,0.20)','--border-lt':'rgba(230,175,90,0.32)',
    '--blush':'#c9956a','--rose':'#9a6a3a','--petal':'#e8c4a0','--mist':'#f5e0cc',
    '--cream':'#fdf5ed','--gold':'#c9a040','--gold-lt':'#e8c060','--muted':'#907050','--muted-lt':'#b09070',
    '--blush-dim':'rgba(200,140,55,0.07)','--border-hi':'rgba(200,140,55,0.38)','--ink-glass':'rgba(14,8,3,0.85)'
  },
  forest: {
    '--ink':'#050d07','--deep':'#08140a','--panel':'#0e2014','--mid':'#142c1c',
    '--border':'rgba(65,165,90,0.20)','--border-lt':'rgba(100,200,120,0.32)',
    '--blush':'#5aaa70','--rose':'#2a7a45','--petal':'#a0d8b0','--mist':'#ccecd4',
    '--cream':'#f0f8f2','--gold':'#a0c96a','--gold-lt':'#c0e890','--muted':'#48885a','--muted-lt':'#70a878',
    '--blush-dim':'rgba(65,165,90,0.07)','--border-hi':'rgba(65,165,90,0.38)','--ink-glass':'rgba(5,13,7,0.85)'
  },
  void: {
    '--ink':'#070707','--deep':'#0d0d0d','--panel':'#141414','--mid':'#1e1e1e',
    '--border':'rgba(150,150,165,0.16)','--border-lt':'rgba(205,205,215,0.24)',
    '--blush':'#9898aa','--rose':'#606074','--petal':'#c4c4d4','--mist':'#e0e0e8',
    '--cream':'#f5f5f8','--gold':'#b0aa90','--gold-lt':'#d0c8a8','--muted':'#707080','--muted-lt':'#9898a8',
    '--blush-dim':'rgba(150,150,170,0.07)','--border-hi':'rgba(150,150,170,0.38)','--ink-glass':'rgba(7,7,7,0.85)'
  }
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
  // Accent is an OPTIONAL override on top of the background theme
  const t2 = ACCENT_THEMES[key];
  if (!t2) return;
  const root = document.documentElement;
  Object.entries(t2).forEach(([k, v]) => root.style.setProperty(k, v));
  document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === key));
}
function applyBoxTheme(key) {
  // Background theme owns the full palette — surfaces + bundled accent colors
  const t2 = APP_THEMES[key] || APP_THEMES.obsidian;
  const root = document.documentElement;
  Object.entries(t2).forEach(([k, v]) => root.style.setProperty(k, v));
  document.querySelectorAll('.box-theme-opt').forEach(b => b.classList.toggle('active', b.dataset.boxTheme === key));
  // Deselect accent swatches — bg theme now owns the accent colors
  document.querySelectorAll('.theme-opt').forEach(b => b.classList.remove('active'));
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
  const theme       = document.querySelector('.theme-opt.active')?.dataset.theme || '';
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

  // Save preferences locally for fast load
  if (theme) localStorage.setItem('aos_theme', theme);
  else       localStorage.removeItem('aos_theme'); // no accent override — bg theme owns palette
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

  const savedBox   = localStorage.getItem('aos_box_theme') || 'obsidian';
  const savedTheme = currentProfile.theme || localStorage.getItem('aos_theme') || '';
  const savedFont  = currentProfile.font  || localStorage.getItem('aos_font')  || 'elegant';
  applyBoxTheme(savedBox);                      // full palette first
  if (savedTheme) applyAccentTheme(savedTheme); // accent override only if set
  applyFont(savedFont);

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
  const boxTheme = localStorage.getItem('aos_box_theme') || 'obsidian';
  const accent   = localStorage.getItem('aos_theme') || '';
  const font     = localStorage.getItem('aos_font')  || 'elegant';
  applyBoxTheme(boxTheme);           // bg theme sets full palette first
  if (accent) applyAccentTheme(accent); // accent overrides only if explicitly set
  applyFont(font);
}
