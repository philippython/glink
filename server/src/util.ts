import crypto from 'node:crypto'
import type { ZodType } from 'zod'

export const id = (prefix: string) => `${prefix}_${crypto.randomBytes(9).toString('base64url')}`
export const now = () => new Date().toISOString()
export const today = () => new Date().toISOString().slice(0, 10)
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString()
}

/** Money is stored in cents; the API speaks whole dollars to match the UI. */
export const toCents = (dollars: number) => Math.round(dollars * 100)
export const toDollars = (cents: number) => Math.round(cents) / 100

export class HttpError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) { super(message) }
}
export const notFound = (what = 'Not found') => new HttpError(404, what)
export const forbidden = (why = 'You don’t have permission to do that.') => new HttpError(403, why)

/** Validates input with a zod schema and returns field errors in plain language (422). */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input)
  if (r.success) return r.data
  const fields: Record<string, string> = {}
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || '_'
    if (!fields[key]) fields[key] = issue.message
  }
  throw new HttpError(422, 'Please fix the highlighted fields.', fields)
}

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')
