import { CreditCard, Lock, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Empty, PageHeader, Panel, Pill, SectionHead, Stat, StatRow, useToast, type Tone } from '../../components/kit'
import type { Payment } from '../../data/market'
import { useStore } from '../../data/store'
import { errorMessage } from '../../lib/api'
import { cx, fmtDate, money } from '../../lib/format'

const statusLabel: Record<Payment['status'], [string, Tone]> = { pending: ['Pending', 'warn'], available: ['Released', 'success'], paid_out: ['Paid out', 'success'] }
const kindLabel = { topup: 'Top-up', hold: 'Escrow hold', refund: 'Returned to wallet' }

const PRESETS = [500, 1000, 2500, 5000]

export default function Billing() {
  const { state, topUp, checkout, refresh, config } = useStore()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [amount, setAmount] = useState(1000)
  const [paying, setPaying] = useState(false)
  const paid = state.payments.reduce((a, p) => a + p.base + p.bonus, 0)
  const byCreator = state.creators.map(c => ({ c, rows: state.payments.filter(p => p.creatorId === c.id) })).filter(x => x.rows.length)
  const owner = state.myRole === 'Owner'
  const cards = config.payments === 'stripe'

  // setParams changes identity as the page re-renders, so handle the return exactly once.
  const handledReturn = useRef(false)
  // Back from Stripe: the wallet is credited by Stripe's confirmation, which can land a moment later.
  const [awaitingCredit, setAwaitingCredit] = useState(false)
  useEffect(() => {
    const result = params.get('topup')
    if (!result || handledReturn.current) return
    handledReturn.current = true
    setParams({}, { replace: true })
    if (result === 'cancelled') toast('Payment cancelled — nothing was charged.')
    else { toast('Payment received. Your wallet will update in a moment.'); setAwaitingCredit(true) }
  }, [params, setParams, toast])
  useEffect(() => {
    if (!awaitingCredit) return
    let tries = 0
    const t = setInterval(() => { void refresh(); if (++tries >= 5) setAwaitingCredit(false) }, 2000)
    return () => clearInterval(t)
  }, [awaitingCredit, refresh])

  const add = async () => {
    setBusy(true)
    try { await topUp(1000); toast('$1,000 in test funds added') } catch (e) { toast(errorMessage(e)) } finally { setBusy(false) }
  }
  const pay = async () => {
    setPaying(true)
    try { await checkout(amount) } catch (e) { toast(errorMessage(e)); setPaying(false) }
  }

  return (
    <>
      <PageHeader title="Billing" subtitle="Budgets are held in escrow when a campaign launches and released when you approve a video."
        actions={owner && config.testFunds && <Button variant="secondary" onClick={() => void add()} loading={busy}><Plus size={15} /> Add $1,000 test funds</Button>} />
      <StatRow cols={3}>
        <Stat label="Wallet balance" value={money(state.wallet)} sub="Available for new campaigns" />
        <Stat label="Held in escrow" value={money(state.billing.held)} sub="Reserved for live campaigns" />
        <Stat label="Paid to creators" value={money(paid)} sub="All time, including bonuses" />
      </StatRow>

      {cards && owner && (
        <Panel className="mt-6 overflow-hidden bg-[linear-gradient(120deg,var(--tint-violet),var(--surface)_60%)]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[15px] font-medium text-fg"><CreditCard size={17} className="text-violet" /> Add funds</div>
              <p className="mt-1 text-[13px] text-muted">Pay by card on Stripe’s secure page. Your wallet updates as soon as the payment is confirmed.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {PRESETS.map(p => (
                  <button key={p} onClick={() => setAmount(p)}
                    className={cx('h-9 rounded-full border px-4 text-[13.5px] font-medium transition', amount === p ? 'border-violet bg-violet text-pure-white' : 'border-line-strong bg-surface text-fg hover:border-violet')}>
                    {money(p)}
                  </button>
                ))}
                <label className="flex h-9 items-center gap-1 rounded-full border border-line-strong bg-surface pl-3.5 pr-1 text-[13.5px] focus-within:border-violet">
                  <span className="text-muted">$</span>
                  <input type="number" min={50} max={100000} step={50} value={amount} onChange={e => setAmount(Number(e.target.value))} aria-label="Custom amount"
                    className="w-24 bg-transparent text-fg outline-none" />
                </label>
              </div>
            </div>
            <Button variant="brand" onClick={() => void pay()} loading={paying} disabled={!(amount >= 50 && amount <= 100000)}>
              <Lock size={14} /> Pay {amount >= 50 ? money(amount) : ''} with card
            </Button>
          </div>
        </Panel>
      )}
      {!owner && <p className="mt-3 text-[12.5px] text-faint">Only the brand owner can add funds.</p>}
      {owner && config.payments === 'none' && <p className="mt-3 text-[12.5px] text-faint">Adding funds will be available once card payments are connected.</p>}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="min-w-0">
          <SectionHead title="Payouts by creator" />
          <Panel pad={false}>
            {byCreator.length === 0 ? <Empty text="No payouts yet. Approving a video pays its creator from escrow." /> : byCreator.map(({ c, rows }) => (
              <div key={c.id} className="border-b border-line px-5 py-4 last:border-0">
                <div className="mb-2 text-[14px] font-medium text-fg">{c.displayName}</div>
                {rows.map(p => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-1 text-[13px]">
                    <span className="text-muted">{state.campaigns.find(x => x.id === p.campaignId)?.name} · {p.kind === 'bonus' ? 'Bonus' : p.kind === 'prize' ? 'Prize' : 'Base fee'} · {fmtDate(p.date)}</span>
                    <span className="flex items-center gap-2"><span className="tabular-nums text-fg">{money(p.base + p.bonus)}</span><Pill tone={statusLabel[p.status][1]}>{statusLabel[p.status][0]}</Pill></span>
                  </div>
                ))}
              </div>
            ))}
          </Panel>
        </section>
        <section className="min-w-0">
          <SectionHead title="Wallet activity" />
          <Panel pad={false}>
            {state.billing.ledger.length === 0 ? <Empty text="No wallet activity yet." /> : state.billing.ledger.map(l => (
              <div key={l.id} className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-0">
                <div className="min-w-0 flex-1"><div className="truncate text-[14px] text-fg">{l.note}</div><div className="text-[12.5px] text-muted">{kindLabel[l.kind]} · {fmtDate(l.date)}</div></div>
                <span className={`tabular-nums text-[14px] ${l.amount < 0 ? 'text-fg' : 'text-success'}`}>{l.amount < 0 ? '−' : '+'}{money(Math.abs(l.amount))}</span>
              </div>
            ))}
          </Panel>
        </section>
      </div>
    </>
  )
}
