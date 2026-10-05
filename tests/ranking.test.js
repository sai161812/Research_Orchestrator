import test from 'node:test'
import assert from 'node:assert/strict'
import { hybridRank } from '../src/utils/paperUtils.js'
test('malformed citation counts never produce NaN or unbounded scores', () => {
  for (const citationCount of [-10, 'unknown', Infinity, null]) {
    const paper = {title:'Graph learning', citationCount, year:9999}
    assert.ok(Number.isFinite(hybridRank(paper, 'graph')))
    assert.ok(hybridRank(paper, 'graph') <= 1)
    assert.ok(hybridRank({...paper, isExactMatch:true}, 'graph') >= 1000)
  }
})
test('missing dates do not receive the current-year bonus', () => {
  const paper = {title:'Graph learning', citationCount:0}
  assert.ok(hybridRank({...paper, year:new Date().getFullYear()}, 'graph') > hybridRank(paper, 'graph'))
})
