import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateBedTypeSchema } from '@/lib/validations/metadata'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const bedTypeId = parseInt(id)
    if (isNaN(bedTypeId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const body = await req.json()
    const result = updateBedTypeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 },
      )
    }

    const existing = await prisma.bed_types.findUnique({ where: { id: bedTypeId } })
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Bed type not found' }, { status: 404 })
    }

    const nextName = result.data.name ?? existing.name
    if (nextName !== existing.name) {
      const duplicate = await prisma.bed_types.findFirst({
        where: { name: nextName, id: { not: bedTypeId } },
      })
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: `A bed type named "${nextName}" already exists.` },
          { status: 409 },
        )
      }
    }

    const updated = await prisma.bed_types.update({ where: { id: bedTypeId }, data: result.data })
    return NextResponse.json({ success: true, message: 'Bed type updated', data: updated })
  } catch (error) {
    console.error('Failed to update bed type:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const bedTypeId = parseInt(id)
    if (isNaN(bedTypeId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const bedType = await prisma.bed_types.findUnique({
      where: { id: bedTypeId },
      include: { _count: { select: { room_detail_bed_types: true } } },
    })
    if (!bedType) {
      return NextResponse.json({ success: false, message: 'Bed type not found' }, { status: 404 })
    }

    const usageCount = bedType._count.room_detail_bed_types
    if (usageCount > 0) {
      await prisma.bed_types.update({ where: { id: bedTypeId }, data: { is_active: false } })
      return NextResponse.json({
        success: true,
        message: `Bed type deactivated. It is in use by ${usageCount} room(s) and cannot be permanently deleted.`,
      })
    }

    await prisma.bed_types.delete({ where: { id: bedTypeId } })
    return NextResponse.json({ success: true, message: 'Bed type deleted permanently' })
  } catch (error) {
    console.error('Failed to delete bed type:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}