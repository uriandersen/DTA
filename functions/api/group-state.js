import {gate,json,sha256} from "./_auth.js";
function groupOf(request){const g=new URL(request.url).searchParams.get("group");return ["1","2","3"].includes(g)?g:null}
async function isAdmin(request,env){
 const raw=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");if(!raw)return false;
 const stored=env.DTA_ACCESS?await env.DTA_ACCESS.get("admin_key_hash"):null;
 return stored?(await sha256(raw))===stored:(!!env.DTA_ADMIN_KEY&&raw===env.DTA_ADMIN_KEY);
}
export async function onRequestGet(context){
 const kv=context.env.DTA_ACCESS;if(!kv)return json({error:"State store not configured"},503);
 const g=groupOf(context.request);if(!g)return json({error:"Invalid group"},400);
 const admin=await isAdmin(context.request,context.env);
 if(!admin){const access=await gate(context);if(!access.ok)return json({error:access.error},403)}
 const raw=await kv.get("group_state_"+g);
 return json({group:g,state:raw?JSON.parse(raw):{}});
}
export async function onRequestPut(context){
 const access=await gate(context);if(!access.ok)return json({error:access.error},403);
 const kv=context.env.DTA_ACCESS,g=groupOf(context.request);if(!g)return json({error:"Invalid group"},400);
 const state=await context.request.json();
 const payload=JSON.stringify({...state,serverUpdatedAt:Date.now()});
 if(payload.length>5000000)return json({error:"Project state too large"},413);
 await kv.put("group_state_"+g,payload);
 return json({ok:true,group:g});
}
export async function onRequestDelete(context){
 const kv=context.env.DTA_ACCESS,g=groupOf(context.request);if(!g)return json({error:"Invalid group"},400);
 if(!(await isAdmin(context.request,context.env)))return json({error:"Unauthorized"},401);
 await kv.delete("group_state_"+g);return json({ok:true,group:g});
}
