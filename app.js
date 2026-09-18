
const GROUP=new URLSearchParams(location.search).get('group')||'1';
const KEY='dta-group-'+GROUP;
const GROUP_LABEL='Gruppe '+GROUP;
const API='/api/chat';
const $=s=>document.querySelector(s);
function toast(t){let e=$('#toast');if(!e){e=document.createElement('div');e.id='toast';e.style.cssText='position:fixed;right:24px;bottom:24px;background:#202020;color:#fff;padding:10px 14px;border-radius:5px;font:12px Aptos,Arial;z-index:99';document.body.appendChild(e)}e.textContent=t;setTimeout(()=>e.remove(),1400)}
function getState(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
function save(p){localStorage.setItem(KEY,JSON.stringify({...getState(),...p}))}
window.addEventListener('DOMContentLoaded',()=>{
 const pn=$('.project-name'), st=getState();
 pn.textContent=(st.projectName||'Design Thinking-projekt')+' · '+GROUP_LABEL;
 pn.removeAttribute('contenteditable');
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
 function htmlBlob(artifact){return new Blob([artifact.content],{type:'text/html;charset=utf-8'})}
 function htmlName(artifact){let n=(artifact.filename||artifact.title||'prototype').toLowerCase().replace(/[^a-z0-9æøå]+/gi,'-').replace(/^-|-$/g,'');return (n||'prototype')+'.html'}
 function previewHtml(artifact){const url=URL.createObjectURL(htmlBlob(artifact));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000)}
 function downloadHtml(artifact){const url=URL.createObjectURL(htmlBlob(artifact)),a=document.createElement('a');a.href=url;a.download=htmlName(artifact);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 function renderArtifact(artifact){
  if(!artifact||!artifact.content)return;
  const out=$('#output'), isHtml=artifact.type==='html';
  out.innerHTML='<div class="artifact"><span class="badge"></span><h2></h2><div class="artifact-body"></div></div><div class="artifact-actions"><a href="#" data-act="save">GEM</a>'+(isHtml?'<a href="#" data-act="preview">ÅBN PREVIEW</a><a href="#" data-act="download">DOWNLOAD .HTML</a>':'')+'</div>';
  out.querySelector('.badge').textContent=artifact.phase||'OUTPUT';
  out.querySelector('h2').textContent=artifact.title||'Output';
  const body=out.querySelector('.artifact-body');
  if(isHtml){body.innerHTML='<div class="html-artifact"><b>'+escapeHtml(htmlName(artifact))+'</b><small>Interaktiv HTML-prototype</small></div>'}
  else{body.classList.add('md');body.innerHTML=renderMarkdown(artifact.content)}
  out.querySelector('[data-act="save"]').onclick=e=>{e.preventDefault();saveArtifact(artifact)};
  if(isHtml){out.querySelector('[data-act="preview"]').onclick=e=>{e.preventDefault();previewHtml(artifact)};out.querySelector('[data-act="download"]').onclick=e=>{e.preventDefault();downloadHtml(artifact)}}
 }
 function saveArtifact(artifact){
  const st=getState(), saved=st.saved||[];
  saved.unshift({...artifact,savedAt:Date.now()});save({saved});renderSaved();toast('Gemt');
 }
 function renderSaved(){
  const pane=$('#saved'), saved=getState().saved||[];pane.innerHTML='';
  saved.forEach((x,i)=>{const e=document.createElement('div');e.className='saved-entry';const isHtml=x.type==='html';e.innerHTML='<div class="saved-item"><b></b><small></small></div><div class="saved-actions"><a href="#" data-act="context">BRUG SOM KONTEKST</a>'+(isHtml?'<a href="#" data-act="preview">ÅBN PREVIEW</a><a href="#" data-act="download">DOWNLOAD .HTML</a>':'')+'</div>';e.querySelector('b').textContent=x.title||'Output';e.querySelector('small').textContent=isHtml?htmlName(x):(x.phase||'');e.querySelector('[data-act="context"]').onclick=ev=>{ev.preventDefault();const st=getState();const active=st.activeSaved||[];if(!active.includes(i))active.push(i);save({activeSaved:active});toast('Bruges som kontekst')};if(isHtml){e.querySelector('[data-act="preview"]').onclick=ev=>{ev.preventDefault();previewHtml(x)};e.querySelector('[data-act="download"]').onclick=ev=>{ev.preventDefault();downloadHtml(x)}}pane.appendChild(e)});
 }
 renderSaved();
 const send=$('.send'), ta=$('textarea');
 send.onclick=async()=>{const v=ta.value.trim();if(!v)return;const c=$('.chat');const m=document.createElement('div');m.className='msg user';m.textContent=v;c.appendChild(m);ta.value='';const h=getState().messages||[];h.push({role:'user',text:v});save({messages:h});c.scrollTop=c.scrollHeight;send.disabled=true;const wait=document.createElement('div');wait.className='msg ai';wait.innerHTML='<span class="thinking" aria-label="DTA arbejder"><i></i><i></i><i></i></span>';c.appendChild(wait);try{const phase=document.querySelector('.phase.active .phase-head span')?.textContent||'PROTOTYPE';const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:v,phase,group:GROUP,projectName:pn.textContent.trim(),history:h.slice(-20),materials:getState().materials||[],savedArtifacts:(getState().saved||[]).filter((_,i)=>(getState().activeSaved||[]).includes(i))})});const data=await r.json();if(!r.ok)throw new Error(data.error||'API-fejl');wait.innerHTML='<span class="badge">'+phase+'</span><br><br><div class="md">'+renderMarkdown(data.text)+'</div>';h.push({role:'assistant',text:data.text,phase});save({messages:h});if(data.artifact)renderArtifact(data.artifact);}catch(err){wait.textContent='DTA kunne ikke svare endnu: '+err.message}finally{send.disabled=false;c.scrollTop=c.scrollHeight}};
 function escapeHtml(v){const d=document.createElement('div');d.textContent=v;return d.innerHTML}
 function renderMarkdown(v){
  let x=escapeHtml(v||'').replace(/\r\n?/g,'\n');
  x=x.replace(/^### (.+)$/gm,'<h3>$1</h3>')
     .replace(/^## (.+)$/gm,'<h2>$1</h2>')
     .replace(/^# (.+)$/gm,'<h1>$1</h1>')
     .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
     .replace(/\*(.+?)\*/g,'<em>$1</em>')
     .replace(/`([^`]+)`/g,'<code>$1</code>');
  const lines=x.split('\n'); let out='',list=null;
  const close=()=>{if(list){out+='</'+list+'>';list=null}};
  for(const line of lines){
   let m=line.match(/^[-*] (.+)$/); if(m){if(list!=='ul'){close();out+='<ul>';list='ul'}out+='<li>'+m[1]+'</li>';continue}
   m=line.match(/^\d+\. (.+)$/); if(m){if(list!=='ol'){close();out+='<ol>';list='ol'}out+='<li>'+m[1]+'</li>';continue}
   close();
   if(/^<h[1-3]>/.test(line)) out+=line;
   else if(line.trim()) out+='<p>'+line+'</p>';
  }
  close(); return out;
 }
 ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send.click()}});
});
