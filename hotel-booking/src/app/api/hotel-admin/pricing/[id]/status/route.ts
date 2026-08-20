import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { updatePricingRuleStatusSchema } from '@/lib/validations/pricing'
import { logHotelAdminActivity } from '@/lib/hotel-admin-activity'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ['HOTEL_ADMIN'])
    if (auth.error) return auth.error

    const hotelId = auth.payload.hotel_id
    const hotelAdminId = auth.payload.actor_id
    const { id } = await params
    const ruleId = parseInt(id)
    if (isNaN(ruleId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

    const body = await req.json()
    const result = updatePricingRuleStatusSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ success: false, message: 'Validation error', errors: result.error.issues }, { status: 400 })
    }

    const rule = await prisma.pricing_rules.findUnique({
      where: { id: ruleId },
      include: { room_variant: { include: { room_type: true } } },
    })
    if (!rule || rule.room_variant.room_type.hotel_id !== hotelId) {
      return NextResponse.json({ success: false, message: 'Pricing rule not found' }, { status: 404 })
    }

    const updated = await prisma.pricing_rules.update({ where: { id: ruleId }, data: { status: result.data.status } })

    await logHotelAdminActivity({
      hotelId, actorId: hotelAdminId, actorType: 'HOTEL_ADMIN',
      action: result.data.status === 'ACTIVE' ? 'pricing_rule.activated' : 'pricing_rule.paused',
      entityType: 'pricing_rules', entityId: ruleId,
    })

    return NextResponse.json({ success: true, message: result.data.status === 'ACTIVE' ? 'Offer activated' : 'Offer paused', data: updated })
  } catch (error) {
    console.error('Update pricing rule status error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}