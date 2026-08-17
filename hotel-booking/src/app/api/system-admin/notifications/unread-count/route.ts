import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const count = await prisma.system_admin_notifications.count({
      where: { recipient_id: auth.payload.actor_id, is_read: false },
    })

    return NextResponse.json({ success: true, data: { count } })
  } catch (error) {
    console.error('Fetch unread count error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}