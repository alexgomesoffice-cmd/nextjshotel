// filepath: src/app/api/hotel-admin/guests/[id]/route.ts
// GET  /api/hotel-admin/guests/[id]
// Full guest detail for one guest. [id] = end_user.id (integer).
// Auth: HOTEL_ADMIN or HOTEL_SUB_ADMIN. Ownership enforced via hotel_id from JWT.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
  if (error) return error

  const hotelId = payload.hotel_id
  if (!hotelId) {
    return NextResponse.json({ success: false, message: 'Hotel context missing' }, { status: 403 })
  }

  const { id: idStr } = await params
  const endUserId = parseInt(idStr, 10)
  if (isNaN(endUserId)) {
    return NextResponse.json({ success: false, message: 'Invalid guest id' }, { status: 400 })
  }

  try {
    const user = await prisma.end_users.findUnique({
      where: { id: endUserId },
      include: {
        detail: true,
        images: {
          where:   { is_active: true },
          orderBy: { created_at: 'desc' },
          take:    1,
        },
        bookings: {
          where: { hotel_id: hotelId },
          orderBy: { check_in: 'desc' },
          include: {
            room_bookings: {
              include: {
                room_type: true,
                room_variant: {
                  include: {
                    variant_images: {
                      orderBy: [{ is_cover: 'desc' }, { sort_order: 'asc' }],
                      take:    1,
                    },
                    bed_types: {
                      include: { bed_type: true },
                    },
                    facilities: {
                      include: { facility: true },
                    },
                  },
                },
                room_detail: true,
                nightly_rates: {
                  orderBy: { stay_date: 'asc' },
                },
              },
              orderBy: { id: 'asc' },
            },
          }
        }
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'Guest not found' }, { status: 404 })
    }

    // A guest must have at least one qualifying booking at this hotel to be visible
    const validStatuses = ['BOOKED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED']
    const hotelBookings = user.bookings.filter(b => validStatuses.includes(b.status))

    if (hotelBookings.length === 0) {
      return NextResponse.json({ success: false, message: 'Guest not found at your hotel' }, { status: 404 })
    }

    // Serialize bookings
    const mapBooking = (booking: typeof hotelBookings[0]) => ({
      id:                booking.id,
      booking_reference: booking.booking_reference,
      status:            booking.status,
      check_in:          booking.check_in.toISOString(),
      check_out:         booking.check_out.toISOString(),
      guests:            booking.guests,
      rooms_count:       booking.rooms_count,
      total_price:       Number(booking.total_price),
      special_request:   booking.special_request ?? null,
      created_at:        booking.created_at.toISOString(),
      reserved_until:    booking.reserved_until?.toISOString() ?? null,

      room_bookings: booking.room_bookings.map(rb => ({
        id:             rb.id,
        price_per_night: Number(rb.price_per_night),
        nights:         rb.nights,
        subtotal:       Number(rb.subtotal),
        room_type_name: rb.room_type.name,

        room_variant: {
          id:            rb.room_variant.id,
          price:         Number(rb.room_variant.price),
          room_size:     rb.room_variant.room_size,
          max_occupancy: rb.room_variant.max_occupancy,
          cover_image:   rb.room_variant.variant_images[0]?.image_url ?? null,
          bed_types:     rb.room_variant.bed_types.map(bt => ({
            name:  bt.bed_type.name,
            count: bt.count,
          })),
          facilities: rb.room_variant.facilities.map(f => f.facility.name),
        },

        room_detail: {
          id:          rb.room_detail.id,
          room_number: rb.room_detail.room_number,
          floor:       rb.room_detail.floor,
          status:      rb.room_detail.status,
        },

        nightly_rates: rb.nightly_rates.map(nr => ({
          stay_date:         nr.stay_date.toISOString(),
          price:             Number(nr.price),
          pricing_rule_name: nr.pricing_rule_name ?? null,
        })),
      })),
    })

    const serializedBookings = hotelBookings.map(mapBooking)
    const currentStays = serializedBookings.filter(b => b.status === 'CHECKED_IN')
    const upcomingStays = serializedBookings.filter(b => b.status === 'BOOKED')
    const previousStays = serializedBookings.filter(b => b.status === 'CHECKED_OUT')
    const bookingHistory = serializedBookings

    const out = {
      guest: {
        id:      user.id,
        name:    user.name,
        email:   user.email,
        image:   user.images[0]?.image_url ?? null,
        phone:   user.detail?.phone   ?? null,
        dob:     user.detail?.dob?.toISOString() ?? null,
        gender:  user.detail?.gender  ?? null,
        address: user.detail?.address ?? null,
        country: user.detail?.country ?? null,
      },
      currentStays,
      upcomingStays,
      previousStays,
      bookingHistory
    }

    return NextResponse.json({ success: true, data: out })
  } catch (err) {
    console.error('[hotel-admin] GET /guests/[id] error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
