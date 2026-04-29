import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/jwt'
import { loginSchema } from '@/lib/validations/auth'
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MINUTES } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    // Find end user
    const user = await prisma.end_users.findUnique({
      where: { email },
    })

    if (!user || user.deleted_at) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check blocking
    if (user.is_blocked) {
      return NextResponse.json(
        { success: false, message: 'Your account has been blocked' },
        { status: 403 }
      )
    }

    // Check lock
    if (user.login_attempts >= MAX_LOGIN_ATTEMPTS && user.locked_until && user.locked_until > new Date()) {
      return NextResponse.json(
        { success: false, message: 'Account temporarily locked. Try again later.' },
        { status: 423 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password!)
    if (!isValid) {
      // Increment login attempts
      const newAttempts = user.login_attempts + 1
      const lockUntil = newAttempts >= MAX_LOGIN_ATTEMPTS 
        ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
        : null

      await prisma.end_users.update({
        where: { id: user.id },
        data: {
          login_attempts: newAttempts,
          locked_until: lockUntil,
        },
      })

      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Success - reset attempts and update last login
    await prisma.end_users.update({
      where: { id: user.id },
      data: {
        login_attempts: 0,
        locked_until: null,
        last_login_at: new Date(),
      },
    })

    // Generate token
    const token = signToken({
      actor_id: user.id,
      actor_type: 'END_USER',
    })

    // Set cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('End-user login error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}