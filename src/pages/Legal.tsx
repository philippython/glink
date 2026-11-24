// Terms of Service and Privacy Policy.
// NOTE: this is a plain-language starting point written for the product as built. Have a lawyer review
// it for the countries you operate in before launch, and update `UPDATED` whenever the text changes.
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ThemeToggle } from '../components/kit'
import { Logo } from '../components/Logo'
import { cx } from '../lib/format'

const UPDATED = '21 November 2026'
const CONTACT = 'legal@glink.app'

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mt-10 text-[19px] font-semibold text-fg">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-fg-2">{children}</div>
    </section>
  )
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3">
          <Link to="/" className="flex items-center gap-2.5"><Logo size={24} /><span className="font-semibold text-fg">Glink</span></Link>
          <nav className="flex items-center gap-1 text-[13.5px]">
            {[['/terms', 'Terms'], ['/privacy', 'Privacy']].map(([to, l]) => (
              <NavLink key={to} to={to} className={({ isActive }) => cx('rounded-full px-3 py-1.5', isActive ? 'bg-subtle text-fg' : 'text-muted hover:text-fg')}>{l}</NavLink>
            ))}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <Link to="/" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-fg"><ArrowLeft size={13} /> Back to Glink</Link>
        <h1 className="title-serif mt-4 text-[38px] text-fg">{title}</h1>
        <p className="mt-1 text-[13px] text-faint">Last updated {UPDATED}</p>
        {children}
        <p className="mt-12 border-t border-line pt-6 text-[13.5px] text-muted">Questions? Email <a className="text-fg underline underline-offset-4" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
      </main>
    </div>
  )
}

export function Terms() {
  return (
    <Shell title="Terms of Service">
      <p className="mt-6 text-[15px] leading-relaxed text-fg-2">
        These terms are an agreement between you and Glink. Glink is a marketplace where brands commission short videos from creators
        and pay for them through escrow. By creating an account you agree to these terms and to our <Link to="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.
      </p>

      <Section title="1. Accounts">
        <p>You must be at least 18 and able to enter a contract. Keep your password safe; you are responsible for activity on your account.
          A brand account can have teammates with different roles (Owner, Manager, Reviewer); the Owner is responsible for what teammates do on the brand’s behalf.</p>
        <p>Information you give us, including follower counts and audience details, must be accurate.</p>
      </Section>

      <Section title="2. How campaigns work">
        <p>A brand publishes a brief with a submission timeline, payment terms and a content licence. Creators may accept or decline an invitation, or enter an open contest.
          Accepting a campaign is an agreement to deliver the videos described in the brief by its deadline, and to grant the licence set out in it.</p>
        <p>Glink’s automated checks (“pre-flight”) and match scores are aids, not guarantees. The brand decides whether a video meets the brief.</p>
      </Section>

      <Section title="3. Payments, escrow and fees">
        <p>When a brand launches a campaign, its budget (creator fees, the maximum possible bonuses or the prize pool) plus the Glink platform fee shown at launch is held from its wallet in escrow.</p>
        <p>The base fee for a video is released to the creator when the brand approves it, or automatically if the brand does not review a video that passed every check within the review period shown in the product.
          Bonuses are paid automatically when the results recorded for an ad meet the campaign’s bonus rule within its window. Contest prizes are paid to the entries the brand picks as winners.</p>
        <p>Released money becomes available to the creator after a short clearing period and is paid out to the bank account connected through our payment provider, Stripe.
          The platform fee is charged to the brand only on money actually paid to creators; the fee on unspent budget returns with it.</p>
        <p>Unused budget returns to the brand’s wallet when a campaign completes or its bonus window closes. A brand Owner can ask for wallet money that was added by card to be refunded to that card.
          Card payments are processed by Stripe; Glink does not store card or bank details.</p>
        <p>Disputing a card payment that funded work already approved and paid is a breach of these terms.</p>
      </Section>

      <Section id="licence" title="4. Content licence">
        <p>Creators keep ownership of the videos they make. When a brand approves and pays for a video (or picks it as a contest winner), the creator grants the brand a non-exclusive licence to use it
          on the platforms, for the period and in the ways (organic posts only, or also paid ads) set out in that campaign. The licence is recorded on the campaign and shown to the creator before they accept.</p>
        <p>The brand may edit, crop, caption and subtitle the video and use the creator’s name and handle to credit it. Any other use, such as on platforms not listed or after the licence ends, needs the creator’s separate agreement.</p>
        <p>Videos that are not approved, or contest entries that do not win, are not licensed to the brand and may not be used.</p>
        <p>Creators confirm that each video is their own work, that they have the rights to any music, people or places that appear in it, and that it follows the law and each platform’s rules,
          including disclosing paid partnerships (for example with #ad or the platform’s branded-content label).</p>
      </Section>

      <Section title="5. Things you must not do">
        <p>Do not make false or misleading claims about products (including medical or health claims a brand has not substantiated), upload content you do not have rights to,
          arrange payments outside Glink for work found through Glink, interfere with the service, or misuse other people’s data.</p>
      </Section>

      <Section title="6. Ending your account">
        <p>You can close your account at any time once your live campaigns and payouts are settled. We may suspend accounts that break these terms or put other users at risk,
          and will pay out any money owed for approved work unless it is subject to fraud or a dispute.</p>
      </Section>

      <Section title="7. Liability">
        <p>Glink provides the marketplace and escrow; agreements to create and use content are between brands and creators. To the extent the law allows,
          Glink is not liable for indirect losses or for the performance of any ad, and our total liability is limited to the fees you paid Glink in the 12 months before the claim.</p>
      </Section>

      <Section title="8. Changes">
        <p>We may update these terms. If a change is significant we will tell you by email or in the app before it takes effect. Live campaigns keep the payment terms and licence agreed when they launched.</p>
      </Section>
    </Shell>
  )
}

export function Privacy() {
  return (
    <Shell title="Privacy Policy">
      <p className="mt-6 text-[15px] leading-relaxed text-fg-2">This policy explains what personal data Glink collects, why, and the choices you have.</p>

      <Section title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li><b>Account details:</b> name, email, a scrambled (hashed) version of your password, and your role. If you sign in with Google, Facebook or Apple we receive your name and verified email from them.</li>
          <li><b>Profile details:</b> brand name, country and target customers; or creator display name, country, niches, bio, rates and the social channels you add.</li>
          <li><b>Work on Glink:</b> campaign briefs, uploaded videos and scripts, review notes, automated check results, ad results that brands record, and messages and notifications.</li>
          <li><b>Payments:</b> wallet and payout records. Card and bank details are collected and held by Stripe, not by Glink.</li>
          <li><b>Technical data:</b> a session cookie that keeps you signed in, and server logs (IP address, browser and time) used for security.</li>
        </ul>
      </Section>

      <Section title="How we use it">
        <p>To run the marketplace: match creators to campaigns, check videos against briefs, move money through escrow, pay creators, send account emails (such as password resets and team invites) and keep the service secure.
          Match scores use a creator’s past results on Glink. We do not sell personal data, and we do not use it for advertising.</p>
        <p>Some checks may send video frames or product pages to an AI provider (Anthropic) to review them against a brief. They are processed only to give that result.</p>
      </Section>

      <Section title="Who can see what">
        <p>Brands see creators’ public profiles and the videos submitted to their own campaigns. Creators see the briefs they are invited to and open contests.
          Uploaded videos are private: only the creator and the brand that commissioned them can watch them.</p>
        <p>We share data with the providers that run Glink: hosting, Stripe (payments and identity checks for payouts), Resend (email) and, where used, Anthropic (AI checks) — and with authorities when the law requires it.</p>
      </Section>

      <Section title="How long we keep it">
        <p>Account and campaign data is kept while your account is open. Payment and tax records are kept for as long as the law requires (usually 6–7 years). Backups are deleted on a rolling basis.</p>
      </Section>

      <Section title="Your choices and rights">
        <p>You can view and update your details in Settings. You can ask us for a copy of your data, to correct it or to delete your account by emailing us. Depending on where you live
          (for example under the GDPR, UK GDPR, Nigeria’s NDPA or California’s CCPA) you may have further rights, including to object to processing or to complain to your data protection authority.</p>
      </Section>

      <Section title="Cookies">
        <p>We use one essential cookie to keep you signed in, and store your light or dark theme choice in your browser. We do not use advertising or tracking cookies.</p>
      </Section>

      <Section title="Security">
        <p>Passwords are hashed, sessions are stored as hashes, connections are encrypted, and access to data is limited by role. No system is perfectly secure; if a breach affects you we will tell you promptly.</p>
      </Section>
    </Shell>
  )
}
