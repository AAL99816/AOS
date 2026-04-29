'use strict';

const ACCENT_THEMES = {
  rose:     { '--blush':'#c0607a','--rose':'#8b3252','--petal':'#e8a0b0','--mist':'#f0ccd5','--cream':'#faf0f2','--gold':'#c9956a','--gold-lt':'#e8b990','--muted':'#8a5060','--muted-lt':'#b07888','--blush-dim':'rgba(192,96,122,0.07)','--border-hi':'rgba(192,96,122,0.38)' },
  ocean:    { '--blush':'#5a9fbf','--rose':'#2d6a8a','--petal':'#a0d0e8','--mist':'#d0eaf5','--cream':'#f0f8fc','--gold':'#6ab0c9','--gold-lt':'#90cde8','--muted':'#4a7890','--muted-lt':'#70a0b8','--blush-dim':'rgba(70,140,190,0.07)','--border-hi':'rgba(70,140,190,0.38)' },
  forest:   { '--blush':'#6aaa7a','--rose':'#3a7a4a','--petal':'#a0d0a8','--mist':'#d0ead5','--cream':'#f0f8f2','--gold':'#c9a96a','--gold-lt':'#e8c890','--muted':'#4a7858','--muted-lt':'#70a078','--blush-dim':'rgba(90,160,100,0.07)','--border-hi':'rgba(90,160,100,0.38)' },
  midnight: { '--blush':'#9090b0','--rose':'#5a5a7a','--petal':'#c0c0d8','--mist':'#e0e0ec','--cream':'#f5f5fa','--gold':'#c9b06a','--gold-lt':'#e8cc90','--muted':'#606078','--muted-lt':'#909098','--blush-dim':'rgba(130,130,160,0.07)','--border-hi':'rgba(130,130,160,0.38)' },
  ember:    { '--blush':'#c08040','--rose':'#8b5220','--petal':'#e8c0a0','--mist':'#f5e0d0','--cream':'#fdf5ef','--gold':'#c9956a','--gold-lt':'#e8b990','--muted':'#8a6040','--muted-lt':'#b09070','--blush-dim':'rgba(180,110,50,0.07)','--border-hi':'rgba(180,110,50,0.38)' },
  crimson:  { '--blush':'#c0405a','--rose':'#8b1a30','--petal':'#e880a0','--mist':'#f5c0d0','--cream':'#fdf0f3','--gold':'#c9856a','--gold-lt':'#e8a890','--muted':'#8a4050','--muted-lt':'#b06878','--blush-dim':'rgba(192,64,90,0.07)','--border-hi':'rgba(192,64,90,0.38)' },
  amber:    { '--blush':'#c09030','--rose':'#8b6010','--petal':'#e8c070','--mist':'#f5e0b8','--cream':'#fdf8ef','--gold':'#c9b040','--gold-lt':'#e8d070','--muted':'#8a7040','--muted-lt':'#b09060','--blush-dim':'rgba(192,144,48,0.07)','--border-hi':'rgba(192,144,48,0.38)' },
  violet:   { '--blush':'#9060c8','--rose':'#6030a0','--petal':'#c0a0e8','--mist':'#e0d0f5','--cream':'#f8f4ff','--gold':'#c0a060','--gold-lt':'#d8c080','--muted':'#806090','--muted-lt':'#a080b8','--blush-dim':'rgba(144,96,200,0.07)','--border-hi':'rgba(144,96,200,0.38)' },
  teal:     { '--blush':'#40a8a0','--rose':'#1a7870','--petal':'#80d0c8','--mist':'#c0ece8','--cream':'#f0fafa','--gold':'#80b8a0','--gold-lt':'#a0d4b8','--muted':'#407870','--muted-lt':'#68a098','--blush-dim':'rgba(64,168,160,0.07)','--border-hi':'rgba(64,168,160,0.38)' },
  coral:    { '--blush':'#d06040','--rose':'#a03818','--petal':'#e8a088','--mist':'#f5d0c0','--cream':'#fdf4ef','--gold':'#c9a06a','--gold-lt':'#e8c090','--muted':'#8a5040','--muted-lt':'#b07860','--blush-dim':'rgba(208,96,64,0.07)','--border-hi':'rgba(208,96,64,0.38)' }
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
  },
  lavender: {
    '--ink':'#08050f','--deep':'#100b1c','--panel':'#1c1330','--mid':'#2a1d46',
    '--border':'rgba(160,120,220,0.22)','--border-lt':'rgba(200,168,255,0.34)',
    '--blush':'#9b7fc7','--rose':'#6a4a9a','--petal':'#c9b0f0','--mist':'#e8dafa',
    '--cream':'#f5f0ff','--gold':'#c0a060','--gold-lt':'#ddc080','--muted':'#7a6098','--muted-lt':'#a090c8',
    '--blush-dim':'rgba(155,127,199,0.08)','--border-hi':'rgba(155,127,199,0.40)','--ink-glass':'rgba(8,5,15,0.85)'
  },
  rose: {
    '--ink':'#100508','--deep':'#1c0a10','--panel':'#2e1018','--mid':'#3e1820',
    '--border':'rgba(200,90,120,0.22)','--border-lt':'rgba(240,140,165,0.34)',
    '--blush':'#c0607a','--rose':'#8b3252','--petal':'#e8a0b0','--mist':'#f5d0da',
    '--cream':'#fdf0f3','--gold':'#c9956a','--gold-lt':'#e8b990','--muted':'#905060','--muted-lt':'#b87888',
    '--blush-dim':'rgba(192,96,122,0.08)','--border-hi':'rgba(192,96,122,0.40)','--ink-glass':'rgba(16,5,8,0.85)'
  },
  dusk: {
    '--ink':'#0c080f','--deep':'#180f22','--panel':'#241530','--mid':'#322040',
    '--border':'rgba(180,120,160,0.22)','--border-lt':'rgba(220,170,210,0.34)',
    '--blush':'#b07898','--rose':'#7a4868','--petal':'#d8b0c8','--mist':'#f0daea',
    '--cream':'#fdf4fa','--gold':'#c9a070','--gold-lt':'#e0c090','--muted':'#887080','--muted-lt':'#b098a8',
    '--blush-dim':'rgba(176,120,152,0.08)','--border-hi':'rgba(176,120,152,0.40)','--ink-glass':'rgba(12,8,15,0.85)'
  },
  ash: {
    '--ink':'#0c0e0f','--deep':'#141618','--panel':'#1e2224','--mid':'#2a3035',
    '--border':'rgba(140,160,180,0.18)','--border-lt':'rgba(180,205,220,0.28)',
    '--blush':'#8aa0b8','--rose':'#5a7898','--petal':'#b8d0e0','--mist':'#d8e8f0',
    '--cream':'#f0f6fa','--gold':'#b0a888','--gold-lt':'#d0c8a8','--muted':'#606e78','--muted-lt':'#909aa4',
    '--blush-dim':'rgba(140,160,180,0.07)','--border-hi':'rgba(140,160,180,0.36)','--ink-glass':'rgba(12,14,15,0.85)'
  },
  aurora: {
    '--ink':'#05080f','--deep':'#0a1020','--panel':'#101828','--mid':'#182534',
    '--border':'rgba(80,180,190,0.20)','--border-lt':'rgba(120,220,230,0.32)',
    '--blush':'#48bac0','--rose':'#20888e','--petal':'#88d8dc','--mist':'#c0ece8',
    '--cream':'#f0fafa','--gold':'#90c0a0','--gold-lt':'#b8dac0','--muted':'#408890','--muted-lt':'#70b0b8',
    '--blush-dim':'rgba(80,180,190,0.07)','--border-hi':'rgba(80,180,190,0.38)','--ink-glass':'rgba(5,8,15,0.85)'
  },
  mocha: {
    '--ink':'#100a06','--deep':'#1c140c','--panel':'#2c1e12','--mid':'#3c2c1a',
    '--border':'rgba(180,140,90,0.20)','--border-lt':'rgba(220,180,120,0.32)',
    '--blush':'#b89060','--rose':'#886030','--petal':'#d8b888','--mist':'#f0dcc0',
    '--cream':'#fdf5e8','--gold':'#c0a060','--gold-lt':'#e0c080','--muted':'#887058','--muted-lt':'#a89078',
    '--blush-dim':'rgba(180,140,90,0.07)','--border-hi':'rgba(180,140,90,0.38)','--ink-glass':'rgba(16,10,6,0.85)'
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
  elegant: { body: "'Jost', sans-serif",        heading: "'Cormorant Garamond', serif", mono: "'DM Mono', monospace", label: 'Elegant' },
  clean:   { body: "'Jost', sans-serif",        heading: "'Jost', sans-serif",           mono: "'DM Mono', monospace", label: 'Clean'   },
  sharp:   { body: "'DM Mono', monospace",      heading: "'DM Mono', monospace",         mono: "'DM Mono', monospace", label: 'Mono'    },
  serif:   { body: "'Georgia', serif",          heading: "'Georgia', serif",             mono: "'DM Mono', monospace", label: 'Serif'   },
  rounded: { body: "'Trebuchet MS', sans-serif",heading: "'Trebuchet MS', sans-serif",   mono: "'DM Mono', monospace", label: 'Rounded' },
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
  const t2 = APP_THEMES[key] || APP_THEMES.lavender;
  const root = document.documentElement;
  Object.entries(t2).forEach(([k, v]) => root.style.setProperty(k, v));
  document.querySelectorAll('.box-theme-opt').forEach(b => b.classList.toggle('active', b.dataset.boxTheme === key));
  // Deselect accent swatches — bg theme now owns the accent colors
  document.querySelectorAll('.theme-opt').forEach(b => b.classList.remove('active'));
  // Re-apply any custom color overrides so they survive theme switching
  restoreCustomColors();
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

// ── Custom color overrides ─────────────────────────────────────────────────
function applyCustomColor(cssVar, hex) {
  if (!hex || !hex.startsWith('#')) return;
  document.documentElement.style.setProperty(cssVar, hex);
  // Persist override
  if (!S.appPrefs) S.appPrefs = {};
  if (!S.appPrefs.customColors) S.appPrefs.customColors = {};
  // Map CSS var → prefs key
  const key = cssVar.replace(/^--/, '').replace(/-/g, '_');
  S.appPrefs.customColors[key] = hex;
  scheduleSave();
  // Sync the corresponding input if open
  const inp = document.querySelector(`input[data-custom-var="${cssVar}"]`);
  if (inp) inp.value = hex;
}

function restoreCustomColors() {
  const cc = S?.appPrefs?.customColors;
  if (!cc || typeof cc !== 'object') return;
  Object.entries(cc).forEach(([key, hex]) => {
    if (!hex) return;
    const cssVar = '--' + key.replace(/_/g, '-');
    document.documentElement.style.setProperty(cssVar, hex);
  });
  // Sync open color inputs
  document.querySelectorAll('input[data-custom-var]').forEach(inp => {
    const val = cc[inp.dataset.customVar?.replace(/^--/, '').replace(/-/g, '_')];
    if (val) inp.value = val;
  });
}

function clearCustomColors() {
  if (S?.appPrefs?.customColors) S.appPrefs.customColors = {};
  scheduleSave();
  // Re-apply box theme without overrides
  const box = localStorage.getItem('aos_box_theme') || 'lavender';
  const t2 = APP_THEMES[box] || APP_THEMES.lavender;
  Object.entries(t2).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  // Reset inputs
  document.querySelectorAll('input[data-custom-var]').forEach(inp => { inp.value = ''; });
  toast('Custom colors cleared');
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

  saveUserSettings(); // persist box_theme + prefs to relational table
  renderHeroProfile();
  renderAll();
  toast(t('settings_saved'));
}

// ── Community profile helpers ────────────────────────────────────────────────
async function saveCommunityProfileField(field, value) {
  if (typeof saveCommunityProfile === 'function') await saveCommunityProfile({ [field]: value });
  // Reset community data so next tab open re-fetches
  if (typeof _communityLoaded !== 'undefined') window._communityLoaded = false;
}

function toggleCommunityShareSection(isPublic) {
  const sec = eid('comm-shareSection');
  if (sec) sec.style.display = isPublic ? '' : 'none';
}

function _populateCommunitySettings() {
  const p = currentProfile || {};
  const isPublicEl = eid('comm-isPublic');
  const bioEl      = eid('comm-bio');
  if (isPublicEl) { isPublicEl.checked = !!p.is_public; toggleCommunityShareSection(!!p.is_public); }
  if (bioEl)      bioEl.value = p.bio || '';
  ['fitness','food','projects','media'].forEach(k => {
    const el = eid(`comm-share-${k}`);
    if (el) el.checked = !!p[`share_${k}`];
  });
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

  const savedBox   = localStorage.getItem('aos_box_theme') || 'lavender';
  const savedTheme = currentProfile.theme || localStorage.getItem('aos_theme') || '';
  const savedFont  = currentProfile.font  || localStorage.getItem('aos_font')  || 'elegant';
  applyBoxTheme(savedBox);                      // full palette first (also calls restoreCustomColors)
  if (savedTheme) applyAccentTheme(savedTheme); // accent override only if set
  applyFont(savedFont);
  // Sync custom color pickers with stored values
  restoreCustomColors();

  const swRef = eid('st-weekly-reflection');
  if (swRef) swRef.checked = S.appPrefs?.showWeeklyReflection !== false;

  // Pre-render all dynamic panes so they're ready when the user clicks their tab
  renderTodaySettingsPane();
  renderFitnessSettingsPane();
  renderFocusSettingsPane();
  renderProjectsSettingsPane();
  renderMediaSettingsPane();
  renderFeaturesPane();
  if (typeof renderModulesPane === 'function') renderModulesPane();

  // Sync static feature toggles in Profile and Summary panes
  const agRef = eid('feat-annualGoals');
  if (agRef) agRef.checked = !!(S.features || {}).annualGoals;
  const gsRef = eid('feat-globalSearch');
  if (gsRef) gsRef.checked = !!(S.features || {}).globalSearch;

  // Always open on Profile tab
  switchSettingsTab('profile');

  eid('stLangToggle').textContent = currentLang === 'en' ? 'AR' : 'EN';
  _populateCommunitySettings();
  openModal('mSettings');
}

async function uploadAvatarFromSettings(input) {
  const f = input.files[0];
  if (!f || !currentUser) return;
  if (f.size > 5 * 1024 * 1024) { toast('Image too large — max 5 MB'); input.value = ''; return; }
  const status = eid('stAvatarStatus');
  status.textContent = 'Uploading…';
  input.disabled = true;
  try {
    const url = await uploadAsset('avatar', f);
    const { error } = await sb.from('profiles').upsert({ id: currentUser.id, email: currentUser.email, avatar_url: url }, { onConflict: 'id' });
    if (error) throw error;
    if (!currentProfile) currentProfile = {};
    currentProfile.avatar_url = url;
    const av = eid('stAvatarPreview');
    av.innerHTML = `<img src="${escapeAttr(url)}" alt="" style="width:100%;height:100%;object-fit:cover">`;
    status.textContent = 'Saved';
    renderHeroProfile();
  } catch (e) {
    status.textContent = 'Upload failed: ' + (e.message || String(e));
  } finally {
    input.disabled = false;
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

/* ══ SETTINGS SUB-TABS ══ */
const SETTINGS_TABS = ['profile','summary','today','fitness','focus','projects','media','features','modules'];

function switchSettingsTab(tab) {
  SETTINGS_TABS.forEach(t2 => {
    const btn  = eid(`stab-${t2}`);
    const pane = eid(`stPane-${t2}`);
    if (btn)  btn.classList.toggle('active', t2 === tab);
    if (pane) pane.style.display = t2 === tab ? '' : 'none';
  });
  if (tab === 'today')    renderTodaySettingsPane();
  if (tab === 'fitness')  renderFitnessSettingsPane();
  if (tab === 'focus')    renderFocusSettingsPane();
  if (tab === 'projects') renderProjectsSettingsPane();
  if (tab === 'media')    renderMediaSettingsPane();
  if (tab === 'summary') {
    const swRef = eid('st-weekly-reflection');
    if (swRef) swRef.checked = S.appPrefs?.showWeeklyReflection !== false;
    const agRef = eid('feat-annualGoals');
    if (agRef) agRef.checked = !!(S.features || {}).annualGoals;
  }
  if (tab === 'profile') {
    const gsRef = eid('feat-globalSearch');
    if (gsRef) gsRef.checked = !!(S.features || {}).globalSearch;
  }
  if (tab === 'features') renderFeaturesPane();
  if (tab === 'modules')  { if (typeof renderModulesPane === 'function') renderModulesPane(); }
}

function _featRow(f, feats) {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:0.82rem;color:var(--cream);margin-bottom:2px">${f.label}</div>
        <div style="font-size:0.68rem;color:var(--muted)">${f.desc}</div>
      </div>
      <label class="toggle-switch" style="flex-shrink:0;margin-left:12px">
        <input type="checkbox" ${feats[f.key] ? 'checked' : ''} onchange="toggleFeature('${f.key}',this.checked)">
        <span class="toggle-slider"></span>
      </label>
    </div>`;
}

function _modRow(m) {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0;margin-right:12px">
        <div style="font-size:0.82rem;color:var(--cream);margin-bottom:2px">${escapeHtml(m.label)}</div>
        <div style="font-size:0.66rem;color:var(--muted);line-height:1.4">${escapeHtml(m.desc)}</div>
      </div>
      <label class="toggle-switch" style="flex-shrink:0">
        <input type="checkbox" ${(typeof modOn === 'function' ? modOn(m.id) : true) ? 'checked' : ''} onchange="setModule('${m.id}',this.checked)">
        <span class="toggle-slider"></span>
      </label>
    </div>`;
}

function _settingsSection(kicker, body) {
  return `<div class="settings-section"><div class="settings-kicker">${kicker}</div>${body}</div>`;
}

function renderTodaySettingsPane() {
  const pane = eid('stPane-today');
  if (!pane) return;
  const feats         = S.features || {};
  const unit          = (S.appPrefs && S.appPrefs.waterUnit) || 'glasses';
  const prayerOn      = S.appPrefs?.showPrayerTracker !== false;
  const activePrays   = (typeof getActivePrayers === 'function') ? getActivePrayers() : (typeof PRAYERS !== 'undefined' ? PRAYERS : []);
  const todayMods     = (typeof MODULE_REGISTRY !== 'undefined' ? MODULE_REGISTRY : []).filter(m => m.group === 'Today');
  const allPrayers    = (typeof PRAYERS !== 'undefined') ? PRAYERS : [];

  pane.innerHTML =
    _settingsSection('Display', `
      <div class="mf"><label><input type="checkbox" id="st-reflection" ${S.appPrefs?.showReflection !== false ? 'checked' : ''} onchange="toggleReflection(this.checked)"> <span>Daily Reflection</span></label></div>
      <div style="font-size:0.68rem;color:var(--muted);margin-top:4px;line-height:1.5">Show the daily reflection card on your Today page.</div>
    `) +
    _settingsSection('Habits', `
      <div style="font-size:0.68rem;color:var(--muted);margin-bottom:10px;line-height:1.5">Add, rename, hide or remove habits from your Today and Summary views.</div>
      <button class="btn btn-g" onclick="openHabitManager()" style="font-size:0.76rem">Manage Habits</button>
    `) +
    _settingsSection('Prayer Tracker', `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-size:0.82rem;color:var(--cream);margin-bottom:2px">Show Prayer Tracker</div>
          <div style="font-size:0.68rem;color:var(--muted)">Show the prayer section on Today and Summary</div>
        </div>
        <label class="toggle-switch" style="flex-shrink:0;margin-left:12px">
          <input type="checkbox" ${prayerOn ? 'checked' : ''} onchange="setPrayerTrackerVisible(this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      ${prayerOn && allPrayers.length ? `
      <div style="font-size:0.68rem;color:var(--muted);margin-bottom:8px">Active prayers:</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${allPrayers.map(p => {
          const isActive = activePrays.includes(p);
          const label = (typeof PRAYER_LABEL !== 'undefined') ? PRAYER_LABEL[p] : (p.charAt(0).toUpperCase() + p.slice(1));
          return `<button class="btn btn-g${isActive?' active':''}" onclick="toggleActivePrayer('${p}',this)" style="font-size:0.7rem;min-height:34px">${escapeHtml(label)}</button>`;
        }).join('')}
      </div>` : ''}
    `) +
    _settingsSection('Water Tracking', `
      <div class="mf">
        <label style="display:block;margin-bottom:6px">Unit</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-g${unit==='glasses'?' active':''}" id="wuBtn-glasses" onclick="setWaterUnit('glasses')" style="font-size:0.7rem">Glasses (250ml)</button>
          <button class="btn btn-g${unit==='litres'?' active':''}"  id="wuBtn-litres"  onclick="setWaterUnit('litres')"  style="font-size:0.7rem">Litres</button>
          <button class="btn btn-g${unit==='cups'?' active':''}"    id="wuBtn-cups"    onclick="setWaterUnit('cups')"    style="font-size:0.7rem">Cups (240ml)</button>
          <button class="btn btn-g${unit==='oz'?' active':''}"      id="wuBtn-oz"      onclick="setWaterUnit('oz')"      style="font-size:0.7rem">Fl oz</button>
        </div>
        <div style="font-size:0.68rem;color:var(--muted);margin-top:6px;line-height:1.5">Changing unit resets today's log count display — raw data is preserved.</div>
      </div>
    `) +
    _settingsSection('Features',
      [
        { key:'moodTracking',     label:'Mood Tracking',     desc:'Log a daily mood score (1–10) in the Today tab' },
        { key:'streakProtection', label:'Streak Protection', desc:'Allow one grace day per week without breaking streaks' },
      ].map(f => _featRow(f, feats)).join('')
    ) +
    _settingsSection('Sections',
      `<div style="font-size:0.66rem;color:var(--muted);margin-bottom:10px;line-height:1.5">Show or hide sections on your Today dashboard.</div>` +
      todayMods.map(_modRow).join('')
    );
}

function setPrayerTrackerVisible(on) {
  if (!S.appPrefs) S.appPrefs = {};
  S.appPrefs.showPrayerTracker = on;
  scheduleSave();
  renderToday();
  if (typeof renderWeeklyReview === 'function') renderWeeklyReview();
  // Re-render the pane so prayer buttons appear/disappear instantly
  renderTodaySettingsPane();
}

function toggleActivePrayer(key, btn) {
  if (!S.appPrefs) S.appPrefs = {};
  const all = (typeof PRAYERS !== 'undefined') ? PRAYERS : [];
  if (!S.appPrefs.activePrayers) S.appPrefs.activePrayers = [...all];
  const idx = S.appPrefs.activePrayers.indexOf(key);
  if (idx >= 0) {
    if (S.appPrefs.activePrayers.length <= 1) return; // keep at least one
    S.appPrefs.activePrayers.splice(idx, 1);
    btn.classList.remove('active');
  } else {
    S.appPrefs.activePrayers.push(key);
    btn.classList.add('active');
  }
  scheduleSave();
  renderToday();
  if (typeof renderWeeklyReview === 'function') renderWeeklyReview();
}

function renderFitnessSettingsPane() {
  const pane = eid('stPane-fitness');
  if (!pane) return;
  const feats = S.features || {};
  const mode     = (S.appPrefs && S.appPrefs.calorieMode) || 'meal';
  const restSecs = (S.appPrefs && S.appPrefs.restTimerSecs) || 90;
  const restLbl  = restSecs < 60 ? restSecs + 's' : Math.floor(restSecs/60) + 'm' + (restSecs % 60 ? ' ' + (restSecs % 60) + 's' : '');
  const fitMods  = (typeof MODULE_REGISTRY !== 'undefined' ? MODULE_REGISTRY : []).filter(m => m.group === 'Fitness');
  pane.innerHTML =
    _settingsSection('Food & Calories', `
      <div class="mf">
        <label>Calorie Tracking Mode</label>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button id="calModeBtn-meal"  class="btn btn-g${mode==='meal'?' active':''}"  onclick="setCalorieMode('meal')"  style="font-size:0.7rem">Meal mode</button>
          <button id="calModeBtn-daily" class="btn btn-g${mode==='daily'?' active':''}" onclick="setCalorieMode('daily')" style="font-size:0.7rem">Daily total</button>
        </div>
        <div style="font-size:0.68rem;color:var(--muted);margin-top:6px;line-height:1.5">Meal mode logs individual meals. Daily total logs one number per day.</div>
      </div>
    `) +
    _settingsSection('Workout', `
      <div class="mf">
        <label>Rest Timer Duration</label>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
          <input type="range" min="30" max="300" step="15" id="restTimerRange" value="${restSecs}"
            oninput="if(!S.appPrefs)S.appPrefs={};S.appPrefs.restTimerSecs=parseInt(this.value);scheduleSave();eid('restTimerRangeVal').textContent=Math.floor(this.value/60)+'m '+(this.value%60?this.value%60+'s':'')"
            style="flex:1;accent-color:var(--blush)">
          <span id="restTimerRangeVal" style="font-size:0.7rem;color:var(--gold-lt);font-family:'DM Mono',monospace;min-width:36px">${restLbl}</span>
        </div>
        <div style="font-size:0.68rem;color:var(--muted);margin-top:4px">Countdown starts automatically after each logged set.</div>
      </div>
    `) +
    _settingsSection('Features',
      [
        { key:'bodyWeight',  label:'Body Weight Log', desc:'Track your body weight over time in the Fitness tab' },
        { key:'exercisePbs', label:'Exercise PBs',    desc:'Auto-track personal bests per exercise' },
      ].map(f => _featRow(f, feats)).join('')
    ) +
    _settingsSection('Sections',
      `<div style="font-size:0.66rem;color:var(--muted);margin-bottom:10px;line-height:1.5">Show or hide sections on your Fitness tab.</div>` +
      fitMods.map(_modRow).join('')
    );
}

function renderFocusSettingsPane() {
  const pane = eid('stPane-focus');
  if (!pane) return;
  const feats = S.features || {};
  pane.innerHTML =
    _settingsSection('Focus Timer',
      [
        { key:'pomodoro', label:'Pomodoro Timer', desc:'Focus timer for projects (25 min work / 5 min break)' },
      ].map(f => _featRow(f, feats)).join('')
    );
}

function renderProjectsSettingsPane() {
  const pane = eid('stPane-projects');
  if (!pane) return;
  const feats    = S.features || {};
  const projMods = (typeof MODULE_REGISTRY !== 'undefined' ? MODULE_REGISTRY : []).filter(m => m.group === 'Projects');
  pane.innerHTML =
    _settingsSection('Display', `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0">
        <div>
          <div style="font-size:0.82rem;color:var(--cream);margin-bottom:2px">Show Done Projects</div>
          <div style="font-size:0.68rem;color:var(--muted)">Include completed projects in the project list</div>
        </div>
        <label class="toggle-switch" style="flex-shrink:0;margin-left:12px">
          <input type="checkbox" ${S.appPrefs?.showDoneProjects ? 'checked' : ''} onchange="setProjectPref('showDoneProjects',this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-top:1px solid var(--border)">
        <div>
          <div style="font-size:0.82rem;color:var(--cream);margin-bottom:2px">Show Task Count</div>
          <div style="font-size:0.68rem;color:var(--muted)">Show remaining task count badge on project cards</div>
        </div>
        <label class="toggle-switch" style="flex-shrink:0;margin-left:12px">
          <input type="checkbox" ${S.appPrefs?.showProjectTaskCount !== false ? 'checked' : ''} onchange="setProjectPref('showProjectTaskCount',this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
    `) +
    (projMods.length ? _settingsSection('Sections',
      `<div style="font-size:0.66rem;color:var(--muted);margin-bottom:10px;line-height:1.5">Show or hide sections on your Projects tab.</div>` +
      projMods.map(_modRow).join('')) : '');
}

function renderMediaSettingsPane() {
  const pane = eid('stPane-media');
  if (!pane) return;
  const feats    = S.features || {};
  const mediaMods = (typeof MODULE_REGISTRY !== 'undefined' ? MODULE_REGISTRY : []).filter(m => m.group === 'Media');
  pane.innerHTML =
    _settingsSection('Display', `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0">
        <div>
          <div style="font-size:0.82rem;color:var(--cream);margin-bottom:2px">Show Ratings</div>
          <div style="font-size:0.68rem;color:var(--muted)">Display star ratings on book and media cards</div>
        </div>
        <label class="toggle-switch" style="flex-shrink:0;margin-left:12px">
          <input type="checkbox" ${S.appPrefs?.showMediaRatings !== false ? 'checked' : ''} onchange="setMediaPref('showMediaRatings',this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-top:1px solid var(--border)">
        <div>
          <div style="font-size:0.82rem;color:var(--cream);margin-bottom:2px">Show Progress Bars</div>
          <div style="font-size:0.68rem;color:var(--muted)">Show reading/watching progress on in-progress items</div>
        </div>
        <label class="toggle-switch" style="flex-shrink:0;margin-left:12px">
          <input type="checkbox" ${S.appPrefs?.showMediaProgress !== false ? 'checked' : ''} onchange="setMediaPref('showMediaProgress',this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
    `) +
    (mediaMods.length ? _settingsSection('Sections',
      `<div style="font-size:0.66rem;color:var(--muted);margin-bottom:10px;line-height:1.5">Show or hide sections on your Media tab.</div>` +
      mediaMods.map(_modRow).join('')) : '');
}

function setProjectPref(key, val) {
  if (!S.appPrefs) S.appPrefs = {};
  S.appPrefs[key] = val;
  scheduleSave();
  if (typeof renderProjects === 'function') renderProjects();
}

function setMediaPref(key, val) {
  if (!S.appPrefs) S.appPrefs = {};
  S.appPrefs[key] = val;
  scheduleSave();
  if (typeof renderMedia === 'function') renderMedia();
}

function renderFeaturesPane() {
  const pane = eid('stPane-features');
  if (!pane) return;
  pane.innerHTML =
    _settingsSection('Export Data', `
      <div style="font-size:0.68rem;color:var(--muted);margin-bottom:10px;line-height:1.5">Download your data as CSV files.</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px" id="exportBtns">
        <button class="btn btn-g" onclick="exportCSV('media')"    style="font-size:0.68rem">Media</button>
        <button class="btn btn-g" onclick="exportCSV('workouts')" style="font-size:0.68rem">Workouts</button>
        <button class="btn btn-g" onclick="exportCSV('habits')"   style="font-size:0.68rem">Habits</button>
        <button class="btn btn-g" onclick="exportCSV('cardio')"   style="font-size:0.68rem">Cardio</button>
        <button class="btn btn-g" onclick="exportCSV('calories')" style="font-size:0.68rem">Calories</button>
        <button class="btn btn-g" onclick="exportCSV('weight')"   style="font-size:0.68rem">Weight</button>
      </div>
    `) +
    _settingsSection('Backup', `
      <div style="font-size:0.66rem;color:var(--muted);margin-bottom:10px;line-height:1.5">Export or import your complete AOS data as JSON.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-g" onclick="doExport()" style="font-size:0.68rem">Export JSON Backup</button>
        <button class="btn btn-g" onclick="doImport()" style="font-size:0.68rem">Import JSON Backup</button>
      </div>
      ${(()=>{ const ls = localStorage.getItem('aos_last_synced'); if(!ls) return ''; const d = new Date(ls); return `<div style="font-size:0.62rem;color:var(--muted);margin-top:8px;font-family:'DM Mono',monospace">Last synced: ${d.toLocaleString()}</div>`; })()}
    `) +
    `<div style="margin-top:20px;padding-top:14px;border-top:1px solid rgba(180,60,60,0.28)">
      <div style="font-size:0.72rem;color:#f09090;margin-bottom:10px;font-weight:500">Danger Zone</div>
      <div style="font-size:0.66rem;color:var(--muted);margin-bottom:10px">Permanently delete all your AOS data. This cannot be undone.</div>
      <button class="btn" onclick="clearAllData()"
        style="font-size:0.68rem;background:rgba(180,60,60,0.15);border:1px solid rgba(180,60,60,0.35);color:#f09090;padding:6px 14px;border-radius:8px;cursor:pointer">
        Clear All Data
      </button>
    </div>`;
}

async function clearAllData() {
  const confirmed = confirm(
    'This will permanently delete ALL your AOS data — habits, food logs, workouts, projects, media, notes and more.\n\nThis cannot be undone. Are you absolutely sure?'
  );
  if (!confirmed) return;
  const typed = prompt('Type DELETE (all caps) to confirm permanent data wipe:');
  if (typed === null) { toast('Cancelled — nothing was deleted'); return; }
  if (typed !== 'DELETE') { toast('Incorrect — type DELETE in all caps to confirm'); return; }
  // Auto-backup before wiping
  try { await window.api.exportData(JSON.stringify(S, null, 2)); } catch(_) {}
  S = normalizeAppState({});
  scheduleSave();
  closeModal('mSettings');
  renderAll();
  toast('All data cleared');
}

function toggleFeature(key, on) {
  if (!S.features) S.features = {};
  S.features[key] = on;
  scheduleSave();
  renderAll();
  // Re-apply feature-specific visibility
  if (typeof applyAllFeatures === 'function') applyAllFeatures();
}

function _refreshCalModeBtns() {
  const mode = (S.appPrefs && S.appPrefs.calorieMode) || 'meal';
  const meal  = eid('calModeBtn-meal');
  const daily = eid('calModeBtn-daily');
  if (meal)  meal.classList.toggle('active', mode === 'meal');
  if (daily) daily.classList.toggle('active', mode === 'daily');
}

function setCalorieMode(mode) {
  if (!S.appPrefs) S.appPrefs = {};
  S.appPrefs.calorieMode = mode;
  scheduleSave();
  _refreshCalModeBtns();
  if (typeof renderCalorieSection === 'function') renderCalorieSection();
}

function toggleWeeklyReflection(on) {
  if (!S.appPrefs) S.appPrefs = {};
  S.appPrefs.showWeeklyReflection = on;
  scheduleSave();
  applyWeeklyReflectionVisibility();
}

function applyWeeklyReflectionVisibility() {
  const el = eid('weeklyReflectionCard');
  if (el) el.style.display = (S.appPrefs && S.appPrefs.showWeeklyReflection !== false) ? '' : 'none';
}

/* Called on app boot to restore saved theme/font */
function restoreAppearance() {
  const boxTheme = localStorage.getItem('aos_box_theme') || 'lavender';
  const accent   = localStorage.getItem('aos_theme') || '';
  const font     = localStorage.getItem('aos_font')  || 'elegant';
  applyBoxTheme(boxTheme);              // bg theme sets full palette (also calls restoreCustomColors)
  if (accent) applyAccentTheme(accent); // accent overrides only if explicitly set
  applyFont(font);
}
