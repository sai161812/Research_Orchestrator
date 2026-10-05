import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDoi, deduplicateAndMerge } from '../src/utils/paperUtils.js'
test('DOI URLs with surrounding whitespace deduplicate against bare identifiers', () => {
  assert.equal(normalizeDoi(' HTTPS://DX.DOI.ORG/10.1234/ABC '), '10.1234/abc')
  assert.equal(normalizeDoi(null), '')
  assert.equal(deduplicateAndMerge([
    {id:'a', title:'First title', doi:' https://doi.org/10.1234/ABC '},
    {id:'b', title:'Other title', doi:'10.1234/abc'}
  ]).length, 1)
})
