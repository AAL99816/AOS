/* ══ DEFAULT STATE ══ */
const DS = {
  appTitle:'AOS', appSub:'', heroImg:'',
  quote:{ text:'Welcome to AOS. Edit any heading, click habits to mark them, and use the + buttons to shape this into your own system.', author:'— Begin anywhere' },
  streakPrefs:{prayer:false,cardio:true,gym:true,read:true,study:true},
  cardioTarget:'30 min cardio — run, walk, or cycle',
  habits:[
    {id:1,name:'Gym / Lift',days:{}},
    {id:2,name:'Cardio / Walk',days:{}},
    {id:3,name:'Reading',days:{}},
    {id:4,name:'Study / Deep Work',days:{}},
    {id:5,name:'Sleep On Time',days:{}},
    {id:6,name:'Hydration',days:{}},
    {id:7,name:'Stretch / Mobility',days:{}},
    {id:8,name:'Journal / Reflect',days:{}}
  ],
  workout:[
    {type:'',rest:true},{type:'',rest:true},{type:'',rest:true},{type:'',rest:true},
    {type:'',rest:true},{type:'',rest:true},{type:'',rest:true}
  ],
  workoutCards:[],
  projects:[],
  media:[],
gymLog:{},
cardioLog:{},
cardioHistory:[],
calorieHistory:[],
prayerLog:{},
notes:{},
workoutHistory:[],
exerciseHistory:{},
activeWorkoutDrafts:{},
customExercises:[],
waterLog:{},
winsLog:[],
groceryList:[],
weeklyReflections:{},
weightLog:[],
moodLog:{},
annualGoals:null,
appPrefs:{ showReflection: true, calorieMode: 'meal', defaultTab: 'today', tabOrder: [] },
modules:{},
notesTopics:[],
customStreaks:[],
onboarded:false,
focusItems:[],
focusHistory:[],
foodLog:{},
foodTargets:{ kcal:2000, protein:150, carbs:200, fat:65, fiber:25 },
mealPlans:[],
customFoods:[],
features:{
  moodTracking:      true,
  bodyWeight:        true,
  annualGoals:       true,
  pomodoro:          true,
  globalSearch:      true,
  dataExport:        true,
  exercisePbs:       true,
  streakProtection:  false,
  financialTracking: false,
  aiInsights:        false,
}

};

const clone = v => JSON.parse(JSON.stringify(v));

let S = clone(DS);
let appBooted = false;
let inlineEditsBound = false;

function deepMerge(base,over){
  const r = clone(base);
  if(!over || typeof over !== 'object') return r;
  for(const k in over){
    if(Array.isArray(over[k])) r[k] = over[k];
    else if(over[k] && typeof over[k] === 'object') r[k] = deepMerge(r[k] || {}, over[k]);
    else r[k] = over[k];
  }
  return r;
}

function makeCardioSession(s={}) {
  return {
    id: s.id ?? uid(),
    date: s.date ?? today(),
    activity: s.activity ?? '',
    duration: s.duration ?? '',
    distance: s.distance ?? '',
    steps: s.steps ?? '',
    notes: s.notes ?? ''
  };
}

function makeWorkoutDay(w={}){
  return {
    type:   w.type   ?? '',
    rest:   !!w.rest,
    cardId: w.cardId ?? null
  };
}

function makeProject(p={}){
  return {
    id: p.id ?? uid(),
    title:   p.title   ?? p.school   ?? '',
    type:    p.type    ?? p.name     ?? '',
    context: p.context ?? p.location ?? '',
    status:   p.status   ?? 'Active',
    deadline: p.deadline ?? '',
    notes:    p.notes    ?? '',
    richNotes: p.richNotes ?? '',
    isPublic: p.isPublic ?? false,
    tasks: Array.isArray(p.tasks) ? p.tasks.map(tk => ({
      id: tk.id ?? uid(),
      text: tk.text ?? '',
      done: !!tk.done,
      dueDate: tk.dueDate ?? '',
      taskNotes: tk.taskNotes ?? ''
    })) : []
  };
}

function makeMedia(m={}){
  return {
    id: m.id ?? uid(),
    mediaType: m.mediaType ?? 'book',
    title: m.title ?? '',
    author: m.author ?? '',       // used as Artist for albums
    status: m.status ?? 'unread',
    rating: m.rating ?? null,
    notes: m.notes ?? '',
    coverUrl: m.coverUrl ?? '',
    finishedOn: m.finishedOn || null,
    // Books
    currentPage: Number.isFinite(+m.currentPage) ? +m.currentPage : 0,
    totalPages:  Number.isFinite(+m.totalPages)  ? +m.totalPages  : 0,
    highlights:   Array.isArray(m.highlights)   ? m.highlights   : [],
    // Shows / Anime
    currentSeason:  Number.isFinite(+m.currentSeason)  ? +m.currentSeason  : 1,
    currentEpisode: Number.isFinite(+m.currentEpisode) ? +m.currentEpisode : 0,
    totalSeasons:   Number.isFinite(+m.totalSeasons)   ? +m.totalSeasons   : 0,
    totalEpisodes:  Number.isFinite(+m.totalEpisodes)  ? +m.totalEpisodes  : 0,
    // Films
    runtime:    m.runtime    ?? '',
    watchCount: Number.isFinite(+m.watchCount) ? +m.watchCount : 0,
    // Games
    platform:    m.platform    ?? '',
    hoursPlayed: Number.isFinite(+m.hoursPlayed) ? +m.hoursPlayed : 0,
    // Albums
    tracks: Array.isArray(m.tracks) ? m.tracks.map(tr => ({
      id:     tr.id     ?? uid(),
      title:  tr.title  ?? '',
      duration: tr.duration ?? '',
      rating: Number.isFinite(+tr.rating) ? +tr.rating : 0,
      review: tr.review ?? ''
    })) : [],
    // Genre (all types)
    genre: m.genre ?? ''
  };
}

function makeNote(n={}) {
  return {
    id: n.id ?? uid(),
    title: n.title ?? '',
    body: n.body ?? '',
    date: n.date ?? today(),
    updatedAt: n.updatedAt ?? n.date ?? today()
  };
}

function makeTopic(t={}) {
  return {
    id: t.id ?? uid(),
    title: t.title ?? 'Untitled',
    icon: t.icon ?? '',
    linkedTab: t.linkedTab ?? '',
    linkedEntityId:   t.linkedEntityId   ?? null,
    linkedEntityType: t.linkedEntityType ?? '',
    notes: Array.isArray(t.notes) ? t.notes.map(makeNote) : []
  };
}

function makeHabit(h={}){
  return {
    id: h.id ?? uid(),
    name: h.name ?? '',
    days: h.days && typeof h.days === 'object' ? h.days : {}
  };
}

function _numOr(value, fallback = 0) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeFoodCountryCode(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'GLOBAL';
  const lower = raw.toLowerCase();
  const aliases = {
    kuwait: 'KW',
    kw: 'KW',
    ksa: 'SA',
    saudi: 'SA',
    'saudi arabia': 'SA',
    usa: 'US',
    us: 'US',
    'united states': 'US',
    america: 'US',
    jamaica: 'JM',
    jm: 'JM',
    korea: 'KR',
    'south korea': 'KR',
    kr: 'KR',
    global: 'GLOBAL',
    gcc: 'GLOBAL'
  };
  if (aliases[lower]) return aliases[lower];
  return raw.length === 2 ? raw.toUpperCase() : 'GLOBAL';
}

function makeCustomFood(cf={}) {
  const id = (typeof cf.id === 'number' || (typeof cf.id === 'string' && /^\d{13}$/.test(cf.id))) ? uid() : (cf.id ?? uid());
  const per100g = cf.per100g && typeof cf.per100g === 'object' ? cf.per100g : {};
  const countryCode = normalizeFoodCountryCode(cf.countryCode || cf.country_code || cf.region || (cf.gcc ? 'KW' : 'GLOBAL'));
  const regionGroup = cf.regionGroup || cf.region_group || (cf.gcc || String(cf.region || '').toLowerCase() === 'gcc' ? 'GCC' : '');
  return {
    id,
    name: cf.name || '',
    brand: cf.brand || '',
    barcode: cf.barcode || '',
    countryCode,
    regionGroup,
    servingGrams: Math.max(1, _numOr(cf.servingGrams ?? cf.serving_grams, 100)),
    sourceProductId: cf.sourceProductId || cf.sharedProductId || cf.source_product_id || '',
    kcal: _numOr(cf.kcal ?? per100g.kcal),
    protein: _numOr(cf.protein ?? per100g.protein),
    carbs: _numOr(cf.carbs ?? per100g.carbs),
    fat: _numOr(cf.fat ?? per100g.fat),
    fiber: _numOr(cf.fiber ?? per100g.fiber),
    notes: cf.notes || '',
    submittedAt: cf.submittedAt || cf.submitted_at || '',
    submissionStatus: cf.submissionStatus || cf.submission_status || (cf._shared ? 'pending' : '')
  };
}

function normalizeAppState(raw={}){
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = deepMerge(DS, src);

  out.quote = out.quote && typeof out.quote === 'object' ? deepMerge(DS.quote, out.quote) : clone(DS.quote);
  out.streakPrefs = out.streakPrefs && typeof out.streakPrefs === 'object' ? deepMerge(DS.streakPrefs, out.streakPrefs) : clone(DS.streakPrefs);

  out.notes = out.notes && typeof out.notes === 'object' ? out.notes : {};
  out.gymLog = out.gymLog && typeof out.gymLog === 'object' ? out.gymLog : {};
  out.cardioLog = out.cardioLog && typeof out.cardioLog === 'object' ? out.cardioLog : {};
  out.cardioHistory = (Array.isArray(out.cardioHistory) ? out.cardioHistory : []).map(makeCardioSession);
  // Migrate old calorieLog/calorieTarget — just drop them gracefully
  delete out.calorieLog;
  delete out.calorieTarget;
  out.calorieHistory = Array.isArray(out.calorieHistory) ? out.calorieHistory : (Array.isArray(src.calorieHistory) ? src.calorieHistory : []);
  out.mealPlans = Array.isArray(src.mealPlans) ? src.mealPlans : [];
  out.workoutHistory = (Array.isArray(out.workoutHistory) ? out.workoutHistory : []).map(makeWorkoutSession);
  out.exerciseHistory = out.exerciseHistory && typeof out.exerciseHistory === 'object' ? out.exerciseHistory : {};
  out.activeWorkoutDrafts = normalizeWorkoutDrafts(out.activeWorkoutDrafts);
  out.customExercises = Array.isArray(out.customExercises) ? out.customExercises : [];
  out.waterLog = out.waterLog && typeof out.waterLog === 'object' ? out.waterLog : {};
  out.winsLog = Array.isArray(out.winsLog) ? out.winsLog : [];
  out.groceryList = Array.isArray(out.groceryList) ? out.groceryList : [];
  out.prayerLog = out.prayerLog && typeof out.prayerLog === 'object' ? out.prayerLog : {};
  out.weeklyReflections = out.weeklyReflections && typeof out.weeklyReflections === 'object' ? out.weeklyReflections : {};
  out.weightLog = Array.isArray(out.weightLog) ? out.weightLog : [];
  out.moodLog = out.moodLog && typeof out.moodLog === 'object' ? out.moodLog : {};
  // annualGoals migrated to year-keyed map: { 2025: { booksTarget, workoutsTarget }, ... }
  // Old format was: { year, booksTarget, workoutsTarget }
  if (out.annualGoals && typeof out.annualGoals === 'object' && out.annualGoals.year && !out.annualGoals[out.annualGoals.year]) {
    const old = out.annualGoals;
    out.annualGoals = { [old.year]: { booksTarget: old.booksTarget || 12, workoutsTarget: old.workoutsTarget || 100 } };
  } else if (!out.annualGoals || typeof out.annualGoals !== 'object') {
    out.annualGoals = {};
  }
  out.features = deepMerge(DS.features, (src.features && typeof src.features === 'object') ? src.features : {});
  out.appPrefs = deepMerge(DS.appPrefs, out.appPrefs || {});
  out.modules = (src.modules && typeof src.modules === 'object') ? src.modules : {};
  out.notesTopics = Array.isArray(out.notesTopics) ? out.notesTopics.map(makeTopic) : [];
  out.onboarded = typeof src.onboarded === 'boolean' ? src.onboarded : false;
  out.customStreaks = (Array.isArray(src.customStreaks) ? src.customStreaks : []).map(cs => ({
    id: cs.id ?? uid(),
    name: cs.name ?? 'Custom',
    emoji: cs.emoji ?? '🔥',
    log: (cs.log && typeof cs.log === 'object') ? cs.log : {}
  }));

  // Migrate My Foods into the country-aware product shape and preserve macro snapshots in old logs.
  if (Array.isArray(out.customFoods)) {
    out.customFoods = out.customFoods.map(makeCustomFood).filter(cf => cf.name);
  }
  // Migrate legacy Date.now() IDs (13-digit numbers) on foodLog entries to UUIDs.
  if (out.foodLog && typeof out.foodLog === 'object') {
    Object.keys(out.foodLog).forEach(date => {
      if (Array.isArray(out.foodLog[date])) {
        out.foodLog[date] = out.foodLog[date].map(e => ({
          ...e,
          id: (typeof e.id === 'number' || (typeof e.id === 'string' && /^\d{13}$/.test(e.id))) ? uid() : e.id
        }));
      }
    });
  }

  out.habits = (Array.isArray(out.habits) ? out.habits : clone(DS.habits)).map(makeHabit);
  out.workout = (Array.isArray(out.workout) ? out.workout : clone(DS.workout)).map(makeWorkoutDay);
  out.workoutCards = Array.isArray(out.workoutCards) ? out.workoutCards : clone(DS.workoutCards);

const rawProjects =
  Array.isArray(src.projects) ? src.projects :
  Array.isArray(src.programs) ? src.programs :
  Array.isArray(out.projects) ? out.projects : [];

out.projects = rawProjects.map(makeProject);
delete out.programs;

  const rawMedia = Array.isArray(src.media) ? src.media
    : Array.isArray(src.books) ? src.books
    : Array.isArray(out.media) ? out.media : [];
  out.media = rawMedia.map(makeMedia);
  delete out.books;

  return out;
}
function normalizeLoggedSets(input){
  if (!Array.isArray(input)) return [];
  return input.flatMap(set => {
    const count = Math.max(1, parseInt(set.sets, 10) || 1);
    return Array.from({ length: count }, () => ({
      weight: Number.isFinite(+set.weight) ? +set.weight : null,
      reps: Number.isFinite(+set.reps) ? +set.reps : null,
      restBeforeSecs: Number.isFinite(+set.restBeforeSecs) ? +set.restBeforeSecs : null,
      createdAt: set.createdAt || null
    }));
  }).filter(set => set.weight !== null || set.reps !== null);
}

function normalizeWorkoutExercise(ex={}){
  const legacyCount = Math.max(1, parseInt(ex.sets, 10) || 1);
  let loggedSets = normalizeLoggedSets(ex.loggedSets);
  if (!loggedSets.length && (ex.weight != null || ex.reps != null)) {
    loggedSets = Array.from({ length: legacyCount }, () => ({
      weight: Number.isFinite(+ex.weight) ? +ex.weight : null,
      reps: Number.isFinite(+ex.reps) ? +ex.reps : null,
      restBeforeSecs: null,
      createdAt: null
    }));
  }
  const best = loggedSets.reduce((picked, set) => {
    if (!picked) return set;
    return (+set.weight || 0) > (+picked.weight || 0) ? set : picked;
  }, null);
  return {
    name: ex.name ?? '',
    sets: loggedSets.length || ex.sets || '',
    weight: best && Number.isFinite(+best.weight) ? +best.weight : (Number.isFinite(+ex.weight) ? +ex.weight : null),
    reps: best && Number.isFinite(+best.reps) ? +best.reps : (Number.isFinite(+ex.reps) ? +ex.reps : null),
    loggedSets,
    dbId: ex.dbId ?? ex.exercise_db_id ?? null
  };
}

function normalizeWorkoutDrafts(drafts){
  if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts)) return {};
  const out = {};
  Object.entries(drafts).forEach(([cardId, draft]) => {
    if (!draft || typeof draft !== 'object') return;
    const exercises = {};
    const rawExercises = draft.exercises && typeof draft.exercises === 'object' ? draft.exercises : {};
    Object.entries(rawExercises).forEach(([exerciseId, ex]) => {
      if (!ex || typeof ex !== 'object') return;
      exercises[exerciseId] = {
        exerciseId: ex.exerciseId ?? exerciseId,
        name: ex.name ?? '',
        sets: normalizeLoggedSets(ex.sets)
      };
    });
    out[cardId] = {
      id: draft.id ?? uid(),
      cardId: draft.cardId ?? cardId,
      title: draft.title ?? 'Workout',
      date: draft.date ?? today(),
      startedAt: draft.startedAt ?? new Date().toISOString(),
      lastSetAt: Number.isFinite(+draft.lastSetAt) ? +draft.lastSetAt : null,
      notes: draft.notes ?? '',
      exercises
    };
  });
  return out;
}

function makeWorkoutSession(s={}){
  return {
    id: s.id ?? uid(),
    date: s.date ?? today(),
    title: s.title ?? 'Workout',
    cardId: s.cardId ?? null,
    summary: s.summary ?? '',
    notes: s.notes ?? '',
    exercises: Array.isArray(s.exercises)
      ? s.exercises.map(normalizeWorkoutExercise)
      : []
  };
}
