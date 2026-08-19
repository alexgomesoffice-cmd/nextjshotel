import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const bookingId = Number(id)
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid booking id' }, { status: 400 })
    }

    const booking = await prisma.user_bookings.findUnique({
      where: { id: bookingId },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            approval_status: true,
            city: { select: { name: true } },
            detail: { select: { star_rating: true, check_in_time: true, check_out_time: true } },
            images: {
              where: { is_cover: true },
              select: { image_url: true },
              orderBy: { sort_order: 'asc' },
              take: 1,
            },
          },
        },
        end_user: {
          select: {
            id: true,
            name: true,
            email: true,
            detail: {
              select: {
                phone: true,
                country: true,
                address: true,
                gender: true,
              },
            },
          },
        },
        room_bookings: {
          include: {
            room_type: { select: { id: true, name: true } },
            room_variant: {
              select: {
                id: true,
                room_size: true,
                max_occupancy: true,
                bed_types: {
                  select: {
                    count: true,
                    bed_type: { select: { name: true } },
                  },
                },
                facilities: {
                  select: {
                    facility: { select: { name: true } },
                  },
                },
                variant_images: {
                  select: { image_url: true, is_cover: true },
                  orderBy: { sort_order: 'asc' },
                  take: 1,
                },
              },
            },
            room_detail: {
              select: {
                id: true,
                room_number: true,
                floor: true,
                status: true,
              },
            },
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...booking,
        total_price: Number(booking.total_price),
        check_in: booking.check_in.toISOString(),
        check_out: booking.check_out.toISOString(),
        created_at: booking.created_at.toISOString(),
        updated_at: booking.updated_at.toISOString(),
        reserved_until: booking.reserved_until?.toISOString() ?? null,
        hotel: {
          ...booking.hotel,
          star_rating: booking.hotel.detail?.star_rating ? Number(booking.hotel.detail.star_rating) : null,
          cover_image_url: booking.hotel.images[0]?.image_url ?? null,
        },
        room_bookings: booking.room_bookings.map((room) => ({
          ...room,
          price_per_night: Number(room.price_per_night),
          subtotal: Number(room.subtotal),
        })),
      },
    })
  } catch (error) {
    console.error('[system-admin] GET /bookings/[id] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
