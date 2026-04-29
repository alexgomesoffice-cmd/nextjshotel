import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

// Blacklist check is NOT done here — middleware must be fast/edge-compatible.
// Blacklist check happens inside each API route handler via requireAuth().

const ROLE_REQUIRED: Record<string, string[]> = {
  '/dashboard/system': ['SYSTEM_ADMIN'],
  '/dashboard/hotel':  ['HOTEL_ADMIN'],
  '/dashboard/sub':    ['HOTEL_SUB_ADMIN'],
  '/profile':          ['END_USER'],
  '/bookings':         ['END_USER'],
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const matched = Object.entries(ROLE_REQUIRED).find(([prefix]) =>
    pathname.startsWith(prefix)
  )
  if (!matched) return NextResponse.next()

  const [, allowedRoles] = matched
  const token = req.cookies.get('token')?.value

  if (!token) {
    const loginMap: Record<string, string> = {
      SYSTEM_ADMIN:    '/admin-login',
      HOTEL_ADMIN:     '/hotel-login',
      HOTEL_SUB_ADMIN: '/hotel-login',
      END_USER:        '/login',
    }
    const redirectTo = loginMap[allowedRoles[0]] ?? '/login'
    const callbackUrl = encodeURIComponent(req.url)
    return NextResponse.redirect(new URL(`${redirectTo}?callbackUrl=${callbackUrl}`, req.url))
  }

  try {
    const payload = verifyToken(token)
    if (!allowedRoles.includes(payload.actor_type)) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/bookings/:path*'],
}