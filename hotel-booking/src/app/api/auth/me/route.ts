export const runtime = "nodejs";
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    const { payload, error } = await requireAuth(req, [
      'SYSTEM_ADMIN',
      'HOTEL_ADMIN',
      'HOTEL_SUB_ADMIN',
      'END_USER',
    ])

    if (error) return error

    let userData: { id: number; name: string; email: string } | null = null

    switch (payload.actor_type) {
      case 'SYSTEM_ADMIN': {
        const admin = await prisma.system_admins.findUnique({
          where: { id: payload.actor_id },
          select: { id: true, name: true, email: true },
        })
        userData = admin
        break
      }
      case 'HOTEL_ADMIN': {
        const admin = await prisma.hotel_admins.findUnique({
          where: { id: payload.actor_id },
          select: { id: true, name: true, email: true },
        })
        userData = admin
        break
      }
      case 'HOTEL_SUB_ADMIN': {
        const admin = await prisma.hotel_sub_admins.findUnique({
          where: { id: payload.actor_id },
          select: { id: true, name: true, email: true },
        })
        userData = admin
        break
      }
      case 'END_USER': {
        const user = await prisma.end_users.findUnique({
          where: { id: payload.actor_id },
          select: { id: true, name: true, email: true },
        })
        userData = user
        break
      }
    }

    if (!userData) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...userData,
        actor_type: payload.actor_type,
        hotel_id: payload.hotel_id,
      },
    })
  } catch (error) {
    console.error('Me endpoint error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}