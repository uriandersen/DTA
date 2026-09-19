import {sha256,makeSession,validSession,json} from "./_auth.js";
export async function onRequestGet(context){
 const kv=context.env.DTA_ACCESS;if(!kv)return json({configured:false,enabled:false,authenticated:false},503);
 const enabled=(await kv.get("enabled"))==="1";
 const authenticated=enabled&&await validSession(context.request,context.env.DTA_SESSION_SECRET);
 return json({configured:true,enabled,authenticated});
}
export async function onRequestPost(context){
 try{
  const kv=context.env.DTA_ACCESS;if(!kv)return json({error:"Access store not configured"},503);
  const b=await context.request.json();const enabled=(await kv.get("enabled"))==="1";
  if(!enabled)return json({error:"DTA is closed"},403);
  const hash=await kv.get("course_code_hash");
  if(!hash||await sha256(String(b.code||""))!==hash)return json({error:"Forkert kode"},401);
  const token=await makeSession(context.env.DTA_SESSION_SECRET);
  return json({ok:true},200,{"set-cookie":`dta_access=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`});
 }catch(e){return json({error:e.message},500)}
}
