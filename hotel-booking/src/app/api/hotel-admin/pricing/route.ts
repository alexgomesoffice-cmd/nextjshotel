import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { createPricingRuleSchema } from '@/lib/validations/pricing'
import { resolvePriceForDate } from '@/lib/pricing-resolver'
import { logHotelAdminActivity } from '@/lib/hotel-admin-activity'

/**
 * GET /api/hotel-admin/pricing
 * All pricing rules across every room variant this hotel owns, with the
 * variant/room-type context and today's resolved effective price for
 * display — resolved via the same resolver everything else uses.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const rules = await prisma.pricing_rules.findMany({
      where: { room_variant: { room_type: { hotel_id: hotelId } } },
      include: {
        room_variant: {
          include: {
            room_type: { select: { id: true, name: true } },
            bed_types: { include: { bed_type: true } },
            facilities: { include: { facility: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    const today = new Date()
    const data = rules.map((r) => ({
      ...r,
      today_resolved: resolvePriceForDate(Number(r.room_variant.price), [r] as any, today),
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Fetch pricing rules error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/hotel-admin/pricing
 * Direct create — live immediately, no case review. Ownership of
 * room_variant_id is verified against the authenticated hotel before
 * anything is written.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    if (!hotelId) return NextResponse.json({ success: false, message: 'No hotel assigned' }, { status: 400 })

    const body = await req.json()
    const result = createPricingRuleSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }
    const data = result.data

    const variant = await prisma.room_variants.findUnique({
      where: { id: data.room_variant_id },
      include: { room_type: true },
    })
    if (!variant || variant.room_type.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Room variant not found' }, { status: 404 })
    }

    const rule = await prisma.pricing_rules.create({
      data: {
        room_variant_id: data.room_variant_id,
        name: data.name,
        description: data.description ?? null,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        priority: data.priority,
        start_date: data.start_date,
        end_date: data.end_date,
      },
    })

    await logHotelAdminActivity({
      hotelId, actorId: hotelAdminId, actorType: 'HOTEL_ADMIN',
      action: 'pricing_rule.created', entityType: 'pricing_rules', entityId: rule.id,
      metadata: { room_variant_id: data.room_variant_id, name: data.name, discount_type: data.discount_type, discount_value: data.discount_value },
    })

    return NextResponse.json({ success: true, message: 'Offer created', data: rule }, { status: 201 })
  } catch (error) {
    console.error('Create pricing rule error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}