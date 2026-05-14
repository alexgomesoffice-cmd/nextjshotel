type RawRoomImage = {
  id: number
  image_url: string
}

type RawRoomDetail = {
  id: number
  room_number: string
  price: number | string | { toNumber: () => number }
  ac: boolean
  smoking_allowed: boolean
  pet_allowed: boolean
  notes: string | null
  room_images: RawRoomImage[]
}

export type GroupedRoomVariant = {
  id: number
  room_number: string
  price: number
  ac: boolean
  smoking_allowed: boolean
  pet_allowed: boolean
  notes: string | null
  room_images: RawRoomImage[]
  available_count: number
}

function normalizePrice(price: number | string | { toNumber: () => number }): number {
  if (typeof price === 'number') return price
  if (typeof price === 'string') return parseFloat(price)
  if (price && typeof price.toNumber === 'function') return price.toNumber()
  return Number(price)
}

export function groupRoomVariants(roomDetails: RawRoomDetail[]): GroupedRoomVariant[] {
  const grouped = new Map<string, GroupedRoomVariant>()

  for (const room of roomDetails) {
    const price = normalizePrice(room.price)
    const imageUrl = room.room_images?.[0]?.image_url ?? ''
    // Group key based on ATTRIBUTES only, not image URLs (to group same room specs)
    const key = `${price}|${room.ac ? 1 : 0}|${room.smoking_allowed ? 1 : 0}|${room.pet_allowed ? 1 : 0}`

    const existing = grouped.get(key)
    if (existing) {
      existing.available_count += 1
      continue
    }

    grouped.set(key, {
      id: room.id,
      room_number: room.room_number,
      price,
      ac: room.ac,
      smoking_allowed: room.smoking_allowed,
      pet_allowed: room.pet_allowed,
      notes: room.notes,
      room_images: room.room_images,
      available_count: 1,
    })
  }

  return Array.from(grouped.values())
}
