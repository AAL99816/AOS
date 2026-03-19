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

  const { error } = await sb.from('app_data').upsert({
    user_id: currentUser.id,
    data: S,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

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
  setSyncStatus('synced');
  return true;
}
