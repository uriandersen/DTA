export async function onRequestGet(context){
  const env=context.env||{};
  return new Response(JSON.stringify({
    commit:env.CF_PAGES_COMMIT_SHA||null,
    branch:env.CF_PAGES_BRANCH||null,
    deployment:env.CF_PAGES_URL||null
  }),{status:200,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}
