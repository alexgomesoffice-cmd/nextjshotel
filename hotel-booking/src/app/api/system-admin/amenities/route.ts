import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createAmenitySchema } from '@/lib/validations/metadata'

// ─── GET /api/system-admin/amenities ───────────────────────────────────────
// Amenities are fully global now (no is_default/hotel_id) — this simply
// lists everything, optionally filtered by context (HOTEL/ROOM) and search.
// Includes a usage count (hotel_amenities + room_type_amenities) per row so
// the catalog page can show how widely each amenity is actually in use.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const context = searchParams.get('context') as 'HOTEL' | 'ROOM' | null

    const skip = (page - 1) * limit

    const where: any = {
      name: { contains: search },
    }
    if (context) {
      where.context = context
    }

    const [amenities, total] = await Promise.all([
      prisma.amenities.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { hotel_amenities: true, room_type_amenities: true },
          },
        },
      }),
      prisma.amenities.count({ where }),
    ])

    const data = amenities.map((a: (typeof amenities)[number]) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      context: a.context,
      is_active: a.is_active,
      created_at: a.created_at,
      usage_count: a._count.hotel_amenities + a._count.room_type_amenities,
    }))

    return NextResponse.json({
      success: true,
      data: {
        amenities: data,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('Failed to fetch amenities:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST /api/system-admin/amenities ──────────────────────────────────────
// Creates a global amenity. Uniqueness is on [name, context] — the same
// name may exist once per context (e.g. a HOTEL-level and a ROOM-level
// amenity could theoretically share a name, but never duplicate within the
// same context).
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const body = await req.json()
    const result = createAmenitySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 },
      )
    }

    const { name, icon, context, is_active } = result.data

    const existing = await prisma.amenities.findFirst({
      where: { name: { equals: name }, context },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, message: `An amenity named "${name}" already exists for ${context.toLowerCase()} context.` },
        { status: 409 },
      )
    }

    const newAmenity = await prisma.amenities.create({
      data: { name, icon: icon || null, context, is_active },
    })

    return NextResponse.json({ success: true, message: 'Amenity created successfully', data: newAmenity })
  } catch (error) {
    console.error('Failed to create amenity:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}