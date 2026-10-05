import test from 'node:test'
import assert from 'node:assert/strict'
import handler from '../api/arxiv.js'
function response() {
  return {headers:{}, setHeader(k,v){this.headers[k]=v}, status(n){this.code=n;return this},
    json(v){this.body=v;return this}, send(v){this.body=v;return this}, end(){return this}}
}
test('arXiv rejects non-GET methods and invalid pagination before contacting upstream', async (t) => {
  const original = globalThis.fetch
  globalThis.fetch = () => {throw new Error('must not fetch')}
  t.after(() => {globalThis.fetch=original})
  for (const query of [
    {search_query:['a','b']}, {search_query:' '},
    {search_query:'graph', start:'-1'}, {search_query:'graph', max_results:'101'}
  ]) {
    const res=response(); await handler({method:'GET', query},res); assert.equal(res.code,400)
  }
  const res=response()
  await handler({method:'POST',query:{search_query:'graph'}},res)
  assert.equal(res.code,405)
  assert.equal(res.headers.Allow,'GET, OPTIONS')
})
test('arXiv preserves XML and returns a bounded timeout error', async (t) => {
  const original=globalThis.fetch
  t.after(() => {globalThis.fetch=original})
  globalThis.fetch=async (url, options) => {
    assert.ok(options.signal instanceof AbortSignal)
    assert.equal(new URL(url).searchParams.get('search_query'),'all:graph & learning')
    return {ok:true,text:async()=>'<feed />'}
  }
  let res=response()
  await handler({method:'GET',query:{search_query:'all:graph & learning'}},res)
  assert.equal(res.body,'<feed />')
  globalThis.fetch=async()=>{throw Object.assign(new Error('private details'),{name:'TimeoutError'})}
  res=response(); await handler({method:'GET',query:{search_query:'graph'}},res)
  assert.equal(res.code,504)
  assert.ok(!res.body.error.includes('private'))
})
