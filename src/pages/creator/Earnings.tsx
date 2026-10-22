import { Building2, ExternalLink } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Empty, PageHeader, Panel, Pill, SectionHead, Stat, StatRow, useToast, type Tone } from '../../components/kit'
import { type Payment } from '../../data/market'
import { useStore } from '../../data/store'
import { errorMessage } from '../../lib/api'
import { fmtDate, money } from '../../lib/format'
import { useCreatorTotals } from './useCreatorTotals'

const meta: Record<Payment['status'], [string, Tone]> = {
  pending: ['Pending', 'warn'], available: ['Available', 'success'], paid_out: ['Paid out', 'success'],
}

export default function Earnings() {
  const { state, withdraw, config, connectPayouts, syncPayouts, openPayoutDashboard } = useStore()
  const toast = useToast()
  const t = useCreatorTotals()
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [linking, setLinking] = useState(false)
  const [params, setParams] = useSearchParams()
  const bank = config.payments === 'stripe'
  const account = state.payoutAccount

  // setParams changes identity as the page re-renders, so handle the return exactly once.
  const handledReturn = useRef(false)
  // Back from Stripe's onboarding page: re-check the account straight away.
  useEffect(() => {
    if (!params.get('payouts') || handledReturn.current) return
    handledReturn.current = true
    setParams({}, { replace: true })
    void syncPayouts().then(ready => toast(ready ? 'Your payout account is ready.' : 'Stripe still needs a few details before you can withdraw.'), e => toast(errorMessage(e)))
  }, [params, setParams, syncPayouts, toast])

  const link = async (fn: () => Promise<void>) => {
    setLinking(true)
    try { await fn() } catch (e) { toast(errorMessage(e)) } finally { setLinking(false) }
  }
  const pays = state.payments
  const list = showAll ? pays : pays.slice(0, 5)

  const doWithdraw = async () => {
    setBusy(true)
    try { const amt = await withdraw(); toast(bank ? `${money(amt)} is on its way to your bank` : `${money(amt)} withdrawal recorded`) } catch (e) { toast(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Earnings" subtitle="Your creative work, paid fairly."
        actions={<>
          <Button variant="secondary" onClick={() => setShowAll(v => !v)}>{showAll ? 'Recent payments' : 'Payment history'}</Button>
          <Button onClick={() => void doWithdraw()} loading={busy} disabled={t.available === 0 || (bank && !account.ready)}>Withdraw {t.available ? money(t.available) : ''}</Button>
        </>} />
      <StatRow>
        <Stat label="Available balance" value={money(t.available)} sub="Ready to withdraw" />
        <Stat label="Pending earnings" value={money(t.pending)} sub="Clears 3 days after approval" />
        <Stat label="Lifetime earnings" value={money(t.lifetime)} />
        <Stat label="Performance bonuses" value={money(t.bonuses)} />
      </StatRow>

      {bank && (
        <Panel className="mt-6 flex flex-wrap items-center gap-4 bg-[linear-gradient(120deg,var(--tint-coral),var(--surface)_60%)]">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-coral text-pure-white"><Building2 size={19} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium text-fg">
              {account.ready ? 'Payouts go straight to your bank' : account.connected ? 'Finish setting up payouts' : 'Connect your bank to get paid'}
            </div>
            <p className="text-[13px] text-muted">
              {account.ready ? 'Withdrawals are sent through Stripe. Your bank usually receives them within a few business days.'
                : account.connected ? 'Stripe needs a few more details before you can withdraw.'
                : 'Payouts are handled by Stripe. It takes a few minutes and your bank details are never stored by Glink.'}
            </p>
          </div>
          {account.ready
            ? <Button variant="secondary" loading={linking} onClick={() => void link(openPayoutDashboard)}><ExternalLink size={14} /> Manage bank details</Button>
            : <Button variant="brand" loading={linking} onClick={() => void link(connectPayouts)}>{account.connected ? 'Continue setup' : 'Set up payouts'}</Button>}
        </Panel>
      )}

      <section className="mt-10">
        <SectionHead title="Payments" />
        <Panel pad={false}>
          {list.length === 0 ? <Empty text="Payments appear here once a brand approves your video." /> : list.map(p => {
            const c = state.campaigns.find(x => x.id === p.campaignId)!
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-fg">{c.brandName} · {c.name}</div>
                  <div className="text-[13px] text-muted">{p.kind === 'bonus' ? 'Performance bonus' : p.kind === 'prize' ? 'Contest prize' : 'Base fee'} · {fmtDate(p.date)}{p.status === 'pending' && ` · available ${fmtDate(p.availableAt)}`}</div>
                </div>
                <span className="title-serif text-[20px] tabular-nums text-fg">{money(p.base + p.bonus)}</span>
                <Pill tone={meta[p.status][1]}>{meta[p.status][0]}</Pill>
              </div>
            )
          })}
        </Panel>
        {!bank && <p className="mt-3 text-[12.5px] text-faint">Withdrawals are recorded here; bank transfers start once card payments are connected.</p>}
      </section>
    </>
  )
}
