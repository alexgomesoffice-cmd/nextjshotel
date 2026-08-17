import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // PENDING | FULFILLED | DISMISSED
    const category = searchParams.get('category') // AMENITY | BED_TYPE | ROOM_FACILITY
    const search = searchParams.get('search')?.trim() ?? ''

    const where: any = {}
    if (status) where.status = status
    if (category) where.category = category
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { hotel: { name: { contains: search } } },
      ]
    }

    const [requests, pendingCount, fulfilledCount, dismissedCount] = await Promise.all([
      prisma.master_data_requests.findMany({
        where,
        include: {
          hotel: { select: { id: true, name: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.master_data_requests.count({ where: { status: 'PENDING' } }),
      prisma.master_data_requests.count({ where: { status: 'FULFILLED' } }),
      prisma.master_data_requests.count({ where: { status: 'DISMISSED' } }),
    ])

    // Requester names — hotel_admins only (requested_by is always a hotel_admins.id).
    const requesterIds = [...new Set(requests.map((r) => r.requested_by))]
    const requesters = requesterIds.length > 0
      ? await prisma.hotel_admins.findMany({ where: { id: { in: requesterIds } }, select: { id: true, name: true } })
      : []
    const requesterMap = new Map(requesters.map((r) => [r.id, r.name]))

    const formatted = requests.map((r) => ({ ...r, requested_by_name: requesterMap.get(r.requested_by) ?? 'Unknown' }))

    return NextResponse.json({
      success: true,
      data: formatted,
      summary: { pending: pendingCount, fulfilled: fulfilledCount, dismissed: dismissedCount, total: pendingCount + fulfilledCount + dismissedCount },
    })
  } catch (error) {
    console.error('Fetch master data requests error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}