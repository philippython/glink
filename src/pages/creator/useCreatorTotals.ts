import { useStore } from '../../data/store'

/** Derived creator stats so both Home and Performance show the same numbers. */
export function useCreatorTotals() {
  const { state } = useStore()
  const mine = state.submissions
  const pays = state.payments
  const approved = mine.filter(s => s.status === 'approved' || s.status === 'paid').length
  const completedCampaigns = new Set(
    state.matches.filter(m => m.status === 'accepted')
      .filter(m => {
        const subs = mine.filter(s => s.matchId === m.id)
        return subs.length > 0 && subs.every(s => s.status === 'approved' || s.status === 'paid')
      }).map(m => m.campaignId),
  ).size
  return {
    completed: completedCampaigns,
    approved,
    winning: mine.filter(s => s.winning).length,
    lifetime: pays.reduce((a, p) => a + p.base + p.bonus, 0),
    available: pays.filter(p => p.status === 'available').reduce((a, p) => a + p.base + p.bonus, 0),
    pending: pays.filter(p => p.status === 'pending').reduce((a, p) => a + p.base + p.bonus, 0),
    bonuses: pays.reduce((a, p) => a + p.bonus, 0),
  }
}
