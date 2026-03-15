'use strict';

/* ══ HERO ══ */
async function uploadHero(input){
  const f = input.files[0];
  if(!f) return;

  try {
    S.heroImg = await uploadAsset('hero', f);
  } catch {
    S.heroImg = await new Promise(res => {
      const r = new FileReader();
      r.onload = e => res(e.target.result);
      r.readAsDataURL(f);
    });
  }

  const img = eid('heroImg');
  if(S.heroImg){ img.src=S.heroImg; img.classList.add('has-image'); }
  else { img.src=''; img.classList.remove('has-image'); }
  scheduleSave();
}

/* ══ EXPORT / IMPORT ══ */
async function doExport(){const res=await window.api.exportData(JSON.stringify(S,null,2));if(res.ok)toast('Backup exported!');}
async function doImport(){
  const res=await window.api.importData();if(!res.ok)return;
  try{S=normalizeAppState(JSON.parse(res.data));scheduleSave();renderAll();toast('Data imported!');}
  catch(e){alert('Could not read file.');}
}

/* ══ NAV ══ */
function go(name,btn){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  eid('panel-'+name).classList.add('active');if(btn)btn.classList.add('active');
}

/* ══ TODAY SUMMARY ══ */
function calmInsight(t, habitsDone, habitsTotal, gymDone, cardioMins){
  const hour = new Date().getHours();
  const prayerLog = (S.prayerLog && S.prayerLog[t]) || {};
  const prayersDone = (typeof PRAYERS !== 'undefined') ? PRAYERS.filter(p=>!!prayerLog[p]).length : 0;

  if(prayersDone === 5 && habitsTotal && habitsDone === habitsTotal)
    return 'All prayers and all habits. A rare kind of day.';
  if(prayersDone === 5) return 'All prayers complete. A good foundation.';
  if(prayersDone > 0 && prayersDone < 5) return `${prayersDone} of 5 prayers done. ${5-prayersDone} remaining.`;

  if(habitsTotal && habitsDone === habitsTotal) return 'Every habit done. Hold the standard.';
  if(habitsTotal && habitsDone/habitsTotal >= 0.7) return `${habitsDone} of ${habitsTotal} habits — momentum is there.`;

  if(gymDone && cardioMins >= 30) return 'Gym and cardio both done. Rest well tonight.';
  if(gymDone) return 'Gym done. The work is in.';
  if(cardioMins >= 30) return `${cardioMins} min of cardio — goal met.`;

  const readH = (typeof hfind !== 'undefined') ? hfind('read','reading','book') : null;
  const readStr = readH ? calcStreak(readH.days||{}) : 0;
  if(readStr >= 7) return `${readStr}-day reading streak. Protect it.`;
  if(readStr >= 3) return `${readStr} days of reading in a row.`;

  if(habitsTotal && habitsDone === 0 && hour >= 15) return 'Nothing logged yet — the day still has room.';
  if(hour < 10) return 'Morning. The day is open.';
  if(hour < 17) return 'Afternoon. Build on what you started.';
  return 'Evening. Reflect, rest, reset.';
}

function renderTodaySummary(){
  const c = eid('todaySummary');
  if(!c) return;

  const t = today();
  const habitsDone  = (S.habits||[]).filter(h=>h.days&&h.days[t]).length;
  const habitsTotal = (S.habits||[]).length;
  const gymDone     = !!(S.gymLog&&S.gymLog[t]);
  const cardioMins  = (S.cardioLog&&S.cardioLog[t]) || 0;
  const activeMedia = (S.media||[]).find(m=>m.status==='reading');
  const activeGoals = (S.goals||[]).filter(g=>g.progress>0&&g.progress<100).length;
  const activeProjs = (S.projects||[]).filter(p=>p.status==='Active').length;
  const insight     = calmInsight(t, habitsDone, habitsTotal, gymDone, cardioMins);

  const stats = [
    {label:'Habits',  val: habitsTotal ? `${habitsDone} / ${habitsTotal}` : '—'},
    {label:'Gym',     val: gymDone ? '✓ done' : 'not logged'},
    ...(cardioMins>0 ? [{label:'Cardio', val:`${cardioMins} min`}] : []),
    ...(activeMedia   ? [{label: activeMedia.mediaType==='book' ? 'Reading' : 'Watching', val:activeMedia.title}] : []),
    ...(activeGoals>0 ? [{label:'Goals',    val:`${activeGoals} active`}] : []),
    ...(activeProjs>0 ? [{label:'Projects', val:`${activeProjs} active`}] : []),
  ];

  c.innerHTML = `
    <div class="card" style="padding:14px 20px">
      <div style="font-size:0.58rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--blush);font-family:'DM Mono',monospace;margin-bottom:12px">Today at a Glance</div>
      <div style="display:flex;gap:28px;flex-wrap:wrap">
        ${stats.map(s=>`
          <div>
            <div style="font-size:0.55rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;font-family:'DM Mono',monospace;margin-bottom:3px">${s.label}</div>
            <div style="font-size:0.82rem;color:var(--mist)">${escapeHtml(String(s.val))}</div>
          </div>`).join('')}
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:0.8rem;color:var(--muted-lt);font-style:italic;font-family:'Cormorant Garamond',serif;">${escapeHtml(insight)}</div>
    </div>
  `;
}

/* ══ RENDER ALL ══ */
function renderAll(){
  eid('appTitle').textContent = S.appTitle;
  eid('appSub').textContent = S.appSub;

  const img = eid('heroImg');
  if (S.heroImg) {
    img.src = S.heroImg;
    img.classList.add('has-image');
  } else {
    img.src = '';
    img.classList.remove('has-image');
  }

  eid('quoteText').value = S.quote.text;
  eid('quoteAuthor').value = S.quote.author;
  eid('cardioTarget').value = S.cardioTarget || '';
  eid('dailyNotes').value=S.notes[today()]||'';

  renderTodaySummary();
  renderHabits();
  renderPrayer();
  renderGymWeek();
  renderWorkoutCards();
  renderTrainingLog();
  renderGoals();
  renderProjects();
  renderBooks();
  updateCardioDisplay();
}

/* ══ INLINE TITLE EDITING ══ */
function setupInlineEdits(){
  if(inlineEditsBound) return;
  inlineEditsBound = true;
  eid('appTitle').addEventListener('input',e=>{S.appTitle=e.target.textContent;scheduleSave();});
  eid('appSub').addEventListener('input',e=>{S.appSub=e.target.textContent;scheduleSave();});
}

/* ══ INIT ══ */
async function initApp(){
  await loadFromSupabase();
  eid('dateBadge').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  setupInlineEdits();
  renderAll();
}

async function bootApp(){
  if(appBooted) return;
  appBooted = true;
  try{
    await initApp();
  }catch(e){
    appBooted = false;
    throw e;
  }
}

// Booted by auth.js after session restore or login.