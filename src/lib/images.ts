// Photos live in public/images (Unsplash License, sources in public/images/CREDITS.md).
const img = (name: string) => `/images/${name}.webp`

export const photos = {
  hero: img('hero'),
  auth: img('auth'),
  brands: img('brands'),
  creators: img('creators'),
  brandHome: img('product-serum'),
  creatorHome: img('creator-home'),
}

export type Clip = { src: string; handle: string; caption: string; sound: string; views: string; likes: number; style: string; check: string }

/** Vertical clips for the social-feed sections of the landing page. Handles are fictional. */
export const clips: Clip[] = [
  { src: img('frame-hero'), handle: '@mayamakesitsimple', caption: 'I over-exfoliated for 2 years. Here’s what fixed it', sound: 'original sound — maya', views: '128.4K', likes: 18200, style: 'Confession hook', check: '92% match' },
  { src: img('frame-laugh'), handle: '@itsdanaontheday', caption: 'Me reading the ingredients list out loud', sound: 'laugh track — dana', views: '412K', likes: 51800, style: 'Reaction', check: 'Pre-flight passed' },
  { src: img('frame-food'), handle: '@platedbypia', caption: 'Rating every snack in my bag, honestly', sound: 'lofi kitchen — pia', views: '86.1K', likes: 9400, style: 'Review', check: 'Approved' },
  { src: img('frame-sofa'), handle: '@noahs.notes', caption: 'Day 14 of the barrier reset. Look at this', sound: 'original sound — noah', views: '203K', likes: 27600, style: 'Before / after', check: '+$150 bonus' },
  { src: img('frame-selfie'), handle: '@kai.films', caption: 'POV: you finally found a gym bag that fits', sound: 'night drive — kai', views: '57.9K', likes: 6100, style: 'POV', check: 'Pre-flight passed' },
  { src: img('frame-smile'), handle: '@zuri.glows', caption: 'My 3-step morning routine (no filter)', sound: 'morning light — zuri', views: '341K', likes: 44300, style: 'Routine', check: '96% match' },
  { src: img('frame-cooking'), handle: '@twoforbrunch', caption: 'We tried the 5-minute version so you don’t have to', sound: 'sunday brunch — duo', views: '98.7K', likes: 12100, style: 'Duet', check: 'Approved' },
  { src: img('frame-ring'), handle: '@lightsbyleon', caption: 'The lighting trick nobody tells you about', sound: 'synthwave — leon', views: '1.2M', likes: 162000, style: 'Tutorial', check: 'Winning ad' },
  { src: img('frame-mirror'), handle: '@sofi.skin', caption: 'Esthetician explains: why “miracle” is a red flag', sound: 'original sound — sofia', views: '74.2K', likes: 8800, style: 'Explainer', check: 'Pre-flight passed' },
  { src: img('frame-dog'), handle: '@leoanddoug', caption: 'Doug approves of exactly one product. This is it', sound: 'walkies — leo', views: '688K', likes: 93500, style: 'Storytelling', check: '+$150 bonus' },
  { src: img('frame-chat'), handle: '@mei.talks', caption: 'Storytime: the reply that changed my mind', sound: 'storytime — mei', views: '152K', likes: 19900, style: 'Storytime', check: '88% match' },
  { src: img('frame-portrait'), handle: '@jaydenwalks', caption: 'Three things I pack for every city trip', sound: 'city walk — jayden', views: '45.3K', likes: 5200, style: 'Listicle', check: 'Approved' },
  { src: img('frame-studio'), handle: '@benbuilds', caption: 'Unboxing my new setup — honest first take', sound: 'studio session — ben', views: '63.8K', likes: 7400, style: 'Unboxing', check: 'Pre-flight passed' },
  { src: img('frame-hands'), handle: '@priyaathome', caption: 'Night routine in warm light, start to finish', sound: 'slow evenings — priya', views: '119K', likes: 15700, style: 'ASMR', check: 'Approved' },
  { src: img('frame-changing'), handle: '@styledbyrae', caption: 'Trying on everything I almost returned', sound: 'try-on haul — rae', views: '230K', likes: 30400, style: 'Try-on', check: '91% match' },
  { src: img('frame-tripod'), handle: '@movewithana', caption: '10 minutes, no equipment, sore tomorrow', sound: 'warm up — ana', views: '91.5K', likes: 10800, style: 'Routine', check: 'Winning ad' },
]

export const compactCount = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K` : `${n}`

const pick = (list: string[], key: string) => list[[...key].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % list.length]

/** A stand-in product photo for a campaign until brands can upload their own. */
export function campaignImage(c: { id: string; product: string; category: string }) {
  const p = c.product.toLowerCase()
  if (p.includes('mask') || p.includes('cream')) return img('product-mask')
  if (p.includes('serum') || p.includes('oil')) return img('product-serum')
  if (/skin|beauty/i.test(c.category)) return pick([img('product-serum'), img('product-texture'), img('product-mask')], c.id)
  return pick([img('creator-ship'), img('creator-camera'), img('creator-street')], c.id)
}

/** A cover photo for a creator profile, chosen from their niches. */
export function creatorCover(c: { id: string; niches: string[] }) {
  if (c.niches.some(n => /pet|dog|cat/i.test(n))) return img('creator-pets')
  return pick([img('creator-home'), img('creator-camera'), img('creator-street'), img('creator-ship')], c.id)
}
