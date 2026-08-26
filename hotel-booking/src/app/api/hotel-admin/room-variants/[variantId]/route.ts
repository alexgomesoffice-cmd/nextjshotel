import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { findOrCreateVariant, computeVariantSignature } from '@/lib/room-variant-matching'
import { logHotelAdminActivity } from '@/lib/hotel-admin-activity'
import { resolvePriceForDate } from '@/lib/pricing-resolver'
import { z } from 'zod'

const updateVariantSchema = z.object({
  price: z.number().positive().optional(),
  room_size: z.string().max(50).optional().nullable(),
  max_occupancy: z.number().int().positive().optional().nullable(),
  facility_ids: z.array(z.number().int().positive()).optional(),
  bed_types: z.array(z.object({ bed_type_id: z.number().int().positive(), count: z.number().int().positive() })).optional(),
})

type Params = { params: Promise<{ variantId: string }> }

const VARIANT_INCLUDE = {
  room_type: true,
  facilities: { include: { facility: true } },
  bed_types: { include: { bed_type: true } },
  variant_images: { orderBy: { sort_order: 'asc' as const } },
  room_details: { where: { deleted_at: null }, orderBy: { room_number: 'asc' as const } },
  pricing_rules: { where: { status: 'ACTIVE' as const } },
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const { variantId } = await params
    const id = parseInt(variantId)
    if (isNaN(id)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const variant = await prisma.room_variants.findUnique({ where: { id }, include: VARIANT_INCLUDE })
    if (!variant || variant.room_type.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Variant not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { ...variant, pricing: resolvePriceForDate(Number(variant.price), variant.pricing_rules, new Date()) },
    })
  } catch (error) {
    console.error('Fetch variant error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/hotel-admin/room-variants/[variantId]
 * Direct edit of a variant's whole configuration — live immediately, no
 * case review. Every editable field here is variant-defining, so any
 * change recalculates the signature for ALL of this variant's rooms at
 * once: if the new config matches a different existing variant, every
 * room (and, since this is really "the same variant under a new
 * identity," its images) moves there; otherwise a fresh variant is
 * created and everything moves to it. The old variant is left in place,
 * empty, per the same "don't auto-delete" rule as single-room edits.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    const { variantId } = await params
    const id = parseInt(variantId)
    if (isNaN(id)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const body = await req.json()
    const result = updateVariantSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }
    const data = result.data

    const variant = await prisma.room_variants.findUnique({
      where: { id },
      include: { room_type: true, facilities: true, bed_types: true },
    })
    if (!variant || variant.room_type.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Variant not found' }, { status: 404 })
    }

    const config = {
      room_type_id: variant.room_type_id,
      price: data.price !== undefined ? data.price : Number(variant.price),
      room_size: data.room_size !== undefined ? data.room_size : variant.room_size,
      max_occupancy: data.max_occupancy !== undefined ? data.max_occupancy : variant.max_occupancy,
      facility_ids: data.facility_ids !== undefined ? data.facility_ids : variant.facilities.map((f) => f.facility_id),
      bed_types: data.bed_types !== undefined ? data.bed_types : variant.bed_types.map((b) => ({ bed_type_id: b.bed_type_id, count: b.count })),
    }

    const newSignature = computeVariantSignature(config)
    if (newSignature === variant.signature_hash) {
      // Nothing actually changed.
      const unchanged = await prisma.room_variants.findUnique({ where: { id }, include: VARIANT_INCLUDE })
      return NextResponse.json({ success: true, message: 'No changes', data: unchanged })
    }

    // Check if another variant with the new signature already exists
    const existingOtherVariant = await prisma.room_variants.findFirst({
      where: {
        room_type_id: variant.room_type_id,
        signature_hash: newSignature,
        id: { not: id },
      },
    })

    const targetVariantId = await prisma.$transaction(async (tx) => {
      if (existingOtherVariant) {
        // Merge into the existing matching variant
        await tx.room_details.updateMany({
          where: { room_variant_id: id },
          data: { room_variant_id: existingOtherVariant.id },
        })

        await tx.room_images.updateMany({
          where: { room_variant_id: id },
          data: { room_variant_id: existingOtherVariant.id },
        })

        // Remove the old variant to prevent empty orphaned duplicates
        await tx.room_variants.delete({ where: { id } })

        return existingOtherVariant.id
      } else {
        // Update current variant IN PLACE
        await tx.room_variants.update({
          where: { id },
          data: {
            signature_hash: newSignature,
            price: config.price,
            room_size: config.room_size ?? null,
            max_occupancy: config.max_occupancy ?? null,
          },
        })

        // Update facilities
        await tx.room_variant_facilities.deleteMany({ where: { room_variant_id: id } })
        if (config.facility_ids.length > 0) {
          await tx.room_variant_facilities.createMany({
            data: config.facility_ids.map((facility_id) => ({ room_variant_id: id, facility_id })),
          })
        }

        // Update bed types
        await tx.room_variant_bed_types.deleteMany({ where: { room_variant_id: id } })
        if (config.bed_types.length > 0) {
          await tx.room_variant_bed_types.createMany({
            data: config.bed_types.map((b) => ({ room_variant_id: id, bed_type_id: b.bed_type_id, count: b.count })),
          })
        }

        return id
      }
    })

    await logHotelAdminActivity({
      hotelId, actorId: hotelAdminId, actorType: 'HOTEL_ADMIN',
      action: 'variant.reconfigured', entityType: 'room_variants', entityId: id,
      metadata: { from_variant_id: id, to_variant_id: targetVariantId },
    })

    const updated = await prisma.room_variants.findUnique({ where: { id: targetVariantId }, include: VARIANT_INCLUDE })

    return NextResponse.json({
      success: true,
      message: existingOtherVariant ? 'Configuration updated — merged into an existing matching variant' : 'Configuration updated successfully',
      data: updated,
    })
  } catch (error) {
    console.error('Update variant error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/hotel-admin/room-variants/[variantId]
 * Direct Hotel Admin deletion. Inventory must be completely free before a
 * variant can be removed. Physical rooms without booking history are
 * removed with the variant; historical booking records are never removed.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    const { variantId } = await params
    const id = parseInt(variantId)
    if (isNaN(id)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const variant = await prisma.room_variants.findUnique({
      where: { id },
      select: {
        room_type: { select: { hotel_id: true } },
        room_details: {
          select: {
            id: true,
            room_number: true,
            status: true,
            deleted_at: true,
            room_bookings: {
              select: {
                booking: {
                  select: {
                    status: true,
                    check_in: true,
                    check_out: true,
                    reserved_until: true,
                  },
                },
              },
            },
            room_trackers: {
              select: {
                status: true,
                check_in: true,
                check_out: true,
              },
            },
          },
        },
      },
    })
    if (!variant || variant.room_type.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Variant not found' }, { status: 404 })
    }

    const now = new Date()
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const activeBookingStatuses = new Set(['RESERVED', 'BOOKED', 'CHECKED_IN'])
    const activeTrackerStatuses = new Set(['RESERVED', 'BOOKED', 'CHECKED_IN'])
    const affectsCurrentOrFutureInventory = (checkOut: Date) => checkOut > today

    const liveRooms = variant.room_details.filter((room) => room.deleted_at === null)
    const unavailableRoom = liveRooms.find((room) => room.status !== 'AVAILABLE')
    if (unavailableRoom) {
      return NextResponse.json({
        success: false,
        message: `Room ${unavailableRoom.room_number} is ${unavailableRoom.status.toLowerCase().replace('_', ' ')} and is not available for deletion.`,
      }, { status: 409 })
    }

    const hasActiveBooking = liveRooms.some((room) => room.room_bookings.some(({ booking }) => {
      if (!activeBookingStatuses.has(booking.status)) return false
      if (booking.status === 'RESERVED' && booking.reserved_until && booking.reserved_until <= now) return false
      return affectsCurrentOrFutureInventory(booking.check_out)
    }))
    if (hasActiveBooking) {
      return NextResponse.json({
        success: false,
        message: 'This room variant cannot be deleted because at least one physical room has an active or ongoing booking.',
      }, { status: 409 })
    }

    const hasActiveTracker = liveRooms.some((room) => room.room_trackers.some((tracker) => (
      activeTrackerStatuses.has(tracker.status) && affectsCurrentOrFutureInventory(tracker.check_out)
    )))
    if (hasActiveTracker) {
      return NextResponse.json({
        success: false,
        message: 'This room variant cannot be deleted because at least one physical room has an active inventory lock.',
      }, { status: 409 })
    }

    try {
      await prisma.$transaction(async (tx) => {
        const now = new Date()
        let hasAnyHistory = false

        for (const room of variant.room_details) {
          const hasHistory = room.room_bookings.length > 0
          if (hasHistory) {
            hasAnyHistory = true
            await tx.room_details.update({ where: { id: room.id }, data: { deleted_at: now } })
            await tx.room_trackers.deleteMany({ where: { room_detail_id: room.id } })
          } else {
            await tx.room_trackers.deleteMany({ where: { room_detail_id: room.id } })
            await tx.room_details.delete({ where: { id: room.id } })
          }
        }

        if (hasAnyHistory) {
          await tx.room_variants.update({ where: { id }, data: { is_active: false } })
        } else {
          await tx.room_variants.delete({ where: { id } })
        }
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
        return NextResponse.json({
          success: false,
          message: 'This room variant still has inventory or booking records and cannot be deleted safely.',
        }, { status: 409 })
      }
      throw error
    }
    await logHotelAdminActivity({
      hotelId, actorId: hotelAdminId, actorType: 'HOTEL_ADMIN',
      action: 'variant.deleted', entityType: 'room_variants', entityId: id,
    })

    return NextResponse.json({ success: true, message: 'Room variant deleted' })
  } catch (error) {
    console.error('Delete variant error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}