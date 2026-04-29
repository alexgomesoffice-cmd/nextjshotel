import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/jwt'
import { loginSchema } from '@/lib/validations/auth'
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MINUTES } from '@/lib/constants'
import type { JwtPayload } from '@/types'

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

    // Try hotel_admins first
    let actor = await prisma.hotel_admins.findUnique({
      where: { email },
    })

    let actorType: JwtPayload['actor_type'] = 'HOTEL_ADMIN'
    let table = 'hotel_admins'

    // If not found, try hotel_sub_admins
    if (!actor || actor.deleted_at) {
      actor = await prisma.hotel_sub_admins.findUnique({
        where: { email },
      }) as typeof actor
      actorType = 'HOTEL_SUB_ADMIN'
      table = 'hotel_sub_admins'
    }

    if (!actor || actor.deleted_at) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check blocking
    if (actor.is_blocked) {
      return NextResponse.json(
        { success: false, message: 'Your account has been blocked' },
        { status: 403 }
      )
    }

    // Check active
    if (!actor.is_active) {
      return NextResponse.json(
        { success: false, message: 'Account is inactive' },
        { status: 403 }
      )
    }

    // Check lock
    if (actor.login_attempts >= MAX_LOGIN_ATTEMPTS && actor.locked_until && actor.locked_until > new Date()) {
      return NextResponse.json(
        { success: false, message: 'Account temporarily locked. Try again later.' },
        { status: 423 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, actor.password)
    if (!isValid) {
      // Increment login attempts
      const newAttempts = actor.login_attempts + 1
      const lockUntil = newAttempts >= MAX_LOGIN_ATTEMPTS 
        ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
        : null

      if (table === 'hotel_admins') {
        await prisma.hotel_admins.update({
          where: { id: actor.id },
          data: {
            login_attempts: newAttempts,
            locked_until: lockUntil,
          },
        })
      } else {
        await prisma.hotel_sub_admins.update({
          where: { id: actor.id },
          data: {
            login_attempts: newAttempts,
            locked_until: lockUntil,
          },
        })
      }

      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Success - reset attempts and update last login
    if (table === 'hotel_admins') {
      await prisma.hotel_admins.update({
        where: { id: actor.id },
        data: {
          login_attempts: 0,
          locked_until: null,
          last_login_at: new Date(),
        },
      })
    } else {
      await prisma.hotel_sub_admins.update({
        where: { id: actor.id },
        data: {
          login_attempts: 0,
          locked_until: null,
          last_login_at: new Date(),
        },
      })
    }

    // Generate token
    const token = signToken({
      actor_id: actor.id,
      actor_type: actorType,
      hotel_id: actor.hotel_id,
    })

    // Set cookie
    const response = NextResponse.json({
      success: true,
      data: {
        admin: {
          id: actor.id,
          name: actor.name,
          email: actor.email,
          hotel_id: actor.hotel_id,
          role: actorType,
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
    console.error('Hotel admin login error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}