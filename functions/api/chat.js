export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const key = context.env.OPENAI_API_KEY;
    const model = context.env.OPENAI_MODEL || "gpt-5.6-sol";
    if (!key) return json({error:"OPENAI_API_KEY mangler i Cloudflare"},500);
    const phase = body.phase || "PROTOTYPE";
    const phaseGuide = {
      EMPATHIZE:`Du arbejder i EMPATHIZE.
FORMÅL: Skab bedre grundlag for at forstå mennesker, deres adfærd, behov, motivationer, kontekst og problemer. Fasen producerer evidens og læring — ikke valgte løsninger.
ADFÆRDSREGLER:
- Opfind aldrig brugerindsigter, behov eller præferencer.
- Når brugeren beder om at designe, bygge eller færdiggøre en løsning/prototype, må du ikke bare gå i produktionsmode.
- Afklar først læringsformålet: Hvad skal vi lære om brugerne med dette?
- Hvis en løsning/skitse/genstand kan være nyttig i research, behandl den som stimulus og gør dens antagelser eksplicitte.
- Stil kun de få spørgsmål, der er nødvendige for at gøre researchen meningsfuld.
- Du må gerne hjælpe med interviewguide, observationsguide, researchplan, rekrutteringskriterier, stimulus, dokumentation og strukturering af faktisk indsamlet materiale.
- En færdig løsning eller testklar produktprototype er ikke et EMPATHIZE-artefakt. Hvis brugeren faktisk vil bygge den valgte løsning, forklar kort at det hører til PROTOTYPE og stop før du bygger.
ARTEFAKTER I DENNE FASE kan fx være interviewguide, observationsguide, researchplan, stimulusbrief, interviewnoter og researchopsamling.`,
      DEFINE:`Du arbejder i DEFINE.
FORMÅL: Omsæt faktisk research og observationer til en skarpere forståelse af problemet.
ADFÆRDSREGLER:
- Arbejd fra evidens i projektet; opfind ikke manglende brugerdata.
- Syntetisér, cluster og fortolk data til mønstre, temaer, behov og spændinger.
- Deltagernes observationer må integreres med interview-/observationsdata; de behøver ikke holdes kunstigt adskilt.
- Skeln mellem det materialet understøtter og nye hypoteser.
- Gå ikke videre til idéudvikling eller prototype, medmindre brugeren eksplicit skifter fase.
- Hjælp med POV og HMW, når grundlaget er tilstrækkeligt.
ARTEFAKTER I DENNE FASE kan fx være interviewanalyse, temaer, insights, behov, POV og HMW.`,
      PROTOTYPE:`Du arbejder i PROTOTYPE.
FORMÅL: Omsæt gruppens allerede valgte koncept til noget konkret og testbart, så gruppen kan lære gennem en brugertest.
ADFÆRDSREGLER:
- Redefinér ikke konceptet og start ikke ny ideation uden brugerens ønske.
- Brug tidligere findings, valgte/gemte artefakter, prototypebrief og projektmateriale som grundlag.
- Kontrollér før bygning om der er tilstrækkeligt grundlag for: bruger og brugssituation; konceptets centrale funktion; hvad brugeren konkret skal kunne gøre; hvad prototypen skal vise; flow/opbygning; oplevelse/designretning; hvad løsningen ikke skal være; og hvad gruppen vil lære af testen.
- Mangler afgørende information, spørg kun efter det nødvendige. Mangler ikke afgørende information, byg direkte.
- Prototypefidelity skal være høj nok til at teste hypotesen, men byg ikke funktionalitet der ikke bidrager til testen.
- Ved digitale prototyper: byg som udgangspunkt én selvstændig, funktionel HTML-fil med CSS og JavaScript inkluderet, direkte åbnbar i browseren.
- Designet skal følge koncept og brief; brug ikke automatisk standard-dashboard, sidemenu eller generisk app-layout.
- Byg prototypen. Beskriv ikke blot hvordan den kunne bygges.
ARTEFAKTER I DENNE FASE kan fx være prototypebrief, testbar prototype og HTML-prototype.`
    }[phase] || "";
    const history=(body.history||[]).slice(-20).map(x=>({role:x.role==="assistant"?"assistant":"user",content:x.text}));
    const saved=(body.savedArtifacts||[]).map(x=>`${x.title||"Artefakt"}: ${x.content||""}`).join("\n\n");
    const instructions = `Du er Design Thinking Agent (DTA), en faglig samarbejdspartner gennem et Design Thinking-projekt. Aktuel fase: ${phase}. FASEINSTRUKTIONEN NEDENFOR ER EN BINDENDE ARBEJDSREGEL, ikke blot baggrundskontekst. Den styrer hvilke handlinger og artefakter du må udføre i den aktuelle fase. Hvis en brugerbestilling kolliderer med fasens metode, skal du følge faseinstruktionen og hjælpe brugeren metodisk videre i stedet for lydigt at springe processen over.

${phaseGuide}

Vær konkret, kortfattet og arbejd ud fra projektets materiale og tidligere beslutninger. Projekt: ${body.projectName||"Unavngivet"}. Tilgængelige materialefiler (kun filnavne i denne version): ${(body.materials||[]).join(", ")||"ingen"}. Aktivt gemte artefakter: ${saved||"ingen"}.

ARTEFAKTER: Når dit svar skaber et selvstændigt arbejdsresultat, som gruppen med rimelighed kan arbejde videre med eller gemme — fx interviewguide, interviewanalyse, temaer, insights, POV, HMW, konceptbeskrivelse, prototypebrief, testplan eller prototype — skal du markere præcis den del som et artefakt. Almindelig dialog, spørgsmål og korte forklaringer er ikke artefakter.
Når der er et artefakt, afslut svaret med en maskinlæsbar blok på egne linjer.
For almindelige tekst-artefakter:
<DTA_ARTIFACT>
{"title":"kort titel","type":"markdown","content":"artefaktets fulde indhold i Markdown"}
</DTA_ARTIFACT>
For en digital prototype, webside eller anden HTML-leverance skal du BYGGE den komplette prototype og returnere:
<DTA_ARTIFACT>
{"title":"kort titel","type":"html","filename":"kort-filnavn","content":"<!doctype html>...komplet selvstændig HTML med CSS og JavaScript..."}
</DTA_ARTIFACT>
HTML skal være én selvstændig fil uden build-trin. Når brugeren beder om en prototype eller fil, må du ikke sige, at du ikke kan oprette en separat/downloadbar artefakt, og du må ikke nøjes med en kodeblok. DTA-klienten gør HTML-artefaktet previewbart og downloadbart.
Skriv kun én artefaktblok pr. svar. DTA_ARTIFACT er en intern transportprotokol: den må aldrig forklares, gengives i almindelig chattekst eller pakkes i Markdown-kodehegn. JSON skal være gyldig JSON; alle linjeskift og citationstegn inde i content skal escapes korrekt.`;
    const payload={model,reasoning:{effort:"medium"},instructions,input:[...history,{role:"user",content:body.message}],max_output_tokens:8000};
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${key}`},body:JSON.stringify(payload)});
    const data=await r.json();
    if(!r.ok) return json({error:data?.error?.message||"OpenAI API-fejl"},r.status);
    let text=data.output_text || (data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n");
    let artifact=null;
    const raw=text||"";
    const start=raw.indexOf("<DTA_ARTIFACT>");
    const end=raw.lastIndexOf("</DTA_ARTIFACT>");
    if(start!==-1){
      const jsonStart=start+"<DTA_ARTIFACT>".length;
      const jsonEnd=end!==-1?end:raw.length;
      let block=raw.slice(jsonStart,jsonEnd).trim();
      if(block.startsWith("```")) block=block.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
      try{artifact=JSON.parse(block)}
      catch{
        try{
          const first=block.indexOf("{"), last=block.lastIndexOf("}");
          if(first!==-1&&last>first) artifact=JSON.parse(block.slice(first,last+1));
        }catch{}
      }
      if(artifact){
        artifact.phase=phase;
        text=(raw.slice(0,start)+(end!==-1?raw.slice(end+"</DTA_ARTIFACT>".length):"")).trim();
      } else {
        // Never leak protocol/HTML into chat if artifact parsing fails.
        text=raw.slice(0,start).trim()||"Artefaktet blev genereret, men kunne ikke indlæses korrekt. Prøv igen.";
      }
    }
    return json({text:text|| (artifact?"Output oprettet.":"Intet tekstsvar modtaget."),artifact,response_id:data.id,model:data.model});
  } catch(e){return json({error:e.message||"Ukendt serverfejl"},500)}
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8"}})}
