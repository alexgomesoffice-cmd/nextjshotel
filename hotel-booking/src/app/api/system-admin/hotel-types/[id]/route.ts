import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateHotelTypeSchema } from '@/lib/validations/metadata'

type Params = { params: Promise<{ id: string }> }

// ─── GET /api/system-admin/hotel-types/[id] ────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const typeId = parseInt(id)
    if (isNaN(typeId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const hotelType = await prisma.hotel_types.findUnique({
      where: { id: typeId },
      include: { _count: { select: { hotels: true } } },
    })

    if (!hotelType) {
      return NextResponse.json({ success: false, message: 'Hotel type not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: hotelType })
  } catch (error) {
    console.error('Failed to fetch hotel type:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

// ─── PATCH /api/system-admin/hotel-types/[id] ──────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const typeId = parseInt(id)
    if (isNaN(typeId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const body = await req.json()
    const result = updateHotelTypeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const existing = await prisma.hotel_types.findUnique({ where: { id: typeId } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Hotel type not found' }, { status: 404 })
    }

    // Enforce name uniqueness if name is being changed
    if (result.data.name && result.data.name !== existing.name) {
      const nameClash = await prisma.hotel_types.findFirst({
        where: { name: result.data.name, id: { not: typeId } },
      })
      if (nameClash) {
        return NextResponse.json(
          { success: false, message: 'A hotel type with that name already exists' },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.hotel_types.update({
      where: { id: typeId },
      data: result.data,
    })

    return NextResponse.json({ success: true, message: 'Hotel type updated', data: updated })
  } catch (error) {
    console.error('Failed to update hotel type:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE /api/system-admin/hotel-types/[id] ─────────────────────────────
// Hard delete if no hotels reference it; otherwise deactivate (is_active = false).
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const typeId = parseInt(id)
    if (isNaN(typeId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const hotelType = await prisma.hotel_types.findUnique({
      where: { id: typeId },
      include: { _count: { select: { hotels: true } } },
    })

    if (!hotelType) {
      return NextResponse.json({ success: false, message: 'Hotel type not found' }, { status: 404 })
    }

    if (hotelType._count.hotels > 0) {
      // Hotels reference this type — deactivate only to preserve data integrity
      await prisma.hotel_types.update({
        where: { id: typeId },
        data: { is_active: false },
      })
      return NextResponse.json({
        success: true,
        message: `Hotel type deactivated. ${hotelType._count.hotels} hotel(s) reference it and it cannot be permanently deleted.`,
      })
    }

    // No hotels reference it — safe hard delete
    await prisma.hotel_types.delete({ where: { id: typeId } })
    return NextResponse.json({ success: true, message: 'Hotel type deleted permanently' })
  } catch (error) {
    console.error('Failed to delete hotel type:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
