
const KEY='dta-project-v1';
const API='/api/chat';
const $=s=>document.querySelector(s);
function toast(t){let e=$('#toast');if(!e){e=document.createElement('div');e.id='toast';e.style.cssText='position:fixed;right:24px;bottom:24px;background:#202020;color:#fff;padding:10px 14px;border-radius:5px;font:12px Aptos,Arial;z-index:99';document.body.appendChild(e)}e.textContent=t;setTimeout(()=>e.remove(),1400)}
function getState(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
function save(p){localStorage.setItem(KEY,JSON.stringify({...getState(),...p}))}
window.addEventListener('DOMContentLoaded',()=>{
 const pn=$('.project-name'), st=getState();
 if(st.projectName)pn.textContent=st.projectName;
 pn.addEventListener('blur',()=>{save({projectName:pn.textContent.trim()});toast('Projektnavn gemt')});
 const addBtn=$('#materials .add');
 const materialInput=document.createElement('input');materialInput.type='file';materialInput.multiple=true;materialInput.hidden=true;document.body.appendChild(materialInput);
 addBtn.onclick=()=>materialInput.click();
 function persist(){save({materials:[...document.querySelectorAll('#materials .material b')].map(x=>x.textContent)})}
 function addMaterial(name){
  const el=document.createElement('div');el.className='material';
  el.innerHTML='<div class="file"><b></b><small>Projektmateriale</small></div><button class="remove">×</button>';
  el.querySelector('b').textContent=name; el.querySelector('.remove').onclick=()=>{el.remove();persist()};
  addBtn.parentElement.insertBefore(el,addBtn);
 }
 materialInput.onchange=e=>{[...e.target.files].forEach(f=>addMaterial(f.name));persist();toast('Tilføjet til Materiale')};
 if(st.materials){document.querySelectorAll('#materials .material').forEach(x=>x.remove());st.materials.forEach(addMaterial)}
 document.querySelectorAll('#materials .remove').forEach(b=>b.onclick=()=>{b.parentElement.remove();persist()});
 const attach=$('.attach'), chatInput=document.createElement('input');chatInput.type='file';chatInput.multiple=true;chatInput.hidden=true;document.body.appendChild(chatInput);
 attach.onclick=()=>chatInput.click();
 chatInput.onchange=e=>{[...e.target.files].forEach(f=>{addMaterial(f.name);const m=document.createElement('div');m.className='msg ai';m.innerHTML='<div class="upload-card">▣ &nbsp;<b></b>&nbsp; · tilføjet til Materiale</div>';m.querySelector('b').textContent=f.name;$('.chat').appendChild(m)});persist();toast('Upload tilføjet til Materiale')};
 const send=$('.send'), ta=$('textarea');
 send.onclick=async()=>{const v=ta.value.trim();if(!v)return;const c=$('.chat');const m=document.createElement('div');m.className='msg user';m.textContent=v;c.appendChild(m);ta.value='';const h=getState().messages||[];h.push({role:'user',text:v});save({messages:h});c.scrollTop=c.scrollHeight;send.disabled=true;const wait=document.createElement('div');wait.className='msg ai';wait.textContent='…';c.appendChild(wait);try{const phase=document.querySelector('.phase.active .phase-head span')?.textContent||'PROTOTYPE';const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:v,phase,projectName:pn.textContent.trim(),history:h.slice(-20),materials:getState().materials||[]})});const data=await r.json();if(!r.ok)throw new Error(data.error||'API-fejl');wait.innerHTML='<span class="badge">'+phase+'</span><br><br>'+escapeHtml(data.text).replace(/\n/g,'<br>');h.push({role:'assistant',text:data.text,phase});save({messages:h});}catch(err){wait.textContent='DTA kunne ikke svare endnu: '+err.message}finally{send.disabled=false;c.scrollTop=c.scrollHeight}};
 function escapeHtml(v){const d=document.createElement('div');d.textContent=v;return d.innerHTML}
 ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send.click()}});
});
