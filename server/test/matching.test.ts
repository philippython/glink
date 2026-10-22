import assert from 'node:assert/strict'
import { test } from 'node:test'
import { learnStrengths, rankCreators, scoreMatch, selectInvites, type CampaignInput, type CreatorInput } from '../src/matching.ts'

const camp: CampaignInput = { brandId: 'b1', category: 'Skincare', goal: 'Purchases', market: 'United States', creativeAngle: 'Problem-solution', baseFee: 38000 }
const base: CreatorInput = {
  id: 'c', niches: ['Skincare'], styles: ['Problem/Solution'], country: 'United States', baseRate: 35000, availability: 'Available',
  prior: { hook: 70, retention: 70, conversion: 70, reliability: 90 }, history: [], activeJobs: 0,
}

test('a perfect-fit creator scores high and explains why', () => {
  const r = scoreMatch(base, camp)
  assert.ok(r.score >= 75, `score ${r.score}`)
  assert.ok(r.reasons.some(x => x.includes('Skincare')))
  assert.equal(r.eligible, true)
})

test('category: exact > related > unrelated', () => {
  const exact = scoreMatch(base, camp).score
  const related = scoreMatch({ ...base, niches: ['Beauty'] }, camp).score
  const none = scoreMatch({ ...base, niches: ['Gaming'] }, camp).score
  assert.ok(exact > related && related > none, `${exact} ${related} ${none}`)
})

test('goal weighting: conversion matters most for Purchases, hook for Awareness', () => {
  const closer = { ...base, id: 'closer', prior: { hook: 40, retention: 60, conversion: 95, reliability: 90 } }
  const hooker = { ...base, id: 'hooker', prior: { hook: 95, retention: 60, conversion: 40, reliability: 90 } }
  assert.equal(rankCreators([hooker, closer], camp)[0].creatorId, 'closer')
  assert.equal(rankCreators([hooker, closer], { ...camp, goal: 'Awareness' })[0].creatorId, 'hooker')
})

test('unavailable creators are not eligible and score 0', () => {
  const r = scoreMatch({ ...base, availability: 'Unavailable' }, camp)
  assert.equal(r.score, 0)
  assert.equal(r.eligible, false)
})

test('rate far above the fee is a blocker; slightly above lowers the score', () => {
  assert.ok(scoreMatch({ ...base, baseRate: 45000 }, camp).score < scoreMatch(base, camp).score)
  assert.equal(scoreMatch({ ...base, baseRate: 90000 }, camp).eligible, false)
})

test('real results move learned strengths away from the prior, more with more data', () => {
  const prior = { hook: 50, retention: 50, conversion: 50, reliability: 80 }
  const great = { category: 'Skincare', brandId: 'b1', approved: true, onTime: true, thumbstop: 50, holdRate: 35, ctr: 3, cvr: 6 }
  const one = learnStrengths(prior, [great])
  const four = learnStrengths(prior, [great, great, great, great])
  assert.ok(one.hook > prior.hook && four.hook > one.hook, `${one.hook} ${four.hook}`)
  const late = learnStrengths(prior, [{ ...great, onTime: false }, { ...great, onTime: false }])
  assert.ok(late.reliability < prior.reliability)
})

test('proven category results and past work for the brand lift the score', () => {
  const history = [1, 2, 3].map(() => ({ category: 'Skincare', brandId: 'b1', approved: true, onTime: true, ctr: 2.5, cvr: 4, thumbstop: 45, holdRate: 30 }))
  assert.ok(scoreMatch({ ...base, history }, camp).score > scoreMatch(base, camp).score)
})

test('selectInvites takes the top eligible creators above the threshold, skipping excluded', () => {
  const people = ['a', 'b', 'c', 'd'].map((id, i) => ({ ...base, id, prior: { hook: 90 - i * 15, retention: 90 - i * 15, conversion: 90 - i * 15, reliability: 90 } }))
  const ranked = rankCreators(people, camp)
  const picks = selectInvites(ranked, 2, new Set(['a']))
  assert.deepEqual(picks.map(p => p.creatorId), ['b', 'c'])
  assert.ok(picks.every(p => p.score >= 55))
})
