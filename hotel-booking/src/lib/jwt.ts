import type { JwtPayload } from '@/types'

const SECRET = process.env.JWT_SECRET!
const ALGORITHM = 'HS256'

// ========== Web Crypto API Helpers ==========

async function base64UrlEncode(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function base64UrlDecode(base64: string): Promise<ArrayBuffer> {
  let base64Url = base64.replace(/-/g, '+').replace(/_/g, '/')
  while (base64Url.length % 4) {
    base64Url += '='
  }
  const binary = atob(base64Url)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function signWithKey(data: ArrayBuffer, key: CryptoKey): Promise<ArrayBuffer> {
  const signature = await crypto.subtle.sign(
    { name: 'HMAC', hash: 'SHA-256' },
    key,
    data
  )
  return signature
}

async function verifyWithKey(
  data: ArrayBuffer,
  signature: ArrayBuffer,
  key: CryptoKey
): Promise<boolean> {
  return crypto.subtle.verify(
    { name: 'HMAC', hash: 'SHA-256' },
    key,
    signature,
    data
  )
}

async function getSigningKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(SECRET)
  const hash = await crypto.subtle.digest('SHA-256', keyData)
  
  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function sha256Hash(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  const bytes = new Uint8Array(hashBuffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

// ========== JWT Functions ==========

export async function signToken(
  payload: Omit<JwtPayload, 'iat' | 'exp'>
): Promise<string> {
  const header = { alg: ALGORITHM, typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + (parseExpiresIn() || 7 * 24 * 60 * 60),
  }

  const encoder = new TextEncoder()
  const headerB64 = await base64UrlEncode(encoder.encode(JSON.stringify(header)).buffer)
  const payloadB64 = await base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)).buffer)
  
  const signingInput = `${headerB64}.${payloadB64}`
  const signingKey = await getSigningKey()
  const signatureBuffer = await signWithKey(
    encoder.encode(signingInput).buffer,
    signingKey
  )
  const signatureB64 = await base64UrlEncode(signatureBuffer)

  return `${signingInput}.${signatureB64}`
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid token format')
  }

  const [headerB64, payloadB64, signatureB64] = parts
  const signingInput = `${headerB64}.${payloadB64}`
  
  const encoder = new TextEncoder()
  const signingInputBuffer = encoder.encode(signingInput).buffer
  const signatureBuffer = await base64UrlDecode(signatureB64)
  
  const signingKey = await getSigningKey()
  const isValid = await verifyWithKey(signingInputBuffer, signatureBuffer, signingKey)
  
  if (!isValid) {
    throw new Error('Invalid signature')
  }

  const payloadBuffer = await base64UrlDecode(payloadB64)
  const decoder = new TextDecoder()
  const payloadStr = decoder.decode(payloadBuffer)
  const payload = JSON.parse(payloadStr) as JwtPayload

  // Check expiration
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired')
  }

  return payload
}

// ========== Token Hashing (for blacklist) ==========

export async function hashToken(token: string): Promise<string> {
  return sha256Hash(token)
}


// ========== Helper ==========

function parseExpiresIn(): number {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d'
  const match = expiresIn.match(/^(\d+)(d|h|m|s)$/)
  if (!match) return 7 * 24 * 60 * 60 // default 7 days
  
  const value = parseInt(match[1], 10)
  const unit = match[2]
  
  switch (unit) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 60 * 60
    case 'd': return value * 24 * 60 * 60
    default: return 7 * 24 * 60 * 60
  }
}