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
        await prisma.hotels.update({ where: { id: hotelId }, data: { [fc.field_name]: value } })
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
        // value: image_url string
        await prisma.hotel_images.create({ data: { hotel_id: hotelId, image_url: value } })
      } else if (fc.field_name === 'deleted') {
        await prisma.hotel_images.delete({ where: { id: fc.entity_id } }).catch(() => {})
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

    case 'ROOM_TYPE': {
      if (fc.entity_id === null) {
        // value: { name, description, amenity_ids: number[] }
        const rt = await prisma.room_types.create({
          data: { hotel_id: hotelId, name: value.name, description: value.description ?? null },
        })
        if (Array.isArray(value.amenity_ids) && value.amenity_ids.length > 0) {
          await prisma.room_type_amenities.createMany({
            data: value.amenity_ids.map((amenity_id: number) => ({ room_type_id: rt.id, amenity_id })),
          })
        }
      } else if (fc.field_name === 'amenity_ids') {
        await prisma.room_type_amenities.deleteMany({ where: { room_type_id: fc.entity_id } })
        if (Array.isArray(value) && value.length > 0) {
          await prisma.room_type_amenities.createMany({
            data: value.map((amenity_id: number) => ({ room_type_id: fc.entity_id!, amenity_id })),
          })
        }
      } else if (fc.field_name) {
        await prisma.room_types.update({ where: { id: fc.entity_id }, data: { [fc.field_name]: value } })
      }
      return
    }

    case 'ROOM_TYPE_IMAGE': {
      if (fc.entity_id === null) {
        // value: { room_type_id, image_url }
        await prisma.room_images.create({ data: { room_type_id: value.room_type_id, image_url: value.image_url } })
      } else if (fc.field_name === 'deleted') {
        await prisma.room_images.delete({ where: { id: fc.entity_id } }).catch(() => {})
      }
      return
    }

    case 'ROOM_FACILITY': {
      // entity_id = room_details.id, value = array of facility ids
      if (fc.field_name === 'selection' && fc.entity_id !== null) {
        await prisma.room_detail_facilities.deleteMany({ where: { room_detail_id: fc.entity_id } })
        if (Array.isArray(value) && value.length > 0) {
          await prisma.room_detail_facilities.createMany({
            data: value.map((facility_id: number) => ({ room_detail_id: fc.entity_id!, facility_id })),
          })
        }
      }
      return
    }

    case 'ROOM_DETAIL': {
      if (fc.entity_id === null) {
        // value: { room_type_id, room_number, floor, price, room_size,
        //          max_occupancy, facility_ids: number[], bed_types: {bed_type_id, count}[] }
        const room = await prisma.room_details.create({
          data: {
            room_type_id: value.room_type_id,
            room_number: value.room_number,
            floor: value.floor ?? null,
            price: value.price,
            room_size: value.room_size ?? null,
            max_occupancy: value.max_occupancy ?? null,
          },
        })
        if (Array.isArray(value.facility_ids) && value.facility_ids.length > 0) {
          await prisma.room_detail_facilities.createMany({
            data: value.facility_ids.map((facility_id: number) => ({ room_detail_id: room.id, facility_id })),
          })
        }
        if (Array.isArray(value.bed_types) && value.bed_types.length > 0) {
          await prisma.room_detail_bed_types.createMany({
            data: value.bed_types.map((b: { bed_type_id: number; count: number }) => ({
              room_detail_id: room.id, bed_type_id: b.bed_type_id, count: b.count,
            })),
          })
        }
      }
      // Editing an existing room's non-facility fields is immediate (not
      // reviewed) per our design, so there's no "update" branch here.
      return
    }
  }
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

  const pending = c.field_changes.filter((fc: (typeof c.field_changes)[number]) => fc.status === 'PENDING')
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