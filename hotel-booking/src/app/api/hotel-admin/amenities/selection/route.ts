import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

/**
 * GET /api/hotel-admin/amenities/selection
 * Returns the IDs of amenities currently selected for the hotel.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })
    }

    const selection = await prisma.hotel_amenities.findMany({
      where: { hotel_id: hotelId },
      select: { amenity_id: true }
    })

    return NextResponse.json({ 
      success: true, 
      data: selection.map(s => s.amenity_id) 
    })
  } catch (error) {
    console.error('Failed to fetch amenity selection:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/hotel-admin/amenities/selection
 * Updates the hotel's amenity selection.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })
    }

    const { amenityIds } = await req.json()

    if (!Array.isArray(amenityIds)) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
    }

    // Use a transaction to ensure atomic update
    await prisma.$transaction(async (tx) => {
      // 1. Remove existing selections
      await tx.hotel_amenities.deleteMany({
        where: { hotel_id: hotelId }
      })

      // 2. Add new selections
      if (amenityIds.length > 0) {
        await tx.hotel_amenities.createMany({
          data: amenityIds.map((id: number) => ({
            hotel_id: hotelId,
            amenity_id: id
          }))
        })
      }
    })

    return NextResponse.json({ success: true, message: 'Amenities updated successfully' })
  } catch (error) {
    console.error('Failed to update amenity selection:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
