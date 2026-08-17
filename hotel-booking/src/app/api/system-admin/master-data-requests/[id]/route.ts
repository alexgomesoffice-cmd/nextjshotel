import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { id } = await params
    const requestId = parseInt(id)
    if (isNaN(requestId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const request = await prisma.master_data_requests.findUnique({
      where: { id: requestId },
      include: { hotel: { select: { id: true, name: true } } },
    })
    if (!request) return NextResponse.json({ success: false, message: 'Request not found' }, { status: 404 })

    const requester = await prisma.hotel_admins.findUnique({ where: { id: request.requested_by }, select: { name: true, email: true } })
    const resolver = request.resolved_by
      ? await prisma.system_admins.findUnique({ where: { id: request.resolved_by }, select: { name: true } })
      : null

    let createdEntityName: string | null = null
    if (request.created_entity_id) {
      const table = { AMENITY: prisma.amenities, BED_TYPE: prisma.bed_types, ROOM_FACILITY: prisma.room_facilities }[request.category]
      const entity = await (table as any).findUnique({ where: { id: request.created_entity_id }, select: { name: true } })
      createdEntityName = entity?.name ?? null
    }

    return NextResponse.json({
      success: true,
      data: { ...request, requester, resolver_name: resolver?.name ?? null, created_entity_name: createdEntityName },
    })
  } catch (error) {
    console.error('Fetch master data request error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}