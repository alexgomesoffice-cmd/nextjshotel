'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, RotateCw, MapPin, ArrowRight, Building2, ImageIcon } from 'lucide-react'
import { OpsSectionHeader } from '@/components/admin/shared/primitives'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-5">
      {/* Header */}
      <OpsSectionHeader
        title="Hotel Room Types"
        description="View and manage room type configurations across all properties."
      />

      {/* Toolbar: Search, Status Filter, Refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search hotels by name, city, or address..."
            className="pl-9 h-10 bg-card border-border/80 focus-visible:ring-1"
          />
        </div>

        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-[180px] bg-card border-border/80">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent align="end">
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={loadHotels}
            className="h-10 px-4 gap-2 bg-card border-border/80 hover:bg-secondary/60 shrink-0"
          >
            <RotateCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="overflow-hidden border border-border/60 bg-card">
              <Skeleton className="h-44 w-full" />
              <CardContent className="space-y-4 p-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3.5 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : hotels.length === 0 ? (
        <Card className="border border-dashed border-border/80 bg-card p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No hotels found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search query or status filter.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((hotel) => (
            <Card
              key={hotel.id}
              className="group overflow-hidden border border-border/80 bg-card shadow-sm hover:border-border hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Hotel Image Container */}
                <div className="relative h-44 w-full bg-secondary/40 overflow-hidden border-b border-border/40">
                  {hotel.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hotel.cover_image_url}
                      alt={hotel.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground/60 gap-1.5">
                      <ImageIcon className="h-8 w-8 stroke-[1.5]" />
                      <span className="text-xs font-medium">No hotel image</span>
                    </div>
                  )}
                </div>

                <CardContent className="p-5 space-y-4">
                  {/* Title, Location & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold text-foreground truncate tracking-tight group-hover:text-primary transition-colors">
                        {hotel.name}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                        <span>{hotel.city?.name ?? 'Location unavailable'}</span>
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border',
                        hotel.approval_status === 'PUBLISHED'
                          ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                          : hotel.approval_status === 'UNPUBLISHED'
                          ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                          : 'bg-muted text-muted-foreground border-border'
                      )}
                    >
                      {hotel.approval_status}
                    </Badge>
                  </div>

                  {/* 3-Column Statistics Card */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-secondary/30 rounded-lg p-2.5 border border-border/40">
                    <div>
                      <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                        Room Types
                      </p>
                      <p className="text-base font-bold text-foreground mt-0.5">{hotel.room_type_count}</p>
                    </div>
                    <div className="border-x border-border/40 px-1">
                      <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                        Variants
                      </p>
                      <p className="text-base font-bold text-foreground mt-0.5">{hotel.variant_count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                        Rooms
                      </p>
                      <p className="text-base font-bold text-foreground mt-0.5">{hotel.room_count}</p>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Action Button */}
              <div className="px-5 pb-5 pt-0">
                <Button
                  variant="outline"
                  className="w-full justify-between h-9 text-xs font-semibold bg-secondary/20 hover:bg-primary border-border/80 transition-colors"
                  onClick={() => router.push(`/dashboard/system/room-types/${hotel.id}`)}
                >
                  <span>View Room Types</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
