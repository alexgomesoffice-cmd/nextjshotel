import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { blacklistToken } from '@/lib/token-blacklist'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token_user')?.value
      ?? req.cookies.get('token_hotel_admin')?.value
      ?? req.cookies.get('token_system_admin')?.value

    if (token) {
      try {
        const payload = await verifyToken(token)
        await blacklistToken(token, payload)
      } catch {
        // Token invalid or expired - just clear cookie
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    // Clear the cookies
    response.cookies.set('token_user', '', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 0,
    })
    response.cookies.set('token_hotel_admin', '', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 0,
    })
    response.cookies.set('token_system_admin', '', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}