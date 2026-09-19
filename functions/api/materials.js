import {gate} from "./_auth.js";
export async function onRequestPost(context) {
  try {
    const access=await gate(context); if(!access.ok) return json({error:access.error},403);
    const key=context.env.OPENAI_API_KEY;
    if(!key) return json({error:"OPENAI_API_KEY mangler i Cloudflare"},500);
    const incoming=await context.request.formData();
    const file=incoming.get("file");
    if(!file || typeof file==="string") return json({error:"Ingen fil modtaget"},400);
    const fd=new FormData();
    fd.append("purpose","user_data");
    fd.append("file",file,file.name||"materiale");
    const r=await fetch("https://api.openai.com/v1/files",{method:"POST",headers:{authorization:`Bearer ${key}`},body:fd});
    const data=await r.json();
    if(!r.ok) return json({error:data?.error?.message||"OpenAI fil-upload fejlede"},r.status);
    return json({file_id:data.id,name:data.filename,bytes:data.bytes});
  } catch(e){return json({error:e.message||"Ukendt upload-fejl"},500)}
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8"}})}
