import jwt, { SignOptions } from 'jsonwebtoken'
import { createHash } from 'crypto'
import { prisma } from './prisma'
import type { JwtPayload } from '@/types'

const SECRET = process.env.JWT_SECRET!

export function signToken(
  payload: Omit<JwtPayload, 'iat' | 'exp'>
): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn']

  return jwt.sign(payload, SECRET, { expiresIn })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function isBlacklisted(token: string): Promise<boolean> {
  const found = await prisma.blacklisted_tokens.findUnique({
    where: { token_hash: hashToken(token) },
  })
  return !!found
}

export async function blacklistToken(token: string, payload: JwtPayload): Promise<void> {
  await prisma.blacklisted_tokens.create({
    data: {
      token_hash: hashToken(token),
      actor_id:   payload.actor_id,
      actor_type: payload.actor_type,
      expires_at: new Date(payload.exp * 1000),
    },
  })
}