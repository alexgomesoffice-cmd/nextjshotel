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
  AlertCircle, RefreshCw, FilterX, Copy, BedDouble
} from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  RESERVED: { label: 'Reserved', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock },
  BOOKED: { label: 'Confirmed', badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: CheckCircle2 },
  CHECKED_IN: { label: 'Checked In', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: LogIn },
  CHECKED_OUT: { label: 'Checked Out', badge: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: LogOut },
  CANCELLED: { label: 'Cancelled', badge: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle },
  EXPIRED: { label: 'Expired', badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: AlertCircle },
  NO_SHOW: { label: 'No Show', badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: UserX },
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
  // NO_SHOW confirmation dialog state
  const [noShowDialogOpen, setNoShowDialogOpen] = useState(false)
  const [pendingNoShowRef, setPendingNoShowRef] = useState<string | null>(null)

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
    // NO_SHOW uses a proper AlertDialog — do not use browser confirm().
    if (action === 'no_show') {
      setPendingNoShowRef(reference)
      setNoShowDialogOpen(true)
      return
    }
    if (action === 'cancel' && !confirm(`${labels[action]} booking ${reference}?`)) return
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

  async function confirmNoShow() {
    if (!pendingNoShowRef) return
    const reference = pendingNoShowRef
    setNoShowDialogOpen(false)
    setPendingNoShowRef(null)
    try {
      setActionLoading(reference + 'no_show')
      const res = await fetch(`/api/hotel-admin/bookings/${reference}/status`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'no_show' }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Done', description: data.message, variant: 'success' })
        fetchBookings()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to mark booking as No Show', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied', description: 'Booking reference copied to clipboard.' })
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('all')
    setSortBy('created_at')
    setOrder('desc')
    setDateFrom('')
    setDateTo('')
    resetPage()
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-1.5">Manage reservations, guest stays and booking status.</p>
        </div>
        <div className="flex items-center gap-3">
          {pagination.total > 0 && !loading && (
            <div className="bg-secondary/50 px-3 py-1.5 rounded-md border border-border/50 flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Bookings</span>
              <span className="font-semibold text-sm">{pagination.total}</span>
            </div>
          )}
          <Button variant="outline" onClick={fetchBookings} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm bg-card/40">
        <div className="p-3 flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search reference or guest..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); resetPage() }} 
              className="pl-9 h-10 bg-background/50 border-border/50" 
            />
          </div>
          
          <Select value={status} onValueChange={v => { setStatus(v); resetPage() }}>
            <SelectTrigger className="h-10 w-full md:w-[160px] bg-background/50 border-border/50">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Input 
              type="date" 
              value={dateFrom} 
              onChange={e => { setDateFrom(e.target.value); resetPage() }} 
              className="h-10 w-full md:w-[140px] bg-background/50 border-border/50" 
            />
            <span className="text-muted-foreground text-sm">—</span>
            <Input 
              type="date" 
              value={dateTo} 
              onChange={e => { setDateTo(e.target.value); resetPage() }} 
              className="h-10 w-full md:w-[140px] bg-background/50 border-border/50" 
            />
          </div>
          
          <Select value={`${sortBy}-${order}`} onValueChange={v => { const [by, ord] = v.split('-'); setSortBy(by); setOrder(ord); resetPage() }}>
            <SelectTrigger className="h-10 w-full md:w-[150px] bg-background/50 border-border/50">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Newest First</SelectItem>
              <SelectItem value="created_at-asc">Oldest First</SelectItem>
              <SelectItem value="check_in-asc">Check-in ↑</SelectItem>
              <SelectItem value="check_in-desc">Check-in ↓</SelectItem>
              <SelectItem value="total_price-desc">Price High→Low</SelectItem>
              <SelectItem value="total_price-asc">Price Low→High</SelectItem>
            </SelectContent>
          </Select>
          
          {(search || status !== 'all' || dateFrom || dateTo || sortBy !== 'created_at' || order !== 'desc') && (
            <Button variant="ghost" className="h-10 px-3 text-muted-foreground hover:text-foreground shrink-0" onClick={clearFilters}>
              <FilterX className="h-4 w-4 mr-2" /> Clear
            </Button>
          )}
        </div>
      </Card>

      <Card className="border-border/50 shadow-sm overflow-hidden bg-card/20">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground h-11">Reference</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground h-11">Guest</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground h-11">Stay</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground h-11">Rooms</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground h-11">Total</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground h-11">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground h-11 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i} className="border-border/30">
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1.5"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div>
                      </div>
                    </TableCell>
                    <TableCell><div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div></TableCell>
                    <TableCell><div className="space-y-1.5"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div></TableCell>
                    <TableCell><div className="space-y-1.5"><Skeleton className="h-4 w-16" /><Skeleton className="h-3 w-8" /></div></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></TableCell>
                  </TableRow>
                ))
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Hash className="h-10 w-10 mb-4 opacity-20" />
                      <p className="text-base font-medium text-foreground">No bookings found</p>
                      <p className="text-sm mt-1 mb-4">Try adjusting your search or filters.</p>
                      {(search || status !== 'all' || dateFrom || dateTo) && (
                        <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : bookings.map(booking => {
                const cfg = STATUS_CONFIG[booking.status]
                const StatusIcon = cfg.icon
                const n = nights(booking.check_in, booking.check_out)
                const isActing = actionLoading?.startsWith(booking.booking_reference)
                
                const roomTypes = [...new Set(booking.room_bookings.map(rb => rb.room_type.name))]
                const roomTypeText = roomTypes.length > 1 ? 'Multiple Types' : (roomTypes[0] || 'Unknown Room')

                return (
                  <TableRow key={booking.id} className="border-border/30 hover:bg-secondary/20 transition-colors group">
                    <TableCell className="align-top py-4">
                      <div className="flex items-center gap-1.5 group/ref cursor-pointer" onClick={() => copyToClipboard(booking.booking_reference)}>
                        <span className="font-mono text-[13px] font-medium text-muted-foreground group-hover/ref:text-foreground transition-colors">{booking.booking_reference}</span>
                        <Copy className="h-3 w-3 opacity-0 group-hover/ref:opacity-100 text-muted-foreground transition-opacity" />
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 border border-border/50">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                            {booking.end_user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-[14px] font-semibold text-foreground leading-none mb-1.5">{booking.end_user.name}</p>
                          <p className="text-[13px] text-muted-foreground leading-none">{booking.end_user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex items-start gap-2.5">
                        <CalendarDays className="h-4 w-4 text-muted-foreground/70 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[14px] font-medium text-foreground leading-none mb-1.5">
                            {format(new Date(booking.check_in), 'MMM d')} – {format(new Date(booking.check_out), 'MMM d, yyyy')}
                          </p>
                          <p className="text-[13px] text-muted-foreground leading-none">
                            {n} night{n !== 1 ? 's' : ''} · {booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex items-start gap-2.5">
                        <BedDouble className="h-4 w-4 text-muted-foreground/70 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[14px] font-medium text-foreground leading-none mb-1.5 max-w-[160px] truncate" title={roomTypes.join(', ')}>
                            {roomTypeText}
                          </p>
                          <p className="text-[13px] text-muted-foreground leading-none">
                            {booking.rooms_count} room{booking.rooms_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <p className="text-[14px] font-semibold text-foreground leading-none mb-1.5">৳{booking.total_price.toLocaleString()}</p>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium leading-none">Total</p>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <Badge variant="outline" className={cn('text-[11px] font-semibold px-2 py-0.5 h-6 uppercase tracking-wider', cfg.badge)}>
                        <StatusIcon className="h-3 w-3 mr-1.5" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <TooltipProvider delayDuration={300}>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                                <Link href={`/dashboard/hotel/bookings/${booking.booking_reference}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>

                          {booking.status === 'BOOKED' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'check_in')}>
                                  <LogIn className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Check In</TooltipContent>
                            </Tooltip>
                          )}
                          
                          {booking.status === 'CHECKED_IN' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-500 hover:text-purple-600 hover:bg-purple-500/10" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'check_out')}>
                                  <LogOut className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Check Out</TooltipContent>
                            </Tooltip>
                          )}

                          {booking.status === 'BOOKED' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'no_show')}>
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mark No Show</TooltipContent>
                            </Tooltip>
                          )}
                          
                          {['RESERVED', 'BOOKED', 'CHECKED_IN'].includes(booking.status) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'cancel')}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cancel</TooltipContent>
                            </Tooltip>
                          )}
                          
                        </TooltipProvider>
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
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">Showing page <span className="font-medium text-foreground">{pagination.page}</span> of <span className="font-medium text-foreground">{pagination.totalPages}</span></p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} className="h-9 gap-1.5 shadow-sm">
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} className="h-9 gap-1.5 shadow-sm">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* NO_SHOW confirmation dialog — shared across all table rows */}
      <AlertDialog open={noShowDialogOpen} onOpenChange={(open: boolean) => {
        setNoShowDialogOpen(open)
        if (!open) setPendingNoShowRef(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this booking as No Show?</AlertDialogTitle>
            <AlertDialogDescription>
              This means the guest did not arrive. The reserved room(s) will be released and become available again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={confirmNoShow}
            >
              <UserX className="h-4 w-4 mr-1.5" />
              Confirm No Show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
