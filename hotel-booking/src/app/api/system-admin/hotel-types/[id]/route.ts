import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updateHotelTypeSchema } from '@/lib/validations/metadata'

type Params = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const typeId = parseInt(id)

    const body = await req.json()
    const result = updateHotelTypeSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: result.error.issues },
        { status: 400 }
      )
    }

    const typeExists = await prisma.hotel_types.findUnique({ where: { id: typeId } })
    if (!typeExists) {
      return NextResponse.json({ success: false, message: 'Hotel type not found' }, { status: 404 })
    }

    const updatedType = await prisma.hotel_types.update({
      where: { id: typeId },
      data: result.data,
    })

    return NextResponse.json({ success: true, message: 'Hotel type updated', data: updatedType })
  } catch (error) {
    console.error('Failed to update hotel type:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
