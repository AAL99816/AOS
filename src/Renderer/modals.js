/* ══ MODALS ══ */
function openModal(id){eid(id).classList.add('open');}
function closeModal(id){eid(id).classList.remove('open');}
document.querySelectorAll('.modal-bg').forEach(bg=>{bg.addEventListener('click',e=>{if(e.target===bg)bg.classList.remove('open');});});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.modal-bg.open').forEach(m=>m.classList.remove('open'));});
