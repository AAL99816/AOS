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
  const boxTheme = localStorage.getItem('aos_box_theme') || 'lavender';
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
    .select('*, project_tasks(*)')
    .eq('user_id', currentUser.id)
    .not('app_id', 'is', null)
    .order('order_index');
  if (error || !data || !data.length) return;

  S.projects = data.map(row => ({
    id:       row.app_id,
    _uuid:    row.id,
    title:    row.title   || '',
    type:     row.type    || '',
    context:  row.context || '',
    status:   row.status  || 'Active',
    deadline: row.deadline || '',
    notes:    row.notes   || '',
    richNotes: '',
    isPublic: row.is_public || false,
    tasks: (row.project_tasks || [])
      .filter(tk => tk.app_id)
      .sort((a, b) => a.order_index - b.order_index)
      .map(tk => ({
        id:        tk.app_id,
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
      is_public:   p.isPublic || false,
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

  }
}

/* ── media_items / media_notes / media_tracks tables ── */
async function loadMedia() {
  if (!currentUser) return;
  const { data, error } = await sb
    .from('media_items')
    .select('*, media_tracks(*)')
    .eq('user_id', currentUser.id)
    .not('app_id', 'is', null)
    .order('order_index');
  if (error || !data || !data.length) return;

  S.media = data.map(row => ({
    id:             row.app_id,
    _uuid:          row.id,
    mediaType:      row.media_type      || 'book',
    title:          row.title           || '',
    author:         row.creator         || '',
    status:         row.status          || 'unread',
    rating:         row.rating          ?? null,
    notes:          row.notes           || '',
    coverUrl:       row.cover_url       || '',
    finishedOn:     row.finished_on     || null,
    currentPage:    row.current_page    || 0,
    totalPages:     row.total_pages     || 0,
    currentSeason:  row.current_season  || 1,
    currentEpisode: row.current_episode || 0,
    totalSeasons:   row.total_seasons   || 0,
    totalEpisodes:  row.total_episodes  || 0,
    runtime:        row.runtime_minutes != null ? String(row.runtime_minutes) : '',
    watchCount:     row.watch_count     || 0,
    platform:       row.platform        || '',
    hoursPlayed:    row.hours_played    || 0,
    tracks: (row.media_tracks || [])
      .filter(tr => tr.app_id)
      .sort((a, b) => a.track_number - b.track_number)
      .map(tr => ({
        id:       tr.app_id,
        title:    tr.title    || '',
        duration: tr.duration || '',
        rating:   tr.rating   || 0,
        review:   tr.review   || ''
      }))
  }));
}

async function saveMedia() {
  if (!currentUser) return;
  const media = S.media || [];

  await sb.from('media_items').delete().eq('user_id', currentUser.id).is('app_id', null);

  const { data: existingRows } = await sb
    .from('media_items').select('id, app_id').eq('user_id', currentUser.id);
  const existingMap = {};
  for (const row of (existingRows || [])) existingMap[row.app_id] = row.id;

  const currentAppIds = new Set(media.map(m => String(m.id)));
  for (const appId of Object.keys(existingMap)) {
    if (!currentAppIds.has(appId))
      await sb.from('media_items').delete().eq('id', existingMap[appId]);
  }

  for (let i = 0; i < media.length; i++) {
    const m     = media[i];
    const appId = String(m.id);

    const { data: itemRow } = await sb.from('media_items').upsert({
      user_id:         currentUser.id,
      app_id:          appId,
      media_type:      m.mediaType      || 'book',
      title:           m.title          || '',
      creator:         m.author         || '',
      status:          m.status         || 'unread',
      rating:          m.rating         ?? null,
      notes:           m.notes          || '',
      cover_url:       m.coverUrl       || '',
      finished_on:     m.finishedOn     || null,
      current_page:    m.currentPage    || 0,
      total_pages:     m.totalPages     || 0,
      current_season:  m.currentSeason  || 1,
      current_episode: m.currentEpisode || 0,
      total_seasons:   m.totalSeasons   || 0,
      total_episodes:  m.totalEpisodes  || 0,
      runtime_minutes: m.runtime ? (parseInt(m.runtime) || null) : null,
      watch_count:     m.watchCount     || 0,
      platform:        m.platform       || '',
      hours_played:    m.hoursPlayed    || 0,
      order_index:     i
    }, { onConflict: 'user_id,app_id' }).select('id').single();

    const itemUuid = itemRow?.id;
    if (!itemUuid) continue;

    // Album tracks
    const tracks = m.tracks || [];
    if (tracks.length) {
      await sb.from('media_tracks').upsert(
        tracks.map((tr, j) => ({
          app_id:        String(tr.id),
          media_item_id: itemUuid,
          title:         tr.title    || '',
          duration:      tr.duration || '',
          track_number:  j,
          rating:        tr.rating   || 0,
          review:        tr.review   || ''
        })),
        { onConflict: 'app_id' }
      );
    }
    const trackIds = tracks.map(tr => `"${tr.id}"`).join(',');
    if (trackIds) {
      await sb.from('media_tracks').delete()
        .eq('media_item_id', itemUuid).not('app_id', 'in', `(${trackIds})`);
    } else {
      await sb.from('media_tracks').delete().eq('media_item_id', itemUuid);
    }
  }
}

/* ── habits / habit_logs / prayer_logs tables ── */
async function loadHabits() {
  if (!currentUser) return;
  const { data, error } = await sb
    .from('habits')
    .select('*, habit_logs(*)')
    .eq('user_id', currentUser.id)
    .not('app_id', 'is', null)
    .order('order_index');
  if (error || !data || !data.length) return;

  S.habits = data.map(row => ({
    id:   row.app_id,
    name: row.name || '',
    days: Object.fromEntries(
      (row.habit_logs || []).map(l => [l.logged_date, true])
    )
  }));
}

async function loadPrayer() {
  if (!currentUser) return;
  const { data, error } = await sb
    .from('prayer_logs')
    .select('*')
    .eq('user_id', currentUser.id);
  if (error || !data || !data.length) return;

  S.prayerLog = {};
  for (const row of data) {
    S.prayerLog[row.prayer_date] = {
      fajr:    row.fajr    || false,
      dhuhr:   row.dhuhr   || false,
      asr:     row.asr     || false,
      maghrib: row.maghrib || false,
      isha:    row.isha    || false
    };
  }
}

async function saveHabits() {
  if (!currentUser) return;
  const habits = S.habits || [];

  await sb.from('habits').delete().eq('user_id', currentUser.id).is('app_id', null);

  const { data: existingRows } = await sb
    .from('habits').select('id, app_id').eq('user_id', currentUser.id);
  const existingMap = {};
  for (const row of (existingRows || [])) existingMap[row.app_id] = row.id;

  const currentAppIds = new Set(habits.map(h => String(h.id)));
  for (const appId of Object.keys(existingMap)) {
    if (!currentAppIds.has(appId))
      await sb.from('habits').delete().eq('id', existingMap[appId]);
  }

  for (let i = 0; i < habits.length; i++) {
    const h     = habits[i];
    const appId = String(h.id);

    const { data: habitRow } = await sb.from('habits').upsert({
      user_id:     currentUser.id,
      app_id:      appId,
      name:        h.name || '',
      order_index: i
    }, { onConflict: 'user_id,app_id' }).select('id').single();

    const habitUuid = habitRow?.id;
    if (!habitUuid) continue;

    // Upsert each logged day
    const days = Object.keys(h.days || {}).filter(d => h.days[d]);
    if (days.length) {
      await sb.from('habit_logs').upsert(
        days.map(d => ({
          app_id:      `${appId}_${d}`,
          user_id:     currentUser.id,
          habit_id:    habitUuid,
          logged_date: d
        })),
        { onConflict: 'app_id' }
      );
    }
    // Delete removed days
    const dayIds = days.map(d => `"${appId}_${d}"`).join(',');
    if (dayIds) {
      await sb.from('habit_logs').delete()
        .eq('habit_id', habitUuid).not('app_id', 'in', `(${dayIds})`);
    } else {
      await sb.from('habit_logs').delete().eq('habit_id', habitUuid);
    }
  }
}

async function savePrayer() {
  if (!currentUser) return;
  const prayerLog = S.prayerLog || {};
  const dates = Object.keys(prayerLog);
  if (!dates.length) return;

  await sb.from('prayer_logs').upsert(
    dates.map(d => ({
      user_id:     currentUser.id,
      prayer_date: d,
      fajr:    !!(prayerLog[d]?.fajr),
      dhuhr:   !!(prayerLog[d]?.dhuhr),
      asr:     !!(prayerLog[d]?.asr),
      maghrib: !!(prayerLog[d]?.maghrib),
      isha:    !!(prayerLog[d]?.isha)
    })),
    { onConflict: 'user_id,prayer_date' }
  );

  // Delete dates no longer in state
  const dateList = dates.map(d => `"${d}"`).join(',');
  if (dateList) {
    await sb.from('prayer_logs').delete()
      .eq('user_id', currentUser.id).not('prayer_date', 'in', `(${dateList})`);
  }
}

/* ── daily_notes + weekly_reflections ── */
async function loadNotes() {
  if (!currentUser) return;
  const [notesRes, reflRes] = await Promise.all([
    sb.from('daily_notes').select('note_date, text').eq('user_id', currentUser.id),
    sb.from('weekly_reflections').select('week_start, text').eq('user_id', currentUser.id)
  ]);
  if (!notesRes.error && notesRes.data?.length) {
    if (!S.notes || typeof S.notes !== 'object') S.notes = {};
    for (const r of notesRes.data) S.notes[r.note_date] = r.text;
  }
  if (!reflRes.error && reflRes.data?.length) {
    if (!S.weeklyReflections || typeof S.weeklyReflections !== 'object') S.weeklyReflections = {};
    for (const r of reflRes.data) S.weeklyReflections[r.week_start] = r.text;
  }
}

async function saveNotes() {
  if (!currentUser) return;
  const notes = S.notes && typeof S.notes === 'object' ? S.notes : {};
  const refl  = S.weeklyReflections && typeof S.weeklyReflections === 'object' ? S.weeklyReflections : {};

  const noteRows = Object.entries(notes)
    .filter(([date, text]) => date && text)
    .map(([date, text]) => ({ user_id: currentUser.id, note_date: date, text }));

  const reflRows = Object.entries(refl)
    .filter(([date, text]) => date && text)
    .map(([date, text]) => ({ user_id: currentUser.id, week_start: date, text }));

  await Promise.all([
    noteRows.length ? sb.from('daily_notes').upsert(noteRows, { onConflict: 'user_id,note_date' }) : Promise.resolve(),
    reflRows.length ? sb.from('weekly_reflections').upsert(reflRows, { onConflict: 'user_id,week_start' }) : Promise.resolve()
  ]);
}

/* ── unified notes table ── */
async function loadNotesDB() {
  if (!currentUser) return;
  const { data, error } = await sb
    .from('notes')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('order_index');
  if (error) { console.warn('[notes] load failed:', error.message); return; }
  S.notesDB = (data || []).map(r => ({
    id:          r.id,
    section:     r.section     || 'custom',
    entityType:  r.entity_type || null,
    entityId:    r.entity_id   || null,
    title:       r.title       || '',
    body:        r.body        || '',
    orderIndex:  r.order_index || 0,
    createdAt:   r.created_at  || '',
    updatedAt:   r.updated_at  || ''
  }));
  // Re-render Notes tab if it is currently visible
  if (typeof renderNotes === 'function' && eid('notesTopicList')) renderNotes();
}

async function saveNoteDB(note) {
  if (!currentUser) return;
  const row = {
    id:          note.id,
    user_id:     currentUser.id,
    section:     note.section    || 'custom',
    entity_type: note.entityType || null,
    entity_id:   note.entityId   || null,
    title:       note.title      || '',
    body:        note.body       || '',
    order_index: note.orderIndex || 0
  };
  const { data, error } = await sb
    .from('notes')
    .upsert(row, { onConflict: 'id' })
    .select('id, updated_at')
    .single();
  if (error) { console.warn('[notes] save failed:', error.message); return; }
  // Update in local array
  if (!Array.isArray(S.notesDB)) S.notesDB = [];
  const idx = S.notesDB.findIndex(n => n.id === note.id);
  const merged = { ...note, updatedAt: data?.updated_at || note.updatedAt };
  if (idx >= 0) S.notesDB[idx] = merged; else S.notesDB.push(merged);
}

async function deleteNoteDB(noteId) {
  if (!currentUser) return;
  await sb.from('notes').delete().eq('id', noteId).eq('user_id', currentUser.id);
  if (Array.isArray(S.notesDB)) S.notesDB = S.notesDB.filter(n => n.id !== noteId);
}

function _subscribeNotesRealtime() {
  sb.channel('notes-changes')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'notes',
      filter: `user_id=eq.${currentUser.id}`
    }, payload => {
      if (!Array.isArray(S.notesDB)) S.notesDB = [];
      if (payload.eventType === 'DELETE') {
        S.notesDB = S.notesDB.filter(n => n.id !== payload.old.id);
      } else {
        const r = payload.new;
        const note = {
          id: r.id, section: r.section || 'custom',
          entityType: r.entity_type || null, entityId: r.entity_id || null,
          title: r.title || '', body: r.body || '',
          orderIndex: r.order_index || 0,
          createdAt: r.created_at || '', updatedAt: r.updated_at || ''
        };
        const idx = S.notesDB.findIndex(n => n.id === r.id);
        if (idx >= 0) S.notesDB[idx] = note; else S.notesDB.push(note);
      }
      if (typeof renderNotes === 'function' && document.querySelector('#notesTopicList')) renderNotes();
      if (typeof renderChapterNotes === 'function') renderChapterNotes();
      if (typeof renderPdNotes === 'function') {
        const p = (S.projects||[]).find(p => p.id === _activeProjectId);
        if (p) renderPdNotes(p);
      }
    })
    .subscribe();
}

/* ── exercise_pbs ── */
async function saveExercisePbs() {
  if (!currentUser) return;
  const hist = S.exerciseHistory || {};
  const pbs = Object.entries(hist).map(([name, entries]) => {
    if (!entries?.length) return null;
    const best = entries.reduce((b, e) => (Number(e.weight)||0) > (Number(b.weight)||0) ? e : b, entries[0]);
    const last = entries[entries.length - 1];
    return {
      user_id: currentUser.id,
      exercise_name: name,
      best_weight_kg: Number(best.weight) || null,
      best_reps: Number(best.reps) || null,
      last_logged_date: last.date || null
    };
  }).filter(Boolean);
  if (pbs.length) {
    await sb.from('exercise_pbs').upsert(pbs, { onConflict: 'user_id,exercise_name' });
  }
}

/* ── workout_schedule ── */
async function loadWorkoutSchedule() {
  if (!currentUser) return;
  const { data, error } = await sb.from('workout_schedule').select('*').eq('user_id', currentUser.id).order('weekday');
  if (error || !data?.length) return;
  const { data: tmpls } = await sb.from('workout_templates').select('id, app_id').eq('user_id', currentUser.id);
  const uuidToAppId = {};
  for (const t of (tmpls || [])) uuidToAppId[t.id] = Number(t.app_id);
  S.workout = data.map(row => ({
    type:   row.label   || '',
    rest:   !!row.is_rest,
    cardId: row.template_id ? (uuidToAppId[row.template_id] || null) : null
  }));
}

async function saveWorkoutSchedule() {
  if (!currentUser) return;
  const schedule = S.workout || [];
  const { data: tmpls } = await sb.from('workout_templates').select('id, app_id').eq('user_id', currentUser.id).not('app_id', 'is', null);
  const tmplMap = {};
  for (const t of (tmpls || [])) tmplMap[t.app_id] = t.id;
  await sb.from('workout_schedule').delete().eq('user_id', currentUser.id);
  const rows = schedule.map((day, i) => ({
    user_id:     currentUser.id,
    weekday:     i,
    label:       day.type || '',
    is_rest:     !!day.rest,
    template_id: day.cardId ? (tmplMap[String(day.cardId)] || null) : null
  }));
  if (rows.length) await sb.from('workout_schedule').insert(rows);
}

/* ── body_weight_logs ── */
async function loadBodyWeight() {
  if (!currentUser) return;
  const { data, error } = await sb.from('body_weight_logs').select('*').eq('user_id', currentUser.id).order('logged_date', { ascending: false });
  if (error || !data?.length) return;
  S.weightLog = data.map(row => ({
    id:     row.id,
    date:   row.logged_date,
    weight: Number(row.weight_kg),
    notes:  row.notes || ''
  }));
}

async function saveBodyWeight() {
  if (!currentUser) return;
  const entries = S.weightLog || [];
  if (!entries.length) return;
  await sb.from('body_weight_logs').upsert(
    entries.map(e => ({
      user_id:     currentUser.id,
      logged_date: e.date,
      weight_kg:   Number(e.weight),
      notes:       e.notes || ''
    })),
    { onConflict: 'user_id,logged_date' }
  );
}

/* ── fitness: workout templates, sessions, cardio, calories ── */
async function loadFitness() {
  if (!currentUser) return;

  const [tmplRes, sessRes, cardioRes, calRes] = await Promise.all([
    sb.from('workout_templates').select('*, workout_template_exercises(*)').eq('user_id', currentUser.id).not('app_id', 'is', null).order('order_index'),
    sb.from('workout_sessions').select('*, workout_exercises(*)').eq('user_id', currentUser.id).not('app_id', 'is', null).order('session_date'),
    sb.from('cardio_sessions').select('*').eq('user_id', currentUser.id).not('app_id', 'is', null).order('session_date'),
    sb.from('calorie_entries').select('*').eq('user_id', currentUser.id).not('app_id', 'is', null).order('entry_date')
  ]);

  if (!tmplRes.error && tmplRes.data?.length) {
    S.workoutCards = tmplRes.data.map(row => ({
      id:       row.app_id,
      _uuid:    row.id,
      title:    row.title    || '',
      subtitle: row.subtitle || '',
      exercises: (row.workout_template_exercises || [])
        .filter(e => e.app_id)
        .sort((a, b) => a.order_index - b.order_index)
        .map(e => ({ id: e.app_id, name: e.name || '' }))
    }));
  }

  if (!sessRes.error && sessRes.data?.length) {
    S.workoutHistory = sessRes.data.map(row => ({
      id:      row.app_id,
      _uuid:   row.id,
      date:    row.session_date || '',
      title:   row.title        || 'Workout',
      cardId:  row.template_id  ? (S.workoutCards || []).find(c => c._uuid === row.template_id)?.id ?? null : null,
      summary: row.summary      || '',
      notes:   row.notes        || '',
      exercises: (row.workout_exercises || [])
        .filter(e => e.app_id)
        .sort((a, b) => a.order_index - b.order_index)
        .map(e => ({
          name:       e.name        || '',
          sets:       e.sets        ?? '',
          weight:     e.weight_kg   ?? null,
          reps:       e.reps        ?? null,
          loggedSets: Array.isArray(e.logged_sets) && e.logged_sets.length ? e.logged_sets : null
        }))
    }));
    // Rebuild gymLog from sessions
    S.gymLog = {};
    for (const s of S.workoutHistory) { if (s.date) S.gymLog[s.date] = true; }
  }

  if (!cardioRes.error && cardioRes.data?.length) {
    S.cardioHistory = cardioRes.data.map(row => ({
      id:       row.app_id,
      date:     row.session_date     || '',
      activity: row.activity         || '',
      duration: row.duration_minutes != null ? String(row.duration_minutes) : '',
      distance: row.distance_km      != null ? String(row.distance_km)      : '',
      steps:    row.steps            != null ? String(row.steps)            : '',
      notes:    row.notes            || ''
    }));
  }

  if (!calRes.error && calRes.data?.length) {
    S.calorieHistory = calRes.data.map(row => ({
      id:          row.app_id,
      date:        row.entry_date   || '',
      description: row.description  || '',
      calories:    row.calories     || 0
    }));
  }
}

async function saveFitness() {
  if (!currentUser) return;

  // ── Workout templates ──
  const cards = S.workoutCards || [];
  await sb.from('workout_templates').delete().eq('user_id', currentUser.id).is('app_id', null);
  const { data: existingTmpls } = await sb.from('workout_templates').select('id, app_id').eq('user_id', currentUser.id);
  const tmplMap = {};
  for (const r of (existingTmpls || [])) tmplMap[r.app_id] = r.id;
  const currentTmplIds = new Set(cards.map(c => String(c.id)));
  for (const appId of Object.keys(tmplMap)) {
    if (!currentTmplIds.has(appId)) await sb.from('workout_templates').delete().eq('id', tmplMap[appId]);
  }
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const { data: tmplRow } = await sb.from('workout_templates').upsert({
      user_id: currentUser.id, app_id: String(c.id),
      title: c.title || '', subtitle: c.subtitle || '', order_index: i
    }, { onConflict: 'user_id,app_id' }).select('id').single();
    const tmplUuid = tmplRow?.id;
    if (!tmplUuid) continue;
    const exs = c.exercises || [];
    if (exs.length) {
      await sb.from('workout_template_exercises').upsert(
        exs.map((e, j) => ({ app_id: String(e.id), template_id: tmplUuid, name: e.name || '', order_index: j })),
        { onConflict: 'app_id' }
      );
    }
    const exIds = exs.map(e => `"${e.id}"`).join(',');
    if (exIds) await sb.from('workout_template_exercises').delete().eq('template_id', tmplUuid).not('app_id', 'in', `(${exIds})`);
    else        await sb.from('workout_template_exercises').delete().eq('template_id', tmplUuid);
  }

  // ── Workout sessions ──
  const sessions = S.workoutHistory || [];
  await sb.from('workout_sessions').delete().eq('user_id', currentUser.id).is('app_id', null);
  const { data: existingSess } = await sb.from('workout_sessions').select('id, app_id').eq('user_id', currentUser.id);
  const sessMap = {};
  for (const r of (existingSess || [])) sessMap[r.app_id] = r.id;
  const currentSessIds = new Set(sessions.map(s => String(s.id)));
  for (const appId of Object.keys(sessMap)) {
    if (!currentSessIds.has(appId)) await sb.from('workout_sessions').delete().eq('id', sessMap[appId]);
  }
  for (const s of sessions) {
    const { data: sessRow } = await sb.from('workout_sessions').upsert({
      user_id: currentUser.id, app_id: String(s.id),
      session_date: s.date || null, title: s.title || 'Workout', summary: s.summary || '', notes: s.notes || ''
    }, { onConflict: 'user_id,app_id' }).select('id').single();
    const sessUuid = sessRow?.id;
    if (!sessUuid) continue;
    const exs = s.exercises || [];
    if (exs.length) {
      await sb.from('workout_exercises').upsert(
        exs.map((e, j) => ({
          app_id: `${s.id}_${j}`, session_id: sessUuid, user_id: currentUser.id,
          name: e.name || '', sets: e.sets || null, reps: e.reps || null, weight_kg: e.weight || null, order_index: j,
          logged_sets: Array.isArray(e.loggedSets) && e.loggedSets.length ? e.loggedSets : null
        })),
        { onConflict: 'app_id' }
      );
    }
    const exIds = exs.map((_, j) => `"${s.id}_${j}"`).join(',');
    if (exIds) await sb.from('workout_exercises').delete().eq('session_id', sessUuid).not('app_id', 'in', `(${exIds})`);
    else        await sb.from('workout_exercises').delete().eq('session_id', sessUuid);
  }

  // ── Cardio sessions ──
  const cardio = S.cardioHistory || [];
  await sb.from('cardio_sessions').delete().eq('user_id', currentUser.id).is('app_id', null);
  if (cardio.length) {
    await sb.from('cardio_sessions').upsert(
      cardio.map(c => ({
        app_id: String(c.id), user_id: currentUser.id, session_date: c.date || null,
        activity: c.activity || '',
        duration_minutes: c.duration ? (parseInt(c.duration) || null) : null,
        distance_km: c.distance ? (parseFloat(c.distance) || null) : null,
        steps: c.steps ? (parseInt(c.steps) || null) : null,
        notes: c.notes || ''
      })),
      { onConflict: 'user_id,app_id' }
    );
  }
  const cardioIds = cardio.map(c => `"${c.id}"`).join(',');
  if (cardioIds) await sb.from('cardio_sessions').delete().eq('user_id', currentUser.id).not('app_id', 'in', `(${cardioIds})`);

  // ── Calorie entries ──
  const calories = S.calorieHistory || [];
  await sb.from('calorie_entries').delete().eq('user_id', currentUser.id).is('app_id', null);
  if (calories.length) {
    await sb.from('calorie_entries').upsert(
      calories.map(e => ({
        app_id: String(e.id), user_id: currentUser.id, entry_date: e.date || null,
        description: e.description || '', calories: e.calories || 0
      })),
      { onConflict: 'user_id,app_id' }
    );
  }
  const calIds = calories.map(e => `"${e.id}"`).join(',');
  if (calIds) await sb.from('calorie_entries').delete().eq('user_id', currentUser.id).not('app_id', 'in', `(${calIds})`);

  // ── Exercise PBs + workout schedule (depend on templates being saved above) ──
  await Promise.all([
    saveExercisePbs().catch(e => console.error('[sync] saveExercisePbs failed:', e)),
    saveWorkoutSchedule().catch(e => console.error('[sync] saveWorkoutSchedule failed:', e))
  ]);
}

function setSyncStatus(status) {
  const dot = eid('syncDot');
  if (!dot) return;
  dot.className = 'sync-dot ' + status;
  if (status === 'synced') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    dot.title = `Synced at ${timeStr}`;
    // D1: store last-synced time for settings display
    localStorage.setItem('aos_last_synced', now.toISOString());
  } else {
    dot.title = {
      syncing: 'Syncing…',
      offline: 'Offline — changes saved locally'
    }[status] || '';
  }
}

let saveTimer;
let lastSaveTime = 0;
let syncChannel = null;
let _isSaving = false;

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
      // Ignore remote updates while we're mid-save or within 3s of a save
      if (_isSaving || Date.now() - lastSaveTime < 3000) return;
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

  _isSaving = true;
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
    saveProjects().catch(e => console.error('[sync] saveProjects failed:', e)),
    saveMedia().catch(e => console.error('[sync] saveMedia failed:', e)),
    saveHabits().catch(e => console.error('[sync] saveHabits failed:', e)),
    savePrayer().catch(e => console.error('[sync] savePrayer failed:', e)),
    saveNotes().catch(e => console.error('[sync] saveNotes failed:', e)),
    saveBodyWeight().catch(e => console.error('[sync] saveBodyWeight failed:', e)),
    saveFocusItems().catch(e => console.error('[sync] saveFocusItems failed:', e))
  ]);

  _isSaving = false;

  if (error) {
    setSyncStatus('offline');
    eid('saveInd').textContent = 'Saved locally (offline)';
    setTimeout(() => { eid('saveInd').textContent = ''; }, 2500);
  } else {
    setSyncStatus('synced');
    eid('saveInd').textContent = 'Synced';
    setTimeout(() => { eid('saveInd').textContent = ''; }, 2000);
  }
  // Run fitness save after main save — it has many sequential DB calls
  // and must not compete with other saves in the Promise.all
  saveFitness().catch(e => {
    console.error('[sync] saveFitness failed:', e);
    if (typeof toast === 'function') toast('Workout data failed to sync — pull down to retry');
  });
}

async function saveFocusItems() {
  if (!currentUser) return;
  const items = S.focusItems || [];
  if (!items.length) {
    await sb.from('focus_items').delete().eq('user_id', currentUser.id);
    return;
  }
  const { data: existing } = await sb.from('focus_items').select('id, app_id').eq('user_id', currentUser.id);
  const existingIds = new Set((existing || []).map(r => r.app_id));
  const currentIds = new Set(items.map(f => String(f.id)));
  for (const r of (existing || [])) {
    if (!currentIds.has(r.app_id)) await sb.from('focus_items').delete().eq('id', r.id);
  }
  const rows = items.map((f, i) => ({
    app_id: String(f.id),
    user_id: currentUser.id,
    label: f.label || '',
    project_id: null, // UUID FK — skip for now; projectId is an app-level UUID not a DB UUID
    pomodoros_done: f.pomodorosDone || 0,
    pomodoros_target: f.pomodorosTarget || 0,
    order_index: i
  }));
  await sb.from('focus_items').upsert(rows, { onConflict: 'app_id' });
}

async function loadFocusItems() {
  if (!currentUser) return;
  const { data, error } = await sb.from('focus_items').select('*').eq('user_id', currentUser.id).order('order_index');
  if (error || !data?.length) return;
  S.focusItems = data.map(r => ({
    id: r.app_id || r.id,
    label: r.label || '',
    projectId: null,
    pomodorosDone: r.pomodoros_done || 0,
    pomodorosTarget: r.pomodoros_target || 0,
    completed: false
  }));
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
  await Promise.all([loadUserSettings(), loadProjects(), loadMedia(), loadHabits(), loadPrayer(), loadNotes(), loadBodyWeight(), loadWorkoutSchedule(), loadFitness(), loadFocusItems(), loadNotesDB()]);
  _subscribeNotesRealtime();
  setSyncStatus('synced');
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Community — all Supabase data functions
// ═══════════════════════════════════════════════════════════════════════════════

/* ── Community profile ── */
async function saveCommunityProfile(updates) {
  if (!currentUser) return;
  const { error } = await sb.from('profiles').update(updates).eq('id', currentUser.id);
  if (error) { console.warn('[community] saveCommunityProfile failed:', error.message); return; }
  if (!currentProfile) currentProfile = {};
  Object.assign(currentProfile, updates);
}

/* ── Feed events (daily rollup via ON CONFLICT DO UPDATE) ── */
async function pushFeedEvent(type, entityId, summary) {
  if (!currentUser) return;
  const p = currentProfile || {};
  if (!p.is_public) return;
  // Check share flag for the event type
  const shareFlags = {
    workout:        'share_fitness',
    cardio:         'share_fitness',
    food_day:       'share_food',
    project_update: 'share_projects',
    media_finish:   'share_media',
    community_note: null   // always share (it's a public note by definition)
  };
  const flag = shareFlags[type];
  if (flag && !p[flag]) return;

  const dateStr = (typeof today === 'function') ? today() : new Date().toISOString().slice(0, 10);
  await sb.from('community_feed_events').upsert({
    user_id:    currentUser.id,
    event_type: type,
    entity_id:  entityId || null,
    event_date: dateStr,
    summary:    summary || {}
  }, { onConflict: 'user_id,event_type,event_date' });
}

/* ── Community notes ── */
async function loadCommunityNotes() {
  if (!currentUser) return [];
  const { data, error } = await sb
    .from('community_notes')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  if (error) { console.warn('[community] loadCommunityNotes failed:', error.message); return []; }
  return data || [];
}

async function saveCommunityNote(note) {
  if (!currentUser) return null;
  const row = { user_id: currentUser.id, title: note.title || '', body: note.body || '' };
  if (note.id) row.id = note.id;
  const { data, error } = await sb
    .from('community_notes')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) { console.warn('[community] saveCommunityNote failed:', error.message); return null; }
  return data;
}

async function deleteCommunityNote(id) {
  if (!currentUser) return;
  await sb.from('community_notes').delete().eq('id', id).eq('user_id', currentUser.id);
}

/* ── Follows ── */
async function followUser(userId) {
  if (!currentUser) return;
  await sb.from('community_follows').insert({ follower_id: currentUser.id, following_id: userId });
}

async function unfollowUser(userId) {
  if (!currentUser) return;
  await sb.from('community_follows').delete()
    .eq('follower_id', currentUser.id).eq('following_id', userId);
}

async function loadFollowing() {
  if (!currentUser) return [];
  const { data } = await sb
    .from('community_follows')
    .select('following_id')
    .eq('follower_id', currentUser.id);
  return (data || []).map(r => r.following_id);
}

async function loadFollowersCount(userId) {
  const { count } = await sb
    .from('community_follows')
    .select('follower_id', { count: 'exact', head: true })
    .eq('following_id', userId);
  return count || 0;
}

/* ── Feed ── */
async function loadCommunityFeed(followingIds) {
  if (!currentUser || !followingIds.length) return [];
  const { data, error } = await sb
    .from('community_feed_events')
    .select('*, profiles(username, display_name, avatar_url)')
    .in('user_id', followingIds)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) { console.warn('[community] loadCommunityFeed failed:', error.message); return []; }
  return data || [];
}

async function loadCommunityFeedByUser(userId) {
  const { data, error } = await sb
    .from('community_feed_events')
    .select('*')
    .eq('user_id', userId)
    .order('event_date', { ascending: false })
    .limit(20);
  if (error) return [];
  return data || [];
}

/* ── Discover ── */
async function searchCommunityProfiles(query) {
  if (!currentUser) return [];
  const clean = query.replace(/'/g, "''");
  const { data, error } = await sb
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, share_fitness, share_food, share_projects, share_media')
    .eq('is_public', true)
    .neq('id', currentUser.id)
    .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
    .limit(20);
  if (error) { console.warn('[community] searchProfiles failed:', error.message); return []; }
  return data || [];
}

async function fetchPublicProfileById(userId) {
  const { data, error } = await sb
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, is_public, share_fitness, share_food, share_projects, share_media')
    .eq('id', userId)
    .eq('is_public', true)
    .single();
  if (error) return null;
  return data;
}

/* ── Per-profile public data tabs ── */
async function fetchPublicFoodLog(userId) {
  const { data } = await sb
    .from('food_log')
    .select('id, log_date, name, brand, meal_type, calories, protein_g, carbs_g, fat_g, grams')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(300);
  return data || [];
}

async function fetchPublicFitness(userId) {
  const [sessRes, cardioRes] = await Promise.all([
    sb.from('workout_sessions')
      .select('id, session_date, title, summary, workout_exercises(name, sets, reps, weight_kg, logged_sets, order_index)')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(50),
    sb.from('cardio_sessions')
      .select('id, session_date, activity, duration_minutes, distance_km, steps, notes')
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .limit(50)
  ]);
  return { sessions: sessRes.data || [], cardio: cardioRes.data || [] };
}

async function fetchPublicProjects(userId) {
  const { data } = await sb
    .from('projects')
    .select('id, title, type, status, deadline, project_tasks(id, text, done, due_date, order_index)')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('order_index');
  return data || [];
}

async function fetchPublicMedia(userId) {
  const { data } = await sb
    .from('media_items')
    .select('id, media_type, title, creator, status, rating, cover_url, finished_on, current_page, total_pages')
    .eq('user_id', userId)
    .order('order_index');
  return data || [];
}
