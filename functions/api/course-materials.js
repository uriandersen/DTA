import {gate,json,sha256} from "./_auth.js";
async function isAdmin(request,env){
 const raw=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");if(!raw)return false;
 const stored=env.DTA_ACCESS?await env.DTA_ACCESS.get("admin_key_hash"):null;
 return stored?(await sha256(raw))===stored:(!!env.DTA_ADMIN_KEY&&raw===env.DTA_ADMIN_KEY);
}
async function load(kv){const raw=await kv.get("course_materials");try{return raw?JSON.parse(raw):[]}catch{return []}}
export async function onRequestGet(context){
 const kv=context.env.DTA_ACCESS;if(!kv)return json({error:"Material store not configured"},503);
 const admin=await isAdmin(context.request,context.env);if(!admin){const access=await gate(context);if(!access.ok)return json({error:access.error},403)}
 return json({materials:await load(kv)});
}
export async function onRequestPost(context){
 const kv=context.env.DTA_ACCESS;if(!kv)return json({error:"Material store not configured"},503);
 if(!(await isAdmin(context.request,context.env)))return json({error:"Unauthorized"},401);
 const item=await context.request.json();
 if(!item||!item.fileId||!item.name)return json({error:"Invalid material"},400);
 const materials=await load(kv),id=item.id||crypto.randomUUID();
 const next=[...materials.filter(x=>x.id!==id),{id,name:String(item.name),fileId:String(item.fileId),mime:String(item.mime||""),bytes:Number(item.bytes||0),kind:String(item.kind||"file"),createdAt:Date.now()}];
 await kv.put("course_materials",JSON.stringify(next));return json({ok:true,materials:next});
}
export async function onRequestDelete(context){
 const kv=context.env.DTA_ACCESS;if(!kv)return json({error:"Material store not configured"},503);
 if(!(await isAdmin(context.request,context.env)))return json({error:"Unauthorized"},401);
 const id=new URL(context.request.url).searchParams.get("id");if(!id)return json({error:"Missing id"},400);
 const materials=(await load(kv)).filter(x=>x.id!==id);await kv.put("course_materials",JSON.stringify(materials));
 return json({ok:true,materials});
}
