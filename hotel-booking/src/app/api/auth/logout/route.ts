import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, blacklistToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value

    if (token) {
      try {
        const payload = verifyToken(token)
        await blacklistToken(token, payload)
      } catch {
        // Token invalid or expired - just clear cookie
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    // Clear the cookie
    response.cookies.set('token', '', {
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