import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

// name is on hotel_admins; everything else on hotel_admin_details.
// email is intentionally NOT editable here — permanently immutable once
// set, same rule applies regardless of who's trying to change it.
const schema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  address: z.string().optional(),
  dob: z.string().optional(),
  nid_no: z.string().optional(),
  passport: z.string().optional(),
  emergency_phone: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const hotelId = parseInt(id)
    if (isNaN(hotelId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const result = schema.safeParse(await req.json())
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }

    const { name, dob, phone, address, nid_no, passport, emergency_phone } = result.data

    const admin = await prisma.hotel_admins.findUnique({ where: { hotel_id: hotelId } })
    if (!admin) return NextResponse.json({ success: false, message: 'Hotel admin not found' }, { status: 404 })

    if (name !== undefined) {
      await prisma.hotel_admins.update({ where: { id: admin.id }, data: { name } })
    }

    await prisma.hotel_admin_details.update({
      where: { hotel_admin_id: admin.id },
      data: {
        ...(phone !== undefined ? { phone } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(nid_no !== undefined ? { nid_no } : {}),
        ...(passport !== undefined ? { passport } : {}),
        ...(emergency_phone !== undefined ? { emergency_contact1: emergency_phone } : {}),
        ...(dob !== undefined ? { dob: dob ? new Date(dob) : null } : {}),
      },
    })

    return NextResponse.json({ success: true, message: 'Admin info updated' })
  } catch (error) {
    console.error('Failed to update admin info:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}