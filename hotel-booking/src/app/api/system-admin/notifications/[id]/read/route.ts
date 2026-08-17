import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['SYSTEM_ADMIN'])
    if (auth.error) return auth.error

    const adminId = auth.payload.actor_id
    const { id } = await params
    const notificationId = parseInt(id)
    if (isNaN(notificationId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const notification = await prisma.system_admin_notifications.findUnique({ where: { id: notificationId } })
    if (!notification || notification.recipient_id !== adminId) {
      return NextResponse.json({ success: false, message: 'Notification not found' }, { status: 404 })
    }

    await prisma.system_admin_notifications.update({ where: { id: notificationId }, data: { is_read: true } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark notification read error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}