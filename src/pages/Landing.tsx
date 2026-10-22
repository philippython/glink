import { motion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Lock, Menu, ShieldCheck, Sparkles, Users, Wallet, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CoreLoop } from '../components/CoreLoop'
import { Avatar, Button, Label, LinkButton, StrengthBar, ThemeSwitch } from '../components/kit'
import { Logo } from '../components/Logo'
import type { Role } from '../data/market'
import { useStore } from '../data/store'
import { errorMessage } from '../lib/api'
import { cx } from '../lib/format'
import { clips, photos } from '../lib/images'
import { ClipWall, CountUp, FeedPings, PhoneFeed, TrendTicker } from '../components/SocialFeed'

const ease = [0.22, 1, 0.36, 1] as const
const stepTones = [['bg-coral', 'bg-tint-coral text-coral'], ['bg-rose', 'bg-tint-rose text-rose'], ['bg-violet', 'bg-tint-violet text-violet'], ['bg-lime', 'bg-tint-lime text-fg']]
const nav = [['How it works', '#how'], ['For brands', '#brands'], ['For creators', '#creators'], ['Pricing', '#pricing'], ['FAQ', '#faq']]

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay, ease }}>
      {children}
    </motion.div>
  )
}

function Section({ id, label, title, sub, children }: { id?: string; label: string; title: ReactNode; sub?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
        <Reveal>
          <Label className="text-rose">{label}</Label>
          <h2 className="title-serif mt-3 max-w-3xl text-[32px] leading-[1.15] text-fg md:text-[44px]">{title}</h2>
          {sub && <p className="mt-3 max-w-2xl text-[15.5px] text-muted">{sub}</p>}
        </Reveal>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  )
}

/** Signed-in visitors get a way back to their workspace instead of sign-up buttons. */
function useAccount() {
  const { user, ready } = useStore()
  const home = user ? (user.role && user.onboarded ? `/${user.role}` : '/onboarding') : null
  return { user, ready, home }
}

export default function Landing() {
  const { login, config } = useStore()
  const { user, home } = useAccount()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const [demoBusy, setDemoBusy] = useState<Role>()
  const [demoError, setDemoError] = useState('')

  const demo = async (who: Role) => {
    setDemoBusy(who); setDemoError('')
    try {
      await login(who === 'brand' ? 'alex@lumenskin.com' : 'maya@example.com', 'demo1234')
      navigate(`/${who}`)
    } catch (e) { setDemoError(errorMessage(e)) } finally { setDemoBusy(undefined) }
  }

  const AuthButtons = ({ stacked }: { stacked?: boolean }) => user && home ? (
    <LinkButton to={home} className={stacked ? 'w-full' : ''}>Open dashboard <ArrowRight size={14} /></LinkButton>
  ) : (
    <div className={cx('flex gap-2', stacked && 'flex-col')}>
      <LinkButton variant={stacked ? 'secondary' : 'ghost'} to="/login" className={stacked ? 'w-full' : ''}>Log in</LinkButton>
      <LinkButton to="/signup" className={stacked ? 'w-full' : ''}>Sign up</LinkButton>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
          <Link to="/" className="flex items-center gap-2.5"><Logo size={28} /><span className="text-[16px] font-semibold tracking-tight">Glink</span></Link>
          <nav className="hidden gap-6 text-[13.5px] text-muted lg:flex" aria-label="Sections">
            {nav.map(([l, h]) => <a key={h} href={h} className="hover:text-fg">{l}</a>)}
          </nav>
          <div className="ml-auto hidden items-center gap-3 md:flex">
            <div className="w-36"><ThemeSwitch /></div>
            <AuthButtons />
          </div>
          <button onClick={() => setMenu(m => !m)} className="ml-auto grid h-9 w-9 place-items-center rounded-lg hover:bg-subtle md:hidden" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
            {menu ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {menu && (
          <div className="border-t border-line px-5 pb-5 pt-3 md:hidden">
            <nav className="flex flex-col text-[15px]" aria-label="Sections">
              {nav.map(([l, h]) => <a key={h} href={h} onClick={() => setMenu(false)} className="border-b border-line py-3 text-fg">{l}</a>)}
            </nav>
            <div className="mt-4"><AuthButtons stacked /></div>
            <div className="mt-4"><ThemeSwitch /></div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="blob right-[-8%] top-[4%] h-[420px] w-[420px] bg-rose opacity-25 dark:opacity-20" />
        <div className="blob right-[18%] top-[38%] h-[340px] w-[340px] bg-violet opacity-20 [animation-delay:-6s] dark:opacity-25" />
        <div className="blob left-[-10%] top-[10%] h-[300px] w-[300px] bg-coral opacity-[0.14] [animation-delay:-12s]" />
        <div className="blob bottom-[-6%] left-[30%] h-[180px] w-[180px] bg-lime opacity-20 [animation-delay:-3s] dark:opacity-10" />
      </div>
      <section className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-16 md:pt-24 lg:grid-cols-[1.1fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
          <span className="grad-border mb-6 inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[12.5px] font-medium text-fg">
            <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-semibold text-pure-black">New</span>
            <Sparkles size={12} className="text-rose" /> UGC that learns from every campaign
          </span>
          <h1 className="title-serif text-[44px] leading-[1.05] text-fg md:text-[64px]">
            The right creators.<br />Videos that follow the brief.<br /><span className="text-grad italic">Paid for results.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[16.5px] leading-relaxed text-muted">
            Write one brief. Glink matches it to creators whose real results fit, checks every video before you see it, and releases payment only when you approve — with bonuses when an ad wins.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user && home ? (
              <LinkButton to={home} variant="brand" className="h-12 px-6 text-[15px]">Open your dashboard <ArrowRight size={16} /></LinkButton>
            ) : (
              <>
                <LinkButton to="/signup?as=brand" variant="brand" className="h-12 px-6 text-[15px]">Start as a brand <ArrowRight size={16} /></LinkButton>
                <LinkButton to="/signup?as=creator" variant="secondary" className="h-12 px-6 text-[15px]">Join as a creator</LinkButton>
              </>
            )}
          </div>
          {!user && (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px] text-muted">
              <span>Already have an account? <Link to="/login" className="font-medium text-fg underline-offset-4 hover:underline">Log in</Link></span>
              {config.demo && <><span className="hidden text-faint sm:inline">·</span>
              <span>
                Try the demo as a{' '}
                <button onClick={() => void demo('brand')} disabled={!!demoBusy} className="font-medium text-fg underline-offset-4 hover:underline">{demoBusy === 'brand' ? 'brand…' : 'brand'}</button> or{' '}
                <button onClick={() => void demo('creator')} disabled={!!demoBusy} className="font-medium text-fg underline-offset-4 hover:underline">{demoBusy === 'creator' ? 'creator…' : 'creator'}</button>
              </span></>}
            </div>
          )}
          {demoError && <p role="alert" className="mt-3 text-[13px] text-danger">{demoError}</p>}
          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-2.5">
              {clips.slice(0, 5).map((c, i) => (
                <motion.img key={c.src} src={c.src} alt="" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-bg" />
              ))}
            </div>
            <p className="text-[13px] text-muted">Creators in <span className="font-medium text-coral">skincare</span>, <span className="font-medium text-rose">food</span>, <span className="font-medium text-violet">fitness</span>, pets, fashion and more</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.1, ease }} className="relative mx-auto w-full max-w-[460px] py-4">
          <PhoneFeed />
          <FeedPings />
        </motion.div>
      </section>
      </div>

      {/* ── Proof strip ── */}
      <div className="border-y border-line">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-8 md:grid-cols-4">
          {([
            [Users, 'Matched on results', '8 factors, explained for every creator', 'bg-tint-coral text-coral'],
            [ShieldCheck, 'Checked before review', 'Format, script and frames vs. the brief', 'bg-tint-rose text-rose'],
            [Lock, 'Budget in escrow', 'Released only when you approve', 'bg-tint-violet text-violet'],
            [Wallet, 'Bonuses that pay themselves', 'When an ad beats your benchmark', 'bg-tint-lime text-fg'],
          ] as const).map(([I, t, d, tone], i) => (
            <Reveal key={t} delay={i * 0.06} className="flex gap-3">
              <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', tone)}><I size={18} strokeWidth={2} /></span>
              <div><div className="text-[14px] font-medium text-fg">{t}</div><div className="text-[12.5px] text-muted">{d}</div></div>
            </Reveal>
          ))}
        </div>
      </div>

      <TrendTicker />

      {/* ── Creator videos ── */}
      <section className="overflow-hidden py-20 md:py-24">
        <Reveal className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-5">
          <div>
            <Label>Made by creators, checked by Glink</Label>
            <h2 className="title-serif mt-3 max-w-2xl text-[32px] leading-[1.15] text-fg md:text-[52px]">Scroll-stopping videos. <span className="text-grad italic">On brief.</span></h2>
          </div>
          <p className="max-w-sm text-[14.5px] text-muted">Every video is checked for length, format, must-say lines and words to avoid before it reaches your review queue.</p>
        </Reveal>
        <Reveal className="mt-12"><ClipWall /></Reveal>
        <p className="mx-auto mt-4 max-w-6xl px-5 text-[12px] text-faint">Sample videos for illustration. Hover to pause.</p>

        <div className="mx-auto mt-16 max-w-6xl px-5">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
          {[
            [8, '', 'match factors, explained'],
            [100, '%', 'of videos checked before review'],
            [3, ' days', 'until earnings are released'],
            [14, ' days', 'for an ad to earn its bonus'],
          ].map(([n, s, l]) => (
            <div key={l as string} className="bg-bg p-6 md:p-8">
              <div className="title-serif text-grad inline-block text-[40px] leading-none md:text-[52px]"><CountUp to={n as number} suffix={s as string} /></div>
              <div className="mt-2 text-[13px] text-muted">{l as string}</div>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <Section id="how" label="How it works" title="One loop, from brief to bonus." sub="Each campaign teaches the system who performs, so the next match is better than the last.">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['1', 'Write the brief', 'Goal, angle, opening line, must-include and avoid lists, budget and a submission deadline.'],
            ['2', 'Get matched creators', 'Ranked by proven strengths for your goal. Auto-invite the best, hand-pick, or run a contest.'],
            ['3', 'Review checked videos', 'Every upload is checked against the brief first. Problems are marked on the timeline.'],
            ['4', 'Pay for results', 'Approve to release the fee. Record results and winning ads earn their bonus automatically.'],
          ].map(([n, t, d], i) => (
            <Reveal key={n} delay={i * 0.06}>
              <div className="card group relative h-full overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-28px_var(--violet)]">
                <div className={cx('absolute inset-x-0 top-0 h-1 origin-left scale-x-[0.25] transition-transform duration-500 group-hover:scale-x-100', stepTones[i][0])} />
                <div className={cx('title-serif grid h-12 w-12 place-items-center rounded-2xl text-[26px] leading-none', stepTones[i][1])}>{n}</div>
                <div className="mt-6 text-[15.5px] font-medium text-fg">{t}</div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-16"><CoreLoop /></Reveal>
      </Section>

      {/* ── For brands / creators ── */}
      <section className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-20 md:grid-cols-2 md:py-24">
          <Reveal>
            <div id="brands" className="card h-full scroll-mt-24 overflow-hidden rounded-2xl bg-[linear-gradient(180deg,var(--tint-violet),var(--surface)_55%)] p-8">
              <SidePhoto src={photos.brands} />
              <Label className="text-violet">For brands</Label>
              <h3 className="title-serif mt-3 text-[30px] leading-tight">Stop sifting through applications.</h3>
              <ul className="mt-6 space-y-3 text-[14.5px] text-fg">
                {['Creators ranked by real results, with the reason for every match', 'Videos checked against your brief before they reach you', 'Budget held in escrow — pay only for approved work', 'Bonuses paid automatically when an ad beats your benchmark', 'Invite your team: managers launch, reviewers approve'].map(t => (
                  <li key={t} className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet text-pure-white"><Check size={12} strokeWidth={3} /></span>{t}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-2">
                <LinkButton variant="brand" to={user && home ? home : '/signup?as=brand'}>{user ? 'Open dashboard' : 'Start as a brand'} <ArrowRight size={14} /></LinkButton>
                {!user && config.demo && <Button variant="secondary" onClick={() => void demo('brand')} loading={demoBusy === 'brand'}>See the brand demo</Button>}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div id="creators" className="card h-full scroll-mt-24 overflow-hidden rounded-2xl bg-[linear-gradient(180deg,var(--tint-coral),var(--surface)_55%)] p-8">
              <SidePhoto src={photos.creators} />
              <Label className="text-coral">For creators</Label>
              <h3 className="title-serif mt-3 text-[30px] leading-tight">Get matched, not ignored.</h3>
              <ul className="mt-6 space-y-3 text-[14.5px] text-fg">
                {['Campaigns matched to your strengths — no long applications', 'A clear brief with a deadline, opening line and do’s and don’ts', 'A pre-flight check before you submit, so fewer re-shoots', 'Paid on approval, plus performance bonuses for winning ads', 'A performance profile that learns from every video'].map(t => (
                  <li key={t} className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-coral text-pure-white"><Check size={12} strokeWidth={3} /></span>{t}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-2">
                <LinkButton variant="brand" to={user && home ? home : '/signup?as=creator'}>{user ? 'Open dashboard' : 'Join as a creator'} <ArrowRight size={14} /></LinkButton>
                {!user && config.demo && <Button variant="secondary" onClick={() => void demo('creator')} loading={demoBusy === 'creator'}>See the creator demo</Button>}
              </div>
              <p className="mt-4 inline-flex rounded-full bg-lime px-2.5 py-0.5 text-[12px] font-semibold text-pure-black">Always free for creators</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Features ── */}
      <Section label="Inside Glink" title="Built to make every video count.">
        <div className="grid gap-4 lg:grid-cols-3">
          <Reveal>
            <div className="card h-full rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-28px_var(--rose)]">
              <div className="text-[15.5px] font-medium">Explainable matching</div>
              <p className="mt-1 text-[13.5px] text-muted">Every score shows its reasons. Strengths update from real ad results.</p>
              <div className="mt-6 flex items-center gap-3"><Avatar name="Sofia" size={34} /><div className="flex-1"><div className="text-[14px] font-medium">Sofia Álvarez</div><div className="text-[12px] text-muted">Creates Skincare content</div></div><span className="title-serif text-grad text-[26px]">91%</span></div>
              <div className="mt-5 space-y-2.5">
                <StrengthBar compact label="Goal fit" value={84} />
                <StrengthBar compact label="Category" value={100} />
                <StrengthBar compact label="Reliability" value={96} />
                <StrengthBar compact label="Budget" value={95} />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="card h-full rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-28px_var(--rose)]">
              <div className="text-[15.5px] font-medium">Pre-flight check</div>
              <p className="mt-1 text-[13.5px] text-muted">Problems are caught before review, with the exact moment they happen.</p>
              <ul className="mt-6 divide-y divide-line text-[13.5px]">
                {[['ok', 'Length 22s (requested 15–30s)'], ['ok', 'Says it’s fragrance-free', '0:08'], ['bad', 'Avoid: “miracle” claims', '0:14'], ['rev', 'Show the texture — check by eye']].map(([s, t, at]) => (
                  <li key={t} className="flex items-center gap-2.5 py-2.5">
                    {s === 'ok' ? <Check size={15} className="text-success" /> : s === 'bad' ? <X size={15} className="text-danger" /> : <span className="grid h-4 w-4 place-items-center rounded-full border border-warn text-[10px] text-warn">?</span>}
                    <span className="flex-1">{t}</span>{at && <span className={cx('font-mono text-[11.5px]', s === 'bad' ? 'text-danger' : 'text-faint')}>{at}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="card h-full rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-28px_var(--rose)]">
              <div className="text-[15.5px] font-medium">Escrow and automatic bonuses</div>
              <p className="mt-1 text-[13.5px] text-muted">Money moves when the work is approved — and again when it performs.</p>
              <ol className="mt-6 space-y-3 text-[13.5px]">
                {[['Campaign launches', '$4,240 held in escrow'], ['Video approved', '$380 released to the creator'], ['Ad beats 1.8% CTR', '+$150 bonus paid automatically'], ['Campaign completes', 'Unused budget returns to you']].map(([t, d], i) => (
                  <li key={t} className="flex gap-3"><span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold', stepTones[i][1])}>{i + 1}</span><div><div className="font-medium">{t}</div><div className="text-muted">{d}</div></div></li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── Pricing ── */}
      <Section id="pricing" label="Pricing" title="Pay for outcomes, not seats." sub="Start with a pilot. Creator fees and bonuses are set per campaign and held in escrow. Creators join free.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: 'Creative Intelligence Pilot', price: '$2,500', fit: 'Small and DTC brands', items: ['Product analysis and 3 creative angles', 'One matched campaign', 'Pre-flight on every video', 'Performance report'], cta: 'Start a pilot' },
            { name: 'Performance Lab', price: '$5,000', fit: 'Growing ecommerce and apps', items: ['Everything in Pilot', 'Three campaign rounds', 'Team seats for managers and reviewers', 'Learned creator strengths across rounds'], cta: 'Start Performance Lab', featured: true },
            { name: 'Growth Intelligence', price: '$10,000+', fit: 'Larger brands and agencies', items: ['Everything in Lab', 'Multiple products and markets', 'Contests and direct hire together', 'Dedicated strategist'], cta: 'Get started' },
          ].map((p, i) => (
            <Reveal key={p.name} delay={i * 0.06}>
              <div className={cx('card flex h-full flex-col rounded-2xl p-7 transition duration-300 hover:-translate-y-1', p.featured && 'grad-border shadow-[0_30px_70px_-34px_var(--violet)] md:-translate-y-2 md:hover:-translate-y-3')}>
                <div className="flex items-center justify-between"><div className="text-[14px] font-medium">{p.name}</div>{p.featured && <span className="bg-grad rounded-full px-2.5 py-0.5 text-[12px] font-semibold text-pure-white">Most popular</span>}</div>
                <div className={cx('title-serif mt-4 inline-block text-[40px] leading-none', p.featured && 'text-grad')}>{p.price}</div>
                <div className="mt-2 text-[13px] text-muted">{p.fit}</div>
                <ul className="mt-6 flex-1 space-y-2.5 text-[14px]">
                  {p.items.map(it => <li key={it} className="flex gap-2.5"><Check size={15} className={cx('mt-0.5 shrink-0', p.featured ? 'text-rose' : 'text-success')} />{it}</li>)}
                </ul>
                <LinkButton to={user && home ? home : '/signup?as=brand'} variant={p.featured ? 'brand' : 'secondary'} className="mt-7 w-full">{p.cta}</LinkButton>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-[13.5px] text-muted">
          Are you a creator? <Link to="/signup?as=creator" className="font-medium text-fg underline-offset-4 hover:underline">Join free</Link> and get matched to paid campaigns.
        </p>
      </Section>

      {/* ── FAQ ── */}
      <Section id="faq" label="FAQ" title="Questions, answered.">
        <div className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
          {[
            ['How does matching work?', 'Each creator gets a score for your campaign from eight factors — strengths for your goal, category, style, reliability, market, budget, proven results and past work with you. You see the reasons behind every score, and strengths update as real ad results come in.'],
            ['What does the pre-flight check look at?', 'Length, aspect ratio, resolution and file type; spoken must-include lines and words to avoid, from the creator’s script; and, with the AI layer on, visual items from sampled frames. Anything it can’t confirm is flagged for a quick look rather than guessed.'],
            ['When do creators get paid?', 'The fee is released from escrow when you approve the video and becomes available three days later. If the ad beats your click-through benchmark within 14 days, the bonus is paid automatically.'],
            ['Can I use my own creators or run a contest?', 'Yes. Each campaign can auto-match, let you hand-pick, or run as an open contest where you only pay prize winners.'],
            ['Can I sign up with Google, Apple or Facebook?', 'Yes — or with email and password. The same login can work on both the brand and the creator side.'],
          ].map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium text-fg transition-colors group-open:text-rose">
                {q}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-subtle text-muted transition group-open:rotate-180 group-open:bg-grad group-open:text-pure-white"><ChevronDown size={16} /></span>
              </summary>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* ── Final CTA ── */}
      <section className="px-5 pb-20">
        <Reveal>
          <div className="bg-grad relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-8 py-16 text-center text-pure-white md:px-16 md:py-24">
            <div aria-hidden className="blob left-[-8%] top-[-30%] h-[320px] w-[320px] bg-lime opacity-30" />
            <div aria-hidden className="blob bottom-[-40%] right-[-6%] h-[380px] w-[380px] bg-violet opacity-60 [animation-delay:-8s]" />
            {[clips[5], clips[9]].map((c, k) => (
              <motion.img key={c.src} src={c.src} alt="" aria-hidden loading="lazy"
                initial={{ opacity: 0, y: 40, rotate: k ? 10 : -10 }} whileInView={{ opacity: 1, y: 0, rotate: k ? 8 : -8 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.2 + k * 0.1, ease }}
                className={cx('absolute top-[18%] hidden aspect-[9/16] w-[150px] rounded-2xl object-cover shadow-2xl ring-4 ring-pure-white/25 xl:block', k ? 'right-10' : 'left-10')} />
            ))}
            <div className="relative">
            <h2 className="title-serif mx-auto max-w-2xl text-[34px] leading-tight md:text-[52px]">Every campaign should make the next creative <span className="italic">better.</span></h2>
            <p className="mx-auto mt-4 max-w-xl text-[15.5px] opacity-85">Set up in minutes. Your first brief can be live today.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {user && home ? (
                <Link to={home} className="inline-flex h-12 items-center gap-2 rounded-lg bg-pure-white px-6 text-[15px] font-medium text-pure-black">Open your dashboard <ArrowRight size={16} /></Link>
              ) : (
                <>
                  <Link to="/signup?as=brand" className="inline-flex h-12 items-center gap-2 rounded-lg bg-pure-white px-6 text-[15px] font-medium text-pure-black hover:opacity-90">Start as a brand <ArrowRight size={16} /></Link>
                  <Link to="/signup?as=creator" className="inline-flex h-12 items-center gap-2 rounded-lg border border-current px-6 text-[15px] font-medium opacity-90 hover:opacity-100">Join as a creator</Link>
                </>
              )}
            </div>
            {!user && <p className="mt-5 text-[13.5px] opacity-80">Already have an account? <Link to="/login" className="font-medium underline underline-offset-4">Log in</Link></p>}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5"><Logo size={26} /><span className="font-semibold">Glink</span></div>
            <p className="mt-3 max-w-xs text-[13px] text-muted">UGC that gets better with every campaign.</p>
          </div>
          {[
            ['Product', [['How it works', '#how'], ['Pricing', '#pricing'], ['FAQ', '#faq']]],
            ['Brands', [['Start as a brand', '/signup?as=brand'], ['Log in', '/login']]],
            ['Creators', [['Join as a creator', '/signup?as=creator'], ['Log in', '/login']]],
          ].map(([h, links]) => (
            <div key={h as string}>
              <Label className="mb-3">{h as string}</Label>
              <ul className="space-y-2 text-[13.5px]">
                {(links as string[][]).map(([l, to]) => <li key={l}>{to.startsWith('#') ? <a href={to} className="text-muted hover:text-fg">{l}</a> : <Link to={to} className="text-muted hover:text-fg">{l}</Link>}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 border-t border-line px-5 py-6 text-[12.5px] text-faint">
          <span>© 2026 Glink</span><span>Light and dark mode follow your device.</span>
        </div>
      </footer>
    </div>
  )
}

/** Full-bleed photo across the top of a padded card. */
function SidePhoto({ src }: { src: string }) {
  return (
    <div className="-mx-8 -mt-8 mb-8 overflow-hidden">
      <motion.img src={src} alt="" loading="lazy" initial={{ scale: 1.08 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease }}
        className="aspect-[16/9] w-full object-cover" />
    </div>
  )
}
