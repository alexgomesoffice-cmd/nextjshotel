import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

const createBedTypeSchema = z.object({
  name: z.string().min(1, 'Bed type name is required').max(100),
})

/**
 * GET /api/hotel-admin/bed-types
 * Returns global default bed types + hotel's own custom bed types.
 * Used by:
 *   - Room type creation/edit form (bed type multi-select with count per type)
 *   - Hotel amenities management page (bed types tab)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id!

    const bedTypes = await prisma.bed_types.findMany({
      where: {
        is_active: true,
        OR: [
          { is_default: true, hotel_id: null },  // global defaults
          { hotel_id: hotelId },                  // this hotel's custom bed types
        ],
      },
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        is_default: true,
        is_active: true,
        hotel_id: true,
      },
    })

    return NextResponse.json({ success: true, data: bedTypes })
  } catch (error) {
    console.error('Failed to fetch bed types:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/hotel-admin/bed-types
 * Creates a hotel-specific custom bed type.
 * Body: { name }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id!
    const body = await req.json()
    const result = createBedTypeSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const { name } = result.data

    // Check for duplicate name (global or this hotel's custom)
    const duplicate = await prisma.bed_types.findFirst({
      where: {
        name,
        OR: [
          { is_default: true, hotel_id: null },
          { hotel_id: hotelId },
        ],
      },
    })

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: `A bed type named "${name}" already exists` },
        { status: 409 }
      )
    }

    const bedType = await prisma.bed_types.create({
      data: {
        name,
        is_default: false,
        hotel_id: hotelId,
        is_active: true,
      },
    })

    return NextResponse.json(
      { success: true, message: 'Custom bed type created', data: bedType },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create bed type:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
