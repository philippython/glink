import assert from 'node:assert/strict'
import { test } from 'node:test'
import { briefMatch, formatChecks, scriptChecks, termsFor } from '../src/preflight.ts'

const brief = {
  mustInclude: ['Show the serum’s texture on skin', 'Say it’s fragrance-free'],
  avoid: ['“Miracle” or “cure” claims', 'Background music over your voice', 'Medical claims'],
  deliverables: { aspectRatio: '9:16', minSec: 15, maxSec: 30 },
}

test('term extraction prefers quoted words and handles curly apostrophes', () => {
  assert.deepEqual(termsFor('“Miracle” or “cure” claims'), ['miracle', 'cure'])
  assert.deepEqual(termsFor('Say it’s fragrance-free'), ['fragrance free'])
})

test('format checks: length, aspect ratio, resolution', () => {
  const ok = formatChecks(brief, { duration: 22, width: 1080, height: 1920, mime: 'video/mp4' })
  assert.ok(ok.every(i => i.status === 'pass'))
  const bad = formatChecks(brief, { duration: 45, width: 1920, height: 1080, mime: 'video/mp4' })
  assert.equal(bad.filter(i => i.status === 'fail').length, 2)
})

test('script checks flag an Avoid word with a timestamp and confirm a spoken Must-include', () => {
  const items = scriptChecks(brief, 'Honestly this is a miracle for my skin. It is fragrance-free too.', 20)
  const miracle = items.find(i => i.label.startsWith('“Miracle”'))!
  assert.equal(miracle.status, 'fail')
  assert.equal(typeof miracle.at, 'number')
  assert.equal(items.find(i => i.label.startsWith('Say'))!.status, 'pass')
  assert.equal(items.find(i => i.label.startsWith('Show'))!.status, 'review', 'visual items need eyes or AI')
  assert.equal(items.find(i => i.label.startsWith('Background'))!.kind, 'audio')
})

test('medical claims are caught from a built-in word list', () => {
  const items = scriptChecks(brief, 'This serum will cure your eczema overnight.', 20)
  assert.equal(items.find(i => i.label === 'Medical claims')!.status, 'fail')
})

test('without a script, spoken items stay "review" instead of guessing', () => {
  const items = scriptChecks(brief, undefined, 20)
  assert.ok(items.every(i => i.status === 'review'))
})

test('brief match score drops with failures', () => {
  const clean = briefMatch([...formatChecks(brief, { duration: 22, width: 1080, height: 1920 }), ...scriptChecks(brief, 'It is fragrance-free and gentle.', 22)])
  const flagged = briefMatch([...formatChecks(brief, { duration: 22, width: 1080, height: 1920 }), ...scriptChecks(brief, 'A miracle cure, fragrance-free.', 22)])
  assert.ok(clean.score > flagged.score)
  assert.match(flagged.feedback, /need/)
})
