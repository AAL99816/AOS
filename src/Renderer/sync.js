'use strict';

async function uploadAsset(path, file) {
  if (!currentUser) throw new Error('Not signed in');
  const ext = (file.type || '').split('/')[1] || 'jpg';
  const fullPath = `${currentUser.id}/${path}.${ext}`;
  const { error } = await sb.storage.from('aos').upload(fullPath, file, { upsert: true });
  if (error) throw error;
  const { data } = sb.storage.from('aos').getPublicUrl(fullPath);
  return `${data.publicUrl}?v=${Date.now()}`;
}

/* ── user_settings table ── */
async function loadUserSettings() {
  if (!currentUser) return;
  const { data, error } = await sb
    .from('user_settings')
    .select('*')
    .eq('user_id', currentUser.id)
    .single();
  if (error || !data) return;

  if (data.app_title)              S.appTitle          = data.app_title;
  if (data.app_sub  != null)       S.appSub            = data.app_sub;
  if (data.hero_img != null)       S.heroImg           = data.hero_img;
  if (data.quote_text)             S.quote             = { text: data.quote_text, author: data.quote_author || '' };
  if (!S.appPrefs) S.appPrefs = {};
  S.appPrefs.showReflection       = data.show_reflection        ?? true;
  S.appPrefs.showWeeklyReflection = data.show_weekly_reflection ?? false;
  S.appPrefs.calorieMode          = data.calorie_mode           ?? 'meal';
  if (data.cardio_target != null)  S.cardioTarget      = data.cardio_target;
  S.onboarded = data.onboarded ?? false;
  if (data.box_theme) localStorage.setItem('aos_box_theme', data.box_theme);
}

async function saveUserSettings() {
  if (!currentUser) return;
  const boxTheme = localStorage.getItem('aos_box_theme') || 'obsidian';
  await sb.from('user_settings').upsert({
    user_id:                 currentUser.id,
    app_title:               S.appTitle              || 'AOS',
    app_sub:                 S.appSub                || '',
    hero_img:                S.heroImg               || '',
    quote_text:              S.quote?.text           || '',
    quote_author:            S.quote?.author         || '',
    show_reflection:         S.appPrefs?.showReflection         ?? true,
    show_weekly_reflection:  S.appPrefs?.showWeeklyReflection   ?? false,
    calorie_mode:            S.appPrefs?.calorieMode            ?? 'meal',
    cardio_target:           S.cardioTarget          || '',
    onboarded:               S.onboarded             ?? false,
    box_theme:               boxTheme,
    updated_at:              new Date().toISOString()
  }, { onConflict: 'user_id' });
}

function setSyncStatus(status) {
  const dot = eid('syncDot');
  dot.className = 'sync-dot ' + status;
  dot.title = {
    synced: 'Synced',
    syncing: 'Syncing…',
    offline: 'Offline — changes saved locally'
  }[status] || '';
}

let saveTimer;
let lastSaveTime = 0;
let syncChannel = null;

function subscribeToSync() {
  if (!currentUser) return;
  if (syncChannel) { sb.removeChannel(syncChannel); syncChannel = null; }
  syncChannel = sb.channel('sync:' + currentUser.id)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'app_data',
      filter: `user_id=eq.${currentUser.id}`
    }, payload => {
      if (Date.now() - lastSaveTime < 3000) return;
      if (!payload.new?.data) return;
      S = normalizeAppState(payload.new.data);
      setSyncStatus('synced');
      if (typeof renderAll === 'function') renderAll();
    })
    .subscribe();
}

function scheduleSave() {
  setSyncStatus('syncing');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveToSupabase(), 1200);
}

async function saveToSupabase() {
  if (!currentUser) return;

  setSyncStatus('syncing');
  const json = JSON.stringify(S);
  lastSaveTime = Date.now();

  try {
    await window.api.cacheSave(json);
  } catch (e) {}

  const [{ error }] = await Promise.all([
    sb.from('app_data').upsert({
      user_id: currentUser.id,
      data: S,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' }),
    saveUserSettings()
  ]);

  if (error) {
    setSyncStatus('offline');
    eid('saveInd').textContent = 'Saved locally (offline)';
    setTimeout(() => {
      eid('saveInd').textContent = '';
    }, 2500);
  } else {
    setSyncStatus('synced');
    eid('saveInd').textContent = 'Synced';
    setTimeout(() => {
      eid('saveInd').textContent = '';
    }, 2000);
  }
}

async function loadFromSupabase() {
  if (!currentUser) return false;

  const { data, error } = await sb
    .from('app_data')
    .select('data')
    .eq('user_id', currentUser.id)
    .single();

  if (error || !data) {
    try {
      const cache = await window.api.cacheLoad();
      if (cache.ok && cache.data) {
        S = normalizeAppState(JSON.parse(cache.data));
        setSyncStatus('offline');
        return true;
      }
    } catch (e) {}

    return false;
  }

  S = normalizeAppState(data.data);
  await loadUserSettings(); // overlay with relational data where it exists
  setSyncStatus('synced');
  return true;
}
