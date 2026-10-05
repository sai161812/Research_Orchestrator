import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/semantic-scholar.js'
function response() {
  return {setHeader(){},status(n){this.code=n;return this},
    json(v){this.body=v;return this},end(){return this}}
}
test('Semantic Scholar rejects repeated parameters and query injection', async (t) => {
  const original=globalThis.fetch
  globalThis.fetch=()=>{throw new Error('must not fetch')}
  t.after(()=>{globalThis.fetch=original})
  for (const query of [
    {query:['a','b']}, {query:' '}, {query:'graph',limit:'1&query=other'},
    {query:'graph',offset:'-1'}, {query:'graph',fields:['title','url']},
    {query:'graph',match:['true']}, {query:'graph',limit:'101'}
  ]) {
    const res=response(); await handler({method:'GET',query},res); assert.equal(res.code,400)
  }
  const res=response(); await handler({method:'DELETE',query:{}},res); assert.equal(res.code,405)
})
test('quoted queries are encoded once and match requests omit pagination', async (t) => {
  const original=globalThis.fetch
  t.after(()=>{globalThis.fetch=original})
  globalThis.fetch=async (url, options)=>{
    const parsed=new URL(url)
    assert.equal(parsed.searchParams.get('query'),'"attention & learning"')
    assert.ok(!parsed.searchParams.has('offset'))
    assert.ok(parsed.pathname.endsWith('/match'))
    assert.ok(options.signal instanceof AbortSignal)
    return {ok:true,json:async()=>({paperId:'test'})}
  }
  const res=response()
  await handler({method:'GET',query:{query:'"attention & learning"',match:'true'}},res)
  assert.equal(res.body.paperId,'test')
})
test('upstream failures do not leak response bodies or internal exceptions', async (t) => {
  const original=globalThis.fetch
  t.after(()=>{globalThis.fetch=original})
  globalThis.fetch=async()=>({ok:false,status:429,text:async()=>'<private upstream detail>'})
  let res=response(); await handler({method:'GET',query:{query:'graph'}},res)
  assert.deepEqual(res.body,{error:'Semantic Scholar error: 429'})
  globalThis.fetch=async()=>{throw new Error('private internal detail')}
  res=response(); await handler({method:'GET',query:{query:'graph'}},res)
  assert.equal(res.code,502)
  assert.equal(res.body.error,'Semantic Scholar request failed')
})
