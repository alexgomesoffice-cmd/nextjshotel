'use client'

import { RoomTypesSection } from '@/components/hotel-admin/rooms/room-type-selection'

/**
 * Main Rooms page — Room Types only. Drilling into a specific type
 * (/dashboard/hotel/rooms/[id]) is where Variants and Physical Rooms live.
 * No tabs — this replaced the old Physical Rooms / Room Types tab split,
 * which also carried a stale, pre-Variant-redesign physical-rooms table.
 */
export default function RoomsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
        <p className="text-muted-foreground mt-1">Manage your hotel&apos;s room types, configurations, and physical room inventory.</p>
      </div>
      <RoomTypesSection />
    </div>
  )
}