import {gate,json,sha256} from "./_auth.js";

async function isAdmin(request,env){
  const raw=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");if(!raw)return false;
  const stored=env.DTA_ACCESS?await env.DTA_ACCESS.get("admin_key_hash"):null;
  return stored?(await sha256(raw))===stored:(!!env.DTA_ADMIN_KEY&&raw===env.DTA_ADMIN_KEY);
}
function groupOf(request){
  const g=new URL(request.url).searchParams.get("group");
  return ["1","2","3"].includes(g)?g:null;
}
function cleanMessage(x){
  if(!x||typeof x!=="object")return null;
  const role=x.role==="assistant"?"assistant":"user";
  const text=String(x.text||"").slice(0,100000);
  if(!text)return null;
  return {id:String(x.id||crypto.randomUUID()),role,text,phase:String(x.phase||"").slice(0,40),createdAt:Number(x.createdAt||Date.now())};
}
async function load(kv,g){
  const raw=await kv.get("group_messages_"+g);
  try{if(raw)return JSON.parse(raw)}catch{}
  const legacyRaw=await kv.get("group_state_"+g);
  try{
    const legacy=legacyRaw?JSON.parse(legacyRaw):{},messages=(Array.isArray(legacy.messages)?legacy.messages:[]).map(cleanMessage).filter(Boolean);
    if(messages.length)await kv.put("group_messages_"+g,JSON.stringify(messages));
    return messages;
  }catch{return []}
}
export async function onRequestGet(context){
  const admin=await isAdmin(context.request,context.env);if(!admin){const access=await gate(context);if(!access.ok)return json({error:access.error},403)}
  const kv=context.env.DTA_ACCESS,g=groupOf(context.request);
  if(!kv)return json({error:"State store not configured"},503);
  if(!g)return json({error:"Invalid group"},400);
  return json({group:g,messages:await load(kv,g)});
}
export async function onRequestPost(context){
  const admin=await isAdmin(context.request,context.env);if(!admin){const access=await gate(context);if(!access.ok)return json({error:access.error},403)}
  const kv=context.env.DTA_ACCESS,g=groupOf(context.request);
  if(!kv)return json({error:"State store not configured"},503);
  if(!g)return json({error:"Invalid group"},400);
  const body=await context.request.json();
  const incoming=(Array.isArray(body.messages)?body.messages:[body.message]).map(cleanMessage).filter(Boolean);
  if(!incoming.length)return json({error:"No messages"},400);
  const current=await load(kv,g),byId=new Map(current.map(x=>[x.id,x]));
  incoming.forEach(x=>byId.set(x.id,x));
  const messages=[...byId.values()].sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)).slice(-500);
  const payload=JSON.stringify(messages);
  if(payload.length>5000000)return json({error:"Message store too large"},413);
  await kv.put("group_messages_"+g,payload);
  return json({ok:true,group:g,messages});
}
