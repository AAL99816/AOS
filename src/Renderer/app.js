'use strict';

/* ══ HERO ══ */
function uploadHero(input){
  const f = input.files[0];
  if(!f) return;

  const r = new FileReader();
  r.onload = e => {
    S.heroImg = e.target.result;

    const img = eid('heroImg');
    if (S.heroImg) {
      img.src = S.heroImg;
      img.classList.add('has-image');
    } else {
      img.src = '';
      img.classList.remove('has-image');
    }

    scheduleSave();
  };

  r.readAsDataURL(f);
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
  eid('dailyNotes').value=S.notes[today()]||'Use this space for thoughts, tasks, reflections, reminders, or a quick plan for today.';

  renderHabits();
  renderGymWeek();
  renderWorkoutCards();
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

bootApp();