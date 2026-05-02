import { prisma } from './prisma'
import { hashToken } from './jwt'
import type { JwtPayload } from '@/types'

export async function isBlacklisted(token: string): Promise<boolean> {
  const hash = await hashToken(token)
  const found = await prisma.blacklisted_tokens.findUnique({
    where: { token_hash: hash },
  })
  return !!found
}

export async function blacklistToken(token: string, payload: JwtPayload): Promise<void> {
  const hash = await hashToken(token)
  await prisma.blacklisted_tokens.create({
    data: {
      token_hash: hash,
      actor_id: payload.actor_id,
      actor_type: payload.actor_type,
      expires_at: new Date(payload.exp * 1000),
    },
  })
}
