
const GROUP=new URLSearchParams(location.search).get('group')||'1';
const KEY='dta-group-'+GROUP;
const GROUP_LABEL='Gruppe '+GROUP;
const API='/api/chat';
const RESET=new URLSearchParams(location.search).get('reset')==='1';
if(RESET){
  localStorage.removeItem(KEY);
  const clean=new URL(location.href);
  clean.searchParams.delete('reset');
  history.replaceState({},'',clean.pathname+clean.search+clean.hash);
}
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
 let materials=(st.materials||[]).map(x=>typeof x==='string'?{name:x}:x);
 function persist(){save({materials})}
 function addMaterial(item){
  const el=document.createElement('div');el.className='material';el.dataset.name=item.name;
  el.innerHTML='<div class="file"><b></b><small></small></div><button class="remove">×</button>';
  el.querySelector('b').textContent=item.name;
  el.querySelector('small').textContent=item.fileId?'Klar i DTA-kontekst':'Skal uploades igen';
  el.querySelector('.remove').onclick=()=>{materials=materials.filter(x=>x!==item);el.remove();persist()};
  addBtn.parentElement.insertBefore(el,addBtn);
 }
 async function uploadMaterial(file){
  const fd=new FormData();fd.append('file',file,file.name);
  const r=await fetch('/api/materials',{method:'POST',body:fd});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Upload-fejl');
  const item={name:file.name,fileId:data.file_id,mime:file.type||'',bytes:file.size};
  materials.push(item);addMaterial(item);persist();return item;
 }
 async function handleFiles(files,showChat=false){
  for(const f of files){
   try{
    const item=await uploadMaterial(f);
    if(showChat){const m=document.createElement('div');m.className='msg ai';m.innerHTML='<div class="upload-card">▣ &nbsp;<b></b>&nbsp; · tilføjet til Materiale og DTA-kontekst</div>';m.querySelector('b').textContent=item.name;$('.chat').appendChild(m)}
   }catch(err){toast('Kunne ikke uploade '+f.name);console.error(err)}
  }
 }
 materialInput.onchange=async e=>{await handleFiles([...e.target.files]);toast('Tilføjet til Materiale')};
 document.querySelectorAll('#materials .material').forEach(x=>x.remove());materials.forEach(addMaterial);
 const attach=$('.attach'), chatInput=document.createElement('input');chatInput.type='file';chatInput.multiple=true;chatInput.hidden=true;document.body.appendChild(chatInput);
 attach.onclick=()=>chatInput.click();
 chatInput.onchange=async e=>{await handleFiles([...e.target.files],true);toast('Upload tilføjet til Materiale')};
 function htmlBlob(artifact){return new Blob([artifact.content],{type:'text/html;charset=utf-8'})}
 function htmlName(artifact){let n=(artifact.filename||artifact.title||'prototype').toLowerCase().replace(/[^a-z0-9æøå]+/gi,'-').replace(/^-|-$/g,'');return (n||'prototype')+'.html'}
 function previewHtml(artifact){const url=URL.createObjectURL(htmlBlob(artifact));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000)}
 function downloadHtml(artifact){const url=URL.createObjectURL(htmlBlob(artifact)),a=document.createElement('a');a.href=url;a.download=htmlName(artifact);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 function renderArtifact(artifact){
  if(!artifact||!artifact.content)return;
  const out=$('#output'), isHtml=artifact.type==='html';
  out.innerHTML='<div class="artifact"><span class="badge"></span><h2></h2><div class="artifact-body"></div></div><div class="artifact-actions"><a href="#" data-act="save">GEM</a>'+(isHtml?'<a href="#" data-act="preview">ÅBN PREVIEW</a><a href="#" data-act="download">DOWNLOAD .HTML</a>':'')+'<a href="#" data-act="remove">FJERN</a></div>';
  out.querySelector('.badge').textContent=artifact.phase||'OUTPUT';
  out.querySelector('h2').textContent=artifact.title||'Output';
  const body=out.querySelector('.artifact-body');
  if(isHtml){body.innerHTML='<div class="html-artifact"><b>'+escapeHtml(htmlName(artifact))+'</b><small>Interaktiv HTML-prototype</small></div>'}
  else{body.classList.add('md');body.innerHTML=renderMarkdown(artifact.content)}
  out.querySelector('[data-act="save"]').onclick=e=>{e.preventDefault();saveArtifact(artifact)};out.querySelector('[data-act="remove"]').onclick=e=>{e.preventDefault();out.innerHTML='';toast('Fjernet fra Output')};
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
 const send=$('.send'), ta=$('textarea'), protoProgress=$('.prototype-progress'); let activeController=null;
 function updatePrototypeProgress(text,phase){
  if(!protoProgress)return;
  if(phase!=='PROTOTYPE'){protoProgress.classList.remove('on');return}
  const match=(text||'').match(/#\s*([1-7])\s*\/\s*7/i);
  if(!match){protoProgress.classList.remove('on');return}
  const step=Number(match[1]);protoProgress.classList.add('on');
  [...protoProgress.children].forEach((el,i)=>el.classList.toggle('done',i<step));
 }
 send.onclick=async()=>{
  if(activeController){activeController.abort();return}
  const v=ta.value.trim();if(!v)return;const c=$('.chat');const m=document.createElement('div');m.className='msg user';m.textContent=v;c.appendChild(m);ta.value='';const h=getState().messages||[];h.push({role:'user',text:v});save({messages:h});c.scrollTop=c.scrollHeight;
  activeController=new AbortController();send.innerHTML='<span class="stop-square">■</span>';send.setAttribute('aria-label','Stop');send.classList.add('stop');
  const wait=document.createElement('div');wait.className='msg ai';wait.innerHTML='<span class="thinking" aria-label="DTA arbejder"><i></i><i></i><i></i></span>';c.appendChild(wait);
  try{const phase=document.querySelector('.phase.active .phase-head span')?.textContent||'PROTOTYPE';const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},signal:activeController.signal,body:JSON.stringify({message:v,phase,group:GROUP,projectName:pn.textContent.trim(),history:h.slice(-20),materials:materials,savedArtifacts:(getState().saved||[]).filter((_,i)=>(getState().activeSaved||[]).includes(i))})});const data=await r.json();if(!r.ok)throw new Error(data.error||'API-fejl');updatePrototypeProgress(data.text,phase);const cleanText=phase==='PROTOTYPE'?data.text.replace(/\*\*?#\s*[1-7]\s*\/\s*7\*\*?\s*/g,'').replace(/#\s*[1-7]\s*\/\s*7\s*/g,''):data.text;wait.innerHTML='<span class="badge">'+phase+'</span><br><br><div class="md">'+renderMarkdown(cleanText)+'</div>';h.push({role:'assistant',text:data.text,phase});save({messages:h});if(data.artifact)renderArtifact(data.artifact);}
  catch(err){if(err.name==='AbortError'){wait.remove();toast('Stoppet')}else{wait.textContent='DTA kunne ikke svare endnu: '+err.message}}
  finally{activeController=null;send.innerHTML='<span class="send-arrow">➜</span>';send.setAttribute('aria-label','Send');send.classList.remove('stop');c.scrollTop=c.scrollHeight}
 };
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
