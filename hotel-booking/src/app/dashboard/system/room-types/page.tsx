'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { OpsSectionHeader } from '@/components/admin/shared/primitives'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

interface HotelSummary {
  id: number
  name: string
  city: { name: string } | null
  approval_status: string
  cover_image_url: string | null
  room_type_count: number
  variant_count: number
  room_count: number
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'UNPUBLISHED', label: 'Unpublished' },
  { value: 'SUSPENDED', label: 'Suspended' },
]

export default function SystemAdminRoomTypesPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [hotels, setHotels] = useState<HotelSummary[]>([])
  const [loading, setLoading] = useState(true)

  const loadHotels = useCallback(async () => {
    setLoading(true)
    try {
      const searchParams = new URLSearchParams()
      if (query.trim()) searchParams.set('search', query.trim())
      if (status && status !== 'ALL') searchParams.set('status', status)
      searchParams.set('limit', '50')

      const res = await fetch(`/api/system-admin/hotels?${searchParams.toString()}`, { credentials: 'include' })
      const data = await res.json()
      setHotels(data?.data?.hotels ?? [])
    } catch (error) {
      console.error('Failed to load hotels:', error)
      setHotels([])
    } finally {
      setLoading(false)
    }
  }, [query, status])

  useEffect(() => {
    loadHotels()
  }, [loadHotels])

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <OpsSectionHeader
        title="Hotel Room Types"
        description="View and manage room type configurations across all properties."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search hotels by name, city, or address..."
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={setStatus} className="w-full max-w-xs">
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={loadHotels} className="min-w-[140px]">
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <Skeleton className="h-44 w-full" />
              <CardContent className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : hotels.length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 bg-muted p-8 text-center text-sm text-muted-foreground">
          No hotels found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {hotels.map((hotel) => (
            <Card key={hotel.id} className="overflow-hidden">
              <div className="relative h-44 bg-slate-100">
                {hotel.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hotel.cover_image_url} alt={hotel.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No hotel image
                  </div>
                )}
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold leading-tight">{hotel.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {hotel.city?.name ?? 'Location unavailable'}
                    </p>
                  </div>
                  <Badge variant={hotel.approval_status === 'PUBLISHED' ? 'default' : hotel.approval_status === 'UNPUBLISHED' ? 'secondary' : 'outline'}>
                    {hotel.approval_status}
                  </Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Room Types</p>
                    <p className="text-sm font-semibold">{hotel.room_type_count}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Variants</p>
                    <p className="text-sm font-semibold">{hotel.variant_count}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Rooms</p>
                    <p className="text-sm font-semibold">{hotel.room_count}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/dashboard/system/room-types/${hotel.id}`)}
                >
                  View Room Types →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
