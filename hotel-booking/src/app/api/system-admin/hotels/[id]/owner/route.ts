import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const schema = z.object({
  full_name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  dob: z.string().optional(),
  nid_no: z.string().optional(),
  passport: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
})

// System Admin direct override — writes live immediately, no case involved.
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

    const { dob, ...rest } = result.data
    const updated = await prisma.hotel_owner_details.update({
      where: { hotel_id: hotelId },
      data: { ...rest, ...(dob !== undefined ? { dob: dob ? new Date(dob) : null } : {}) },
    })

    return NextResponse.json({ success: true, message: 'Owner info updated', data: updated })
  } catch (error) {
    console.error('Failed to update owner info:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}