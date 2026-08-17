import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

    const notifications = await prisma.hotel_admin_notifications.findMany({
      where: {
        recipient_id: auth.payload.actor_id,
        recipient_type: auth.payload.actor_type,
        ...(unreadOnly ? { is_read: false } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    })

    return NextResponse.json({ success: true, data: notifications })
  } catch (error) {
    console.error('Fetch hotel admin notifications error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}