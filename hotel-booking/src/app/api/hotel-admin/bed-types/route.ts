import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

const addBedTypeSchema = z.object({
  name: z.string().min(2).max(100)
})

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id

    // Fetch global defaults AND custom bed types for this hotel
    const bedTypes = await prisma.bed_types.findMany({
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

    return NextResponse.json({ success: true, data: bedTypes })
  } catch (error) {
    console.error('Failed to fetch bed types:', error)
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
    const result = addBedTypeSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    // Check if name already exists for this hotel or globally
    const existing = await prisma.bed_types.findFirst({
      where: {
        name: result.data.name,
        OR: [
          { hotel_id: hotelId },
          { hotel_id: null, is_default: true }
        ]
      }
    })

    if (existing) {
      return NextResponse.json({ success: false, message: 'Bed type with this name already exists' }, { status: 400 })
    }

    const bedType = await prisma.bed_types.create({
      data: {
        name: result.data.name,
        is_default: false,
        hotel_id: hotelId,
        is_active: true
      }
    })

    return NextResponse.json({ success: true, data: bedType }, { status: 201 })
  } catch (error) {
    console.error('Failed to create bed type:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
