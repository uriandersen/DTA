import {sha256,json} from "./_auth.js";
function adminOK(request,env){const v=request.headers.get("authorization")||"";return !!env.DTA_ADMIN_KEY&&v===`Bearer ${env.DTA_ADMIN_KEY}`}
export async function onRequestGet(context){
 if(!adminOK(context.request,context.env))return json({error:"Unauthorized"},401);
 const kv=context.env.DTA_ACCESS;if(!kv)return json({error:"Access store not configured"},503);
 return json({enabled:(await kv.get("enabled"))==="1",hasCode:!!(await kv.get("course_code_hash"))});
}
export async function onRequestPost(context){
 const kv=context.env.DTA_ACCESS;if(!kv)return json({error:"Access store not configured"},503);
 const b=await context.request.json();
 if(b.closeOnly===true&&b.enabled===false){await kv.put("enabled","0");return json({ok:true,enabled:false,hasCode:!!(await kv.get("course_code_hash"))})}
 if(!adminOK(context.request,context.env))return json({error:"Unauthorized"},401);
 if(typeof b.enabled==="boolean")await kv.put("enabled",b.enabled?"1":"0");
 if(b.code!==undefined){if(String(b.code).length<4)return json({error:"Koden skal være mindst 4 tegn"},400);await kv.put("course_code_hash",await sha256(String(b.code)))}
 return json({ok:true,enabled:(await kv.get("enabled"))==="1",hasCode:!!(await kv.get("course_code_hash"))});
}
