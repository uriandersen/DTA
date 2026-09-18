export async function onRequestGet(context) {
  const key=context.env.OPENAI_API_KEY;
  const model=context.env.OPENAI_MODEL || "gpt-5.6-sol";
  if(!key) return json({openai:false,model,detail:"OPENAI_API_KEY is not configured"},500);
  try{
    const r=await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`,{
      headers:{Accept:"application/json",Authorization:`Bearer ${key}`}
    });
    if(!r.ok) return json({openai:false,model,detail:`OpenAI HTTP ${r.status}`},r.status);
    return json({openai:true,model,detail:`OpenAI authenticated · ${model}`});
  }catch(e){return json({openai:false,model,detail:e.message||"OpenAI connection failed"},500)}
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8"}})}
