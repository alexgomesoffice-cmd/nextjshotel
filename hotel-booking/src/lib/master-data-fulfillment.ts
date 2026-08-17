import { prisma } from '@/lib/prisma'
import { notifyHotelAdmin } from '@/lib/notifications'
import type { Prisma } from '@prisma/client'

const CATEGORY_LABEL: Record<string, string> = { AMENITY: 'Amenity', BED_TYPE: 'Bed Type', ROOM_FACILITY: 'Room Facility' }

/**
 * Validates a `fulfills_request_id` before entity creation proceeds.
 * Returns the request row if valid, or an error message if not (caller
 * should reject the whole POST rather than silently ignore a bad
 * reference — the System Admin explicitly said "this creation fulfills
 * that request").
 */
export async function validateFulfillsRequest(
  fulfillsRequestId: number | undefined,
  category: 'AMENITY' | 'BED_TYPE' | 'ROOM_FACILITY'
): Promise<{ request: Awaited<ReturnType<typeof prisma.master_data_requests.findUnique>> | null; error: string | null }> {
  if (!fulfillsRequestId) return { request: null, error: null }

  const request = await prisma.master_data_requests.findUnique({ where: { id: fulfillsRequestId } })
  if (!request) return { request: null, error: 'The linked request could not be found.' }
  if (request.status !== 'PENDING') return { request: null, error: 'The linked request is no longer pending.' }
  if (request.category !== category) return { request: null, error: 'The linked request is for a different category.' }

  return { request, error: null }
}

/** Call inside the same transaction as the entity's own .create(). */
export function markRequestFulfilledTx(
  tx: Prisma.TransactionClient,
  requestId: number,
  systemAdminId: number,
  createdEntityId: number
) {
  return tx.master_data_requests.update({
    where: { id: requestId },
    data: { status: 'FULFILLED', resolved_by: systemAdminId, resolved_at: new Date(), created_entity_id: createdEntityId },
  })
}

/** Call after the transaction commits — best-effort, never blocks the response. */
export async function notifyRequestFulfilled(request: { id: number; requested_by: number; category: string }, entityName: string) {
  await notifyHotelAdmin({
    recipientId: request.requested_by,
    recipientType: 'HOTEL_ADMIN',
    type: 'MASTER_DATA_REQUEST',
    title: 'Master Data Request Fulfilled',
    message: `"${entityName}" has been added to the global ${CATEGORY_LABEL[request.category] ?? request.category} catalog. You can now select it when configuring rooms.`,
    relatedEntityType: 'MASTER_DATA_REQUEST',
    relatedEntityId: request.id,
  })
}