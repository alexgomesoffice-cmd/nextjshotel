import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updatePricingRuleSchema } from '@/lib/validations/pricing'
import { resolvePriceForDate } from '@/lib/pricing-resolver'
import { logHotelAdminActivity } from '@/lib/hotel-admin-activity'

type Params = { params: Promise<{ id: string }> }

async function loadOwnedRule(id: number, hotelId: number) {
  const rule = await prisma.pricing_rules.findUnique({
    where: { id },
    include: {
      room_variant: {
        include: {
          room_type: true,
          bed_types: { include: { bed_type: true } },
          facilities: { include: { facility: true } },
        },
      },
    },
  })
  if (!rule || rule.room_variant.room_type.hotel_id !== hotelId) return null
  return rule
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const { id } = await params
    const ruleId = parseInt(id)
    if (isNaN(ruleId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const rule = await loadOwnedRule(ruleId, hotelId!)
    if (!rule) return NextResponse.json({ success: false, message: 'Pricing rule not found' }, { status: 404 })

    const today = new Date()
    return NextResponse.json({
      success: true,
      data: { ...rule, today_resolved: resolvePriceForDate(Number(rule.room_variant.price), [rule] as any, today) },
    })
  } catch (error) {
    console.error('Fetch pricing rule error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/** PATCH — direct edit, live immediately, no case review. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    const { id } = await params
    const ruleId = parseInt(id)
    if (isNaN(ruleId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const existing = await loadOwnedRule(ruleId, hotelId!)
    if (!existing) return NextResponse.json({ success: false, message: 'Pricing rule not found' }, { status: 404 })

    const body = await req.json()
    const result = updatePricingRuleSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }
    const data = result.data

    // Cross-field checks that depend on the OTHER value when only one is
    // being changed (e.g. editing discount_value on an existing PERCENTAGE rule).
    const effectiveType = data.discount_type ?? existing.discount_type
    const effectiveValue = data.discount_value ?? Number(existing.discount_value)
    if (effectiveType === 'PERCENTAGE' && effectiveValue > 100) {
      return NextResponse.json({ success: false, message: 'Percentage discount cannot exceed 100.' }, { status: 400 })
    }
    const effectiveStart = data.start_date ?? existing.start_date
    const effectiveEnd = data.end_date ?? existing.end_date
    if (effectiveEnd < effectiveStart) {
      return NextResponse.json({ success: false, message: 'End date cannot be before start date.' }, { status: 400 })
    }

    const updated = await prisma.pricing_rules.update({ where: { id: ruleId }, data })

    await logHotelAdminActivity({
      hotelId, actorId: hotelAdminId, actorType: 'HOTEL_ADMIN',
      action: 'pricing_rule.updated', entityType: 'pricing_rules', entityId: ruleId,
      metadata: { changed: Object.keys(data) },
    })

    return NextResponse.json({ success: true, message: 'Offer updated', data: updated })
  } catch (error) {
    console.error('Update pricing rule error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE — safe: nightly-rate history snapshots the rule's name as a plain string, not a live join, so deleting the rule never breaks past bookings' records. */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    const { id } = await params
    const ruleId = parseInt(id)
    if (isNaN(ruleId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const existing = await loadOwnedRule(ruleId, hotelId!)
    if (!existing) return NextResponse.json({ success: false, message: 'Pricing rule not found' }, { status: 404 })

    await prisma.pricing_rules.delete({ where: { id: ruleId } })

    await logHotelAdminActivity({
      hotelId, actorId: hotelAdminId, actorType: 'HOTEL_ADMIN',
      action: 'pricing_rule.deleted', entityType: 'pricing_rules', entityId: ruleId,
      metadata: { name: existing.name },
    })

    return NextResponse.json({ success: true, message: 'Offer deleted' })
  } catch (error) {
    console.error('Delete pricing rule error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}