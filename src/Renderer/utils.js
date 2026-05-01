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
const PALS=['#1c1330','#18112a','#201540','#151028','#0e0b1c'];

function today(){return new Date().toISOString().slice(0,10);}
function dStr(d){return d.toISOString().slice(0,10);}
function eid(id){return document.getElementById(id);}
function weekDays(offset){
  const d=new Date();
  if(offset) d.setDate(d.getDate()+offset*7);
  const day=d.getDay();
  const mon=new Date(d); mon.setDate(d.getDate()-(day===0?6:day-1));
  return Array.from({length:7},(_,i)=>{const nd=new Date(mon);nd.setDate(mon.getDate()+i);return dStr(nd);});
}
function calcStreak(obj){let n=0,d=new Date();while(obj[dStr(d)]){n++;d.setDate(d.getDate()-1);}return n;}

function escapeHtml(str){
  return String(str??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function escapeAttr(str){return escapeHtml(str);}

/* ── Shared data helpers ────────────────────────────────────────────────── */
/** Find first item in arr whose id coerces to match */
function findById(arr, id)       { return (arr||[]).find(x => String(x.id) === String(id)); }
/** Return arr without the item whose id coerces to match */
function filterOutById(arr, id)  { return (arr||[]).filter(x => String(x.id) !== String(id)); }
/** Capped percentage; returns 0 when total is falsy */
function calcPercent(val, total) { return total ? Math.min(100, Math.round(val / total * 100)) : 0; }
/** Safe read-only accessor for S.notesDB */
function getNotes()              { return Array.isArray(S.notesDB) ? S.notesDB : []; }
/** Active (non-hidden) habits */
function getVisibleHabits()      { return (S.habits||[]).filter(h => !h.hidden); }

/* ── HTML builder helpers ───────────────────────────────────────────────── */
/**
 * Progress bar track + scaleX fill.
 * @param {number} pct      0-100
 * @param {string} [color]  CSS color for fill (default var(--blush))
 * @param {string} [height] CSS height (default '4px')
 * @param {string} [trans]  transition duration (default '0.3s')
 */
function progressBarHtml(pct, color, height, trans) {
  const c = color  || 'var(--blush)';
  const h = height || '4px';
  const t = trans  || '0.3s';
  return `<div style="height:${h};background:var(--mid);border-radius:2px;overflow:hidden"><div style="height:100%;width:100%;background:${c};border-radius:2px;transform-origin:left;transform:scaleX(${pct/100});transition:transform ${t}"></div></div>`;
}
/**
 * Centered empty-state: ◆ diamond + uppercase label.
 * @param {string} label     Translated text to display
 * @param {number} [spanCols] grid-column span (e.g. 2 for 2-col grids)
 */
function emptyStateHtml(label, spanCols) {
  const grid = spanCols ? `grid-column:span ${spanCols};` : '';
  return `<div style="${grid}text-align:center;padding:48px 24px"><div style="font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--border-lt);margin-bottom:10px">◆</div><div style="font-size:0.66rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);font-family:'DM Mono',monospace">${label}</div></div>`;
}

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

/* Unique ID (simple UUID v4-compatible) */
function uid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}

/* Toast — duration scales with message length */
let toastT;
let _toastQueue = [];
let _toastBusy  = false;

function toast(msg, ms) {
  const duration = ms || Math.min(6000, Math.max(2500, msg.length * 55));
  _toastQueue.push({ msg, duration });
  if (!_toastBusy) _processToastQueue();
}

/* Toast with undo button — callback fires if user taps Undo within 4s */
function toastUndo(msg, undoFn, label) {
  const duration = 4500;
  _toastQueue.push({ msg, duration, undoFn, actionLabel: label || 'Undo' });
  if (!_toastBusy) _processToastQueue();
}

function _processToastQueue() {
  if (!_toastQueue.length) { _toastBusy = false; return; }
  _toastBusy = true;
  const { msg, duration, undoFn, actionLabel } = _toastQueue.shift();
  const el = eid('toast');
  if (!el) { _toastBusy = false; return; }
  el.innerHTML = escapeHtml(msg);
  if (undoFn) {
    const btn = document.createElement('button');
    btn.className = 'toast-undo';
    btn.textContent = actionLabel || 'Undo';
    btn.style.cssText = 'margin-left:12px;background:none;border:1px solid rgba(255,255,255,0.4);border-radius:4px;color:var(--cream);font-size:0.7rem;padding:1px 7px;cursor:pointer;font-family:inherit';
    btn.onclick = () => {
      clearTimeout(toastT);
      el.classList.remove('show');
      undoFn();
      setTimeout(_processToastQueue, 300);
    };
    el.appendChild(btn);
  }
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(_processToastQueue, 300);
  }, duration);
}
