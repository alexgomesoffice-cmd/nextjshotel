'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface RoomTypeDetail {
  id: number
  name: string
  description: string | null
  is_active: boolean
  hotel: { id: number; name: string }
  type_images: { image_url: string; is_cover: boolean }[]
  room_variants: Array<{
    id: number
    price: string
    room_size: string | null
    max_occupancy: number | null
    is_active: boolean
    variant_images: { image_url: string; is_cover: boolean }[]
    facilities: Array<{ facility: { id: number; name: string } }>
    bed_types: Array<{ bed_type: { id: number; name: string }; count: number }>
    room_details: Array<{ id: number; room_number: string; floor: number | null; status: string }>
    pricing_rules: Array<{ id: number; name: string | null; start_date: string; end_date: string; discounted_price: string }>
  }>
}

function statusLabel(status: string) {
  switch (status) {
    case 'AVAILABLE': return 'Available'
    case 'BOOKED': return 'Booked'
    case 'CHECKED_IN': return 'Checked in'
    case 'CHECKED_OUT': return 'Checked out'
    case 'MAINTENANCE': return 'Maintenance'
    default: return status
  }
}

function variantLabel(variant: RoomTypeDetail['room_variants'][number]) {
  const bedText = variant.bed_types.map((item) => `${item.count}× ${item.bed_type.name}`).join(', ')
  return bedText || variant.room_size || 'Room variant'
}

export default function RoomTypeDetailPage() {
  const params = useParams() as { hotelId: string; roomTypeId: string }
  const router = useRouter()
  const hotelId = params.hotelId
  const roomTypeId = params.roomTypeId

  const [roomType, setRoomType] = useState<RoomTypeDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const loadRoomType = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/system-admin/hotels/${hotelId}/room-types/${roomTypeId}`, { credentials: 'include' })
      const data = await res.json()
      setRoomType(data?.data ?? null)
    } catch (error) {
      console.error('Failed to load room type:', error)
      setRoomType(null)
    } finally {
      setLoading(false)
    }
  }, [hotelId, roomTypeId])

  useEffect(() => { loadRoomType() }, [loadRoomType])

  const totals = useMemo(() => {
    if (!roomType) return { variants: 0, rooms: 0 }
    return {
      variants: roomType.room_variants.length,
      rooms: roomType.room_variants.reduce((sum, variant) => sum + variant.room_details.length, 0),
    }
  }, [roomType])

  const activeImage = roomType?.type_images.find((image) => image.is_cover)?.image_url ?? roomType?.type_images[0]?.image_url ?? null

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/system/room-types/${hotelId}`)}
            className="text-sm text-primary hover:underline"
          >
            ← Hotel Room Types
          </button>
          <div>
            <h1 className="text-2xl font-semibold">{roomType?.name ?? 'Room Type'}</h1>
            <p className="text-sm text-muted-foreground">{roomType ? roomType.hotel.name : 'Loading property...'}</p>
          </div>
        </div>
        <div className="space-y-1 rounded-md border border-border/60 bg-secondary/80 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Variants</p>
          <p className="text-lg font-semibold">{totals.variants}</p>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Physical Rooms</p>
          <p className="text-lg font-semibold">{totals.rooms}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-2/4" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : !roomType ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-8 text-sm text-destructive">
          Room type not found.
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className="relative h-72 bg-slate-100">
                {activeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeImage} alt={roomType.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No room type image available
                  </div>
                )}
              </div>
              <CardContent className="space-y-4 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={roomType.is_active ? 'default' : 'secondary'}>
                    {roomType.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="rounded-full bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
                    {totals.variants} variant{totals.variants === 1 ? '' : 's'}
                  </span>
                  <span className="rounded-full bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
                    {totals.rooms} physical room{totals.rooms === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {roomType.description ?? 'No description provided for this room type.'}
                </p>
              </CardContent>
            </div>
          </Card>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Variants</p>
                <h2 className="text-lg font-semibold">Configuration details and physical rooms</h2>
              </div>
            </div>

            {roomType.room_variants.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 bg-muted p-8 text-center text-sm text-muted-foreground">
                No room variants found.
              </div>
            ) : (
              <div className="space-y-4">
                {roomType.room_variants.map((variant) => {
                  const imageUrl = variant.variant_images.find((image) => image.is_cover)?.image_url ?? variant.variant_images[0]?.image_url
                  const activePricing = variant.pricing_rules.find((rule) => {
                    const now = new Date()
                    return new Date(rule.start_date) <= now && new Date(rule.end_date) >= now
                  })

                  return (
                    <Card key={variant.id} className="overflow-hidden">
                      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                        <div className="relative h-64 bg-slate-100">
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrl} alt={variantLabel(variant)} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                              No variant image
                            </div>
                          )}
                        </div>
                        <div className="space-y-4 p-6">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="text-xl font-semibold">{variantLabel(variant)}</h3>
                              <p className="text-sm text-muted-foreground">
                                {variant.room_size ?? 'Room size not specified'} · {variant.max_occupancy ?? 'No occupancy set'} guest{variant.max_occupancy === 1 ? '' : 's'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold">৳{Number(variant.price).toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">Base price / night</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {variant.facilities.map((item) => (
                              <Badge key={item.facility.id} variant="secondary">
                                {item.facility.name}
                              </Badge>
                            ))}
                            {variant.bed_types.map((item) => (
                              <Badge key={item.bed_type.id} variant="outline">
                                {item.count} × {item.bed_type.name}
                              </Badge>
                            ))}
                          </div>

                          <div className="grid gap-2 sm:grid-cols-3 text-sm text-muted-foreground">
                            <div>
                              <p className="uppercase tracking-[0.24em]">Status</p>
                              <p className="text-foreground">{variant.is_active ? 'Active' : 'Inactive'}</p>
                            </div>
                            <div>
                              <p className="uppercase tracking-[0.24em]">Physical rooms</p>
                              <p className="text-foreground">{variant.room_details.length}</p>
                            </div>
                            <div>
                              <p className="uppercase tracking-[0.24em]">Pricing rule</p>
                              <p className="text-foreground">
                                {activePricing ? `${activePricing.name ?? 'Discount'} until ${new Date(activePricing.end_date).toLocaleDateString()}` : 'None'}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-md border border-border/60 bg-secondary/80 p-4">
                            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Physical Rooms</p>
                            {variant.room_details.length === 0 ? (
                              <p className="mt-3 text-sm text-muted-foreground">No physical rooms found.</p>
                            ) : (
                              <div className="mt-3 grid gap-2">
                                {variant.room_details.map((room) => (
                                  <div key={room.id} className="flex flex-col gap-1 rounded-md border border-border/60 bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="font-medium">Room {room.room_number}</p>
                                      <p className="text-xs text-muted-foreground">Floor {room.floor ?? '—'}</p>
                                    </div>
                                    <Badge variant={room.status === 'AVAILABLE' ? 'default' : room.status === 'MAINTENANCE' ? 'secondary' : 'outline'}>
                                      {statusLabel(room.status)}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
