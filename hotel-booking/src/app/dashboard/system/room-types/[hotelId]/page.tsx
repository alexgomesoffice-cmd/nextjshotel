'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, ArrowRight, ImageIcon, Layers, DoorOpen, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface HotelDetail {
  id: number
  name: string
  city: { name: string } | null
  detail: { description: string | null } | null
}

interface RoomTypeSummary {
  id: number
  name: string
  description: string | null
  is_active: boolean
  cover_image_url: string | null
  variant_count: number
  room_count: number
  starting_price: number | null
}

export default function HotelRoomTypesPage() {
  const params = useParams() as { hotelId: string }
  const router = useRouter()
  const hotelId = params.hotelId

  const [hotel, setHotel] = useState<HotelDetail | null>(null)
  const [roomTypes, setRoomTypes] = useState<RoomTypeSummary[]>([])
  const [loadingHotel, setLoadingHotel] = useState(true)
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(true)

  const loadHotel = useCallback(async () => {
    setLoadingHotel(true)
    try {
      const res = await fetch(`/api/system-admin/hotels/${hotelId}`, { credentials: 'include' })
      const data = await res.json()
      setHotel(data?.data ?? null)
    } catch (error) {
      console.error('Failed to load hotel:', error)
      setHotel(null)
    } finally {
      setLoadingHotel(false)
    }
  }, [hotelId])

  const loadRoomTypes = useCallback(async () => {
    setLoadingRoomTypes(true)
    try {
      const res = await fetch(`/api/system-admin/hotels/${hotelId}/rooms`, { credentials: 'include' })
      const data = await res.json()
      setRoomTypes(data?.data ?? [])
    } catch (error) {
      console.error('Failed to load room types:', error)
      setRoomTypes([])
    } finally {
      setLoadingRoomTypes(false)
    }
  }, [hotelId])

  useEffect(() => { loadHotel() }, [loadHotel])
  useEffect(() => { loadRoomTypes() }, [loadRoomTypes])

  const totals = useMemo(() => {
    return {
      roomTypes: roomTypes.length,
      variants: roomTypes.reduce((sum, type) => sum + type.variant_count, 0),
      rooms: roomTypes.reduce((sum, type) => sum + type.room_count, 0),
    }
  }, [roomTypes])

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-5">
      {/* Back navigation & Page Header */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard/system/room-types')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>All Hotels</span>
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Hotel Room Types</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              View room types for this property and inspect their variant inventory.
            </p>
          </div>

          {!loadingHotel && hotel && (
            <Badge
              variant="outline"
              className="px-3 py-1.5 text-xs font-medium bg-card border-border/80 text-muted-foreground gap-1.5 self-start sm:self-auto shrink-0"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>{hotel.city?.name ?? 'Location unavailable'}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Hotel Summary Section */}
      <Card className="overflow-hidden border border-border/80 bg-card p-6 shadow-sm">
        {loadingHotel ? (
          <div className="space-y-4">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : hotel ? (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold uppercase tracking-tight text-foreground">{hotel.name}</h2>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-4xl">
                {hotel.detail?.description ?? 'No description available.'}
              </p>
            </div>

            <div className="pt-4 border-t border-border/60">
              <div className="grid grid-cols-3 gap-3 text-center bg-secondary/30 rounded-lg p-3 border border-border/40">
                <div>
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                    Room Types
                  </p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{totals.roomTypes}</p>
                </div>
                <div className="border-x border-border/40 px-1">
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                    Variants
                  </p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{totals.variants}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                    Physical Rooms
                  </p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{totals.rooms}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm font-medium text-destructive">Hotel not found.</div>
        )}
      </Card>

      {/* Room Types Listing Section Header */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Room Types</h2>
            <p className="text-xs text-muted-foreground">
              Manage room configurations and inspect their variants and physical rooms.
            </p>
          </div>
          {!loadingRoomTypes && (
            <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold bg-secondary/80">
              {totals.roomTypes} room type{totals.roomTypes === 1 ? '' : 's'}
            </Badge>
          )}
        </div>

        {loadingRoomTypes ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="overflow-hidden border border-border/60 bg-card">
                <Skeleton className="h-44 w-full" />
                <CardContent className="space-y-4 p-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3.5 w-full" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : roomTypes.length === 0 ? (
          <Card className="border border-dashed border-border/80 bg-card p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
            <h3 className="text-base font-semibold text-foreground">No room types found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              This property does not have any configured room types yet.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {roomTypes.map((roomType) => (
              <Card
                key={roomType.id}
                className="group overflow-hidden border border-border/80 bg-card shadow-sm hover:border-border hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Cover Image */}
                  <div className="relative h-44 w-full bg-secondary/40 overflow-hidden border-b border-border/40">
                    {roomType.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={roomType.cover_image_url}
                        alt={roomType.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-muted-foreground/60 gap-1.5 bg-secondary/20">
                        <ImageIcon className="h-8 w-8 stroke-[1.5]" />
                        <span className="text-xs font-medium">Image unavailable</span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-5 space-y-4">
                    {/* Header: Name & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-foreground truncate tracking-tight group-hover:text-primary transition-colors">
                          {roomType.name}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 min-h-[32px] leading-relaxed">
                          {roomType.description ?? 'No description available.'}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5',
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

                    <div className="my-2 border-t border-border/50" />

                    {/* Room Type Metrics */}
                    <div className="grid grid-cols-2 gap-3 text-center bg-secondary/30 rounded-lg p-2.5 border border-border/40">
                      <div>
                        <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                          Variants
                        </p>
                        <p className="text-base font-bold text-foreground mt-0.5">{roomType.variant_count}</p>
                      </div>
                      <div className="border-l border-border/40 pl-3">
                        <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                          Physical Rooms
                        </p>
                        <p className="text-base font-bold text-foreground mt-0.5">{roomType.room_count}</p>
                      </div>
                    </div>

                    {/* Starting Price */}
                    {roomType.starting_price != null && (
                      <div className="text-xs text-muted-foreground font-medium pt-1">
                        Starting from{' '}
                        <span className="text-sm font-bold text-foreground">
                          ৳{roomType.starting_price.toLocaleString()}
                        </span>{' '}
                        / night
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Primary Action */}
                <div className="px-5 pb-5 pt-0">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-9 text-xs font-semibold bg-secondary/20 hover:bg-primary border-border/80 transition-colors"
                    onClick={() => router.push(`/dashboard/system/room-types/${hotelId}/${roomType.id}`)}
                  >
                    <span>View Details</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
