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
    amount: number
  }
}

export type PricingRuleLike = {
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
 * Pure pricing calculation for one stay date.
 *
 * Rules:
 * - Only ACTIVE rules can apply.
 * - Rule must cover stayDate.
 * - No discount stacking.
 * - Highest priority wins.
 * - If priorities tie, highest rule id wins deterministically.
 */
export function resolvePriceForDate(
  basePrice: number,
  rules: PricingRuleLike[],
  stayDate: Date
): ResolvedPrice {
  const applicable = rules
    .filter((r) => r.status === 'ACTIVE')
    .filter(
      (r) =>
        stayDate >= startOfDay(r.start_date) &&
        stayDate <= endOfDay(r.end_date)
    )
    .sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }

      return b.id - a.id
    })

  const winner = applicable[0]

  if (!winner) {
    return {
      basePrice,
      effectivePrice: basePrice,
      discount: null,
    }
  }

  const value = Number(winner.discount_value)

  let effectivePrice: number

  if (winner.discount_type === 'PERCENTAGE') {
    effectivePrice = basePrice * (1 - value / 100)
  } else {
    effectivePrice = basePrice - value
  }

  effectivePrice =
    Math.round(Math.max(0, effectivePrice) * 100) / 100

  const amount =
    Math.round((basePrice - effectivePrice) * 100) / 100

  return {
    basePrice,
    effectivePrice,
    discount: {
      ruleId: winner.id,
      name: winner.name,
      type: winner.discount_type,
      value,
      amount,
    },
  }
}

/**
 * Resolves every booked night in [checkIn, checkOut).
 * checkOut itself is not charged.
 */
export function resolvePriceRange(
  basePrice: number,
  rules: PricingRuleLike[],
  checkIn: Date,
  checkOut: Date
): {
  basePrice: number
  nights: { date: Date; resolved: ResolvedPrice }[]
  subtotal: number
} {
  const cursor = startOfDay(checkIn)
  const end = startOfDay(checkOut)

  if (end <= cursor) {
    throw new Error('checkOut must be after checkIn')
  }

  const nights: {
    date: Date
    resolved: ResolvedPrice
  }[] = []

  while (cursor < end) {
    nights.push({
      date: new Date(cursor),
      resolved: resolvePriceForDate(
        basePrice,
        rules,
        cursor
      ),
    })

    cursor.setDate(cursor.getDate() + 1)
  }

  const subtotal =
    Math.round(
      nights.reduce(
        (sum, night) =>
          sum + night.resolved.effectivePrice,
        0
      ) * 100
    ) / 100

  return {
    basePrice,
    nights,
    subtotal,
  }
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/**
 * Resolve today's/single-date effective price.
 */
export async function getEffectivePrice(
  roomVariantId: number,
  stayDate: Date
): Promise<ResolvedPrice> {
  const variant = await prisma.room_variants.findUniqueOrThrow({
    where: { id: roomVariantId },
    select: {
      price: true,
      pricing_rules: {
        where: { status: 'ACTIVE' },
      },
    },
  })

  return resolvePriceForDate(
    Number(variant.price),
    variant.pricing_rules,
    stayDate
  )
}

/**
 * Resolve every night in [checkIn, checkOut).
 *
 * Rules are fetched once; all nightly calculations happen in memory.
 */
export async function getEffectivePriceRange(
  roomVariantId: number,
  checkIn: Date,
  checkOut: Date
): Promise<{
  basePrice: number
  nights: {
    date: Date
    resolved: ResolvedPrice
  }[]
  subtotal: number
}> {
  const variant = await prisma.room_variants.findUniqueOrThrow({
    where: { id: roomVariantId },
    select: {
      price: true,
      pricing_rules: {
        where: { status: 'ACTIVE' },
      },
    },
  })

  return resolvePriceRange(
    Number(variant.price),
    variant.pricing_rules,
    checkIn,
    checkOut
  )
}