import crypto from 'crypto'
import type { UserRow } from './store.js'

const SECRET = process.env.AUTH_SECRET || 'belanjaku-dev-secret'

function base64urlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  const normalized = (input + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64')
}

function sign(body: string): Buffer {
  return crypto.createHmac('sha256', SECRET).update(body).digest()
}

export function createPasswordHash(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const iter = 120000
  const hash = crypto.pbkdf2Sync(password, salt, iter, 32, 'sha256').toString('hex')
  return `pbkdf2_sha256$${iter}$${salt}$${hash}`
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): boolean {
  const parts = passwordHash.split('$')
  if (parts.length !== 4) return false
  const algo = parts[0]
  const iter = Number(parts[1])
  const salt = parts[2]
  const hash = parts[3]
  if (algo !== 'pbkdf2_sha256') return false
  if (!Number.isFinite(iter) || iter <= 0) return false
  const computed = crypto.pbkdf2Sync(password, salt, iter, 32, 'sha256').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'))
}

export function createSession(user: UserRow): { token: string } {
  const payload = base64urlEncode(Buffer.from(JSON.stringify({ uid: user.id, iat: Date.now() }), 'utf-8'))
  const sig = base64urlEncode(sign(payload))
  return { token: `${payload}.${sig}` }
}

export function deleteSession(token: string): void {
  void token
}

export function getSessionUserId(token: string): string | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = sign(payload)
  const actual = base64urlDecode(sig)
  if (actual.length !== expected.length) return null
  if (!crypto.timingSafeEqual(actual, expected)) return null
  try {
    const raw = base64urlDecode(payload).toString('utf-8')
    const parsed = JSON.parse(raw) as { uid?: string }
    return parsed.uid ? String(parsed.uid) : null
  } catch {
    return null
  }
}
