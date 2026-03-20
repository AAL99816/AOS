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

/* ── projects / project_tasks / project_notes tables ── */
async function loadProjects() {
  if (!currentUser) return;
  const { data, error } = await sb
    .from('projects')
    .select('*, project_tasks(*), project_notes(*)')
    .eq('user_id', currentUser.id)
    .not('app_id', 'is', null)
    .order('order_index');
  if (error || !data || !data.length) return;

  S.projects = data.map(row => ({
    id:       Number(row.app_id),
    title:    row.title   || '',
    type:     row.type    || '',
    context:  row.context || '',
    status:   row.status  || 'Active',
    deadline: row.deadline || '',
    notes:    row.notes   || '',
    richNotes: '',
    notesLog: (row.project_notes || [])
      .filter(n => n.app_id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(n => ({ id: Number(n.app_id), date: n.note_date || '', text: n.text || '' })),
    tasks: (row.project_tasks || [])
      .filter(tk => tk.app_id)
      .sort((a, b) => a.order_index - b.order_index)
      .map(tk => ({
        id:        Number(tk.app_id),
        text:      tk.text       || '',
        done:      !!tk.done,
        dueDate:   tk.due_date   || '',
        taskNotes: tk.task_notes || ''
      }))
  }));
}

async function saveProjects() {
  if (!currentUser) return;
  const projects = S.projects || [];

  // First run: remove migration-only rows that have no app_id (they'll be replaced)
  await sb.from('projects').delete().eq('user_id', currentUser.id).is('app_id', null);

  // Fetch existing UUID→app_id map so we can detect deletions
  const { data: existingRows } = await sb
    .from('projects').select('id, app_id').eq('user_id', currentUser.id);
  const existingMap = {};
  for (const row of (existingRows || [])) existingMap[row.app_id] = row.id;

  // Delete projects removed from S
  const currentAppIds = new Set(projects.map(p => String(p.id)));
  for (const appId of Object.keys(existingMap)) {
    if (!currentAppIds.has(appId))
      await sb.from('projects').delete().eq('id', existingMap[appId]);
  }

  // Upsert each project and its children
  for (let i = 0; i < projects.length; i++) {
    const p     = projects[i];
    const appId = String(p.id);

    const { data: projRow } = await sb.from('projects').upsert({
      user_id:     currentUser.id,
      app_id:      appId,
      title:       p.title    || '',
      type:        p.type     || '',
      context:     p.context  || '',
      status:      p.status   || 'Active',
      deadline:    p.deadline || null,
      notes:       p.notes    || '',
      order_index: i
    }, { onConflict: 'user_id,app_id' }).select('id').single();

    const projectUuid = projRow?.id;
    if (!projectUuid) continue;

    // Tasks
    const tasks = p.tasks || [];
    if (tasks.length) {
      await sb.from('project_tasks').upsert(
        tasks.map((tk, j) => ({
          app_id:      String(tk.id),
          project_id:  projectUuid,
          user_id:     currentUser.id,
          text:        tk.text      || '',
          done:        !!tk.done,
          due_date:    tk.dueDate   || null,
          task_notes:  tk.taskNotes || '',
          order_index: j
        })),
        { onConflict: 'app_id' }
      );
    }
    const taskIds = tasks.map(tk => `"${tk.id}"`).join(',');
    if (taskIds) {
      await sb.from('project_tasks').delete()
        .eq('project_id', projectUuid).not('app_id', 'in', `(${taskIds})`);
    } else {
      await sb.from('project_tasks').delete().eq('project_id', projectUuid);
    }

    // Notes
    const notes = p.notesLog || [];
    if (notes.length) {
      await sb.from('project_notes').upsert(
        notes.map(n => ({
          app_id:     String(n.id),
          project_id: projectUuid,
          user_id:    currentUser.id,
          note_date:  n.date || today(),
          text:       n.text || ''
        })),
        { onConflict: 'app_id' }
      );
    }
    const noteIds = notes.map(n => `"${n.id}"`).join(',');
    if (noteIds) {
      await sb.from('project_notes').delete()
        .eq('project_id', projectUuid).not('app_id', 'in', `(${noteIds})`);
    } else {
      await sb.from('project_notes').delete().eq('project_id', projectUuid);
    }
  }
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
    saveUserSettings().catch(e => console.error('[sync] saveUserSettings failed:', e)),
    saveProjects().catch(e => console.error('[sync] saveProjects failed:', e))
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
  await Promise.all([loadUserSettings(), loadProjects()]);
  setSyncStatus('synced');
  return true;
}
