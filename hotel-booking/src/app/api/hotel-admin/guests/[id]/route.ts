// filepath: src/app/api/hotel-admin/guests/[id]/route.ts
// GET  /api/hotel-admin/guests/[id]
// Full guest detail for one booking. [id] = user_bookings.id (integer).
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
  const bookingId = parseInt(idStr, 10)
  if (isNaN(bookingId)) {
    return NextResponse.json({ success: false, message: 'Invalid booking id' }, { status: 400 })
  }

  try {
    const booking = await prisma.user_bookings.findUnique({
      where: { id: bookingId },
      include: {
        end_user: {
          include: {
            detail: true,
            images: {
              where:   { is_active: true },
              orderBy: { created_at: 'desc' },
              take:    1,
            },
          },
        },
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
      },
    })

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 })
    }

    // Ownership check — hotel_id must match the authenticated hotel
    if (booking.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    // Serialize to plain JSON (Decimal → number, Date → ISO string)
    const out = {
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

      guest: {
        id:    booking.end_user.id,
        name:  booking.end_user.name,
        email: booking.end_user.email,
        image: booking.end_user.images[0]?.image_url ?? null,
        phone:   booking.end_user.detail?.phone   ?? null,
        dob:     booking.end_user.detail?.dob?.toISOString() ?? null,
        gender:  booking.end_user.detail?.gender  ?? null,
        address: booking.end_user.detail?.address ?? null,
        country: booking.end_user.detail?.country ?? null,
      },

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
    }

    return NextResponse.json({ success: true, data: out })
  } catch (err) {
    console.error('[hotel-admin] GET /guests/[id] error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
