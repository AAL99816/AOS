const DAY_SHORT=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const ALL_CATS=['Academic','Career','Health','Personal','Creative'];
const PALS=['linear-gradient(145deg,#3d0f1c,#1a0a0f)','linear-gradient(145deg,#2d1019,#0f060a)','linear-gradient(145deg,#1e0d28,#0a0614)','linear-gradient(145deg,#0d1a2d,#070d18)','linear-gradient(145deg,#0d2420,#060f0d)'];

function today(){return new Date().toISOString().slice(0,10);}
function dStr(d){return d.toISOString().slice(0,10);}
function eid(id){return document.getElementById(id);}
function weekDays(){
  const d=new Date(),day=d.getDay();
  const mon=new Date(d); mon.setDate(d.getDate()-(day===0?6:day-1));
  return Array.from({length:7},(_,i)=>{const nd=new Date(mon);nd.setDate(mon.getDate()+i);return dStr(nd);});
}
function calcStreak(obj){let n=0,d=new Date();while(obj[dStr(d)]){n++;d.setDate(d.getDate()-1);}return n;}

function escapeHtml(str){
  return String(str??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function escapeAttr(str){return escapeHtml(str);}

let toastT;
function toast(msg,ms=2500){
  const el=eid('toast');
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT=setTimeout(()=>el.classList.remove('show'),ms);
}
