// filepath: src/app/api/system-admin/hotels/[id]/suspend/route.ts
// PATCH: Toggle hotel between SUSPENDED and PUBLISHED status

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

type Params = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const hotelId = parseInt(id)

    // Find hotel and check if exists
    const hotelExists = await prisma.hotels.findUnique({
      where: { id: hotelId, deleted_at: null },
      select: { approval_status: true },
    })

    if (!hotelExists) {
      return NextResponse.json(
        { success: false, message: 'Hotel not found' },
        { status: 404 }
      )
    }

    // Toggle status: SUSPENDED ↔ PUBLISHED
    const newStatus = hotelExists.approval_status === 'SUSPENDED' ? 'PUBLISHED' : 'SUSPENDED'
    const actionMessage = newStatus === 'SUSPENDED' ? 'suspended' : 'unsuspended'

    const updatedHotel = await prisma.hotels.update({
      where: { id: hotelId },
      data: { approval_status: newStatus },
      select: { id: true, name: true, approval_status: true },
    })

    return NextResponse.json({
      success: true,
      message: `Hotel ${actionMessage} successfully`,
      data: updatedHotel,
    })
  } catch (error) {
    console.error('Failed to toggle hotel suspend status:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}