import test from 'node:test'
import assert from 'node:assert/strict'
import { deduplicateAndMerge } from '../src/utils/paperUtils.js'
test('historical title aliases survive multiple winner replacements', () => {
  const papers = [
    {id:'a', title:'Original', doi:'10.1/x', citationCount:1},
    {id:'b', title:'Revision', doi:'10.1/x', citationCount:2},
    {id:'c', title:'Final', doi:'10.1/x', citationCount:3},
    {id:'d', title:'Original', citationCount:4}
  ]
  const result = deduplicateAndMerge(papers)
  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'd')
  assert.equal(result[0].doi, '10.1/x')
})
test('a DOI/title bridge collapses two existing groups', () => {
  const result = deduplicateAndMerge([
    {id:'a', title:'Alpha', doi:'10.1/x', citationCount:1},
    {id:'b', title:'Beta', citationCount:5},
    {id:'c', title:'Beta', doi:'10.1/x', citationCount:2},
    {id:'d', title:'Alpha', citationCount:9}
  ])
  assert.equal(result.length, 1)
  assert.equal(result[0].citationCount, 9)
})
