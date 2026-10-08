import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const featuredHotels = await prisma.hotels.findMany({
      where: {
        is_featured: true,
        approval_status: 'PUBLISHED',
        deleted_at: null,
      },
      orderBy: { created_at: 'desc' },
      include: {
        city: true,
        detail: { select: { star_rating: true } },
        images: { where: { is_cover: true }, take: 1 },
      },
    })

    return NextResponse.json({
      success: true,
      data: { featuredHotels },
    })
  } catch (error) {
    console.error('Failed to fetch featured hotels:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch featured hotels.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const body = await req.json().catch(() => ({}))
    const hotelId = Number(body.hotelId)
    const featured = body.featured

    if (!Number.isInteger(hotelId) || hotelId <= 0) {
      return NextResponse.json({ success: false, message: 'A valid hotel ID is required.' }, { status: 400 })
    }

    if (typeof featured !== 'boolean') {
      return NextResponse.json({ success: false, message: 'Featured status must be true or false.' }, { status: 400 })
    }

    const targetHotel = await prisma.hotels.findUnique({
      where: { id: hotelId },
      select: { id: true, approval_status: true },
    })

    if (!targetHotel) {
      return NextResponse.json({ success: false, message: 'Hotel not found.' }, { status: 404 })
    }

    if (featured && targetHotel.approval_status !== 'PUBLISHED') {
      return NextResponse.json({ success: false, message: 'Only published hotels can be featured.' }, { status: 400 })
    }

    await prisma.hotels.update({
      where: { id: hotelId },
      data: { is_featured: featured },
    })

    return NextResponse.json({
      success: true,
      data: { hotelId, is_featured: featured },
    })
  } catch (error) {
    console.error('Failed to update featured hotel:', error)
    return NextResponse.json({ success: false, message: 'Failed to update featured hotel.' }, { status: 500 })
  }
}
