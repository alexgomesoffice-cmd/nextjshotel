'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Calendar, Hotel, ChevronRight, Clock, CheckCircle2,
  XCircle, AlertCircle, BedDouble, Search, Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-hooks'
import { formatBDT } from '@/lib/utils'

interface RoomBooking {
  id: number
  price_per_night: number
  nights: number
  subtotal: number
  room_type: { id: number; name: string }
  room_detail: { id: number; room_number: string; floor: number | null; ac: boolean }
}

interface Booking {
  id: number
  booking_reference: string
  status: string
  check_in: string
  check_out: string
  total_price: string
  advance_amount: string
  guests: number
  reserved_until: string | null
  created_at: string
  hotel: {
    id: number
    name: string
    slug: string
    city: { name: string } | null
    images: { image_url: string }[]
  }
  room_bookings: RoomBooking[]
}

interface Pagination {
  total: number; page: number; limit: number; totalPages: number
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  RESERVED:    { label: 'Reserved',    badge: 'bg-amber-500/20 text-amber-700 border-amber-500/30',  icon: Clock },
  BOOKED:      { label: 'Confirmed',   badge: 'bg-green-500/20 text-green-700 border-green-500/30',  icon: CheckCircle2 },
  EXPIRED:     { label: 'Expired',     badge: 'bg-gray-500/20 text-gray-600 border-gray-500/30',     icon: AlertCircle },
  CANCELLED:   { label: 'Cancelled',   badge: 'bg-red-500/20 text-red-700 border-red-500/30',        icon: XCircle },
  CHECKED_IN:  { label: 'Checked In',  badge: 'bg-blue-500/20 text-blue-700 border-blue-500/30',    icon: CheckCircle2 },
  CHECKED_OUT: { label: 'Checked Out', badge: 'bg-purple-500/20 text-purple-700 border-purple-500/30', icon: CheckCircle2 },
  NO_SHOW:     { label: 'No Show',     badge: 'bg-red-500/20 text-red-700 border-red-500/30',        icon: XCircle },
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: pagination.page.toString(), limit: '10' })
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const res = await fetch(`/api/user/bookings?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setBookings(data.data.bookings)
        setPagination(data.data.pagination)
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load bookings', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, statusFilter, toast])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const nights = (checkIn: string, checkOut: string) => {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    return Math.round(diff / (1000 * 60 * 60 * 24))
  }

  const filtered = search
    ? bookings.filter(
        (b) =>
          b.booking_reference.toLowerCase().includes(search.toLowerCase()) ||
          b.hotel.name.toLowerCase().includes(search.toLowerCase())
      )
    : bookings

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground mt-1">View and manage all your reservations</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by reference or hotel name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPagination((p) => ({ ...p, page: 1 })) }}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bookings</SelectItem>
            <SelectItem value="RESERVED">Reserved (pending)</SelectItem>
            <SelectItem value="BOOKED">Confirmed</SelectItem>
            <SelectItem value="CHECKED_IN">Checked In</SelectItem>
            <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Booking Cards */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass-strong">
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <Card className="glass-strong">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-25" />
              <p className="text-lg font-medium">No bookings found</p>
              <p className="text-sm mt-1">Your reservations will appear here</p>
              <Link href="/" className="mt-4">
                <Button variant="outline">Explore Hotels</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filtered.map((booking) => {
            const sc = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.EXPIRED
            const StatusIcon = sc.icon
            const nightCount = nights(booking.check_in, booking.check_out)
            const roomTypes = [...new Set(booking.room_bookings.map((r) => r.room_type.name))]

            return (
              <Card key={booking.id} className="glass-strong hover:bg-secondary/10 transition-colors overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Left accent bar */}
                    <div className={`w-full sm:w-1.5 h-1.5 sm:h-auto rounded-t-lg sm:rounded-l-lg sm:rounded-t-none ${
                      booking.status === 'BOOKED' ? 'bg-green-500' :
                      booking.status === 'RESERVED' ? 'bg-amber-500' :
                      booking.status === 'CHECKED_IN' ? 'bg-blue-500' :
                      'bg-gray-400'
                    }`} />

                    <div className="flex-1 p-5 space-y-4">
                      {/* Top row */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Hotel className="h-4 w-4 text-primary" />
                            <span className="font-bold text-lg">{booking.hotel.name}</span>
                          </div>
                          {booking.hotel.city && (
                            <p className="text-sm text-muted-foreground">{booking.hotel.city.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={sc.badge}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {sc.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Dates + rooms row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Check-in</p>
                          <p className="font-medium">{new Date(booking.check_in).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Check-out</p>
                          <p className="font-medium">{new Date(booking.check_out).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Duration</p>
                          <p className="font-medium">{nightCount} night{nightCount !== 1 ? 's' : ''}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Guests</p>
                          <p className="font-medium">{booking.guests} adult{booking.guests !== 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      {/* Rooms summary */}
                      {booking.room_bookings.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {roomTypes.map((rt) => (
                            <span key={rt} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                              <BedDouble className="h-3 w-3" /> {rt}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Bottom row */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <div>
                          <p className="text-xs text-muted-foreground">Ref: <span className="font-mono font-medium text-foreground">{booking.booking_reference}</span></p>
                          <p className="text-lg font-bold text-primary mt-0.5">{formatBDT(Number(booking.total_price))}</p>
                        </div>
                        <Link href={`/bookings/${booking.booking_reference}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            View Details <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page === 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
