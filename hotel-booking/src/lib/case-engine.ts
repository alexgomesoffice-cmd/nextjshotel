import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────────────────────────────
// CASE ENGINE — shared logic for reviewing/deciding cases.
// This is the most complex piece in the whole system: applyFieldChange has
// to know how to write back correctly for every CaseEntityType. Documented
// per-type below since there's no live case to test any of this against yet
// (Hotel Admin's submit flow isn't built) — these are the JSON shapes this
// code expects proposed_value to have, once that side exists.
// ─────────────────────────────────────────────────────────────────────────

// Which live table+field a HOTEL/HOTEL_OWNER/HOTEL_ADMIN field_name belongs to.
const HOTEL_TABLE_FIELDS = new Set(['name', 'email', 'address', 'zip_code', 'map_location'])
const HOTEL_DETAILS_FIELDS = new Set([
  'description', 'reception_no1', 'reception_no2', 'star_rating', 'website',
  'check_in_time', 'check_out_time', 'advance_deposit_percent',
  'emergency_contact_name', 'emergency_contact_designation',
  'emergency_contact_phone1', 'emergency_contact_phone2', 'emergency_contact_email',
])

function parseValue(raw: string): any {
  try { return JSON.parse(raw) } catch { return raw }
}

/** Human-readable label for a field_name, for the diff view. */
export function fieldLabel(field_name: string | null): string {
  if (!field_name) return 'New record'
  return field_name
    .split('_')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Applies one APPROVED case_field_change to the real live tables.
 * Dispatches on entity_type. entity_id === null means "create a new record"
 * (proposed_value holds the full payload); entity_id set means "update this
 * existing record's one field" (except AMENITY/ROOM_FACILITY selections and
 * ROOM_TYPE/POLICY whole-object updates, noted inline).
 */
export async function applyFieldChange(fc: {
  id: number
  entity_type: string
  entity_id: number | null
  field_name: string | null
  proposed_value: string
}, hotelId: number) {
  const value = parseValue(fc.proposed_value)

  switch (fc.entity_type) {
    case 'HOTEL': {
      if (!fc.field_name) return
      if (HOTEL_TABLE_FIELDS.has(fc.field_name)) {
        const normalizedValue = fc.field_name === 'zip_code' ? String(value ?? '') : value
        await prisma.hotels.update({ where: { id: hotelId }, data: { [fc.field_name]: normalizedValue } })
      } else if (HOTEL_DETAILS_FIELDS.has(fc.field_name)) {
        await prisma.hotel_details.update({ where: { hotel_id: hotelId }, data: { [fc.field_name]: value } })
      }
      return
    }

    case 'HOTEL_OWNER': {
      if (!fc.field_name) return
      await prisma.hotel_owner_details.update({ where: { hotel_id: hotelId }, data: { [fc.field_name]: value } })
      return
    }

    case 'HOTEL_ADMIN': {
      if (!fc.field_name) return
      const admin = await prisma.hotel_admins.findUnique({ where: { hotel_id: hotelId } })
      if (!admin) return
      if (fc.field_name === 'name') {
        await prisma.hotel_admins.update({ where: { id: admin.id }, data: { name: value } })
      } else {
        await prisma.hotel_admin_details.update({ where: { hotel_admin_id: admin.id }, data: { [fc.field_name]: value } })
      }
      return
    }

    case 'HOTEL_IMAGE': {
      if (fc.entity_id === null) {
        if (Array.isArray(value)) {
          const coverPayload = value.find((payload: any) => payload?.is_cover === true)
          if (coverPayload) {
            await prisma.hotel_images.updateMany({ where: { hotel_id: hotelId }, data: { is_cover: false } })
          }

          for (const payload of value) {
            await prisma.hotel_images.create({
              data: {
                hotel_id: hotelId,
                image_url: payload.image_url,
                is_cover: Boolean(payload.is_cover),
                sort_order: Number(payload.sort_order ?? 0),
              },
            })
          }
          return
        }

        // value: { image_url, is_cover, sort_order }
        const payload = typeof value === 'string'
          ? { image_url: value, is_cover: false, sort_order: 0 }
          : value

        if (payload.is_cover === true) {
          await prisma.hotel_images.updateMany({ where: { hotel_id: hotelId }, data: { is_cover: false } })
        }

        await prisma.hotel_images.create({
          data: {
            hotel_id: hotelId,
            image_url: payload.image_url,
            is_cover: Boolean(payload.is_cover),
            sort_order: Number(payload.sort_order ?? 0),
          },
        })
      } else if (fc.field_name === 'deleted') {
        await prisma.hotel_images.delete({ where: { id: fc.entity_id } }).catch(() => {})
      } else if (fc.field_name === 'is_cover') {
        const shouldCover = Boolean(value)
        if (shouldCover) {
          await prisma.hotel_images.updateMany({ where: { hotel_id: hotelId }, data: { is_cover: false } })
          await prisma.hotel_images.update({ where: { id: fc.entity_id }, data: { is_cover: true } })
        } else {
          await prisma.hotel_images.update({ where: { id: fc.entity_id }, data: { is_cover: false } })
        }
      }
      return
    }

    case 'HOTEL_DOCUMENT': {
      if (fc.entity_id === null) {
        // value: { document_type, file_url }
        await prisma.hotel_documents.create({
          data: { hotel_id: hotelId, document_type: value.document_type, file_url: value.file_url },
        })
      } else if (fc.field_name === 'file_url') {
        await prisma.hotel_documents.update({ where: { id: fc.entity_id }, data: { file_url: value } })
      }
      return
    }

    case 'AMENITY': {
      // value: array of amenity ids — full replacement of the hotel's selection
      if (fc.field_name === 'selection') {
        await prisma.hotel_amenities.deleteMany({ where: { hotel_id: hotelId } })
        if (Array.isArray(value) && value.length > 0) {
          await prisma.hotel_amenities.createMany({
            data: value.map((amenity_id: number) => ({ hotel_id: hotelId, amenity_id })),
          })
        }
      }
      return
    }

    case 'POLICY': {
      if (fc.entity_id === null) {
        // value: { name, description }
        await prisma.policies.create({ data: { hotel_id: hotelId, name: value.name, description: value.description } })
      } else if (fc.field_name === 'deleted') {
        await prisma.policies.update({ where: { id: fc.entity_id }, data: { deleted_at: new Date() } })
      } else if (fc.field_name) {
        await prisma.policies.update({ where: { id: fc.entity_id }, data: { [fc.field_name]: value } })
      }
      return
    }

    // ROOM_TYPE, ROOM_TYPE_IMAGE, ROOM_FACILITY, and ROOM_DETAIL branches
    // were removed here — Room Type / Room Variant / Physical Room
    // management is direct Hotel Admin CRUD now (see room-variant-matching.ts
    // and the hotel-admin/room-types + hotel-admin/rooms routes), never
    // case-reviewed. Confirmed zero remaining callers before removal: no
    // stageFieldChange call anywhere in the codebase references these
    // entity types, and the corresponding CaseEntityType enum values were
    // removed from schema.prisma in the same pass.
  }
}

// ─────────────────────────────────────────────────────────────────────────
// HOTEL ADMIN SIDE — staging edits into a DRAFTING case before submission.
// ─────────────────────────────────────────────────────────────────────────

function serializeValue(v: any): string {
  return typeof v === 'string' ? v : JSON.stringify(v)
}

/** The hotel's most recent case (any status), with field changes — or null. */
export async function getLatestCase(hotelId: number) {
  return prisma.cases.findFirst({
    where: { hotel_id: hotelId },
    orderBy: { created_at: 'desc' },
    include: {
      field_changes: { orderBy: { id: 'asc' } },
      decider: { select: { name: true } },
    },
  })
}

/**
 * Stage one field change into the hotel's open DRAFTING case (creating it if
 * none exists). Throws if a case is currently PENDING — editing is locked
 * while a submission is under review. If the proposed value matches the
 * live/previous value, any existing staged row for that exact field is
 * removed instead (mirrors the dummy's "equals live = drop from draft").
 */
export async function stageFieldChange(params: {
  hotelId: number
  hotelAdminId: number
  entityType: string
  entityId: number | null
  fieldName: string | null
  previousValue: any
  proposedValue: any
}) {
  const { hotelId, hotelAdminId, entityType, entityId, fieldName } = params
  const previous = params.previousValue === null || params.previousValue === undefined ? null : serializeValue(params.previousValue)
  const proposed = serializeValue(params.proposedValue)

  let openCase = await prisma.cases.findFirst({
    where: { hotel_id: hotelId, status: { in: ['DRAFTING', 'PENDING'] } },
  })

  if (openCase && openCase.status === 'PENDING') {
    throw new Error('Editing is locked while your last submission is under review.')
  }

  // Creating a brand-new record (entity_id null) is never "equal to live" —
  // only updates to an existing field can collapse back to a no-op.
  const isNoOp = entityId !== null && fieldName !== null && proposed === (previous ?? '')

  if (!openCase) {
    if (isNoOp) return null // nothing to stage, nothing to create a case for
    openCase = await prisma.cases.create({
      data: { hotel_id: hotelId, submitted_by: hotelAdminId, status: 'DRAFTING' },
    })
  }

  const isNewRecordProposal = entityId === null && fieldName === null

  const existing = isNewRecordProposal
    ? null // every "new record" call is a distinct item — never collapse into a prior one
    : await prisma.case_field_changes.findFirst({
        where: { case_id: openCase.id, entity_type: entityType as any, entity_id: entityId, field_name: fieldName },
      })

  if (isNoOp) {
    if (existing) await prisma.case_field_changes.delete({ where: { id: existing.id } })
  } else if (existing) {
    await prisma.case_field_changes.update({
      where: { id: existing.id },
      data: { proposed_value: proposed, status: 'PENDING', rejection_reason: null, decided_at: null },
    })
  } else {
    await prisma.case_field_changes.create({
      data: {
        case_id: openCase.id,
        entity_type: entityType as any,
        entity_id: entityId,
        field_name: fieldName,
        previous_value: previous,
        proposed_value: proposed,
      },
    })
  }

  // Clean up: if that was the last staged field and the case has nothing
  // left, remove the empty DRAFTING case entirely rather than leave a shell.
  const remaining = await prisma.case_field_changes.count({ where: { case_id: openCase.id } })
  if (remaining === 0 && openCase.status === 'DRAFTING') {
    await prisma.cases.delete({ where: { id: openCase.id } })
    return null
  }

  return getLatestCase(hotelId)
}

// getRoomTypeCreationHistory removed — Room Type creation is direct CRUD
// now, never staged as a case_field_changes row, so there's nothing left
// for this to query.

/** Discard one staged field change (must belong to an open DRAFTING case). */
export async function discardSingleField(hotelId: number, fieldChangeId: number) {
  const fc = await prisma.case_field_changes.findUnique({ where: { id: fieldChangeId }, include: { case: true } })
  if (!fc || fc.case.hotel_id !== hotelId) throw new Error('Change not found.')
  if (fc.case.status !== 'DRAFTING') throw new Error('Only changes in an unsubmitted draft can be discarded individually.')

  await prisma.case_field_changes.delete({ where: { id: fieldChangeId } })

  const remaining = await prisma.case_field_changes.count({ where: { case_id: fc.case_id } })
  if (remaining === 0) {
    await prisma.cases.delete({ where: { id: fc.case_id } })
  }
}

/** Flip the open DRAFTING case to PENDING. */
export async function submitCase(hotelId: number) {
  const openCase = await prisma.cases.findFirst({
    where: { hotel_id: hotelId, status: 'DRAFTING' },
    include: { field_changes: true },
  })
  if (!openCase) throw new Error('No draft to submit.')
  if (openCase.field_changes.length === 0) throw new Error('No changes to submit.')

  return prisma.cases.update({
    where: { id: openCase.id },
    data: { status: 'PENDING', submitted_at: new Date() },
  })
}

/** Discard the open DRAFTING case entirely (cascades to its field changes). */
export async function discardCase(hotelId: number) {
  const openCase = await prisma.cases.findFirst({ where: { hotel_id: hotelId, status: 'DRAFTING' } })
  if (!openCase) throw new Error('No draft to discard.')
  await prisma.cases.delete({ where: { id: openCase.id } })
}

/** Reject one field — does not touch the case's own status. */
export async function rejectFieldChange(fieldChangeId: number, reason: string, decidedBy: number) {
  await prisma.case_field_changes.update({
    where: { id: fieldChangeId },
    data: { status: 'REJECTED', rejection_reason: reason, decided_at: new Date() },
  })
}

/** Approve every still-PENDING field change on a case, then decide the case. */
export async function approveRemaining(caseId: number, decidedBy: number) {
  const c = await prisma.cases.findUniqueOrThrow({
    where: { id: caseId },
    include: { field_changes: true },
  })

  const pending = c.field_changes
    .filter((fc: (typeof c.field_changes)[number]) => fc.status === 'PENDING')
    .sort((a: (typeof c.field_changes)[number], b: (typeof c.field_changes)[number]) => a.id - b.id)

  for (const fc of pending) {
    await applyFieldChange(fc, c.hotel_id)
    await prisma.case_field_changes.update({
      where: { id: fc.id },
      data: { status: 'APPROVED', decided_at: new Date() },
    })
  }

  await prisma.cases.update({
    where: { id: caseId },
    data: { status: 'APPROVED', decided_by: decidedBy, decided_at: new Date() },
  })

  // First-ever approved case publishes the hotel.
  const hotel = await prisma.hotels.findUnique({ where: { id: c.hotel_id } })
  if (hotel && hotel.approval_status === 'UNPUBLISHED') {
    await prisma.hotels.update({
      where: { id: c.hotel_id },
      data: { approval_status: 'PUBLISHED', published_at: new Date() },
    })
  }
}

/** Reject the whole case — nothing gets applied. */
export async function rejectEntireCase(caseId: number, reason: string, decidedBy: number) {
  await prisma.case_field_changes.updateMany({
    where: { case_id: caseId, status: 'PENDING' },
    data: { status: 'REJECTED', rejection_reason: reason, decided_at: new Date() },
  })
  await prisma.cases.update({
    where: { id: caseId },
    data: { status: 'REJECTED', decided_by: decidedBy, decided_at: new Date() },
  })
}