
const GROUP=new URLSearchParams(location.search).get('group')||'1';
const KEY='dta-group-'+GROUP;
const CLEAN_SLATE_VERSION='course-start-2026-09-23';
const CLEAN_SLATE_KEY='dta-clean-slate-version';
if(localStorage.getItem(CLEAN_SLATE_KEY)!==CLEAN_SLATE_VERSION){
  ['1','2','3'].forEach(g=>localStorage.removeItem('dta-group-'+g));
  localStorage.setItem(CLEAN_SLATE_KEY,CLEAN_SLATE_VERSION);
}
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
let syncTimer=null,hydrated=false,serverVersion=0,syncInFlight=false,syncQueued=false;
async function hydrateState(){
 try{
  const r=await fetch('/api/group-state?group='+encodeURIComponent(GROUP));
  if(r.ok){
   const d=await r.json();serverVersion=Number(d.version||d.state?.serverVersion||0);
   if(d.state&&Object.keys(d.state).length)localStorage.setItem(KEY,JSON.stringify(d.state));
  }
 }catch(e){console.warn('Server state unavailable',e)}
 hydrated=true;
}
async function pushState(){
 if(!hydrated)return;
 if(syncInFlight){syncQueued=true;return}
 syncInFlight=true;
 try{
  const local=getState();
  const r=await fetch('/api/group-state?group='+encodeURIComponent(GROUP),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({...local,baseVersion:serverVersion})});
  const d=await r.json().catch(()=>({}));
  if(r.status===409&&d.conflict){
   const remote=d.state||{};
   const localNow=getState();
   const merged={...remote,...localNow,serverVersion:Number(d.version||remote.serverVersion||0)};
   serverVersion=Number(d.version||remote.serverVersion||0);
   localStorage.setItem(KEY,JSON.stringify(merged));
   syncQueued=true;
  }else if(r.ok){
   serverVersion=Number(d.version||serverVersion+1);
   localStorage.setItem(KEY,JSON.stringify({...getState(),serverVersion,serverUpdatedAt:d.serverUpdatedAt||Date.now()}));
  }else console.warn('State sync failed',d.error||r.status);
 }catch(e){console.warn('State sync failed',e)}
 finally{
  syncInFlight=false;
  if(syncQueued){syncQueued=false;pushState()}
 }
}
function syncState(){if(!hydrated)return;clearTimeout(syncTimer);syncTimer=setTimeout(pushState,250)}
function save(p){localStorage.setItem(KEY,JSON.stringify({...getState(),...p}));syncState()}
const messageId=()=>crypto.randomUUID?crypto.randomUUID():'m-'+Date.now()+'-'+Math.random().toString(36).slice(2);
function normalizeMessages(list){return (list||[]).map(x=>({...x,id:x.id||messageId(),createdAt:Number(x.createdAt||Date.now())})).sort((a,b)=>a.createdAt-b.createdAt)}
async function syncMessages(messages){
 try{
  const r=await fetch('/api/group-messages?group='+encodeURIComponent(GROUP),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages})});
  if(r.ok){const d=await r.json();const merged=normalizeMessages(d.messages||[]);localStorage.setItem(KEY,JSON.stringify({...getState(),messages:merged}));return merged}
 }catch(e){console.warn('Message sync failed',e)}
 return normalizeMessages(getState().messages||messages);
}
window.addEventListener('DOMContentLoaded',async()=>{
 await hydrateState();
 const pn=$('.project-name'), st=getState();
 try{
  const mr=await fetch('/api/group-messages?group='+encodeURIComponent(GROUP));
  if(mr.ok){const md=await mr.json();if(Array.isArray(md.messages))localStorage.setItem(KEY,JSON.stringify({...getState(),messages:normalizeMessages(md.messages)}))}
 }catch(e){console.warn('Shared messages unavailable',e)}
 pn.textContent=(st.projectName||'Design Thinking-projekt')+' · '+GROUP_LABEL;
 pn.setAttribute('contenteditable','true');
 pn.setAttribute('spellcheck','false');
 const projectBase=()=>pn.textContent.split(' · '+GROUP_LABEL)[0].trim();
 const persistProjectName=()=>{const name=projectBase()||'Design Thinking-projekt';save({projectName:name});pn.textContent=name+' · '+GROUP_LABEL};
 pn.addEventListener('focus',()=>{pn.textContent=projectBase()});
 pn.addEventListener('blur',persistProjectName);
 pn.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();pn.blur()}});
 const addBtn=$('#materials .add');
 const materialInput=document.createElement('input');materialInput.type='file';materialInput.multiple=true;materialInput.hidden=true;document.body.appendChild(materialInput);
 addBtn.onclick=()=>materialInput.click();
 let materials=(st.materials||[]).map(x=>typeof x==='string'?{name:x}:x);
 const addPreloaded=(title,meta)=>{const pre=document.createElement('div');pre.className='material preloaded';pre.innerHTML='<div class="file"><b></b><small></small></div>';pre.querySelector('b').textContent=title;pre.querySelector('small').textContent=meta;addBtn.parentElement.insertBefore(pre,addBtn)};
 addPreloaded('CASE · Den usynlige gæld','Fælles case · pre-loadet');
 if(GROUP==='1'||GROUP==='2') addPreloaded('Line · brugerinterview','Rå empiri · pre-loadet · '+GROUP_LABEL);
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
  const item={name:file.name,fileId:data.file_id,mime:data.mime||file.type||'',bytes:file.size,kind:data.kind||'file'};
  materials.push(item);addMaterial(item);persist();return item;
 }
 async function handleFiles(files,showChat=false){
  for(const f of files){
   try{
    const item=await uploadMaterial(f);
    if(showChat){const m=document.createElement('div');m.className='msg ai';m.innerHTML='<div class="upload-card">▣ &nbsp;<b></b>&nbsp; · tilføjet til Materiale og DTA-kontekst</div>';m.querySelector('b').textContent=item.name;$('.chat').appendChild(m)}
   }catch(err){toast('Kunne ikke uploade '+f.name+': '+(err.message||'upload-fejl'));console.error(err)}
  }
 }
 materialInput.onchange=async e=>{await handleFiles([...e.target.files]);toast('Tilføjet til Materiale')};
 document.querySelectorAll('#materials .material:not(.preloaded)').forEach(x=>x.remove());materials.forEach(addMaterial);
 const attach=$('.attach'), chatInput=document.createElement('input');chatInput.type='file';chatInput.multiple=true;chatInput.hidden=true;document.body.appendChild(chatInput);
 attach.onclick=()=>chatInput.click();
 chatInput.onchange=async e=>{await handleFiles([...e.target.files],true);toast('Upload tilføjet til Materiale')};
 function htmlBlob(artifact){return new Blob([artifact.content],{type:'text/html;charset=utf-8'})}
 function htmlName(artifact){let n=(artifact.filename||artifact.title||'prototype').toLowerCase().replace(/[^a-z0-9æøå]+/gi,'-').replace(/^-|-$/g,'');return (n||'prototype')+'.html'}
 function previewHtml(artifact){const url=URL.createObjectURL(htmlBlob(artifact));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000)}
 function downloadHtml(artifact){const url=URL.createObjectURL(htmlBlob(artifact)),a=document.createElement('a');a.href=url;a.download=htmlName(artifact);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 function archiveArtifact(artifact){
  if(!artifact||!artifact.content)return;
  const st=getState(), saved=st.saved||[];
  saved.unshift({...artifact,savedAt:Date.now()});save({saved});renderSaved();
 }
 function stripDuplicateArtifactHeading(content,title){
  const lines=String(content||'').split(/\r?\n/);
  if(lines.length&&lines[0].replace(/^#{1,3}\s*/,'').trim().toLowerCase()===String(title||'').trim().toLowerCase()) lines.shift();
  return lines.join('\n').trim();
 }
 function storyboardHtml(artifact){
  const title=escapeHtml(artifact.title||'Prototype'), screens=artifact.storyboard&&Array.isArray(artifact.storyboard.screens)?artifact.storyboard.screens:[];
  const cards=screens.length?screens.map((s,i)=>'<article><div class="n">'+(i+1)+'</div><h2>'+escapeHtml(s.title||('Skærm '+(i+1)))+'</h2><p>'+escapeHtml(s.description||'')+'</p>'+(s.action?'<small>'+escapeHtml(s.action)+'</small>':'')+'</article>').join('<div class="arrow">→</div>'):'<p>Storyboard er ikke tilgængeligt for denne prototype endnu.</p>';
  return '<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Storyboard · '+title+'</title><style>body{font-family:Aptos,Arial,sans-serif;margin:0;padding:36px;background:#f3f1ed;color:#202020}h1{font-size:28px}.flow{display:flex;gap:14px;align-items:stretch;overflow:auto;padding:20px 0}article{background:#fff;border:1px solid #d4cfc7;border-radius:7px;padding:18px;min-width:220px;max-width:280px}.n{font-size:10px;font-weight:800;color:#57534e}h2{font-size:17px}p{font-size:13px;line-height:1.45}small{display:block;margin-top:14px;color:#57534e}.arrow{align-self:center;font-size:22px;color:#57534e}</style></head><body><h1>Storyboard · '+title+'</h1><div class="flow">'+cards+'</div></body></html>';
 }
 function openStoryboard(artifact){const url=URL.createObjectURL(new Blob([storyboardHtml(artifact)],{type:'text/html;charset=utf-8'}));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000)}
 function renderArtifact(artifact){
  if(!artifact||!artifact.content)return;
  const out=$('#output'), isHtml=artifact.type==='html';
  save({currentOutput:artifact});
  const isPrototypeBrief=!isHtml&&/prototypebrief/i.test((artifact.title||'')+' '+(artifact.phase||''));
  const existing=out.querySelector('.output-entry');
  if(existing){
   const old=existing._artifact;
   const revisingBrief=isPrototypeBrief&&old&&!old.type&&/prototypebrief/i.test((old.title||'')+' '+(old.phase||''));
   const revisingPrototype=isHtml&&old&&old.type==='html'&&String(old.title||'').toLowerCase()===String(artifact.title||'').toLowerCase();
   if(!revisingBrief&&!revisingPrototype) archiveArtifact(old);
   existing.remove();
  }
  const entry=document.createElement('div');entry.className='output-entry';entry._artifact=artifact;
  const hasStoryboard=isHtml&&artifact.storyboard&&Array.isArray(artifact.storyboard.screens)&&artifact.storyboard.screens.length;
  entry.innerHTML='<div class="artifact"><span class="badge"></span><h2></h2><div class="artifact-body"></div></div><div class="artifact-actions">'+(isHtml?'<a href="#" data-act="preview">ÅBN PREVIEW</a>'+(hasStoryboard?'<a href="#" data-act="storyboard">STORYBOARD</a>':'')+'<a href="#" data-act="download">DOWNLOAD .HTML</a>':'')+'<a href="#" data-act="remove">FJERN</a></div>';
  entry.querySelector('.badge').textContent=artifact.phase||'OUTPUT';entry.querySelector('h2').textContent=artifact.title||'Output';
  const body=entry.querySelector('.artifact-body');
  if(isHtml){body.innerHTML='<div class="html-artifact"><b>'+escapeHtml(htmlName(artifact))+'</b><small>Interaktiv HTML-prototype</small></div>'}
  else{body.classList.add('md');body.innerHTML=renderMarkdown(stripDuplicateArtifactHeading(artifact.content,artifact.title||''))}
  entry.querySelector('[data-act="remove"]').onclick=e=>{e.preventDefault();entry.remove();save({currentOutput:null});toast('Fjernet fra Output')};
  if(isHtml){entry.querySelector('[data-act="preview"]').onclick=e=>{e.preventDefault();previewHtml(artifact)};entry.querySelector('[data-act="download"]').onclick=e=>{e.preventDefault();downloadHtml(artifact)};if(hasStoryboard)entry.querySelector('[data-act="storyboard"]').onclick=e=>{e.preventDefault();openStoryboard(artifact)}}
  out.prepend(entry);
 }
 function renderSaved(){
  const pane=$('#saved'), saved=getState().saved||[];pane.innerHTML='';
  saved.forEach((x,i)=>{const e=document.createElement('div');e.className='saved-entry';const isHtml=x.type==='html';e.innerHTML='<div class="saved-item"><b></b><small></small></div><div class="saved-actions"><a href="#" data-act="context">BRUG SOM KONTEKST</a>'+(isHtml?'<a href="#" data-act="preview">ÅBN PREVIEW</a><a href="#" data-act="download">DOWNLOAD .HTML</a>':'')+'</div>';e.querySelector('b').textContent=x.title||'Output';e.querySelector('small').textContent=isHtml?htmlName(x):(x.phase||'');e.querySelector('[data-act="context"]').onclick=ev=>{ev.preventDefault();const st=getState();const active=st.activeSaved||[];if(!active.includes(i))active.push(i);save({activeSaved:active});toast('Bruges som kontekst')};if(isHtml){e.querySelector('[data-act="preview"]').onclick=ev=>{ev.preventDefault();previewHtml(x)};e.querySelector('[data-act="download"]').onclick=ev=>{ev.preventDefault();downloadHtml(x)}}pane.appendChild(e)});
 }
 renderSaved();
 if(st.currentOutput)renderArtifact(st.currentOutput);
 const send=$('.send'), ta=$('textarea'), protoProgress=$('.prototype-progress'); let activeController=null;
 function updatePrototypeProgress(text,phase){
  if(!protoProgress)return;
  if(phase!=='PROTOTYPE'){protoProgress.classList.remove('on');return}
  const match=(text||'').match(/#\s*(\d+)\s*\/\s*(\d+)/i);
  if(!match){protoProgress.classList.remove('on');return}
  const step=Number(match[1]),total=Number(match[2]);
  if(!total||step<1||step>total){protoProgress.classList.remove('on');return}
  protoProgress.innerHTML=Array.from({length:total},()=>'<span></span>').join('');
  protoProgress.classList.add('on');
  [...protoProgress.children].forEach((el,i)=>el.classList.toggle('done',i<step));
 }
 send.onclick=async()=>{
  if(activeController){activeController.abort();return}
  const v=ta.value.trim();if(!v)return;const c=$('.chat');const m=document.createElement('div');m.className='msg user';m.textContent=v;c.appendChild(m);ta.value='';let h=normalizeMessages(getState().messages||[]);const userMessage={id:messageId(),role:'user',text:v,createdAt:Date.now()};h.push(userMessage);save({messages:h});h=await syncMessages([userMessage]);c.scrollTop=c.scrollHeight;
  activeController=new AbortController();send.innerHTML='<span class="stop-square">■</span>';send.setAttribute('aria-label','Stop');send.classList.add('stop');
  const wait=document.createElement('div');wait.className='msg ai';wait.innerHTML='<span class="thinking" aria-label="DTA arbejder"><i></i><i></i><i></i></span>';c.appendChild(wait);
  try{const phase=document.querySelector('.phase.active .phase-head span')?.textContent||'PROTOTYPE';const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},signal:activeController.signal,body:JSON.stringify({message:v,phase,group:GROUP,projectName:pn.textContent.trim(),history:h.slice(-20),materials:materials,savedArtifacts:(getState().saved||[]).filter((_,i)=>(getState().activeSaved||[]).includes(i))})});const data=await r.json();if(!r.ok)throw new Error(data.error||'API-fejl');updatePrototypeProgress(data.text,phase);const cleanText=phase==='PROTOTYPE'?data.text.replace(/\*\*?#\s*\d+\s*\/\s*\d+\*\*?\s*/g,'').replace(/#\s*\d+\s*\/\s*\d+\s*/g,''):data.text;wait.innerHTML='<span class="badge">'+phase+'</span><br><br><div class="md">'+renderMarkdown(cleanText)+'</div>';const assistantMessage={id:messageId(),role:'assistant',text:data.text,phase,createdAt:Date.now()};h.push(assistantMessage);save({messages:h});h=await syncMessages([assistantMessage]);if(data.artifact)renderArtifact(data.artifact);}
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
