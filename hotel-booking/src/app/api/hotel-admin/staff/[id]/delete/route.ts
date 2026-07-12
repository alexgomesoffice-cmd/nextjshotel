import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { emitToRoom } from '@/lib/socket-emit'

type Params = { params: { id: string } }

export async function DELETE(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN'])
  if (error) return error

  try {
    const { id } = params
    const staffId = parseInt(id)
    if (isNaN(staffId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const staff = await prisma.hotel_sub_admins.findUnique({
      where: { id: staffId },
      select: { hotel_id: true, deleted_at: true, name: true },
    })

    if (!staff || staff.deleted_at || staff.hotel_id !== payload.hotel_id) {
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 })
    }

    await prisma.hotel_sub_admins.update({
      where: { id: staffId },
      data:  { deleted_at: new Date() },
    })

    void emitToRoom(`user:${staffId}`, 'staff:deleted', { actor_id: staffId })

    return NextResponse.json({
      success: true,
      message: `${staff.name} has been removed`,
    })
  } catch (err) {
    console.error('[hotel-admin] DELETE /staff/[id]/delete error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
