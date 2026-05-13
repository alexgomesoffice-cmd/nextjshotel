// filepath: src/app/api/hotel-admin/bookings/route.ts
// GET: List all bookings for this hotel (hotel admin + sub admin + system admin)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN', 'SYSTEM_ADMIN'])
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const page     = parseInt(searchParams.get('page')   || '1')
    const limit    = parseInt(searchParams.get('limit')  || '15')
    const search   = searchParams.get('search')  || ''
    const status   = searchParams.get('status')  || ''
    const dateFrom = searchParams.get('date_from') || ''
    const dateTo   = searchParams.get('date_to')   || ''
    const sortBy   = searchParams.get('sort_by')   || 'created_at'
    const order    = (searchParams.get('order') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
    const skip     = (page - 1) * limit

    const hotelId = payload.actor_type === 'SYSTEM_ADMIN'
      ? searchParams.get('hotel_id') ? parseInt(searchParams.get('hotel_id')!) : undefined
      : payload.hotel_id

    const where: any = {}
    if (hotelId) where.hotel_id = hotelId

    if (search) {
      where.OR = [
        { booking_reference: { contains: search } },
        { end_user: { name: { contains: search } } },
        { end_user: { email: { contains: search } } },
      ]
    }

    if (status) where.status = status

    if (dateFrom || dateTo) {
      where.check_in = {}
      if (dateFrom) where.check_in.gte = new Date(dateFrom)
      if (dateTo)   where.check_in.lte = new Date(dateTo)
    }

    const orderByMap: Record<string, any> = {
      created_at:  { created_at: order },
      check_in:    { check_in: order },
      total_price: { total_price: order },
    }

    const [bookings, total] = await Promise.all([
      prisma.user_bookings.findMany({
        where,
        skip,
        take: limit,
        include: {
          end_user: { select: { id: true, name: true, email: true } },
          room_bookings: {
            include: {
              room_type: { select: { name: true } },
              room_detail: { select: { room_number: true } },
            },
          },
        },
        orderBy: orderByMap[sortBy] ?? { created_at: 'desc' },
      }),
      prisma.user_bookings.count({ where }),
    ])

    const serialized = bookings.map(b => ({
      ...b,
      total_price:    Number(b.total_price),
      advance_amount: Number(b.advance_amount),
      check_in:       b.check_in.toISOString(),
      check_out:      b.check_out.toISOString(),
      created_at:     b.created_at.toISOString(),
      reserved_until: b.reserved_until?.toISOString() ?? null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        bookings: serialized,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('[hotel-admin] GET /bookings error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
