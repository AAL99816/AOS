'use strict';

const PRAYERS = ['fajr','dhuhr','asr','maghrib','isha'];
/* PRAYER_LABEL resolves translations at call time */
const PRAYER_LABEL = new Proxy({}, {
  get(_, key) {
    if (typeof t === 'function' && PRAYERS.includes(key)) return t(key);
    return {fajr:'Fajr',dhuhr:'Dhuhr',asr:'Asr',maghrib:'Maghrib',isha:'Isha'}[key] || key;
  }
});

function togglePrayer(name){
  const d=today();
  if(!S.prayerLog) S.prayerLog={};
  if(!S.prayerLog[d]) S.prayerLog[d]={};
  S.prayerLog[d][name]=!S.prayerLog[d][name];
  scheduleSave();
  renderPrayer();
  if(typeof renderTodaySummary==='function') renderTodaySummary();
}

function prayerStreakFor(name){
  if(!S.prayerLog) return 0;
  const days={};
  Object.entries(S.prayerLog).forEach(([d,p])=>{if(p[name]) days[d]=true;});
  return calcStreak(days);
}

function renderPrayer(){
  const c=eid('prayerRow');
  if(!c) return;
  const todayStr=today(), log=(S.prayerLog&&S.prayerLog[todayStr])||{};
  const allDone=PRAYERS.every(p=>!!log[p]);
  c.innerHTML=`
    <div class="prayer-grid">
      ${PRAYERS.map(p=>{
        const done=!!log[p], str=prayerStreakFor(p);
        return `<div class="prayer-slot${done?' done':''}" onclick="togglePrayer('${p}')">
          <div class="prayer-name">${PRAYER_LABEL[p]}</div>
          <div class="prayer-dot">${done?'✓':''}</div>
          <div class="prayer-streak">${str>0?str+'d':''}</div>
        </div>`;
      }).join('')}
    </div>
    ${allDone?`<div style="text-align:center;margin-top:12px;font-size:0.68rem;color:var(--gold-lt);font-family:'Cormorant Garamond',serif;font-style:italic;letter-spacing:0.04em;">${t('all_five_complete')}</div>`:''}
  `;
}

function renderHabits(){
  const week=weekDays(),c=eid('habitList');c.innerHTML='';
  S.habits.forEach(h=>{
    const str=calcStreak(h.days||{});
    const row=document.createElement('div');row.className='habit-row';
    row.innerHTML=`
      <input class="editable habit-name-inp" value="${h.name}" onchange="updateHabitName(${h.id},this.value)" title="Click to rename">
      <div class="habit-days">
        ${week.map((d,i)=>{
          const on=!!(h.days&&h.days[d]),isTod=d===today();
          return `<div class="day-dot ${on?(isTod?'today-on':'on'):''}" title="${d}" onclick="toggleH(${h.id},'${d}')">${DAY_SHORT[i].slice(0,2)}</div>`;
        }).join('')}
      </div>
      <div class="habit-streak-n">${str>0?str+'d':''}</div>
      <button class="habit-del" onclick="delHabit(${h.id})">✕</button>`;
    c.appendChild(row);
  });
  updateStreaks();
  renderPrayer();
  if(typeof renderTodaySummary==='function') renderTodaySummary();
}

function updateHabitName(id,val){
  const h=S.habits.find(h=>h.id===id);
  if(h){h.name=val;scheduleSave();updateStreaks();}
}

function toggleH(id,date){
  const h=S.habits.find(h=>h.id===id);
  if(!h)return;
  if(!h.days)h.days={};
  h.days[date]=!h.days[date];

  /* sync gym log when toggling a gym-type habit */
  if(hmatch(h,'gym','lift','workout','training','weights')){
    if(!S.gymLog) S.gymLog={};
    S.gymLog[date]=!!h.days[date];
    if(typeof renderGymWeek==='function') renderGymWeek();
  }

  scheduleSave();
  renderHabits();
}

function delHabit(id){
  if(!confirm(t('remove_habit')))return;
  S.habits=S.habits.filter(h=>h.id!==id);
  scheduleSave();
  renderHabits();
}

function addHabit(){
  const name=eid('newHabitName').value.trim();
  if(!name)return;
  S.habits.push(makeHabit({
    id: Date.now(),
    name
  }));
  eid('newHabitName').value='';
  scheduleSave();
  renderHabits();
  toast(`"${name}" ${t('added')}`);
}

function hnorm(v){return String(v||'').toLowerCase().trim();}
function hmatch(h,...keys){
  const n=hnorm(h&&h.name);
  return keys.some(k=>n.includes(k));
}
function hfind(...keys){return S.habits.find(h=>hmatch(h,...keys));}
function streakOf(h){return h?calcStreak(h.days||{}):0;}

function prayerStreak(){
  if(S.prayerLog && Object.keys(S.prayerLog).length){
    const days={};
    Object.entries(S.prayerLog).forEach(([d,p])=>{
      if(PRAYERS.every(name=>p[name])) days[d]=true;
    });
    const s=calcStreak(days);
    if(s>0) return s;
  }
  const prayers=PRAYERS.map(k=>hfind(k)).filter(Boolean);
  if(prayers.length===5){
    const days={},all=[...new Set(prayers.flatMap(h=>Object.keys(h.days||{})))];
    all.forEach(d=>{if(prayers.every(h=>h.days&&h.days[d]))days[d]=true;});
    return calcStreak(days);
  }
  return streakOf(hfind('prayer','salah','salat','صلاة','صلاه'));
}

/* Schedule-aware gym streak: rest days are skipped, only missed training days break it.
   If today is a training day but not yet logged, start counting from yesterday so the
   streak reflects what you've built rather than showing 0 all morning. */
function calcGymStreak(){
  if(!S.gymLog) return 0;
  let d=new Date();

  // If today is an unlogged training day, start from yesterday
  const todayStr=dStr(d);
  const todayIdx=d.getDay()===0?6:d.getDay()-1;
  const todayWd=S.workout && S.workout[todayIdx];
  if(!(todayWd && todayWd.rest) && !S.gymLog[todayStr]){
    d.setDate(d.getDate()-1);
  }

  let n=0, guard=365;
  while(guard-->0){
    const dateStr=dStr(d);
    const idx=d.getDay()===0?6:d.getDay()-1;
    const wd=S.workout && S.workout[idx];
    if(wd && wd.rest){ d.setDate(d.getDate()-1); continue; }
    if(S.gymLog[dateStr]){ n++; d.setDate(d.getDate()-1); }
    else break;
  }
  return n;
}

const STREAK_DEFS=[
  {key:'prayer',labelKey:'prayer',val:()=>prayerStreak()},
  {key:'cardio',labelKey:'cardio',val:()=>streakOf(hfind('cardio','walk','run','jog','cycle'))},
  {key:'gym',labelKey:'gym_schedule',val:()=>calcGymStreak()},
  {key:'read',labelKey:'reading_streak',val:()=>streakOf(hfind('read','reading','book'))},
  {key:'study',labelKey:'study',val:()=>streakOf(hfind('study','deep work','revision','research'))}
];

function updateStreaks(){
  const p=S.streakPrefs||{},c=eid('streakList'); if(!c)return;
  c.innerHTML='';
  STREAK_DEFS.forEach(s=>{
    if(p[s.key]===false)return;
    const row=document.createElement('div');
    row.className='streak-row';
    row.innerHTML=`<span class="streak-lbl">${typeof t==='function'?t(s.labelKey):(s.labelKey)}</span><span class="streak-val">${s.val()}d</span>`;
    c.appendChild(row);
  });
  // Custom streaks
  (S.customStreaks||[]).forEach(cs=>{
    const str=calcStreak(cs.log||{});
    const todayStr=today();
    const done=!!(cs.log&&cs.log[todayStr]);
    const row=document.createElement('div');
    row.className='streak-row';
    row.innerHTML=`
      <span class="streak-lbl">${escapeHtml(cs.emoji||'')} ${escapeHtml(cs.name||'')}</span>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="streak-val">${str}d</span>
        <button class="btn btn-g" style="padding:2px 8px;font-size:0.6rem" onclick="logCustomStreak(${cs.id},'${todayStr}')">${done?'✓ Done':'Log'}</button>
        <input type="date" title="Log a past date" style="font-size:0.6rem;background:var(--panel);color:var(--cream);border:1px solid var(--border);border-radius:var(--r-sm);padding:2px 4px;max-width:110px" onchange="if(this.value){logCustomStreak(${cs.id},this.value);this.value=''}">
      </div>`;
    c.appendChild(row);
  });
}

function addCustomStreak(){
  const name=(eid('newStreakName').value||'').trim();
  if(!name)return;
  const emoji=(eid('newStreakEmoji').value||'').trim()||'🔥';
  if(!Array.isArray(S.customStreaks))S.customStreaks=[];
  S.customStreaks.push({id:Date.now(),name,emoji,log:{}});
  eid('newStreakName').value='';
  eid('newStreakEmoji').value='';
  scheduleSave();
  updateStreaks();
  renderCustomStreakList();
}

function deleteCustomStreak(id){
  S.customStreaks=(S.customStreaks||[]).filter(cs=>cs.id!==id);
  scheduleSave();
  updateStreaks();
  renderCustomStreakList();
}

function logCustomStreak(id,dateStr){
  const cs=(S.customStreaks||[]).find(cs=>cs.id===id);
  if(!cs)return;
  if(!cs.log)cs.log={};
  cs.log[dateStr]=!cs.log[dateStr];
  if(!cs.log[dateStr])delete cs.log[dateStr];
  scheduleSave();
  updateStreaks();
}

function renderCustomStreakList(){
  const c=eid('customStreakList');if(!c)return;
  const list=S.customStreaks||[];
  if(!list.length){
    c.innerHTML=`<div style="font-size:0.68rem;color:var(--muted);padding:6px 0">No custom streaks yet.</div>`;
    return;
  }
  c.innerHTML=list.map(cs=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:0.82rem">${escapeHtml(cs.emoji||'')} ${escapeHtml(cs.name||'')}</span>
      <button class="habit-del" style="opacity:0.5" onclick="deleteCustomStreak(${cs.id})">✕</button>
    </div>`).join('');
}

function openStreaks(){
  const p=S.streakPrefs||{};
  eid('st-prayer').checked=!!p.prayer;
  eid('st-cardio').checked=p.cardio!==false;
  eid('st-gym').checked=p.gym!==false;
  eid('st-read').checked=p.read!==false;
  eid('st-study').checked=p.study!==false;
  renderCustomStreakList();
  openModal('mStreaks');
}

function toggleStreakOption(k,v){
  if(!S.streakPrefs)S.streakPrefs={prayer:false,cardio:true,gym:true,read:true,study:true};
  S.streakPrefs[k]=v;
  scheduleSave();
  updateStreaks();
}
