// filepath: src/app/api/hotel-admin/guests/route.ts
// GET  /api/hotel-admin/guests
// Guest management list — BOOKED / CHECKED_IN by default, CHECKED_OUT selectable.
// Auth: HOTEL_ADMIN or HOTEL_SUB_ADMIN only. Hotel ID comes from JWT, never from the client.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { Prisma } from '@prisma/client'

const GUEST_STATUSES = ['BOOKED', 'CHECKED_IN', 'CHECKED_OUT'] as const
type GuestStatus = (typeof GUEST_STATUSES)[number]

export async function GET(req: NextRequest) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
  if (error) return error

  const hotelId = payload.hotel_id
  if (!hotelId) {
    return NextResponse.json({ success: false, message: 'Hotel context missing' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page   = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15')))
    const skip   = (page - 1) * limit
    const search = (searchParams.get('search') || '').trim()
    const status = searchParams.get('status') || ''

    // Determine which statuses to include
    let statusFilter: GuestStatus[]
    if (status && (GUEST_STATUSES as readonly string[]).includes(status)) {
      statusFilter = [status as GuestStatus]
    } else {
      // Default: active guests only
      statusFilter = ['BOOKED', 'CHECKED_IN']
    }

    // Date filtering applies to check_in date
    const dateFrom = searchParams.get('date_from') || ''
    const dateTo   = searchParams.get('date_to')   || ''

    const where: Prisma.user_bookingsWhereInput = {
      hotel_id: hotelId,
      status:   { in: statusFilter },
      ...(dateFrom || dateTo ? {
        check_in: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
        },
      } : {}),
      ...(search ? {
        OR: [
          { booking_reference: { contains: search } },
          { end_user: { name:  { contains: search } } },
          { end_user: { email: { contains: search } } },
          { end_user: { detail: { phone: { contains: search } } } },
        ],
      } : {}),
    }

    const sortBy = searchParams.get('sort_by') || 'check_in'
    const order  = searchParams.get('order') === 'asc' ? 'asc' : 'desc'
    const orderByMap: Record<string, Prisma.user_bookingsOrderByWithRelationInput> = {
      check_in:    { check_in:    order },
      created_at:  { created_at:  order },
      total_price: { total_price: order },
    }
    const orderBy = orderByMap[sortBy] ?? { check_in: 'desc' }


    const [bookings, total] = await Promise.all([
      prisma.user_bookings.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          end_user: {
            select: {
              id:    true,
              name:  true,
              email: true,
              detail: {
                select: { phone: true },
              },
              images: {
                where:   { is_active: true },
                orderBy: { created_at: 'desc' },
                take:    1,
                select:  { image_url: true },
              },
            },
          },
          room_bookings: {
            select: {
              id:      true,
              subtotal: true,
              nights:  true,
              room_type: {
                select: { name: true },
              },
              room_variant: {
                select: {
                  max_occupancy: true,
                  room_size:     true,
                  bed_types: {
                    select: {
                      bed_type: { select: { name: true } },
                      count:    true,
                    },
                  },
                },
              },
              room_detail: {
                select: { room_number: true, floor: true },
              },
            },
          },
        },
      }),
      prisma.user_bookings.count({ where }),
    ])

    const data = bookings.map(b => ({
      id:                b.id,
      booking_reference: b.booking_reference,
      status:            b.status,
      check_in:          b.check_in.toISOString(),
      check_out:         b.check_out.toISOString(),
      guests:            b.guests,
      rooms_count:       b.rooms_count,
      total_price:       Number(b.total_price),
      created_at:        b.created_at.toISOString(),
      end_user: {
        id:    b.end_user.id,
        name:  b.end_user.name,
        email: b.end_user.email,
        phone: b.end_user.detail?.phone ?? null,
        image: b.end_user.images[0]?.image_url ?? null,
      },
      room_bookings: b.room_bookings.map(rb => ({
        id:      rb.id,
        subtotal: Number(rb.subtotal),
        nights:  rb.nights,
        room_type_name: rb.room_type.name,
        room_number:    rb.room_detail.room_number,
        floor:          rb.room_detail.floor,
        room_size:      rb.room_variant.room_size,
        max_occupancy:  rb.room_variant.max_occupancy,
        bed_summary:    rb.room_variant.bed_types
          .map(bt => `${bt.count > 1 ? bt.count + '× ' : ''}${bt.bed_type.name}`)
          .join(', '),
      })),
    }))

    return NextResponse.json({
      success: true,
      data: {
        guests:     data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    console.error('[hotel-admin] GET /guests error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
