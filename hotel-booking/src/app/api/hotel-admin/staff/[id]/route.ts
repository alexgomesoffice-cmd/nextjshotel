import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

type Params = { params: { id: string } }

const updateSchema = z.object({
  name: z.string().min(2).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
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
      select: { hotel_id: true, deleted_at: true },
    })

    if (!staff || staff.deleted_at || staff.hotel_id !== payload.hotel_id) {
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 })
    }

    const body = await req.json()
    const validation = updateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const updated = await prisma.hotel_sub_admins.update({
      where: { id: staffId },
      data:  { ...validation.data, updated_at: new Date() },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json({ success: true, data: updated, message: 'Updated successfully' })
  } catch (err) {
    console.error('[hotel-admin] PATCH /staff/[id] error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
