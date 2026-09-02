// filepath: src/app/api/hotel-admin/guests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { Prisma } from '@prisma/client'

const VALID_GUEST_STATUSES = ['BOOKED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED'] as const
type ValidStatus = typeof VALID_GUEST_STATUSES[number]

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
    const filter = searchParams.get('filter') || 'all' // active, previous, booked, etc.

    // Base condition for a user to be considered a guest of this hotel
    const guestCondition: Prisma.user_bookingsWhereInput = {
      hotel_id: hotelId,
      status: { in: VALID_GUEST_STATUSES as unknown as Prisma.EnumBookingStatusFilter['in'] },
    }

    if (filter !== 'all') {
      if (filter === 'active') {
        guestCondition.status = { in: ['CHECKED_IN'] }
      } else if (filter === 'upcoming') {
        guestCondition.status = { in: ['BOOKED'] }
      } else if (filter === 'previous') {
        guestCondition.status = { in: ['CHECKED_OUT'] }
      }
    }

    const where: Prisma.end_usersWhereInput = {
      bookings: {
        some: guestCondition
      },
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
          { detail: { phone: { contains: search } } },
          { bookings: { some: { booking_reference: { contains: search }, hotel_id: hotelId } } }
        ]
      } : {})
    }

    const [users, total] = await Promise.all([
      prisma.end_users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }, // Can sort by latest booking, but for unique guests, sorting by ID or created_at is stable.
        include: {
          detail: {
            select: { phone: true }
          },
          images: {
            where: { is_active: true },
            orderBy: { created_at: 'desc' },
            take: 1,
            select: { image_url: true }
          },
          bookings: {
            where: {
              hotel_id: hotelId,
              status: { in: VALID_GUEST_STATUSES as unknown as Prisma.EnumBookingStatusFilter['in'] }
            },
            orderBy: { check_in: 'desc' },
            include: {
              room_bookings: {
                select: {
                  room_detail: {
                    select: { room_number: true }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.end_users.count({ where }),
    ])

    const data = users.map(user => {
      const allBookings = user.bookings
      
      const checkedInStays = allBookings.filter(b => b.status === 'CHECKED_IN')
      const bookedStays = allBookings.filter(b => b.status === 'BOOKED')
      const checkedOutStays = allBookings.filter(b => b.status === 'CHECKED_OUT')

      // Total stays = completed/checked-in. (Exclude NO_SHOW and CANCELLED and BOOKED from completed/actual stays count)
      const totalStays = checkedInStays.length + checkedOutStays.length

      const currentStay = checkedInStays.length > 0 ? checkedInStays[0] : null
      const upcomingStay = bookedStays.length > 0 ? bookedStays[0] : null
      
      // Last actual stay (prefer checked_out, but if currently checked_in, that counts too)
      const actualStays = [...checkedInStays, ...checkedOutStays].sort((a, b) => b.check_in.getTime() - a.check_in.getTime())
      const lastStayDate = actualStays.length > 0 ? actualStays[0].check_in.toISOString() : null

      const mapStay = (stay: typeof allBookings[0] | null) => {
        if (!stay) return null
        return {
          booking_reference: stay.booking_reference,
          status: stay.status,
          check_in: stay.check_in.toISOString(),
          check_out: stay.check_out.toISOString(),
          rooms: stay.room_bookings.map(rb => rb.room_detail.room_number)
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.detail?.phone ?? null,
        avatar: user.images[0]?.image_url ?? null,
        summary: {
          totalStays,
          lastStayDate,
          currentStay: mapStay(currentStay),
          upcomingStay: mapStay(upcomingStay)
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        guests: data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (err) {
    console.error('[hotel-admin] GET /guests error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
