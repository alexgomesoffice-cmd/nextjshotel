import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { hotelPolicySchema } from '@/lib/validations/hotel'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 403 })
    }

    const detail = await prisma.hotel_details.findUnique({
      where: { hotel_id: hotelId },
      select: { check_in_time: true, check_out_time: true },
    })

    if (!detail) {
      return NextResponse.json({ success: false, message: 'Hotel details not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: detail })
  } catch (error) {
    console.error('Failed to fetch hotel policy:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) {
      return NextResponse.json({ success: false, message: 'Hotel association missing' }, { status: 403 })
    }

    const result = hotelPolicySchema.safeParse(await req.json())
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 },
      )
    }

    const detail = await prisma.hotel_details.update({
      where: { hotel_id: hotelId },
      data: result.data,
      select: { check_in_time: true, check_out_time: true },
    })

    return NextResponse.json({ success: true, message: 'Hotel policy updated successfully', data: detail })
  } catch (error) {
    console.error('Failed to update hotel policy:', error)
    return NextResponse.json({ success: false, message: 'Unable to update hotel policy' }, { status: 500 })
  }
}
