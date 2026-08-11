import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateRoomFacilitySchema } from '@/lib/validations/metadata'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const facilityId = parseInt(id)
    if (isNaN(facilityId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const body = await req.json()
    const result = updateRoomFacilitySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }

    const existing = await prisma.room_facilities.findUnique({ where: { id: facilityId } })
    if (!existing) return NextResponse.json({ success: false, message: 'Room facility not found' }, { status: 404 })

    const nextName = result.data.name ?? existing.name
    if (nextName !== existing.name) {
      const duplicate = await prisma.room_facilities.findFirst({ where: { name: nextName, id: { not: facilityId } } })
      if (duplicate) {
        return NextResponse.json({ success: false, message: `A room facility named "${nextName}" already exists.` }, { status: 409 })
      }
    }

    const updated = await prisma.room_facilities.update({ where: { id: facilityId }, data: result.data })
    return NextResponse.json({ success: true, message: 'Room facility updated', data: updated })
  } catch (error) {
    console.error('Failed to update room facility:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const facilityId = parseInt(id)
    if (isNaN(facilityId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const facility = await prisma.room_facilities.findUnique({
      where: { id: facilityId },
      include: { _count: { select: { room_variant_facilities: true } } },
    })
    if (!facility) return NextResponse.json({ success: false, message: 'Room facility not found' }, { status: 404 })

    const usageCount = facility._count.room_variant_facilities
    if (usageCount > 0) {
      await prisma.room_facilities.update({ where: { id: facilityId }, data: { is_active: false } })
      return NextResponse.json({
        success: true,
        message: `Room facility deactivated. It is in use by ${usageCount} room(s) and cannot be permanently deleted.`,
      })
    }

    await prisma.room_facilities.delete({ where: { id: facilityId } })
    return NextResponse.json({ success: true, message: 'Room facility deleted permanently' })
  } catch (error) {
    console.error('Failed to delete room facility:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}