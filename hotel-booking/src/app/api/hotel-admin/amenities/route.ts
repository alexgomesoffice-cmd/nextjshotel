import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

const createAmenitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  icon: z.string().max(100).optional().or(z.literal('')),
  context: z.enum(['HOTEL', 'ROOM']),
})

/**
 * GET /api/hotel-admin/amenities
 * Returns global defaults + hotel's own custom amenities, grouped by context.
 * Query param: context? = 'HOTEL' | 'ROOM'  → filter to one context
 *              flat?    = '1'               → return flat array
 * Used by:
 *   - Hotel amenities management page (dashboard/hotel/amenities)
 *   - Room type creation/edit form (ROOM context amenities as checkboxes)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id!
    const { searchParams } = new URL(req.url)
    const contextFilter = searchParams.get('context') as 'HOTEL' | 'ROOM' | null
    const flat = searchParams.get('flat') === '1'

    const where: {
      AND: Array<{
        is_active?: boolean
        context?: 'HOTEL' | 'ROOM'
        OR?: Array<{ is_default: boolean; hotel_id: null } | { hotel_id: number }>
      }>
    } = {
      AND: [
        { is_active: true },
        {
          OR: [
            { is_default: true, hotel_id: null },   // global defaults
            { hotel_id: hotelId },                   // this hotel's custom amenities
          ],
        },
      ],
    }

    if (contextFilter === 'HOTEL' || contextFilter === 'ROOM') {
      where.AND.push({ context: contextFilter })
    }

    const amenities = await prisma.amenities.findMany({
      where,
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        icon: true,
        context: true,
        is_default: true,
        is_active: true,
        hotel_id: true,
      },
    })

    if (flat) {
      return NextResponse.json({ success: true, data: amenities })
    }

    // Group by context
    const grouped = {
      HOTEL: amenities.filter((a) => a.context === 'HOTEL'),
      ROOM: amenities.filter((a) => a.context === 'ROOM'),
    }

    return NextResponse.json({ success: true, data: grouped })
  } catch (error) {
    console.error('Failed to fetch amenities:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/hotel-admin/amenities
 * Creates a hotel-specific custom amenity.
 * Body: { name, icon?, context: 'HOTEL' | 'ROOM' }
 * The amenity is scoped to this hotel (hotel_id = payload.hotel_id, is_default = false).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id!
    const body = await req.json()
    const result = createAmenitySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const { name, icon, context } = result.data

    // Check for duplicate name within this hotel's amenities (global + hotel-specific)
    const duplicate = await prisma.amenities.findFirst({
      where: {
        name,
        context,
        OR: [
          { is_default: true, hotel_id: null },
          { hotel_id: hotelId },
        ],
      },
    })

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: `An amenity named "${name}" already exists for context ${context}` },
        { status: 409 }
      )
    }

    const amenity = await prisma.amenities.create({
      data: {
        name,
        icon: icon || null,
        context,
        is_default: false,
        hotel_id: hotelId,
        is_active: true,
      },
    })

    return NextResponse.json(
      { success: true, message: 'Custom amenity created', data: amenity },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create amenity:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
