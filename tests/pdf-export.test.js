import test from 'node:test'
import assert from 'node:assert/strict'
import CitationAgent from '../src/agents/CitationAgent.js'
test('report links cannot inject attributes or executable URL schemes', (t) => {
  let html = ''
  const previous = globalThis.window
  globalThis.window = {open: () => ({
    document:{open(){}, write(value){html=value}, close(){}},
    focus(){}, print(){}
  })}
  t.after(() => {globalThis.window = previous})
  CitationAgent.exportSessionPdf({query:'<script>bad</script>', papers:[
    {title:'Unsafe', url:'javascript:alert(1)'},
    {title:'Quote', url:'https://example.org/" onclick="alert(1)'},
    {title:'Valid', url:'https://example.org/paper?a=1&b=2'}
  ]})
  assert.ok(!html.includes('href="javascript:'))
  assert.ok(!html.includes('" onclick="'))
  assert.ok(html.includes('https://example.org/paper?a=1&amp;b=2'))
  assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'))
})
