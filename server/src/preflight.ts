// Pre-flight check: compares an uploaded video with its brief before the
// brand sees it. Three layers:
//   1. Format checks from the file itself (always run, deterministic).
//   2. Script checks: spoken Must-include / Avoid items matched against the
//      creator's script or captions (deterministic, explainable).
//   3. Optional AI review of sampled frames + script for visual items
//      (only when an Anthropic API key is configured; see ai.ts).
// Anything that can't be verified is marked "review" — never guessed.

export type CheckStatus = 'pass' | 'fail' | 'review'
export interface PreflightItem { kind: 'format' | 'must' | 'avoid' | 'audio'; label: string; ok: boolean; status: CheckStatus; at?: number; note?: string; source?: 'file' | 'script' | 'ai' }

export interface BriefInput {
  mustInclude: string[]
  avoid: string[]
  deliverables: { aspectRatio: string; minSec: number; maxSec: number }
}
export interface FileInput { duration: number; width?: number; height?: number; mime?: string; sizeBytes?: number; fileName?: string }

const MEDICAL = ['cure', 'cures', 'heal', 'heals', 'treat', 'treats', 'clinically proven', 'prescription', 'diagnose', 'eczema cure']
const SPOKEN = /^(say|mention|tell|call out|use the (word|phrase)|explain|state)\b/i
const VISUAL = /^(show|film|apply|demonstrate|record|include a|day-?\d+|before|after|close-?up|real before)/i
const AUDIO = /(music|audio|sound|voice|voiceover)/i

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/[-_]/g, ' ').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Quoted words win; otherwise the meaningful words after the verb. */
export function termsFor(raw: string): string[] {
  const item = raw.replace(/[‘’]/g, "'")
  const quoted = [...item.matchAll(/[“"]([^”"]{2,40})[”"]/g)].map(m => norm(m[1]))
  if (quoted.length) return quoted
  if (/medical claims?/i.test(item)) return MEDICAL
  const rest = item.replace(SPOKEN, '').replace(/^(that|it'?s|it is|the|a|an)\s+/i, '').replace(/\b(it'?s|it is)\b/gi, '')
  const t = norm(rest)
  return t ? [t] : []
}

function findInScript(script: string, terms: string[]): { found: boolean; position: number } {
  const s = ' ' + norm(script) + ' '
  for (const term of terms) {
    const i = s.indexOf(' ' + term + ' ') >= 0 ? s.indexOf(' ' + term + ' ') : s.indexOf(term)
    if (i >= 0) return { found: true, position: i / Math.max(1, s.length) }
  }
  return { found: false, position: 0 }
}

const ratioOf = (ar: string) => { const [w, h] = ar.split(':').map(Number); return w && h ? w / h : 9 / 16 }

export function formatChecks(brief: BriefInput, f: FileInput): PreflightItem[] {
  const { minSec, maxSec, aspectRatio } = brief.deliverables
  const items: PreflightItem[] = []
  const d = Math.round(f.duration)
  const inRange = f.duration >= minSec && f.duration <= maxSec
  items.push({ kind: 'format', source: 'file', label: `Length ${d}s (requested ${minSec}–${maxSec}s)`, ok: inRange, status: inRange ? 'pass' : 'fail',
    note: inRange ? undefined : f.duration < minSec ? `Add ${Math.ceil(minSec - f.duration)}s — the brief asks for at least ${minSec}s.` : `Trim ${Math.ceil(f.duration - maxSec)}s — the brief allows up to ${maxSec}s.` })
  if (f.width && f.height) {
    const actual = f.width / f.height, target = ratioOf(aspectRatio)
    const ok = Math.abs(actual - target) / target <= 0.03
    items.push({ kind: 'format', source: 'file', label: `Aspect ratio ${f.width}×${f.height} (requested ${aspectRatio})`, ok, status: ok ? 'pass' : 'fail',
      note: ok ? undefined : `Re-export as ${aspectRatio}. This file is ${actual > 1 ? 'landscape' : 'a different shape'}.` })
    const short = Math.min(f.width, f.height)
    const res: CheckStatus = short >= 1080 ? 'pass' : short >= 720 ? 'review' : 'fail'
    items.push({ kind: 'format', source: 'file', label: `Resolution ${short}p`, ok: res !== 'fail', status: res,
      note: res === 'pass' ? undefined : res === 'review' ? '1080p is recommended for paid ads.' : 'Below 720p — re-export at 1080p.' })
  } else {
    items.push({ kind: 'format', source: 'file', label: `Aspect ratio (requested ${aspectRatio})`, ok: true, status: 'review', note: 'Couldn’t read the video dimensions in this browser.' })
  }
  if (f.mime && !/^video\/(mp4|quicktime)$/.test(f.mime) && !/\.(mp4|mov)$/i.test(f.fileName ?? '')) {
    items.push({ kind: 'format', source: 'file', label: 'File type', ok: false, status: 'fail', note: 'Upload an MP4 or MOV file.' })
  }
  return items
}

export function scriptChecks(brief: BriefInput, script: string | undefined, duration: number): PreflightItem[] {
  const items: PreflightItem[] = []
  const has = !!script && script.trim().length > 10
  const at = (p: number) => Math.max(0, Math.min(Math.floor(duration) - 1, Math.round(p * duration)))

  for (const m of brief.mustInclude) {
    const spoken = SPOKEN.test(m) || (!VISUAL.test(m) && !AUDIO.test(m) && termsFor(m).length > 0 && /\b(say|word|fragrance|free|code|price|\$)/i.test(m))
    if (spoken && has) {
      const r = findInScript(script!, termsFor(m))
      items.push({ kind: 'must', source: 'script', label: m, ok: r.found, status: r.found ? 'pass' : 'fail', at: r.found ? at(r.position) : undefined,
        note: r.found ? undefined : 'Not found in your script. Make sure you say it on camera.' })
    } else {
      items.push({ kind: 'must', label: m, ok: true, status: 'review', note: spoken ? 'Add your script so this can be checked automatically.' : 'Visual item — confirm it’s in the video.' })
    }
  }
  for (const a of brief.avoid) {
    if (AUDIO.test(a)) { items.push({ kind: 'audio', label: a, ok: true, status: 'review', note: 'Listen back: keep music low under your voice.' }); continue }
    const terms = termsFor(a)
    const textual = /[“"]/.test(a) || /medical claims?/i.test(a) || /\b(claims?|words?|say|swear)\b/i.test(a)
    if (textual && has && terms.length) {
      const r = findInScript(script!, terms)
      items.push({ kind: 'avoid', source: 'script', label: a, ok: !r.found, status: r.found ? 'fail' : 'pass', at: r.found ? at(r.position) : undefined,
        note: r.found ? 'This is on the brand’s Avoid list. Re-record this line before submitting.' : undefined })
    } else {
      items.push({ kind: 'avoid', label: a, ok: true, status: 'review', note: textual ? 'Add your script so this can be checked automatically.' : 'Visual item — double-check before submitting.' })
    }
  }
  return items
}

/** 0–100: format is 20%, brief items 80% (pass 1, review 0.6, fail 0). */
export function briefMatch(items: PreflightItem[]): { score: number; feedback: string } {
  const fmt = items.filter(i => i.kind === 'format')
  const brief = items.filter(i => i.kind !== 'format')
  const val = (i: PreflightItem) => (i.status === 'pass' ? 1 : i.status === 'review' ? 0.6 : 0)
  const f = fmt.length ? fmt.reduce((a, i) => a + val(i), 0) / fmt.length : 1
  const b = brief.length ? brief.reduce((a, i) => a + val(i), 0) / brief.length : 1
  const score = Math.round(20 * f + 80 * b)
  const fails = items.filter(i => i.status === 'fail')
  const reviews = items.filter(i => i.status === 'review').length
  const feedback = fails.length
    ? `${fails.length} item${fails.length > 1 ? 's' : ''} from the brief need${fails.length > 1 ? '' : 's'} attention: ${fails.map(i => i.label).slice(0, 2).join('; ')}.`
    : reviews
      ? `Everything checked automatically passed. ${reviews} item${reviews > 1 ? 's' : ''} need${reviews > 1 ? '' : 's'} a quick look by eye.`
      : 'Follows the brief closely — every item passed.'
  return { score, feedback }
}

export const issueCount = (items: PreflightItem[]) => items.filter(i => i.status === 'fail').length
