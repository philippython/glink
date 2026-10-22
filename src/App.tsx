import { MotionConfig } from 'framer-motion'
import { useEffect } from 'react'
import { useStore } from './data/store'
import { useTheme, type ThemePref } from './lib/theme'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import Landing from './pages/Landing'
import { BrandSetup, ChoosePath, CreatorSetup, ForgotPassword, Login, Preparing, ResetPassword } from './pages/auth/Onboarding'
// Brand side
import BrandHome from './pages/brand/Home'
import Campaigns from './pages/brand/Campaigns'
import NewCampaign from './pages/brand/NewCampaign'
import BrandCreators from './pages/brand/Creators'
import CreatorDetail from './pages/brand/CreatorDetail'
import { ReviewCreative, Reviews } from './pages/brand/Reviews'
import BrandPerformance from './pages/brand/Performance'
import Billing from './pages/brand/Billing'
import Team from './pages/brand/Team'
// Intelligence screens (kept from the first version, now part of the brand side)
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Contests from './pages/Contests'
import Experiments from './pages/Performance'
import Genome from './pages/Genome'
import NextExperiment from './pages/NextExperiment'
// Creator side
import CreatorHome from './pages/creator/Home'
import { OpportunityDetail, Opportunities } from './pages/creator/Opportunities'
import { Mission, MyWork } from './pages/creator/MyWork'
import CreatorPerformance from './pages/creator/Performance'
import Earnings from './pages/creator/Earnings'
import CreatorProfilePage from './pages/creator/Profile'
// Shared
import Notifications from './pages/shared/Notifications'
import Settings from './pages/shared/Settings'

/** Applies the theme saved on the user's profile when they sign in (device choice still wins afterwards). */
function ThemeSync() {
  const { user } = useStore()
  const { setPref } = useTheme()
  useEffect(() => { if (user?.theme) setPref(user.theme as ThemePref) }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeSync />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login mode="signup" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={<ChoosePath />} />
        <Route path="/onboarding/brand" element={<BrandSetup />} />
        <Route path="/onboarding/creator" element={<CreatorSetup />} />
        <Route path="/onboarding/setup" element={<Preparing />} />

        <Route path="/brand" element={<Shell role="brand" />}>
          <Route index element={<BrandHome />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaigns/new" element={<NewCampaign />} />
          <Route path="creators" element={<BrandCreators />} />
          <Route path="creators/:id" element={<CreatorDetail />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="reviews/:id" element={<ReviewCreative />} />
          <Route path="performance" element={<BrandPerformance />} />
          <Route path="performance/experiments" element={<Experiments />} />
          <Route path="genome" element={<Navigate to="/brand/genome/cr-247" replace />} />
          <Route path="genome/:id" element={<Genome />} />
          <Route path="next" element={<NextExperiment />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="contests" element={<Contests />} />
          <Route path="billing" element={<Billing />} />
          <Route path="team" element={<Team />} />
          <Route path="notifications" element={<Notifications role="brand" />} />
          <Route path="settings" element={<Settings role="brand" />} />
        </Route>

        <Route path="/creator" element={<Shell role="creator" />}>
          <Route index element={<CreatorHome />} />
          <Route path="opportunities" element={<Opportunities />} />
          <Route path="opportunities/:id" element={<OpportunityDetail />} />
          <Route path="work" element={<MyWork />} />
          <Route path="work/:id" element={<Mission />} />
          <Route path="performance" element={<CreatorPerformance />} />
          <Route path="earnings" element={<Earnings />} />
          <Route path="notifications" element={<Notifications role="creator" />} />
          <Route path="settings" element={<Settings role="creator" />} />
          <Route path="profile" element={<CreatorProfilePage />} />
        </Route>

        <Route path="/app/*" element={<Navigate to="/brand" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MotionConfig>
  )
}
