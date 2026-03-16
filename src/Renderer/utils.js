const DAY_SHORT_EN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_SHORT_AR = ['إث','ثل','أر','خم','جم','سب','أح'];
/* DAY_SHORT is read at render time so it reflects the current language */
const DAY_SHORT = new Proxy([], {
  get(_, prop) {
    const arr = (typeof currentLang !== 'undefined' && currentLang === 'ar') ? DAY_SHORT_AR : DAY_SHORT_EN;
    return arr[prop];
  }
});
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

/* Lightweight markdown → HTML (safe — operates on already-escaped text) */
function renderMd(raw){
  if(!raw) return '';
  return escapeHtml(raw)
    /* headings */
    .replace(/^### (.+)$/gm,'<div style="font-size:0.78rem;color:var(--petal);font-weight:500;margin:7px 0 2px">$1</div>')
    .replace(/^## (.+)$/gm,'<div style="font-size:0.82rem;color:var(--petal);font-weight:500;margin:8px 0 2px">$1</div>')
    .replace(/^# (.+)$/gm,'<div style="font-size:0.88rem;color:var(--petal);font-weight:500;margin:9px 0 3px">$1</div>')
    /* inline bold / italic */
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    /* unordered lists */
    .replace(/^[-•] (.+)$/gm,'<div style="padding-left:10px;margin:1px 0">· $1</div>')
    /* line breaks */
    .replace(/\n/g,'<br>');
}

let toastT;
function toast(msg,ms=2500){
  const el=eid('toast');
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT=setTimeout(()=>el.classList.remove('show'),ms);
}
