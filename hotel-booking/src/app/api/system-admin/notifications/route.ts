import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const adminId = auth.payload.actor_id
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

    const notifications = await prisma.system_admin_notifications.findMany({
      where: { recipient_id: adminId, ...(unreadOnly ? { is_read: false } : {}) },
      orderBy: { created_at: 'desc' },
      take: limit,
    })

    return NextResponse.json({ success: true, data: notifications })
  } catch (error) {
    console.error('Fetch system admin notifications error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}