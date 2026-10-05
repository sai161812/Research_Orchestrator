import test from 'node:test'
import assert from 'node:assert/strict'
import { mergePaperData } from '../src/utils/paperUtils.js'
test('records sharing an ID retain complementary metadata from the lower-citation source', () => {
  const original = {id:'same', citationCount:1, abstract:'Useful abstract', doi:'10.1/example'}
  const candidate = {id:'same', citationCount:50, abstract:'No abstract available.'}
  const merged = mergePaperData(original, candidate)
  assert.equal(merged.abstract, 'Useful abstract')
  assert.equal(merged.doi, '10.1/example')
  assert.equal(merged.citationCount, 50)
  assert.equal(candidate.doi, undefined)
})
