import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

// Review Queue list — strict FCFS (oldest submitted first), no priority,
// no assignment. Filters: status tab, city, date range, search.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'PENDING' // pending|approved|rejected|all
    const cityId = searchParams.get('city_id')
    const dateRange = searchParams.get('date_range') // 24h|7d|30d
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = { status: { not: 'DRAFTING' } } // never show drafts here
    if (status !== 'all' && status !== 'ALL') where.status = status.toUpperCase()
    if (cityId) where.hotel = { city_id: parseInt(cityId) }
    if (dateRange) {
      const days = { '24h': 1, '7d': 7, '30d': 30 }[dateRange] ?? 9999
      where.submitted_at = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
    }
    if (search) {
      where.OR = [
        { hotel: { name: { contains: search } } },
        { submitter: { name: { contains: search } } },
      ]
    }

    const [cases, total] = await Promise.all([
      prisma.cases.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submitted_at: 'asc' }, // FCFS — oldest first, always
        include: {
          hotel: { select: { id: true, name: true, city: { select: { name: true } } } },
          submitter: { select: { name: true, email: true } },
          field_changes: { select: { id: true } },
        },
      }),
      prisma.cases.count({ where }),
    ])

    const data = cases.map((c: (typeof cases)[number]) => ({
      id: c.id,
      status: c.status,
      hotel: { id: c.hotel.id, name: c.hotel.name, city: c.hotel.city?.name ?? null },
      submittedBy: c.submitter.name,
      submittedByEmail: c.submitter.email,
      submittedAt: c.submitted_at,
      modifiedFields: c.field_changes.length,
    }))

    return NextResponse.json({
      success: true,
      data: { cases: data, total, pagination: { page, limit, totalPages: Math.ceil(total / limit) } },
    })
  } catch (error) {
    console.error('Failed to fetch cases:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}