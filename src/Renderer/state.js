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
    {type:'Upper',rest:false},{type:'Lower',rest:false},{type:'Full Body',rest:false},
    {type:'Rest',rest:true},{type:'Upper',rest:false},{type:'Lower',rest:false},{type:'Full Body',rest:false},
  ],
  workoutCards:[
    {id:1,title:'Upper Body',subtitle:'Push & Pull',exercises:[
      {id:101,name:'Bench Press',sets:'4×8'},{id:102,name:'Barbell Row',sets:'4×8'},
      {id:103,name:'Overhead Press',sets:'3×10'},{id:104,name:'Lat Pulldown',sets:'3×10'},
      {id:105,name:'Dumbbell Curl',sets:'3×12'},{id:106,name:'Tricep Pushdown',sets:'3×12'},
      {id:107,name:'Face Pull',sets:'3×15'},
    ]},
    {id:2,title:'Lower Body',subtitle:'Strength',exercises:[
      {id:201,name:'Squat',sets:'4×6'},{id:202,name:'Romanian Deadlift',sets:'3×10'},
      {id:203,name:'Leg Press',sets:'3×12'},{id:204,name:'Leg Curl',sets:'3×12'},
      {id:205,name:'Leg Extension',sets:'3×12'},{id:206,name:'Calf Raise',sets:'4×15'},
    ]},
    {id:3,title:'Full Body',subtitle:'Compound',exercises:[
      {id:301,name:'Deadlift',sets:'4×5'},{id:302,name:'Incline Press',sets:'3×10'},
      {id:303,name:'Weighted Pull-up',sets:'3×8'},{id:304,name:'Bulgarian Split Squat',sets:'3×10'},
      {id:305,name:'Cable Row',sets:'3×12'},{id:306,name:'Ab Rollout',sets:'3×10'},
    ]},
  ],
goals:[
  {id:1,text:'Customize this dashboard into your own Life OS',category:'Personal',deadline:'',progress:15,notes:'Edit titles, add sections, and shape the system around your real life.'},
  {id:2,text:'Set up your main recurring habits',category:'Health',deadline:'',progress:10,notes:'Prayer, gym, study, reading, sleep, walking — whatever matters most.'}
],  
projects:[
  {id:1,title:'Graduate Applications',type:'Academic Track',context:'Fall 2026',status:'Active',deadline:'',notes:'Use this for projects, life tracks, applications, business areas, or any long-term focus area.'},
  {id:2,title:'Aqarna',type:'Business / Product',context:'Kuwait',status:'Active',deadline:'',notes:'Rename, repurpose, or remove this card. Projects can represent anything ongoing in your life.'}
],
media:[
  {id:1,mediaType:'book',title:'1984',author:'George Orwell',status:'unread',rating:null,notes:'',coverUrl:'',currentPage:0,totalPages:0,chapterNotes:[]},
  {id:2,mediaType:'book',title:'The Blade Itself',author:'Joe Abercrombie',status:'unread',rating:null,notes:'',coverUrl:'',currentPage:0,totalPages:0,chapterNotes:[]},
  {id:3,mediaType:'book',title:'The World as Will and Idea',author:'Arthur Schopenhauer',status:'unread',rating:null,notes:'',coverUrl:'',currentPage:0,totalPages:0,chapterNotes:[]},
  {id:4,mediaType:'book',title:'Essays of Arthur Schopenhauer',author:'Arthur Schopenhauer',status:'unread',rating:null,notes:'',coverUrl:'',currentPage:0,totalPages:0,chapterNotes:[]},
  {id:5,mediaType:'book',title:'Critique of Pure & Practical Reason',author:'Immanuel Kant',status:'unread',rating:null,notes:'',coverUrl:'',currentPage:0,totalPages:0,chapterNotes:[]},
  {id:6,mediaType:'book',title:'Fundamental Principles of the Metaphysic of Morals',author:'Immanuel Kant',status:'unread',rating:null,notes:'',coverUrl:'',currentPage:0,totalPages:0,chapterNotes:[]},
  {id:7,mediaType:'book',title:'Crime and Punishment',author:'Fyodor Dostoevsky',status:'unread',rating:null,notes:'',coverUrl:'',currentPage:0,totalPages:0,chapterNotes:[]},
  {id:8,mediaType:'book',title:'The Prince',author:'Niccolo Machiavelli',status:'unread',rating:null,notes:'',coverUrl:'',currentPage:0,totalPages:0,chapterNotes:[]},
  {id:9,mediaType:'book',title:'Moby Dick',author:'Herman Melville',status:'unread',rating:null,notes:'',coverUrl:'',currentPage:0,totalPages:0,chapterNotes:[]},
  {id:10,mediaType:'book',title:'Animal Farm',author:'George Orwell',status:'unread',rating:null,notes:'',coverUrl:'',currentPage:0,totalPages:0,chapterNotes:[]},
  {id:11,mediaType:'book',title:'The Brothers Karamazov',author:'Fyodor Dostoevsky',status:'unread',rating:null,notes:'',coverUrl:'',currentPage:0,totalPages:0,chapterNotes:[]},
],
gymLog:{},
cardioLog:{},
prayerLog:{},
notes:{},
workoutHistory:[],
exerciseHistory:{},
weeklyReflections:{},
onboarded:false

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

function makeProject(p={}){
  return {
    id: p.id ?? Date.now() + Math.random(),
    title:   p.title   ?? p.school   ?? '',
    type:    p.type    ?? p.name     ?? '',
    context: p.context ?? p.location ?? '',
    status:  p.status  ?? 'Active',
    deadline: p.deadline ?? '',
    notes: p.notes ?? ''
  };
}

function makeMedia(m={}){
  return {
    id: m.id ?? Date.now() + Math.random(),
    mediaType: m.mediaType ?? 'book',
    title: m.title ?? '',
    author: m.author ?? '',
    status: m.status ?? 'unread',
    rating: m.rating ?? null,
    notes: m.notes ?? '',
    coverUrl: m.coverUrl ?? '',
    currentPage: Number.isFinite(+m.currentPage) ? +m.currentPage : 0,
    totalPages: Number.isFinite(+m.totalPages) ? +m.totalPages : 0,
    chapterNotes: Array.isArray(m.chapterNotes) ? m.chapterNotes : [],
    finishedOn: m.finishedOn || null
  };
}

function makeHabit(h={}){
  return {
    id: h.id ?? Date.now() + Math.random(),
    name: h.name ?? '',
    days: h.days && typeof h.days === 'object' ? h.days : {}
  };
}

function makeGoal(g={}){
  return {
    id: g.id ?? Date.now() + Math.random(),
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
  out.workoutHistory = (Array.isArray(out.workoutHistory) ? out.workoutHistory : []).map(makeWorkoutSession);
  out.exerciseHistory = out.exerciseHistory && typeof out.exerciseHistory === 'object' ? out.exerciseHistory : {};
  out.prayerLog = out.prayerLog && typeof out.prayerLog === 'object' ? out.prayerLog : {};
  out.weeklyReflections = out.weeklyReflections && typeof out.weeklyReflections === 'object' ? out.weeklyReflections : {};
  out.onboarded = typeof src.onboarded === 'boolean' ? src.onboarded : false;

  out.habits = (Array.isArray(out.habits) ? out.habits : clone(DS.habits)).map(makeHabit);
  out.goals = (Array.isArray(out.goals) ? out.goals : clone(DS.goals)).map(makeGoal);
  out.workout = Array.isArray(out.workout) ? out.workout : clone(DS.workout);
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
    id: s.id ?? Date.now() + Math.random(),
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
  