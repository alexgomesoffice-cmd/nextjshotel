import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

// Unified listing across the three blockable account types. `type` selects
// which table to query — tabs on the page correspond 1:1 to this param.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'END_USER'
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const where = { deleted_at: null, name: { contains: search } }

    if (type === 'HOTEL_ADMIN') {
      const [rows, total] = await Promise.all([
        prisma.hotel_admins.findMany({
          where, skip, take: limit, orderBy: { created_at: 'desc' },
          select: {
            id: true, name: true, email: true, is_active: true, is_blocked: true,
            last_login_at: true, hotel: { select: { id: true, name: true } },
          },
        }),
        prisma.hotel_admins.count({ where }),
      ])
      return NextResponse.json({ success: true, data: { users: rows, total } })
    }

    if (type === 'HOTEL_SUB_ADMIN') {
      const [rows, total] = await Promise.all([
        prisma.hotel_sub_admins.findMany({
          where, skip, take: limit, orderBy: { created_at: 'desc' },
          select: {
            id: true, name: true, email: true, is_active: true, is_blocked: true,
            last_login_at: true, hotel: { select: { id: true, name: true } },
          },
        }),
        prisma.hotel_sub_admins.count({ where }),
      ])
      return NextResponse.json({ success: true, data: { users: rows, total } })
    }

    // END_USER — the platform's guests/customers
    const [rows, total] = await Promise.all([
      prisma.end_users.findMany({
        where, skip, take: limit, orderBy: { created_at: 'desc' },
        select: { id: true, name: true, email: true, is_active: true, is_blocked: true, last_login_at: true },
      }),
      prisma.end_users.count({ where }),
    ])
    return NextResponse.json({ success: true, data: { users: rows, total } })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}