import {sha256,json} from "./_auth.js";
async function adminOK(request,env){
 const raw=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!raw)return false;
 const kv=env.DTA_ACCESS;
 const stored=kv?await kv.get("admin_key_hash"):null;
 if(stored)return (await sha256(raw))===stored;
 return !!env.DTA_ADMIN_KEY&&raw===env.DTA_ADMIN_KEY;
}
export async function onRequestGet(context){
 if(!(await adminOK(context.request,context.env)))return json({error:"Unauthorized"},401);
 const kv=context.env.DTA_ACCESS;if(!kv)return json({error:"Access store not configured"},503);
 return json({enabled:(await kv.get("enabled"))==="1",passwordManaged:!!(await kv.get("admin_key_hash"))});
}
export async function onRequestPost(context){
 const kv=context.env.DTA_ACCESS;if(!kv)return json({error:"Access store not configured"},503);
 const b=await context.request.json();
 if(b.closeOnly===true&&b.enabled===false){await kv.put("enabled","0");return json({ok:true,enabled:false})}
 if(!(await adminOK(context.request,context.env)))return json({error:"Unauthorized"},401);
 if(typeof b.enabled==="boolean")await kv.put("enabled",b.enabled?"1":"0");
 if(b.newPassword!==undefined){
  const p=String(b.newPassword);
  if(p.length<8)return json({error:"Adgangskoden skal være mindst 8 tegn"},400);
  await kv.put("admin_key_hash",await sha256(p));
 }
 return json({ok:true,enabled:(await kv.get("enabled"))==="1",passwordManaged:!!(await kv.get("admin_key_hash"))});
}
