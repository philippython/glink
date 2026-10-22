// Optional Claude-powered checks. Every caller has a deterministic fallback,
// so the product works without an API key; these only upgrade "review"
// items to pass/fail and enrich product analysis.

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { config } from './config.ts'
import type { PreflightItem } from './preflight.ts'

const MODEL = 'claude-opus-5-5'
let client: Anthropic | null = null
const getClient = () => (config.anthropicEnabled ? (client ??= new Anthropic()) : null)

export interface Frame { t: number; data: string } // base64 JPEG, timestamp in seconds

const ReviewSchema = z.object({
  items: z.array(z.object({
    index: z.number().int(),
    status: z.enum(['pass', 'fail', 'unclear']),
    at: z.number().nullable(),
    note: z.string(),
  })),
})

/**
 * Asks Claude to judge the brief items that the deterministic checks left as
 * "review", using sampled frames and the creator's script. Returns the items
 * with updated statuses; on any failure returns them unchanged.
 */
export async function aiReview(items: PreflightItem[], frames: Frame[], script: string | undefined): Promise<PreflightItem[]> {
  const c = getClient()
  const pending = items.map((it, index) => ({ it, index })).filter(x => x.it.status === 'review' && x.it.kind !== 'format')
  if (!c || pending.length === 0 || frames.length === 0) return items

  const content: Anthropic.ContentBlockParam[] = []
  for (const f of frames.slice(0, 8)) {
    content.push({ type: 'text', text: `Frame at ${f.t.toFixed(1)}s:` })
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.data } })
  }
  content.push({
    type: 'text',
    text: [
      'You are checking a user-generated video advert against its brief before the brand reviews it.',
      'For each brief item below, decide from the frames (and the script, if given) whether the video satisfies it.',
      '"Must include" items pass when clearly present. "Avoid" items pass when clearly absent and fail when present.',
      'Use "unclear" whenever the frames do not let you tell — do not guess. Give a timestamp (seconds) for the evidence when you can.',
      'Keep each note to one short sentence addressed to the creator.',
      script ? `\nCreator's script:\n"""${script.slice(0, 4000)}"""` : '\nNo script was provided.',
      '\nBrief items:',
      ...pending.map(p => `${p.index}. [${p.it.kind === 'must' ? 'Must include' : 'Avoid'}] ${p.it.label}`),
    ].join('\n'),
  })

  try {
    const res = await c.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low', format: zodOutputFormat(ReviewSchema) },
      messages: [{ role: 'user', content }],
    })
    if (res.stop_reason === 'refusal' || !res.parsed_output) return items
    const next = items.map(i => ({ ...i }))
    for (const r of res.parsed_output.items) {
      const target = next[r.index]
      if (!target || target.status !== 'review' || r.status === 'unclear') continue
      target.status = r.status
      target.ok = r.status === 'pass'
      target.source = 'ai'
      target.at = r.at ?? target.at
      target.note = r.status === 'fail' ? r.note || target.note : undefined
    }
    return next
  } catch (e) {
    console.warn('[ai] pre-flight review skipped:', e instanceof Error ? e.message : e)
    return items
  }
}

const ProductSchema = z.object({
  summary: z.string(),
  category: z.string(),
  audiences: z.array(z.object({ name: z.string(), share: z.number(), insight: z.string() })),
  objections: z.array(z.object({ text: z.string(), severity: z.number() })),
  angles: z.array(z.object({ name: z.string(), why: z.string(), strength: z.number() })),
  usps: z.array(z.string()),
})
export type ProductAnalysis = z.infer<typeof ProductSchema>

/** Turns a product page's text into audiences, objections and creative angles. */
export async function aiAnalyzeProduct(page: { url: string; title: string; description: string; text: string }): Promise<ProductAnalysis | null> {
  const c = getClient()
  if (!c) return null
  try {
    const res = await c.messages.parse({
      model: MODEL,
      max_tokens: 6000,
      output_config: { effort: 'medium', format: zodOutputFormat(ProductSchema) },
      messages: [{
        role: 'user',
        content: [
          'Analyse this product page for a UGC (user-generated content) ad campaign.',
          'Return: a two-sentence summary of the product and buyer; one category from Skincare, Beauty, Wellness, Fitness, Food & Bev, Technology, Finance, Pets, Fashion, Home, Parenting, Gaming, Travel;',
          '2–4 audience segments with an estimated share (summing to 100) and one-line insight; 3–4 purchase objections with severity 0–100;',
          '3–4 creative angles (e.g. Confession, Demonstration, Problem-solution, Testimonial, Unboxing) with why and strength 0–100; and 3 unique selling points.',
          'Only use what the page supports; keep it concrete.',
          `\nURL: ${page.url}\nTitle: ${page.title}\nDescription: ${page.description}\n\nPage text:\n"""${page.text.slice(0, 20000)}"""`,
        ].join('\n'),
      }],
    })
    return res.stop_reason === 'refusal' ? null : res.parsed_output
  } catch (e) {
    console.warn('[ai] product analysis skipped:', e instanceof Error ? e.message : e)
    return null
  }
}
