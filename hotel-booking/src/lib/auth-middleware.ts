import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './jwt'
import { isBlacklisted } from './token-blacklist'
import type { JwtPayload } from '@/types'

type AuthResult =
  | { payload: JwtPayload; error: null }
  | { payload: null; error: NextResponse }

export async function requireAuth(
  req: NextRequest,
  allowedRoles: JwtPayload['actor_type'][]
): Promise<AuthResult> {
  const token = req.cookies.get('token')?.value

  if (!token) {
    return { payload: null, error: NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 }) }
  }

  try {
    const payload = await verifyToken(token)

    if (await isBlacklisted(token)) {
      return { payload: null, error: NextResponse.json({ success: false, message: 'Token revoked' }, { status: 401 }) }
    }

    if (!allowedRoles.includes(payload.actor_type)) {
      return { payload: null, error: NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 }) }
    }

    return { payload, error: null }
  } catch {
    return { payload: null, error: NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 }) }
  }
}