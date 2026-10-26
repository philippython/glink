// Shared reference data for the server and the web app: countries, categories, goals and
// target-customer suggestions. Keep it dependency-free — both sides import it directly.

// ─── Countries ──────────────────────────────────────────────────────────────
// [name, ISO 3166-1 alpha-2, region]. Regions feed market fit in matching:
// NA North America · LA Latin America & Caribbean · EU Europe · ME Middle East · AF Africa · AS Asia · OC Oceania
export type Region = 'NA' | 'LA' | 'EU' | 'ME' | 'AF' | 'AS' | 'OC'
const C: [string, string, Region][] = [
  ['Afghanistan', 'AF', 'AS'], ['Albania', 'AL', 'EU'], ['Algeria', 'DZ', 'AF'], ['Andorra', 'AD', 'EU'], ['Angola', 'AO', 'AF'],
  ['Antigua and Barbuda', 'AG', 'LA'], ['Argentina', 'AR', 'LA'], ['Armenia', 'AM', 'AS'], ['Australia', 'AU', 'OC'], ['Austria', 'AT', 'EU'],
  ['Azerbaijan', 'AZ', 'AS'], ['Bahamas', 'BS', 'LA'], ['Bahrain', 'BH', 'ME'], ['Bangladesh', 'BD', 'AS'], ['Barbados', 'BB', 'LA'],
  ['Belarus', 'BY', 'EU'], ['Belgium', 'BE', 'EU'], ['Belize', 'BZ', 'LA'], ['Benin', 'BJ', 'AF'], ['Bhutan', 'BT', 'AS'],
  ['Bolivia', 'BO', 'LA'], ['Bosnia and Herzegovina', 'BA', 'EU'], ['Botswana', 'BW', 'AF'], ['Brazil', 'BR', 'LA'], ['Brunei', 'BN', 'AS'],
  ['Bulgaria', 'BG', 'EU'], ['Burkina Faso', 'BF', 'AF'], ['Burundi', 'BI', 'AF'], ['Cabo Verde', 'CV', 'AF'], ['Cambodia', 'KH', 'AS'],
  ['Cameroon', 'CM', 'AF'], ['Canada', 'CA', 'NA'], ['Central African Republic', 'CF', 'AF'], ['Chad', 'TD', 'AF'], ['Chile', 'CL', 'LA'],
  ['China', 'CN', 'AS'], ['Colombia', 'CO', 'LA'], ['Comoros', 'KM', 'AF'], ['Congo', 'CG', 'AF'], ['Costa Rica', 'CR', 'LA'],
  ['Côte d’Ivoire', 'CI', 'AF'], ['Croatia', 'HR', 'EU'], ['Cuba', 'CU', 'LA'], ['Cyprus', 'CY', 'EU'], ['Czechia', 'CZ', 'EU'],
  ['Democratic Republic of the Congo', 'CD', 'AF'], ['Denmark', 'DK', 'EU'], ['Djibouti', 'DJ', 'AF'], ['Dominica', 'DM', 'LA'], ['Dominican Republic', 'DO', 'LA'],
  ['Ecuador', 'EC', 'LA'], ['Egypt', 'EG', 'AF'], ['El Salvador', 'SV', 'LA'], ['Equatorial Guinea', 'GQ', 'AF'], ['Eritrea', 'ER', 'AF'],
  ['Estonia', 'EE', 'EU'], ['Eswatini', 'SZ', 'AF'], ['Ethiopia', 'ET', 'AF'], ['Fiji', 'FJ', 'OC'], ['Finland', 'FI', 'EU'],
  ['France', 'FR', 'EU'], ['Gabon', 'GA', 'AF'], ['Gambia', 'GM', 'AF'], ['Georgia', 'GE', 'AS'], ['Germany', 'DE', 'EU'],
  ['Ghana', 'GH', 'AF'], ['Greece', 'GR', 'EU'], ['Grenada', 'GD', 'LA'], ['Guatemala', 'GT', 'LA'], ['Guinea', 'GN', 'AF'],
  ['Guinea-Bissau', 'GW', 'AF'], ['Guyana', 'GY', 'LA'], ['Haiti', 'HT', 'LA'], ['Honduras', 'HN', 'LA'], ['Hong Kong', 'HK', 'AS'],
  ['Hungary', 'HU', 'EU'], ['Iceland', 'IS', 'EU'], ['India', 'IN', 'AS'], ['Indonesia', 'ID', 'AS'], ['Iran', 'IR', 'ME'],
  ['Iraq', 'IQ', 'ME'], ['Ireland', 'IE', 'EU'], ['Israel', 'IL', 'ME'], ['Italy', 'IT', 'EU'], ['Jamaica', 'JM', 'LA'],
  ['Japan', 'JP', 'AS'], ['Jordan', 'JO', 'ME'], ['Kazakhstan', 'KZ', 'AS'], ['Kenya', 'KE', 'AF'], ['Kiribati', 'KI', 'OC'],
  ['Kosovo', 'XK', 'EU'], ['Kuwait', 'KW', 'ME'], ['Kyrgyzstan', 'KG', 'AS'], ['Laos', 'LA', 'AS'], ['Latvia', 'LV', 'EU'],
  ['Lebanon', 'LB', 'ME'], ['Lesotho', 'LS', 'AF'], ['Liberia', 'LR', 'AF'], ['Libya', 'LY', 'AF'], ['Liechtenstein', 'LI', 'EU'],
  ['Lithuania', 'LT', 'EU'], ['Luxembourg', 'LU', 'EU'], ['Madagascar', 'MG', 'AF'], ['Malawi', 'MW', 'AF'], ['Malaysia', 'MY', 'AS'],
  ['Maldives', 'MV', 'AS'], ['Mali', 'ML', 'AF'], ['Malta', 'MT', 'EU'], ['Marshall Islands', 'MH', 'OC'], ['Mauritania', 'MR', 'AF'],
  ['Mauritius', 'MU', 'AF'], ['Mexico', 'MX', 'LA'], ['Micronesia', 'FM', 'OC'], ['Moldova', 'MD', 'EU'], ['Monaco', 'MC', 'EU'],
  ['Mongolia', 'MN', 'AS'], ['Montenegro', 'ME', 'EU'], ['Morocco', 'MA', 'AF'], ['Mozambique', 'MZ', 'AF'], ['Myanmar', 'MM', 'AS'],
  ['Namibia', 'NA', 'AF'], ['Nauru', 'NR', 'OC'], ['Nepal', 'NP', 'AS'], ['Netherlands', 'NL', 'EU'], ['New Zealand', 'NZ', 'OC'],
  ['Nicaragua', 'NI', 'LA'], ['Niger', 'NE', 'AF'], ['Nigeria', 'NG', 'AF'], ['North Korea', 'KP', 'AS'], ['North Macedonia', 'MK', 'EU'],
  ['Norway', 'NO', 'EU'], ['Oman', 'OM', 'ME'], ['Pakistan', 'PK', 'AS'], ['Palau', 'PW', 'OC'], ['Palestine', 'PS', 'ME'],
  ['Panama', 'PA', 'LA'], ['Papua New Guinea', 'PG', 'OC'], ['Paraguay', 'PY', 'LA'], ['Peru', 'PE', 'LA'], ['Philippines', 'PH', 'AS'],
  ['Poland', 'PL', 'EU'], ['Portugal', 'PT', 'EU'], ['Puerto Rico', 'PR', 'LA'], ['Qatar', 'QA', 'ME'], ['Romania', 'RO', 'EU'],
  ['Russia', 'RU', 'EU'], ['Rwanda', 'RW', 'AF'], ['Saint Kitts and Nevis', 'KN', 'LA'], ['Saint Lucia', 'LC', 'LA'], ['Saint Vincent and the Grenadines', 'VC', 'LA'],
  ['Samoa', 'WS', 'OC'], ['San Marino', 'SM', 'EU'], ['São Tomé and Príncipe', 'ST', 'AF'], ['Saudi Arabia', 'SA', 'ME'], ['Senegal', 'SN', 'AF'],
  ['Serbia', 'RS', 'EU'], ['Seychelles', 'SC', 'AF'], ['Sierra Leone', 'SL', 'AF'], ['Singapore', 'SG', 'AS'], ['Slovakia', 'SK', 'EU'],
  ['Slovenia', 'SI', 'EU'], ['Solomon Islands', 'SB', 'OC'], ['Somalia', 'SO', 'AF'], ['South Africa', 'ZA', 'AF'], ['South Korea', 'KR', 'AS'],
  ['South Sudan', 'SS', 'AF'], ['Spain', 'ES', 'EU'], ['Sri Lanka', 'LK', 'AS'], ['Sudan', 'SD', 'AF'], ['Suriname', 'SR', 'LA'],
  ['Sweden', 'SE', 'EU'], ['Switzerland', 'CH', 'EU'], ['Syria', 'SY', 'ME'], ['Taiwan', 'TW', 'AS'], ['Tajikistan', 'TJ', 'AS'],
  ['Tanzania', 'TZ', 'AF'], ['Thailand', 'TH', 'AS'], ['Timor-Leste', 'TL', 'AS'], ['Togo', 'TG', 'AF'], ['Tonga', 'TO', 'OC'],
  ['Trinidad and Tobago', 'TT', 'LA'], ['Tunisia', 'TN', 'AF'], ['Türkiye', 'TR', 'ME'], ['Turkmenistan', 'TM', 'AS'], ['Tuvalu', 'TV', 'OC'],
  ['Uganda', 'UG', 'AF'], ['Ukraine', 'UA', 'EU'], ['United Arab Emirates', 'AE', 'ME'], ['United Kingdom', 'GB', 'EU'], ['United States', 'US', 'NA'],
  ['Uruguay', 'UY', 'LA'], ['Uzbekistan', 'UZ', 'AS'], ['Vanuatu', 'VU', 'OC'], ['Vatican City', 'VA', 'EU'], ['Venezuela', 'VE', 'LA'],
  ['Vietnam', 'VN', 'AS'], ['Yemen', 'YE', 'ME'], ['Zambia', 'ZM', 'AF'], ['Zimbabwe', 'ZW', 'AF'],
]
export const COUNTRIES = C.map(([name]) => name)
export const COUNTRY_CODE: Record<string, string> = Object.fromEntries(C.map(([n, code]) => [n, code]))
export const COUNTRY_REGION: Record<string, Region> = Object.fromEntries(C.map(([n, , r]) => [n, r]))
/** Countries where English is an official or dominant business language (for shared-language market fit). */
export const ENGLISH_SPEAKING = new Set(['United States', 'Canada', 'United Kingdom', 'Ireland', 'Australia', 'New Zealand', 'Nigeria', 'Ghana',
  'Kenya', 'South Africa', 'Uganda', 'Rwanda', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia', 'Malawi', 'Sierra Leone', 'Liberia', 'Gambia',
  'Tanzania', 'Cameroon', 'India', 'Pakistan', 'Philippines', 'Singapore', 'Malaysia', 'Jamaica', 'Trinidad and Tobago', 'Bahamas',
  'Barbados', 'Malta', 'Fiji', 'Hong Kong'])

// ─── Goals ──────────────────────────────────────────────────────────────────
// Weights say which learned strength matters most for each goal (hook / retention / conversion, sum 1).
export const GOALS = {
  'Purchases': { hint: 'Drive sales on your store or marketplace', hook: 0.25, retention: 0.25, conversion: 0.5 },
  'Subscriptions': { hint: 'Win recurring customers or members', hook: 0.25, retention: 0.3, conversion: 0.45 },
  'Bookings': { hint: 'Fill tables, rooms, classes or appointments', hook: 0.25, retention: 0.3, conversion: 0.45 },
  'Sign-ups': { hint: 'Get people to create an account', hook: 0.25, retention: 0.35, conversion: 0.4 },
  'App installs': { hint: 'Get your app downloaded and opened', hook: 0.35, retention: 0.25, conversion: 0.4 },
  'Leads': { hint: 'Collect enquiries, demos or quote requests', hook: 0.25, retention: 0.35, conversion: 0.4 },
  'Store visits': { hint: 'Bring people into a shop, venue or dealership', hook: 0.45, retention: 0.35, conversion: 0.2 },
  'Product launch': { hint: 'Make a new product impossible to miss', hook: 0.45, retention: 0.35, conversion: 0.2 },
  'Social proof': { hint: 'Honest reviews and testimonials to reuse', hook: 0.3, retention: 0.45, conversion: 0.25 },
  'Awareness': { hint: 'Reach as many of the right people as possible', hook: 0.55, retention: 0.35, conversion: 0.1 },
  'Engagement': { hint: 'Comments, shares and follows', hook: 0.5, retention: 0.4, conversion: 0.1 },
  'Content testing': { hint: 'Try several angles to find what works', hook: 0.4, retention: 0.4, conversion: 0.2 },
} as const
export type Goal = keyof typeof GOALS
export const GOAL_NAMES = Object.keys(GOALS) as Goal[]

// ─── Categories ─────────────────────────────────────────────────────────────
// goals: the goals that suit the category, best first. related: categories whose creators are a close fit.
type CategoryInfo = { goals: Goal[]; related: string[]; customers: string[] }
const commerce: Goal[] = ['Purchases', 'Product launch', 'Social proof', 'Awareness', 'Content testing']
export const CATEGORY_INFO: Record<string, CategoryInfo> = {
  'Skincare': { goals: ['Purchases', 'Social proof', 'Product launch', 'Subscriptions', 'Content testing', 'Awareness'], related: ['Beauty', 'Wellness', 'Haircare'], customers: ['Sensitive skin', 'Acne-prone skin', 'Over-exfoliators', 'Anti-ageing seekers', 'Skincare beginners', 'Men’s grooming'] },
  'Beauty': { goals: ['Purchases', 'Product launch', 'Social proof', 'Engagement', 'Content testing', 'Awareness'], related: ['Skincare', 'Haircare', 'Fragrance', 'Fashion'], customers: ['Makeup lovers', 'Beauty beginners', 'Clean-beauty shoppers', 'Brides-to-be', 'Gen Z beauty fans'] },
  'Haircare': { goals: ['Purchases', 'Social proof', 'Subscriptions', 'Product launch', 'Content testing'], related: ['Beauty', 'Skincare'], customers: ['Curly hair', 'Thinning hair', 'Coloured hair', 'Natural hair', 'Barbershop clients'] },
  'Fragrance': { goals: ['Purchases', 'Product launch', 'Awareness', 'Engagement', 'Content testing'], related: ['Beauty', 'Fashion'], customers: ['Gift shoppers', 'Luxury shoppers', 'Fragrance collectors'] },
  'Wellness': { goals: ['Purchases', 'Subscriptions', 'Social proof', 'Sign-ups', 'Content testing', 'Awareness'], related: ['Fitness', 'Skincare', 'Food & Bev', 'Health'], customers: ['Stress and sleep', 'Gut health', 'Supplement users', 'Mindfulness seekers', 'Busy professionals'] },
  'Health': { goals: ['Sign-ups', 'Bookings', 'Leads', 'App installs', 'Awareness', 'Social proof'], related: ['Wellness', 'Fitness'], customers: ['Patients', 'Carers', 'Chronic-condition communities', 'Health-conscious adults'] },
  'Fitness': { goals: ['Subscriptions', 'App installs', 'Purchases', 'Sign-ups', 'Engagement', 'Content testing'], related: ['Wellness', 'Sports & Outdoors', 'Food & Bev'], customers: ['Gym-goers', 'Home workout fans', 'Runners', 'Beginners', 'Yoga and pilates', 'Strength training'] },
  'Sports & Outdoors': { goals: ['Purchases', 'Product launch', 'Engagement', 'Awareness', 'Content testing'], related: ['Fitness', 'Travel'], customers: ['Hikers and campers', 'Cyclists', 'Football fans', 'Weekend adventurers'] },
  'Food & Bev': { goals: ['Purchases', 'Store visits', 'Product launch', 'Social proof', 'Engagement', 'Awareness'], related: ['Restaurants', 'Wellness', 'Kitchen'], customers: ['Home cooks', 'Snack lovers', 'Plant-based eaters', 'Coffee drinkers', 'Health-conscious eaters'] },
  'Restaurants': { goals: ['Store visits', 'Bookings', 'Awareness', 'Engagement', 'Social proof'], related: ['Food & Bev', 'Travel', 'Entertainment'], customers: ['Foodies', 'Date-night couples', 'Families eating out', 'Students on a budget'] },
  'Kitchen': { goals: ['Purchases', 'Product launch', 'Social proof', 'Content testing'], related: ['Home', 'Food & Bev'], customers: ['Home cooks', 'New homeowners', 'Meal preppers'] },
  'Home': { goals: ['Purchases', 'Social proof', 'Product launch', 'Store visits', 'Content testing'], related: ['Kitchen', 'Parenting', 'Sustainability'], customers: ['Homeowners', 'Renters', 'DIY fans', 'Interior lovers', 'New movers'] },
  'Fashion': { goals: commerce, related: ['Beauty', 'Jewelry & Accessories', 'Fragrance'], customers: ['Streetwear fans', 'Workwear shoppers', 'Plus-size shoppers', 'Sustainable fashion', 'Gen Z shoppers'] },
  'Jewelry & Accessories': { goals: ['Purchases', 'Product launch', 'Social proof', 'Awareness'], related: ['Fashion', 'Beauty'], customers: ['Gift shoppers', 'Brides-to-be', 'Luxury shoppers', 'Everyday wear'] },
  'Parenting': { goals: ['Purchases', 'Subscriptions', 'Social proof', 'Sign-ups', 'Awareness'], related: ['Home', 'Wellness', 'Education'], customers: ['New parents', 'Expecting parents', 'Parents of toddlers', 'School-age families'] },
  'Pets': { goals: ['Purchases', 'Subscriptions', 'Social proof', 'Engagement', 'Awareness'], related: ['Home', 'Wellness'], customers: ['Dog owners', 'Cat owners', 'New pet owners', 'Senior pets'] },
  'Technology': { goals: ['Purchases', 'Product launch', 'Social proof', 'Awareness', 'Content testing'], related: ['Apps & Software', 'Gaming'], customers: ['Early adopters', 'Remote workers', 'Students', 'Creators and streamers'] },
  'Apps & Software': { goals: ['App installs', 'Sign-ups', 'Subscriptions', 'Awareness', 'Content testing'], related: ['Technology', 'Finance', 'Education'], customers: ['Small business owners', 'Students', 'Remote workers', 'Freelancers', 'Productivity fans'] },
  'B2B & SaaS': { goals: ['Leads', 'Sign-ups', 'Awareness', 'Social proof', 'Content testing'], related: ['Apps & Software', 'Finance'], customers: ['Founders', 'Marketing teams', 'Small business owners', 'Operations managers'] },
  'Finance': { goals: ['Sign-ups', 'App installs', 'Leads', 'Awareness', 'Social proof'], related: ['Apps & Software', 'Education', 'B2B & SaaS'], customers: ['First-time investors', 'Young professionals', 'Savers', 'Freelancers', 'Small business owners'] },
  'Education': { goals: ['Sign-ups', 'Leads', 'Purchases', 'Subscriptions', 'Awareness'], related: ['Apps & Software', 'Parenting', 'Finance'], customers: ['Students', 'Career changers', 'Parents', 'Lifelong learners', 'Exam takers'] },
  'Gaming': { goals: ['App installs', 'Purchases', 'Engagement', 'Product launch', 'Awareness'], related: ['Technology', 'Entertainment'], customers: ['Mobile gamers', 'PC gamers', 'Console gamers', 'Casual players'] },
  'Entertainment': { goals: ['Awareness', 'Bookings', 'Engagement', 'App installs', 'Product launch'], related: ['Gaming', 'Restaurants', 'Travel'], customers: ['Music fans', 'Film and TV fans', 'Event-goers', 'Book lovers'] },
  'Travel': { goals: ['Bookings', 'Awareness', 'App installs', 'Engagement', 'Content testing'], related: ['Restaurants', 'Sports & Outdoors', 'Entertainment'], customers: ['Frequent travellers', 'Budget travellers', 'Luxury travellers', 'Families on holiday', 'Digital nomads'] },
  'Automotive': { goals: ['Leads', 'Store visits', 'Bookings', 'Awareness', 'Social proof'], related: ['Technology', 'Sports & Outdoors'], customers: ['First-time buyers', 'EV-curious drivers', 'Car enthusiasts', 'Families'] },
  'Real Estate': { goals: ['Leads', 'Bookings', 'Awareness', 'Social proof'], related: ['Home', 'Finance'], customers: ['First-time buyers', 'Renters', 'Investors', 'Relocators'] },
  'Sustainability': { goals: ['Purchases', 'Awareness', 'Social proof', 'Engagement', 'Sign-ups'], related: ['Home', 'Fashion', 'Food & Bev'], customers: ['Eco-conscious shoppers', 'Zero-waste fans', 'Ethical shoppers'] },
}
export const CATEGORIES = Object.keys(CATEGORY_INFO)
export const goalsFor = (category: string): Goal[] => CATEGORY_INFO[category]?.goals ?? GOAL_NAMES

// ─── Target customers ───────────────────────────────────────────────────────
export const AUDIENCES = [
  'Gen Z', 'Millennials', 'Gen X', 'Over 50s', 'Students', 'Young professionals', 'Busy professionals', 'Remote workers', 'Freelancers',
  'Small business owners', 'Founders', 'New parents', 'Expecting parents', 'Parents of toddlers', 'Stay-at-home parents', 'Homeowners', 'Renters',
  'First-time buyers', 'Budget shoppers', 'Luxury shoppers', 'Gift shoppers', 'Eco-conscious shoppers', 'Early adopters', 'Gamers',
  'Fitness enthusiasts', 'Gym-goers', 'Runners', 'Yoga and pilates', 'Home cooks', 'Foodies', 'Plant-based eaters', 'Coffee drinkers',
  'Pet owners', 'Dog owners', 'Cat owners', 'Frequent travellers', 'Digital nomads', 'Music fans', 'Sports fans', 'Car enthusiasts',
  'Sensitive skin', 'Acne-prone skin', 'Over-exfoliators', 'Men’s grooming', 'Makeup lovers', 'Curly hair', 'Brides-to-be',
  'Health-conscious adults', 'Stress and sleep', 'Supplement users', 'Career changers', 'Lifelong learners', 'First-time investors',
]
/** Suggestions for a category first, then the general list, without duplicates. */
export const audienceSuggestions = (category?: string) => [...new Set([...(category ? CATEGORY_INFO[category]?.customers ?? [] : []), ...AUDIENCES])]

// ─── Bonus rules ────────────────────────────────────────────────────────────
// Which result earns the performance bonus. "lower" metrics win by coming in under the threshold.
export const BONUS_METRICS = {
  ctr: { label: 'Click-through rate', unit: '%', better: 'higher', suggested: 1.8 },
  cvr: { label: 'Conversion rate', unit: '%', better: 'higher', suggested: 3 },
  hook: { label: '3-second view rate (hook)', unit: '%', better: 'higher', suggested: 30 },
  hold: { label: '15-second view rate (hold)', unit: '%', better: 'higher', suggested: 15 },
  cpa: { label: 'Cost per result', unit: '$', better: 'lower', suggested: 20 },
} as const
export type BonusMetric = keyof typeof BONUS_METRICS
export const BONUS_METRIC_KEYS = Object.keys(BONUS_METRICS) as BonusMetric[]

/** Plain-language rule, e.g. "Click-through rate above 1.8% within 14 days". */
export function describeBonus(metric: BonusMetric, threshold: number, windowDays: number) {
  const m = BONUS_METRICS[metric]
  const value = m.unit === '$' ? `$${threshold}` : `${threshold}%`
  return `${m.label} ${m.better === 'higher' ? 'above' : 'below'} ${value} within ${windowDays} days`
}
