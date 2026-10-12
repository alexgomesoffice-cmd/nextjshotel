import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './jwt'
import { isBlacklisted } from './token-blacklist'
import { prisma } from './prisma'
import type { JwtPayload } from '@/types'

type AuthResult =
  | { payload: JwtPayload; error: null }
  | { payload: null; error: NextResponse }

export async function requireAuth(
  req: NextRequest,
  allowedRoles: JwtPayload['actor_type'][]
): Promise<AuthResult> {
  const token = req.cookies.get('token_user')?.value
    ?? req.cookies.get('token_hotel_admin')?.value
    ?? req.cookies.get('token_system_admin')?.value

  if (!token) {
    return { payload: null, error: NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 }) }
  }

  let payload: JwtPayload
  try {
    payload = await verifyToken(token)
  } catch {
    return { payload: null, error: NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 }) }
  }

  if (!allowedRoles.includes(payload.actor_type)) {
    return { payload: null, error: NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 }) }
  }

  try {
    if (await isBlacklisted(token)) {
      return { payload: null, error: NextResponse.json({ success: false, message: 'Token revoked' }, { status: 401 }) }
    }

    let accountIsActive = false
    switch (payload.actor_type) {
      case 'END_USER': {
        const account = await prisma.end_users.findUnique({
          where: { id: payload.actor_id },
          select: { is_active: true, is_blocked: true, deleted_at: true },
        })
        accountIsActive = !!account && account.is_active && !account.is_blocked && account.deleted_at === null
        break
      }
      case 'HOTEL_ADMIN': {
        const account = await prisma.hotel_admins.findUnique({
          where: { id: payload.actor_id },
          select: { is_active: true, is_blocked: true, deleted_at: true },
        })
        accountIsActive = !!account && account.is_active && !account.is_blocked && account.deleted_at === null
        break
      }
      case 'HOTEL_SUB_ADMIN': {
        const account = await prisma.hotel_sub_admins.findUnique({
          where: { id: payload.actor_id },
          select: { is_active: true, is_blocked: true, deleted_at: true },
        })
        accountIsActive = !!account && account.is_active && !account.is_blocked && account.deleted_at === null
        break
      }
      case 'SYSTEM_ADMIN': {
        const account = await prisma.system_admins.findUnique({
          where: { id: payload.actor_id },
          select: { is_active: true, is_blocked: true, deleted_at: true },
        })
        accountIsActive = !!account && account.is_active && !account.is_blocked && account.deleted_at === null
        break
      }
    }

    if (!accountIsActive) {
      return { payload: null, error: NextResponse.json({ success: false, message: 'Account is inactive or unavailable' }, { status: 401 }) }
    }
  } catch (error) {
    console.error('Authentication status check failed:', error)
    return { payload: null, error: NextResponse.json({ success: false, message: 'Authentication service unavailable' }, { status: 500 }) }
  }

  return { payload, error: null }
}