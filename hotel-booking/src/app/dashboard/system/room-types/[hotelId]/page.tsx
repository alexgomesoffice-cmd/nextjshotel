'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

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
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/system/room-types')}
            className="text-sm text-primary hover:underline"
          >
            ← All Hotels
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Hotel Room Types</h1>
            <p className="text-sm text-muted-foreground">View room types for this property and inspect their variant inventory.</p>
          </div>
        </div>
        {loadingHotel ? null : hotel ? (
          <div className="rounded-full border border-border/60 bg-secondary/80 px-4 py-2 text-sm font-medium text-muted-foreground">
            {hotel.city?.name ?? 'Location unavailable'}
          </div>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-6">
          {loadingHotel ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : hotel ? (
            <>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{hotel.name}</p>
                <p className="text-sm text-muted-foreground">{hotel.detail?.description ?? 'No description available.'}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-border/60 p-4">
                  <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground">Room Types</p>
                  <p className="text-lg font-semibold">{totals.roomTypes}</p>
                </div>
                <div className="rounded-md border border-border/60 p-4">
                  <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground">Variants</p>
                  <p className="text-lg font-semibold">{totals.variants}</p>
                </div>
                <div className="rounded-md border border-border/60 p-4">
                  <p className="text-[10px] uppercase tracking-[0.26em] text-muted-foreground">Physical Rooms</p>
                  <p className="text-lg font-semibold">{totals.rooms}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-destructive">Hotel not found.</div>
          )}
        </CardContent>
      </Card>

      {loadingRoomTypes ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <Skeleton className="h-40 w-full" />
              <CardContent className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : roomTypes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 bg-muted p-8 text-center text-sm text-muted-foreground">
          This hotel has no room types yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roomTypes.map((roomType) => (
            <Card key={roomType.id} className="overflow-hidden">
              <div className="relative h-44 bg-slate-100">
                {roomType.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={roomType.cover_image_url} alt={roomType.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No cover image
                  </div>
                )}
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold truncate">{roomType.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{roomType.description ?? 'No description available.'}</p>
                  </div>
                  <Badge variant={roomType.is_active ? 'default' : 'secondary'}>
                    {roomType.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <div>
                    <p>Variants</p>
                    <p className="font-semibold text-foreground">{roomType.variant_count}</p>
                  </div>
                  <div>
                    <p>Physical Rooms</p>
                    <p className="font-semibold text-foreground">{roomType.room_count}</p>
                  </div>
                </div>
                {roomType.starting_price != null && (
                  <div className="text-sm font-semibold">Starting from ৳{roomType.starting_price.toLocaleString()} / night</div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/dashboard/system/room-types/${hotelId}/${roomType.id}`)}
                >
                  View Details →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
