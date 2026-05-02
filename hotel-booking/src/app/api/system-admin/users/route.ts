import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const isBlocked = searchParams.get('is_blocked')

    const skip = (page - 1) * limit

    const where: Prisma.end_usersWhereInput = {
      deleted_at: null,
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
      ],
    }

    if (isBlocked !== null && isBlocked !== undefined) {
      where.is_blocked = isBlocked === 'true'
    }

    const [users, total] = await Promise.all([
      prisma.end_users.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          is_active: true,
          is_blocked: true,
          email_verified: true,
          last_login_at: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.end_users.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
