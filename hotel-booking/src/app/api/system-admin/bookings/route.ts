import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || '' // Searches booking_reference
    const status = searchParams.get('status') as any

    const skip = (page - 1) * limit

    const where: any = {}
    
    if (search) {
      where.booking_reference = { contains: search }
    }
    
    if (status) {
      where.status = status
    }

    const [bookings, total] = await Promise.all([
      prisma.user_bookings.findMany({
        where,
        skip,
        take: limit,
        include: {
          hotel: {
            select: { name: true, slug: true }
          },
          end_user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.user_bookings.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch bookings:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
