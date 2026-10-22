import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar, Button, Chip, Empty, Input, PageHeader, Panel, Pill, Select, StrengthBar, useToast } from '../../components/kit'
import { useStore } from '../../data/store'
import { errorMessage } from '../../lib/api'
import { money } from '../../lib/format'

export default function BrandCreators() {
  const { state, invite } = useStore()
  const [busy, setBusy] = useState('')
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const matchable = state.campaigns.filter(c => c.status === 'live' && c.sourcing !== 'contest')
  const campaignId = params.get('campaign') ?? matchable[0]?.id ?? ''
  const campaign = state.campaigns.find(c => c.id === campaignId)
  const [country, setCountry] = useState('')
  const [niche, setNiche] = useState('')
  const [availability, setAvailability] = useState('')
  const [q, setQ] = useState('')

  const niches = [...new Set(state.creators.flatMap(c => c.niches))]
  const countries = [...new Set(state.creators.map(c => c.country))]

  const rows = useMemo(() => state.creators
    .map(c => {
      const m = state.matches.find(x => x.campaignId === campaignId && x.creatorId === c.id)
      return { c, m, score: m?.score ?? 0 }
    })
    .filter(({ c }) => (!country || c.country === country) && (!niche || c.niches.includes(niche)) && (!availability || c.availability === availability)
      && (c.displayName + c.handle + c.styles.join(' ')).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.score - a.score), [state, campaignId, campaign, country, niche, availability, q])

  return (
    <>
      <PageHeader title="Creators" subtitle="Matched to your brief and ranked by fit, so you don’t sift through applications." />

      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Select aria-label="Campaign" value={campaignId} onChange={e => setParams({ campaign: e.target.value })}>
          {matchable.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select aria-label="Country" value={country} onChange={e => setCountry(e.target.value)}><option value="">All countries</option>{countries.map(c => <option key={c}>{c}</option>)}</Select>
        <Select aria-label="Niche" value={niche} onChange={e => setNiche(e.target.value)}><option value="">All niches</option>{niches.map(n => <option key={n}>{n}</option>)}</Select>
        <Select aria-label="Availability" value={availability} onChange={e => setAvailability(e.target.value)}>
          <option value="">Any availability</option>{['Available', 'Limited', 'Unavailable'].map(a => <option key={a}>{a}</option>)}
        </Select>
        <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" /><Input aria-label="Search creators" value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="pl-8" /></div>
      </div>

      <Panel pad={false} className="overflow-x-auto">
        {!campaign ? <Empty text="Launch a campaign to see matched creators." /> : rows.length === 0 ? <Empty text="No creators match these filters." action={<Button variant="secondary" onClick={() => { setCountry(''); setNiche(''); setAvailability(''); setQ('') }}>Clear filters</Button>} /> : (
          <table className="w-full min-w-[860px] text-[13.5px]">
            <thead className="bg-subtle text-left">
              <tr className="text-[11px] uppercase tracking-[0.08em] text-faint">
                <th className="px-5 py-3 font-medium">Creator</th><th className="px-3 py-3 font-medium">Match</th>
                <th className="w-56 px-3 py-3 font-medium">Strengths</th><th className="px-3 py-3 text-right font-medium">Rate / video</th>
                <th className="px-3 py-3 text-right font-medium">On-time</th><th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, m, score }) => (
                <tr key={c.id} className="border-t border-line align-middle hover:bg-subtle">
                  <td className="px-5 py-4">
                    <Link to={`/brand/creators/${c.id}`} className="flex items-center gap-3">
                      <Avatar name={c.displayName} />
                      <div className="min-w-0">
                        <div className="font-medium text-fg hover:underline">{c.displayName}</div>
                        <div className="mt-1 flex flex-wrap gap-1">{[...new Set([...c.niches, ...c.styles])].slice(0, 3).map(t => <Chip key={t}>{t}</Chip>)}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="max-w-[200px] px-3 py-4">
                    <span className="title-serif text-[24px] text-fg">{m ? `${score}%` : '—'}</span>
                    {m?.reasons[0] && <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{m.reasons[0]}</div>}
                  </td>
                  <td className="space-y-1.5 px-3 py-4">
                    <StrengthBar compact label="Hook" value={c.strengths.hook} />
                    <StrengthBar compact label="Retention" value={c.strengths.retention} />
                    <StrengthBar compact label="Conversion" value={c.strengths.conversion} />
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums text-fg">{money(c.baseRate)}</td>
                  <td className="px-3 py-4 text-right tabular-nums text-fg">{c.onTimeRate}%</td>
                  <td className="px-5 py-4 text-right">
                    {m?.status === 'accepted' ? <Pill tone="success">✓ Accepted</Pill>
                      : m?.status === 'invited' ? <Pill>Invited</Pill>
                      : m?.status === 'declined' ? <Pill tone="danger">Declined</Pill>
                      : <Button size="sm" loading={busy === c.id} disabled={!state.permissions.canSpend} aria-label={`Invite ${c.displayName}`}
                          title={state.permissions.canSpend ? undefined : 'Reviewers can’t invite creators'}
                          onClick={async () => { setBusy(c.id); try { await invite(campaignId, c.id); toast(`${c.displayName} invited`) } catch (e) { toast(errorMessage(e)) } finally { setBusy('') } }}>Invite</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  )
}
