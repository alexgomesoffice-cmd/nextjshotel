import crypto from 'crypto'
import { Prisma } from '@prisma/client'

export type VariantConfig = {
  room_type_id: number
  price: number
  room_size?: string | null
  max_occupancy?: number | null
  facility_ids: number[]
  bed_types: { bed_type_id: number; count: number }[]
}

/**
 * Deterministic signature for a variant's guest-facing configuration.
 * Images are deliberately excluded — see Artifact 3 / Section 6 of the
 * design doc. Everything is normalized before hashing so equivalent input
 * (different array order, "2000" vs "2000.0", trimmed whitespace) always
 * produces the same signature.
 */
export function computeVariantSignature(config: VariantConfig): string {
  const normalizedPrice = Number(config.price).toFixed(2)
  const normalizedSize = (config.room_size ?? '').trim().toLowerCase() || null
  const normalizedOccupancy = config.max_occupancy ?? null
  const normalizedFacilities = [...new Set(config.facility_ids)].sort((a, b) => a - b)
  const normalizedBeds = [...config.bed_types]
    .map((b) => ({ bed_type_id: b.bed_type_id, count: b.count }))
    .sort((a, b) => a.bed_type_id - b.bed_type_id)

  const canonical = JSON.stringify({
    room_type_id: config.room_type_id,
    price: normalizedPrice,
    room_size: normalizedSize,
    max_occupancy: normalizedOccupancy,
    facility_ids: normalizedFacilities,
    bed_types: normalizedBeds,
  })

  return crypto.createHash('sha256').update(canonical).digest('hex')
}

/**
 * Finds the existing room_variant matching this exact configuration, or
 * creates a new one — atomically, safe under concurrent requests via the
 * @@unique([room_type_id, signature_hash]) constraint + upsert (a race
 * between two identical creations resolves to the same row instead of
 * duplicating). Must be called inside a $transaction.
 */
export async function findOrCreateVariant(
  tx: Prisma.TransactionClient,
  config: VariantConfig
) {
  const signature_hash = computeVariantSignature(config)

  let variant
  let isNewlyCreated: boolean

  try {
    // Try to create first. If the unique constraint fires, an identical
    // variant already exists (possibly a concurrent request that won the
    // race) — fall through to fetching it instead of failing the request.
    variant = await tx.room_variants.create({
      data: {
        room_type_id: config.room_type_id,
        signature_hash,
        price: config.price,
        room_size: config.room_size ?? null,
        max_occupancy: config.max_occupancy ?? null,
      },
    })
    isNewlyCreated = true
  } catch (e: any) {
    if (e?.code !== 'P2002') throw e
    variant = await tx.room_variants.findUniqueOrThrow({
      where: { room_type_id_signature_hash: { room_type_id: config.room_type_id, signature_hash } },
    })
    isNewlyCreated = false
  }

  // Only wire up facilities/bed types the first time this variant is
  // actually created — an existing (matched) variant already has them.
  if (isNewlyCreated) {
    if (config.facility_ids.length > 0) {
      await tx.room_variant_facilities.createMany({
        data: config.facility_ids.map((facility_id) => ({ room_variant_id: variant.id, facility_id })),
        skipDuplicates: true,
      })
    }
    if (config.bed_types.length > 0) {
      await tx.room_variant_bed_types.createMany({
        data: config.bed_types.map((b) => ({ room_variant_id: variant.id, bed_type_id: b.bed_type_id, count: b.count })),
        skipDuplicates: true,
      })
    }
  }

  return { variant, isNewlyCreated }
}