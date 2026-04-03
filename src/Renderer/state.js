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
  goals:[],
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
weeklyReflections:{},
weightLog:[],
moodLog:{},
annualGoals:null,
appPrefs:{ showReflection: true, calorieMode: 'meal' },
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
    status:  p.status  ?? 'Active',
    deadline: p.deadline ?? '',
    notes: p.notes ?? '',
    richNotes: p.richNotes ?? '',
    notesLog: Array.isArray(p.notesLog) ? p.notesLog : [],
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
    chapterNotes: Array.isArray(m.chapterNotes) ? m.chapterNotes : [],
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
    })) : []
  };
}

function makeHabit(h={}){
  return {
    id: h.id ?? uid(),
    name: h.name ?? '',
    days: h.days && typeof h.days === 'object' ? h.days : {}
  };
}

function makeGoal(g={}){
  return {
    id: g.id ?? uid(),
    text: g.text ?? '',
    category: g.category ?? 'Personal',
    type: g.type ?? '',
    context: g.context ?? '',
    deadline: g.deadline ?? '',
    progress: Number.isFinite(+g.progress) ? Math.max(0, Math.min(100, +g.progress)) : 0,
    notes: g.notes ?? '',
    projectId: g.projectId ?? null
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
  out.prayerLog = out.prayerLog && typeof out.prayerLog === 'object' ? out.prayerLog : {};
  out.weeklyReflections = out.weeklyReflections && typeof out.weeklyReflections === 'object' ? out.weeklyReflections : {};
  out.weightLog = Array.isArray(out.weightLog) ? out.weightLog : [];
  out.moodLog = out.moodLog && typeof out.moodLog === 'object' ? out.moodLog : {};
  out.annualGoals = (out.annualGoals && typeof out.annualGoals === 'object') ? out.annualGoals : null;
  out.features = deepMerge(DS.features, (src.features && typeof src.features === 'object') ? src.features : {});
  out.appPrefs = deepMerge(DS.appPrefs, out.appPrefs || {});
  out.onboarded = typeof src.onboarded === 'boolean' ? src.onboarded : false;
  out.customStreaks = (Array.isArray(src.customStreaks) ? src.customStreaks : []).map(cs => ({
    id: cs.id ?? uid(),
    name: cs.name ?? 'Custom',
    emoji: cs.emoji ?? '🔥',
    log: (cs.log && typeof cs.log === 'object') ? cs.log : {}
  }));

  // Migrate legacy Date.now() IDs (13-digit numbers) on customFoods and foodLog entries to UUIDs
  if (Array.isArray(out.customFoods)) {
    out.customFoods = out.customFoods.map(cf => ({
      ...cf,
      id: (typeof cf.id === 'number' || (typeof cf.id === 'string' && /^\d{13}$/.test(cf.id))) ? uid() : cf.id
    }));
  }
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
  out.goals = (Array.isArray(out.goals) ? out.goals : clone(DS.goals)).map(makeGoal);
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
  
function makeWorkoutSession(s={}){
  return {
    id: s.id ?? uid(),
    date: s.date ?? today(),
    title: s.title ?? 'Workout',
    cardId: s.cardId ?? null,
    summary: s.summary ?? '',
    exercises: Array.isArray(s.exercises)
      ? s.exercises.map(ex => ({
          name: ex.name ?? '',
          sets: ex.sets ?? '',
          weight: Number.isFinite(+ex.weight) ? +ex.weight : null,
          reps: Number.isFinite(+ex.reps) ? +ex.reps : null
        }))
      : []
  };
}
  