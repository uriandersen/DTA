export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const key = context.env.OPENAI_API_KEY;
    const model = context.env.OPENAI_MODEL || "gpt-5.6-sol";
    if (!key) return json({error:"OPENAI_API_KEY mangler i Cloudflare"},500);
    const phase = body.phase || "PROTOTYPE";
    const phaseGuide = {
      EMPATHIZE:"Hjælp med brugerforståelse, interviews og observation. Opfind ikke brugerindsigter.",
      DEFINE:"Hjælp med at syntetisere evidens til temaer, behov, POV og HMW. Skeln mellem evidens og antagelser.",
      PROTOTYPE:"Omsæt gruppens allerede valgte koncept til noget testbart. Redefinér ikke konceptet uden ønske. Spørg kun efter afgørende manglende information."
    }[phase] || "";
    const history=(body.history||[]).slice(-20).map(x=>({role:x.role==="assistant"?"assistant":"user",content:x.text}));
    const instructions = `Du er Design Thinking Agent (DTA), en faglig samarbejdspartner gennem et Design Thinking-projekt. Aktuel fase: ${phase}. ${phaseGuide} Vær konkret, kortfattet og arbejd ud fra projektets materiale og tidligere beslutninger. Projekt: ${body.projectName||"Unavngivet"}. Tilgængelige materialefiler (kun filnavne i denne version): ${(body.materials||[]).join(", ")||"ingen"}.`;
    const payload={model,reasoning:{effort:"medium"},instructions,input:[...history,{role:"user",content:body.message}],max_output_tokens:1800};
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${key}`},body:JSON.stringify(payload)});
    const data=await r.json();
    if(!r.ok) return json({error:data?.error?.message||"OpenAI API-fejl"},r.status);
    const text=data.output_text || (data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n");
    return json({text:text||"Intet tekstsvar modtaget.",response_id:data.id,model:data.model});
  } catch(e){return json({error:e.message||"Ukendt serverfejl"},500)}
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8"}})}
