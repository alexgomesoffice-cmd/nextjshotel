import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

const addAmenitySchema = z.object({
  name: z.string().min(2).max(150),
  icon: z.string().max(100).optional(),
  context: z.enum(['HOTEL', 'ROOM'])
})

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id

    // Fetch global defaults (is_default = true) AND custom amenities for this hotel
    const amenities = await prisma.amenities.findMany({
      where: {
        is_active: true,
        OR: [
          { is_default: true, hotel_id: null },
          { is_default: false, hotel_id: hotelId }
        ]
      },
      orderBy: [
        { is_default: 'desc' }, // Defaults first
        { name: 'asc' }
      ]
    })

    // Group by context
    const grouped = {
      HOTEL: amenities.filter(a => a.context === 'HOTEL'),
      ROOM: amenities.filter(a => a.context === 'ROOM')
    }

    return NextResponse.json({ success: true, data: grouped })
  } catch (error) {
    console.error('Failed to fetch hotel amenities:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 400 })
    }

    const body = await req.json()
    const result = addAmenitySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    // Check if name already exists for this hotel or globally
    const existing = await prisma.amenities.findFirst({
      where: {
        name: result.data.name,
        OR: [
          { hotel_id: hotelId },
          { hotel_id: null, is_default: true }
        ]
      }
    })

    if (existing) {
      return NextResponse.json({ success: false, message: 'Amenity with this name already exists' }, { status: 400 })
    }

    const amenity = await prisma.amenities.create({
      data: {
        name: result.data.name,
        icon: result.data.icon,
        context: result.data.context,
        is_default: false,
        hotel_id: hotelId,
        is_active: true
      }
    })

    return NextResponse.json({ success: true, data: amenity }, { status: 201 })
  } catch (error) {
    console.error('Failed to create amenity:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
