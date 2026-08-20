import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type ResolvedPrice = {
  basePrice: number
  effectivePrice: number
  discount: null | {
    ruleId: number
    name: string
    type: 'PERCENTAGE' | 'FIXED_AMOUNT'
    value: number
    amount: number // absolute currency amount saved
  }
}

type PricingRuleLike = {
  id: number
  name: string
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discount_value: Prisma.Decimal | number
  status: 'ACTIVE' | 'PAUSED'
  priority: number
  start_date: Date
  end_date: Date
}

/**
 * Pure calculation — given a base price and the set of rules that MIGHT
 * apply to a variant, resolves the effective price for one specific date.
 * No stacking: only the highest-priority ACTIVE rule whose [start_date,
 * end_date] covers stayDate is applied. Exported separately from the DB
 * lookup so booking creation (which fetches rules once for a whole date
 * range) doesn't re-query per night.
 */
export function resolvePriceForDate(
  basePrice: number,
  rules: PricingRuleLike[],
  stayDate: Date
): ResolvedPrice {
  const applicable = rules
    .filter((r) => r.status === 'ACTIVE')
    .filter((r) => stayDate >= startOfDay(r.start_date) && stayDate <= endOfDay(r.end_date))
    .sort((a, b) => b.priority - a.priority)

  const winner = applicable[0]
  if (!winner) {
    return { basePrice, effectivePrice: basePrice, discount: null }
  }

  const value = Number(winner.discount_value)
  let effectivePrice: number
  if (winner.discount_type === 'PERCENTAGE') {
    effectivePrice = basePrice * (1 - value / 100)
  } else {
    effectivePrice = basePrice - value
  }
  effectivePrice = Math.max(0, Math.round(effectivePrice * 100) / 100)
  const amount = Math.round((basePrice - effectivePrice) * 100) / 100

  return {
    basePrice,
    effectivePrice,
    discount: { ruleId: winner.id, name: winner.name, type: winner.discount_type, value, amount },
  }
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

/**
 * Fetches a variant's base price + its rules once, resolving the
 * effective price for a single date. Convenience wrapper for call sites
 * that only need one date (e.g. a room card showing "today's price").
 */
export async function getEffectivePrice(roomVariantId: number, stayDate: Date): Promise<ResolvedPrice> {
  const variant = await prisma.room_variants.findUniqueOrThrow({
    where: { id: roomVariantId },
    select: { price: true, pricing_rules: { where: { status: 'ACTIVE' } } },
  })
  return resolvePriceForDate(Number(variant.price), variant.pricing_rules as any, stayDate)
}

/**
 * Resolves the effective price for EVERY night in [checkIn, checkOut)
 * (checkOut itself is not a booked night, standard hotel convention).
 * This is what booking creation and multi-night price previews use — one
 * query, then pure in-memory resolution per date, so pricing logic never
 * gets duplicated across call sites.
 */
export async function getEffectivePriceRange(
  roomVariantId: number,
  checkIn: Date,
  checkOut: Date
): Promise<{ basePrice: number; nights: { date: Date; resolved: ResolvedPrice }[]; subtotal: number }> {
  const variant = await prisma.room_variants.findUniqueOrThrow({
    where: { id: roomVariantId },
    select: { price: true, pricing_rules: { where: { status: 'ACTIVE' } } },
  })
  const basePrice = Number(variant.price)
  const rules = variant.pricing_rules as any

  const nights: { date: Date; resolved: ResolvedPrice }[] = []
  const cursor = startOfDay(checkIn)
  const end = startOfDay(checkOut)
  while (cursor < end) {
    nights.push({ date: new Date(cursor), resolved: resolvePriceForDate(basePrice, rules, cursor) })
    cursor.setDate(cursor.getDate() + 1)
  }

  const subtotal = Math.round(nights.reduce((sum, n) => sum + n.resolved.effectivePrice, 0) * 100) / 100
  return { basePrice, nights, subtotal }
}