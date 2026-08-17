'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ImageIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  BOOKED: 'bg-blue-500',
  CHECKED_IN: 'bg-purple-500',
  CHECKED_OUT: 'bg-slate-400',
  MAINTENANCE: 'bg-amber-500',
}

function statusLabel(status: string) {
  switch (status) {
    case 'AVAILABLE': return 'Active'
    case 'BOOKED': return 'Booked'
    case 'CHECKED_IN': return 'Checked in'
    case 'CHECKED_OUT': return 'Checked out'
    case 'MAINTENANCE': return 'Maintenance'
    default: return status
  }
}

function variantLabel(variant: RoomTypeDetail['room_variants'][number]) {
  const bedText = variant.bed_types.map((item) => `${item.count} × ${item.bed_type.name}`).join(', ')
  return bedText || variant.room_size || `Variant #${variant.id}`
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
    <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-6">
      {/* Back Navigation */}
      <div>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/system/room-types/${hotelId}`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Hotel Room Types</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : !roomType ? (
        <Card className="border border-destructive/40 bg-destructive/10 p-8 text-center text-sm text-destructive">
          Room type not found.
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Header & Integrated Metrics */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{roomType.name}</h1>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">{roomType.hotel.name}</p>
            </div>

            <div className="flex items-center gap-6 border border-border/80 bg-card rounded-xl px-5 py-3 shadow-sm shrink-0">
              <div className="text-center">
                <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Variants</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{totals.variants}</p>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <div className="text-center">
                <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Physical Rooms</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{totals.rooms}</p>
              </div>
            </div>
          </div>

          {/* Room Type Summary Card */}
          <Card className="overflow-hidden border border-border/80 bg-card shadow-sm p-0">
            <div className="grid gap-6 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] items-center">
              {/* Image Section (25-30% width) */}
              <div className="relative h-48 md:h-full min-h-[160px] w-full bg-secondary/30 border-r border-border/60 overflow-hidden shrink-0">
                {activeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeImage} alt={roomType.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted-foreground/60 gap-2 bg-secondary/20">
                    <ImageIcon className="h-8 w-8 stroke-[1.5]" />
                    <span className="text-xs font-medium">No room type image available</span>
                  </div>
                )}
              </div>

              {/* Information Section */}
              <div className="p-6 space-y-3 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{roomType.name}</h2>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5',
                      roomType.is_active
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full shrink-0',
                        roomType.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                      )}
                    />
                    <span>{roomType.is_active ? 'Active' : 'Inactive'}</span>
                  </Badge>
                </div>

                <p className="text-xs font-medium text-muted-foreground">{roomType.hotel.name}</p>

                {roomType.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{roomType.description}</p>
                )}

                <div className="pt-1 text-xs font-medium text-muted-foreground">
                  <span>{totals.variants} variant{totals.variants === 1 ? '' : 's'}</span>
                  <span className="mx-1.5">•</span>
                  <span>{totals.rooms} physical room{totals.rooms === 1 ? '' : 's'}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Variants Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Variants</h2>
                <p className="text-xs text-muted-foreground">Configuration details and physical rooms</p>
              </div>
              <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-0.5">
                {roomType.room_variants.length} variant{roomType.room_variants.length === 1 ? '' : 's'}
              </Badge>
            </div>

            {roomType.room_variants.length === 0 ? (
              <Card className="border border-dashed border-border/80 bg-card p-12 text-center text-sm text-muted-foreground">
                No room variants configured.
              </Card>
            ) : (
              <div className="space-y-4">
                {roomType.room_variants.map((variant) => {
                  const imageUrl = variant.variant_images.find((image) => image.is_cover)?.image_url ?? variant.variant_images[0]?.image_url
                  const activePricing = variant.pricing_rules.find((rule) => {
                    const now = new Date()
                    return new Date(rule.start_date) <= now && new Date(rule.end_date) >= now
                  })

                  // Filter out facility tags that duplicate bed names
                  const bedNames = (variant.bed_types ?? []).map((b) => b.bed_type?.name?.toLowerCase() ?? '')
                  const filteredFacilities = (variant.facilities ?? []).filter((f) => {
                    const fName = f.facility?.name?.toLowerCase() ?? ''
                    return !bedNames.some((bName) => bName && fName.includes(bName))
                  })

                  return (
                    <Card
                      key={variant.id}
                      className="overflow-hidden border border-border/80 bg-card shadow-sm hover:border-border transition-colors p-5 space-y-4"
                    >
                      {/* Top Row: Thumbnail + Details + Pricing */}
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          {/* Variant Image Thumbnail */}
                          <div className="relative w-44 sm:w-52 h-28 rounded-lg overflow-hidden border border-border/60 bg-secondary/30 shrink-0">
                            {imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={imageUrl} alt={variantLabel(variant)} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center p-3 text-center text-muted-foreground/60 gap-1 bg-secondary/20">
                                <ImageIcon className="h-6 w-6 stroke-[1.5]" />
                                <span className="text-[10px] font-medium">No variant image</span>
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="min-w-0 flex-1 space-y-2">
                            <h3 className="font-bold text-base text-foreground tracking-tight">{variantLabel(variant)}</h3>

                            <p className="text-xs text-muted-foreground font-medium">
                              {variant.room_size ? `${variant.room_size} sq ft` : 'Standard size'}
                              {variant.max_occupancy ? ` · ${variant.max_occupancy} guests` : ''}
                            </p>

                            {filteredFacilities.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {filteredFacilities.map((item) => (
                                  <span
                                    key={item.facility.id}
                                    className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary/80 text-secondary-foreground border border-border/40"
                                  >
                                    {item.facility.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Base Price */}
                        <div className="text-left sm:text-right shrink-0">
                          <p className="text-lg font-bold text-foreground tracking-tight">
                            ৳{Number(variant.price).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium">Base price / night</p>
                        </div>
                      </div>

                      {/* 3-Column Info Row */}
                      <div className="grid grid-cols-3 gap-3 bg-secondary/20 rounded-lg p-3 border border-border/40 text-xs">
                        <div>
                          <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Status</p>
                          <div className="flex items-center gap-1.5 mt-1 font-bold text-foreground">
                            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', variant.is_active ? 'bg-emerald-500' : 'bg-slate-400')} />
                            <span>{variant.is_active ? 'Active' : 'Inactive'}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Physical Rooms</p>
                          <p className="font-bold text-foreground mt-1">{variant.room_details.length}</p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Pricing Rule</p>
                          <p className="font-bold text-foreground mt-1 truncate">
                            {activePricing ? `${activePricing.name ?? 'Discount'}` : 'None'}
                          </p>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border/60" />

                      {/* Physical Rooms Listing */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Physical Rooms</p>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {variant.room_details.length} room{variant.room_details.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {variant.room_details.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No physical rooms in this configuration.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {variant.room_details.map((room) => (
                              <div
                                key={room.id}
                                className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-secondary/40 px-3 py-1.5 text-xs font-semibold text-foreground"
                              >
                                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_DOT[room.status] ?? 'bg-slate-400')} />
                                <span>Room {room.room_number}</span>
                                <span className="text-[10px] text-muted-foreground font-normal">({statusLabel(room.status)})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
