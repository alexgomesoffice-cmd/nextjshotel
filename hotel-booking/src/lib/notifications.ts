import { prisma } from '@/lib/prisma'
import { NotificationType, ActorType } from '@prisma/client'

/** Notify every active, unblocked System Admin (flat model — no per-admin routing). */
export async function notifySystemAdmins(params: {
  type: NotificationType
  title: string
  message: string
  relatedEntityType?: string
  relatedEntityId?: number
}) {
  try {
    const admins = await prisma.system_admins.findMany({
      where: { is_active: true, is_blocked: false, deleted_at: null },
      select: { id: true },
    })
    if (admins.length === 0) return
    await prisma.system_admin_notifications.createMany({
      data: admins.map((a) => ({
        recipient_id: a.id,
        type: params.type,
        title: params.title,
        message: params.message,
        related_entity_type: params.relatedEntityType ?? null,
        related_entity_id: params.relatedEntityId ?? null,
      })),
    })
  } catch (e) {
    console.error('Failed to notify system admins:', e)
  }
}

/** Notify one specific Hotel Admin (or Sub-Admin). */
export async function notifyHotelAdmin(params: {
  recipientId: number
  recipientType: 'HOTEL_ADMIN' | 'HOTEL_SUB_ADMIN'
  type: NotificationType
  title: string
  message: string
  relatedEntityType?: string
  relatedEntityId?: number
}) {
  try {
    await prisma.hotel_admin_notifications.create({
      data: {
        recipient_id: params.recipientId,
        recipient_type: params.recipientType as ActorType,
        type: params.type,
        title: params.title,
        message: params.message,
        related_entity_type: params.relatedEntityType ?? null,
        related_entity_id: params.relatedEntityId ?? null,
      },
    })
  } catch (e) {
    console.error('Failed to notify hotel admin:', e)
  }
}