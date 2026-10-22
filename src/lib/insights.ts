import type { State } from '../data/store'

export interface Insight { title: string; text: string; angle?: string; opening?: string }

/**
 * Plain-language insights from recorded ad results. Each one is backed by
 * numbers the brand can check on the Performance page; with too little data
 * we say so instead of inventing a pattern.
 */
export function brandInsights(state: State): Insight[] {
  const measured = state.submissions.filter(s => s.metrics && s.metrics.views > 0)
  if (measured.length === 0) {
    return [{ title: 'Record your first results to unlock insights.', text: 'Once you add ad results for approved videos, we compare angles, creators and timing and tell you what to repeat.' }]
  }
  const camp = (id: string) => state.campaigns.find(c => c.id === id)
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
  const out: Insight[] = []

  const byAngle = new Map<string, typeof measured>()
  measured.forEach(s => { const a = camp(s.campaignId)?.creativeAngle; if (a) byAngle.set(a, [...(byAngle.get(a) ?? []), s]) })
  const angles = [...byAngle.entries()].map(([angle, xs]) => ({ angle, ctr: avg(xs.map(x => x.metrics!.ctr)), n: xs.length, opening: camp(xs[0].campaignId)?.suggestedOpening }))
    .sort((a, b) => b.ctr - a.ctr)
  const others = measured.filter(s => camp(s.campaignId)?.creativeAngle !== angles[0].angle)
  out.push({
    title: `${angles[0].angle} videos are your best performers.`,
    text: others.length
      ? `Across ${angles[0].n} measured video${angles[0].n > 1 ? 's' : ''} they average ${angles[0].ctr.toFixed(2)}% click-through, versus ${avg(others.map(x => x.metrics!.ctr)).toFixed(2)}% for your other angles.`
      : `Your ${angles[0].n} measured video${angles[0].n > 1 ? 's' : ''} average ${angles[0].ctr.toFixed(2)}% click-through. Test a second angle to compare.`,
    angle: angles[0].angle, opening: angles[0].opening,
  })

  const byCreator = new Map<string, number[]>()
  measured.forEach(s => byCreator.set(s.creatorId, [...(byCreator.get(s.creatorId) ?? []), s.metrics!.ctr]))
  const best = [...byCreator.entries()].map(([id, xs]) => ({ id, ctr: avg(xs), n: xs.length })).sort((a, b) => b.ctr - a.ctr)[0]
  const name = state.creators.find(c => c.id === best.id)?.displayName
  if (name) out.push({ title: `${name} drives your highest click-through.`, text: `${best.ctr.toFixed(2)}% across ${best.n} video${best.n > 1 ? 's' : ''}. Invite them first on similar briefs.` })

  const winners = measured.filter(s => s.winning).length
  out.push({ title: `${winners} of ${measured.length} measured videos beat their benchmark.`, text: 'A video wins when its click-through beats the campaign benchmark within 14 days of approval; its bonus is then paid automatically.' })

  const hook = measured.filter(s => s.metrics!.thumbstop > 0)
  if (hook.length >= 2) {
    const strong = hook.filter(s => s.metrics!.thumbstop >= 40), weak = hook.filter(s => s.metrics!.thumbstop < 40)
    if (strong.length && weak.length) out.push({ title: 'Openings that stop the scroll convert better.', text: `Videos holding 40%+ of viewers past 3 seconds average ${avg(strong.map(s => s.metrics!.ctr)).toFixed(2)}% click-through vs ${avg(weak.map(s => s.metrics!.ctr)).toFixed(2)}% for the rest.` })
  }
  return out
}
