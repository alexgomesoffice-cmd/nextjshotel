// filepath: src/app/dashboard/hotel/bookings/page.tsx
// Hotel Admin — Bookings List
// Search, filter by status/date, sort, paginate
// Inline: check-in, check-out, cancel actions

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Search, ChevronLeft, ChevronRight, Eye,
  CalendarDays, Users, Hash, LogIn, LogOut,
  XCircle, UserX, CheckCircle2, Clock,
  AlertCircle, RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useHotelAdminFeed } from '@/hooks/use-hotel-admin-feed'

type BookingStatus = 'RESERVED' | 'BOOKED' | 'EXPIRED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW'

interface Booking {
  id: number
  booking_reference: string
  status: BookingStatus
  check_in: string
  check_out: string
  guests: number
  rooms_count: number
  total_price: number
  created_at: string
  end_user: { id: number; name: string; email: string }
  room_bookings: {
    room_type: { name: string }
    room_detail: { room_number: string }
  }[]
}

interface Pagination {
  page: number; limit: number; total: number; totalPages: number
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; badge: string; icon: React.ElementType }> = {
  RESERVED: { label: 'Reserved', badge: 'bg-amber-500/20  text-amber-700  border-amber-500/30', icon: Clock },
  BOOKED: { label: 'Confirmed', badge: 'bg-blue-500/20   text-blue-700   border-blue-500/30', icon: CheckCircle2 },
  CHECKED_IN: { label: 'Checked In', badge: 'bg-green-500/20  text-green-700  border-green-500/30', icon: LogIn },
  CHECKED_OUT: { label: 'Checked Out', badge: 'bg-purple-500/20 text-purple-700 border-purple-500/30', icon: LogOut },
  CANCELLED: { label: 'Cancelled', badge: 'bg-red-500/20    text-red-700    border-red-500/30', icon: XCircle },
  EXPIRED: { label: 'Expired', badge: 'bg-gray-500/20   text-gray-600   border-gray-500/30', icon: AlertCircle },
  NO_SHOW: { label: 'No Show', badge: 'bg-orange-500/20 text-orange-700 border-orange-500/30', icon: UserX },
}

function nights(ci: string, co: string) {
  return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000)
}

export default function HotelAdminBookingsPage() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [hotelId, setHotelId] = useState<number | null>(null)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [order, setOrder] = useState('desc')

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: pagination.page.toString(), limit: pagination.limit.toString(), sort_by: sortBy, order })
      if (search) params.append('search', search)
      if (status !== 'all') params.append('status', status)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)

      const res = await fetch(`/api/hotel-admin/bookings?${params}`, { credentials: 'include' })
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
  }, [pagination.page, pagination.limit, search, status, dateFrom, dateTo, sortBy, order, toast])

  useEffect(() => {
    void (async () => { await fetchBookings() })()
  }, [fetchBookings])

  useEffect(() => {
    const loadHotelId = async () => {
      try {
        const res = await fetch('/api/hotel-admin/overview', { credentials: 'include' })
        const data = await res.json()
        if (data.success) {
          setHotelId(data.data.hotel.id)
        }
      } catch {
        // ignore
      }
    }

    void loadHotelId()
  }, [])
  
  const resetPage = () => setPagination(p => ({ ...p, page: 1 }))

  // Listen for live updates and refresh the list silently
  useHotelAdminFeed(hotelId ?? undefined, fetchBookings, fetchBookings)

  async function performAction(reference: string, action: string) {
    const labels: Record<string, string> = { check_in: 'Check in', check_out: 'Check out', cancel: 'Cancel', no_show: 'No Show' }
    if ((action === 'cancel' || action === 'no_show') && !confirm(`${labels[action]} booking ${reference}?`)) return
    try {
      setActionLoading(reference + action)
      const res = await fetch(`/api/hotel-admin/bookings/${reference}/status`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Done', description: data.message, variant: 'success' })
        fetchBookings()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: `Failed to perform action`, variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bookings</h1>
          <p className="text-muted-foreground mt-1">{pagination.total} total bookings</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBookings} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="glass-strong">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Reference or guest..." value={search} onChange={e => { setSearch(e.target.value); resetPage() }} className="pl-10 h-10" />
            </div>
            <Select value={status} onValueChange={v => { setStatus(v); resetPage() }}>
              <SelectTrigger className="h-10"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={`${sortBy}-${order}`} onValueChange={v => { const [by, ord] = v.split('-'); setSortBy(by); setOrder(ord); resetPage() }}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="check_in-asc">Check-in ↑</SelectItem>
                <SelectItem value="check_in-desc">Check-in ↓</SelectItem>
                <SelectItem value="total_price-desc">Price High→Low</SelectItem>
                <SelectItem value="total_price-asc">Price Low→High</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="h-10" onClick={() => { setSearch(''); setStatus('all'); setSortBy('created_at'); setOrder('desc'); setDateFrom(''); setDateTo(''); resetPage() }}>
              Clear Filters
            </Button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">Check-in range:</span>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); resetPage() }} className="h-9 w-40" />
            <span className="text-muted-foreground text-sm">→</span>
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); resetPage() }} className="h-9 w-40" />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-strong overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Rooms</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>))}</TableRow>
                ))
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                    <Hash className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No bookings found</p>
                  </TableCell>
                </TableRow>
              ) : bookings.map(booking => {
                const cfg = STATUS_CONFIG[booking.status]
                const Icon = cfg.icon
                const n = nights(booking.check_in, booking.check_out)
                const rooms = [...new Set(booking.room_bookings.map(rb => rb.room_type.name))].join(', ')
                const isActing = actionLoading?.startsWith(booking.booking_reference)

                return (
                  <TableRow key={booking.id} className="hover:bg-secondary/30">
                    <TableCell>
                      <span className="font-mono text-xs font-medium">{booking.booking_reference}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium leading-tight">{booking.end_user.name}</p>
                          <p className="text-xs text-muted-foreground">{booking.end_user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{format(new Date(booking.check_in), 'MMM d')} – {format(new Date(booking.check_out), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-muted-foreground">{n} night{n !== 1 ? 's' : ''} · {booking.guests} guest{booking.guests !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground max-w-32 truncate" title={rooms}>{rooms || '—'}</p>
                      <p className="text-xs text-muted-foreground">{booking.rooms_count} room{booking.rooms_count !== 1 ? 's' : ''}</p>
                    </TableCell>
                    <TableCell className="font-semibold text-sm">TK {booking.total_price.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <Badge variant="outline" className={cn('text-xs', cfg.badge)}>{cfg.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/hotel/bookings/${booking.booking_reference}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {booking.status === 'BOOKED' && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:bg-green-50" title="Check in" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'check_in')}>
                            <LogIn className="h-4 w-4" />
                          </Button>
                        )}
                        {booking.status === 'CHECKED_IN' && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50" title="Check out" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'check_out')}>
                            <LogOut className="h-4 w-4" />
                          </Button>
                        )}
                        {booking.status === 'BOOKED' && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50" title="No Show" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'no_show')}>
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                        {['RESERVED', 'BOOKED', 'CHECKED_IN'].includes(booking.status) && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-red-50" title="Cancel" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'cancel')}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {!loading && pagination.totalPages > 1 && (
        <Card className="glass-strong">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} className="gap-1">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
