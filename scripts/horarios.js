(()=>{'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key='odontologia_admin_demo_v1';
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const seed=()=>({users:[{id:1,name:'Administrador',last:'Clínica',email:'admin@ejemplo.test',role:'Administrador'},{id:2,name:'Sofía',last:'Morales',email:'sofia@ejemplo.test',role:'Cliente'},{id:3,name:'Virginia',last:'Hernández Sánchez',email:'virginia@ejemplo.test',role:'Odontólogo'}],patients:[{id:1,name:'Mateo',last:'Ramírez',birth:'2018-05-12',userId:2,notes:''}],schedules:[{doctorId:3,days:[1,2,3,4,5],start:'16:30',end:'20:00'}],appointments:[],audit:[]});
let db;try{db=JSON.parse(localStorage.getItem(key))||seed()}catch{db=seed()}
for(const k of ['users','patients','schedules','appointments','audit'])db[k]??=[];
const save=()=>localStorage.setItem(key,JSON.stringify(db)),next=a=>Math.max(0,...a.map(x=>x.id))+1;
const user=id=>db.users.find(x=>x.id===Number(id)),patient=id=>db.patients.find(x=>x.id===Number(id)),fullname=x=>x?`${x.name} ${x.last}`:'No disponible';
const fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}):'—';
const notice=t=>{$('#notice').textContent=t;setTimeout(()=>{$('#notice').textContent=''},4500)};
const log=(action,id,detail)=>db.audit.unshift({date:new Date().toLocaleString('es-MX'),action,id,detail,actor:'Administrador (demo)'});

function render(){$('#schedules').innerHTML=db.users.filter(u=>u.role==='Odontólogo').map(d=>{const s=db.schedules.find(x=>x.doctorId===d.id)||{days:[],start:'16:30',end:'20:00'};return `<div class="schedule-row"><h3>${esc(fullname(d))}</h3><form class="scheduleForm" data-id="${d.id}"><div class="checkdays">${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((n,i)=>`<label><input type="checkbox" name="day" value="${i}" ${s.days.includes(i)?'checked':''}>${n}</label>`).join('')}</div><label>Entrada<input name="start" type="time" value="${s.start}" required></label><label>Salida<input name="end" type="time" value="${s.end}" required></label><button class="primary">Guardar horario</button></form></div>`}).join('')||'<p>Primero registra un usuario con rol Odontólogo.</p>'}
document.addEventListener('submit',e=>{const f=e.target;if(!f.classList.contains('scheduleForm'))return;e.preventDefault();const v=Object.fromEntries(new FormData(f)),days=[...f.querySelectorAll('input[name=day]:checked')].map(x=>Number(x.value));if(!days.length||v.start>=v.end)return notice('Selecciona días y una jornada válida.');const did=Number(f.dataset.id),s=db.schedules.find(x=>x.doctorId===did);if(s)Object.assign(s,{days,start:v.start,end:v.end});else db.schedules.push({doctorId:did,days,start:v.start,end:v.end});save();render();notice('Horario guardado.')});render();
})();