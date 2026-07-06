type RawRoomImage = {
  id: number
  image_url: string
}

type RawRoomTracker = {
  status: string
  check_in?: string | Date | null
  check_out?: string | Date | null
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
  room_trackers?: RawRoomTracker[] | null
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

function normalizeDate(value?: string | Date | null): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function groupRoomVariants(
  roomDetails: RawRoomDetail[],
  options?: { checkIn?: string | Date | null; checkOut?: string | Date | null }
): GroupedRoomVariant[] {
  const grouped = new Map<string, GroupedRoomVariant>()
  const checkInDate = normalizeDate(options?.checkIn)
  const checkOutDate = normalizeDate(options?.checkOut)
  const hasDateRange = Boolean(
    checkInDate && checkOutDate && !Number.isNaN(checkInDate.getTime()) && !Number.isNaN(checkOutDate.getTime())
  )

  for (const room of roomDetails) {
    const price = normalizePrice(room.price)
    // Group key based on ATTRIBUTES only, not image URLs (to group same room specs)
    const key = `${price}|${room.ac ? 1 : 0}|${room.smoking_allowed ? 1 : 0}|${room.pet_allowed ? 1 : 0}`

    const isAvailableForDate = !hasDateRange || !room.room_trackers?.some((tracker) => {
      const trackerCheckIn = normalizeDate(tracker.check_in)
      const trackerCheckOut = normalizeDate(tracker.check_out)
      return (
        tracker.status && ['RESERVED', 'BOOKED', 'CHECKED_IN'].includes(tracker.status) &&
        trackerCheckIn &&
        trackerCheckOut &&
        trackerCheckIn < checkOutDate &&
        trackerCheckOut > checkInDate
      )
    })

    const existing = grouped.get(key)
    if (existing) {
      existing.available_count += isAvailableForDate ? 1 : 0
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
      available_count: isAvailableForDate ? 1 : 0,
    })
  }

  return Array.from(grouped.values()).filter((variant) => variant.available_count > 0 || hasDateRange)
}
