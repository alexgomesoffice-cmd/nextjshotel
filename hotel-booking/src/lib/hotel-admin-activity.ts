import { prisma } from '@/lib/prisma'

/**
 * Writes one row to hotel_admin_activity_logs. This table has existed in
 * the schema for a while but nothing wrote to it yet — this is the first
 * real usage, kept intentionally small since there's no existing pattern
 * to match beyond the table shape itself.
 */
export async function logHotelAdminActivity(params: {
  hotelId: number
  actorId: number
  actorType: 'HOTEL_ADMIN' | 'HOTEL_SUB_ADMIN'
  action: string
  entityType: string
  entityId?: number | null
  metadata?: Record<string, any>
  ipAddress?: string | null
}) {
  try {
    await prisma.hotel_admin_activity_logs.create({
      data: {
        hotel_id: params.hotelId,
        actor_id: params.actorId,
        actor_type: params.actorType,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId ?? null,
        metadata: params.metadata ?? undefined,
        ip_address: params.ipAddress ?? null,
      },
    })
  } catch (e) {
    // Never let logging failure break the actual operation.
    console.error('Failed to write activity log:', e)
  }
}