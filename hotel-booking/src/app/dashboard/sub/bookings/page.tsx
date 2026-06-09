'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Search, ChevronLeft, ChevronRight, Eye,
  CalendarDays, Users, Hash, LogIn, LogOut,
  XCircle, UserX, CheckCircle2, Clock, AlertCircle, RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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
  room_bookings: { room_type: { name: string }; room_detail: { room_number: string } }[]
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

export default function SubAdminBookingsPage() {
  const { toast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '15' })
      if (search) params.append('search', search)
      if (status !== 'all') params.append('status', status)

      const res = await fetch(`/api/hotel-admin/bookings?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setBookings(data.data.bookings)
        setTotalPages(data.data.pagination.totalPages)
        setTotal(data.data.pagination.total)
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load bookings', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, search, status, toast])

  useEffect(() => {
    void (async () => { await fetchBookings() })()
  }, [fetchBookings])

  async function performAction(reference: string, action: string) {
    if ((action === 'cancel' || action === 'no_show') && !confirm(`Perform ${action} on booking ${reference}?`)) return
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
      toast({ title: 'Error', description: 'Action failed', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bookings</h1>
          <p className="text-muted-foreground mt-1">{total} total bookings</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBookings} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="glass-strong">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Reference or guest..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-10 h-10"
              />
            </div>
            <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="h-10"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}</TableRow>
                ))
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Hash className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No bookings found</p>
                  </TableCell>
                </TableRow>
              ) : bookings.map(booking => {
                const cfg = STATUS_CONFIG[booking.status]
                const Icon = cfg.icon
                const n = Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000)
                const rooms = [...new Set(booking.room_bookings.map(rb => rb.room_type.name))].join(', ')
                const isActing = actionLoading?.startsWith(booking.booking_reference)

                return (
                  <TableRow key={booking.id} className="hover:bg-secondary/30">
                    <TableCell><span className="font-mono text-xs font-medium">{booking.booking_reference}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{booking.end_user.name}</p>
                          <p className="text-xs text-muted-foreground">{booking.end_user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(booking.check_in), 'MMM d')} – {format(new Date(booking.check_out), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {n} night{n !== 1 ? 's' : ''} · {booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground max-w-28 truncate">{rooms || '—'}</p>
                      <p className="text-xs text-muted-foreground">{booking.rooms_count} room{booking.rooms_count !== 1 ? 's' : ''}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <Badge variant="outline" className={cn('text-xs', cfg.badge)}>{cfg.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/sub/bookings/${booking.booking_reference}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View detail">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {booking.status === 'BOOKED' && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:bg-green-50" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'check_in')} title="Check in">
                            <LogIn className="h-4 w-4" />
                          </Button>
                        )}
                        {booking.status === 'CHECKED_IN' && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'check_out')} title="Check out">
                            <LogOut className="h-4 w-4" />
                          </Button>
                        )}
                        {booking.status === 'BOOKED' && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'no_show')} title="No Show">
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                        {['RESERVED', 'BOOKED', 'CHECKED_IN'].includes(booking.status) && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-red-50" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'cancel')} title="Cancel">
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

      {totalPages > 1 && (
        <Card className="glass-strong">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="gap-1">
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