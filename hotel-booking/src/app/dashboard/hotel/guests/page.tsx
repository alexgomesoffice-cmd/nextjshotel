// filepath: src/app/dashboard/hotel/guests/page.tsx
// Hotel Admin — Guest Management
// Lists current and confirmed guests (BOOKED, CHECKED_IN by default; CHECKED_OUT selectable).

'use client'

import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react'
import Link from 'next/link'
import {
  Search, ChevronLeft, ChevronRight,
  CalendarDays, Users, RefreshCw, FilterX,
  LogIn, CheckCircle2, LogOut, BedDouble,
  UserCheck,
} from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type GuestStatus = 'BOOKED' | 'CHECKED_IN' | 'CHECKED_OUT'

interface GuestEntry {
  id:                number
  booking_reference: string
  status:            GuestStatus
  check_in:          string
  check_out:         string
  guests:            number
  rooms_count:       number
  total_price:       number
  created_at:        string
  end_user: {
    id:    number
    name:  string
    email: string
    phone: string | null
    image: string | null
  }
  room_bookings: {
    id:             number
    subtotal:       number
    nights:         number
    room_type_name: string
    room_number:    string
    floor:          number | null
    room_size:      string | null
    max_occupancy:  number | null
    bed_summary:    string
  }[]
}

interface Pagination {
  page: number; limit: number; total: number; totalPages: number
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<GuestStatus, { label: string; badge: string; icon: React.ElementType }> = {
  BOOKED:      { label: 'Confirmed',   badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',     icon: CheckCircle2 },
  CHECKED_IN:  { label: 'Checked In',  badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: LogIn },
  CHECKED_OUT: { label: 'Checked Out', badge: 'bg-purple-500/10 text-purple-500 border-purple-500/20',   icon: LogOut },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nights(ci: string, co: string) {
  return Math.max(1, Math.round(
    (new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000,
  ))
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function GuestRowSkeleton() {
  return (
    <div className="flex items-start gap-4 px-4 py-3.5 border-b border-border/30 last:border-0">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-52" />
      </div>
      <div className="hidden md:flex flex-col items-end gap-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="hidden lg:flex flex-col items-end gap-1.5">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HotelGuestsPage() {
  const { toast } = useToast()
  const [guests, setGuests]         = useState<GuestEntry[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 0 })
  const [loading, setLoading]       = useState(true)

  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('active')   // 'active' | 'BOOKED' | 'CHECKED_IN' | 'CHECKED_OUT'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const resetPage = () => setPagination(p => ({ ...p, page: 1 }))

  // Use a stable ref to track the current params so the effect can re-run
  // without triggering the setState-in-effect ESLint rule.
  const fetchRef = useRef<() => Promise<void>>(async () => {})

  const fetchGuests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page:  pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (search)              params.set('search',    search)
      if (status !== 'active') params.set('status',    status)
      if (dateFrom)            params.set('date_from', dateFrom)
      if (dateTo)              params.set('date_to',   dateTo)

      const res  = await fetch(`/api/hotel-admin/guests?${params}`, { credentials: 'include' })
      const data = await res.json()

      if (data.success) {
        setGuests(data.data.guests)
        setPagination(prev => ({ ...prev, ...data.data.pagination }))
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load guests', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, status, dateFrom, dateTo, toast])

  // Keep ref current using a layout effect to avoid the
  // "cannot update ref during render" ESLint rule.
  useLayoutEffect(() => {
    fetchRef.current = fetchGuests
  })

  useEffect(() => {
    void fetchRef.current()
  }, [pagination.page, pagination.limit, search, status, dateFrom, dateTo])

  const clearFilters = () => {
    setSearch(''); setStatus('active'); setDateFrom(''); setDateTo(''); resetPage()
  }

  const hasFilters = search || status !== 'active' || dateFrom || dateTo

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <UserCheck className="h-7 w-7 text-green-500" />
            Guests
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Guests currently staying or confirmed at your hotel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && pagination.total > 0 && (
            <div className="bg-secondary/50 px-3 py-1.5 rounded-md border border-border/50 flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Guests</span>
              <span className="font-semibold text-sm">{pagination.total}</span>
            </div>
          )}
          <Button variant="outline" onClick={() => { resetPage(); void fetchGuests() }} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <Card className="border-border/50 shadow-sm bg-card/40">
        <div className="p-3 flex flex-col md:flex-row gap-3 items-center flex-wrap">
          {/* Search */}
          <div className="relative flex-1 w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="guest-search"
              placeholder="Name, email, phone or reference…"
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage() }}
              className="pl-9 h-10 bg-background/50 border-border/50"
            />
          </div>

          {/* Status filter */}
          <Select value={status} onValueChange={v => { setStatus(v); resetPage() }}>
            <SelectTrigger id="guest-status-filter" className="h-10 w-full md:w-[180px] bg-background/50 border-border/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">All Active Guests</SelectItem>
              <SelectItem value="BOOKED">Confirmed (Booked)</SelectItem>
              <SelectItem value="CHECKED_IN">Checked In</SelectItem>
              <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
            </SelectContent>
          </Select>

          {/* Date range — filters by check_in */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); resetPage() }}
              className="h-10 w-full md:w-[140px] bg-background/50 border-border/50"
            />
            <span className="text-muted-foreground text-sm shrink-0">—</span>
            <Input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); resetPage() }}
              className="h-10 w-full md:w-[140px] bg-background/50 border-border/50"
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" className="h-10 px-3 text-muted-foreground hover:text-foreground shrink-0" onClick={clearFilters}>
              <FilterX className="h-4 w-4 mr-2" /> Clear
            </Button>
          )}
        </div>
      </Card>

      {/* ── Guest list ── */}
      <Card className="border-border/50 shadow-sm overflow-hidden bg-card/20">
        {/* Column headers (desktop) */}
        <div className="hidden md:grid grid-cols-[auto_1fr_minmax(160px,auto)_minmax(180px,auto)_minmax(120px,auto)_minmax(100px,auto)_80px]
          gap-3 items-center px-4 py-2 bg-secondary/30 border-b border-border/30">
          <div className="w-10" />
          <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Guest</div>
          <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Booking</div>
          <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Stay</div>
          <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Status</div>
          <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground text-right">Total</div>
          <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground text-right">Action</div>
        </div>

        <div className="divide-y divide-border/30">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <GuestRowSkeleton key={i} />)
          ) : guests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-15" />
              <p className="text-base font-medium text-foreground">No guests found</p>
              <p className="text-sm mt-1 mb-5">
                {hasFilters
                  ? 'No guests match your current filters.'
                  : 'You have no active guests right now.'}
              </p>
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>Clear Filters</Button>
              )}
            </div>
          ) : guests.map(g => <GuestRow key={g.id} guest={g} />)}
        </div>
      </Card>

      {/* ── Pagination ── */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{pagination.page}</span> of{' '}
            <span className="font-medium text-foreground">{pagination.totalPages}</span>
            {' '}· {pagination.total} guest{pagination.total !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              className="h-9 gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              className="h-9 gap-1.5"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Guest Row ────────────────────────────────────────────────────────────────

function GuestRow({ guest }: { guest: GuestEntry }) {
  const cfg = STATUS_CONFIG[guest.status]
  const StatusIcon = cfg.icon
  const n  = nights(guest.check_in, guest.check_out)
  // Summarise room type(s) for the list
  const roomTypes = [...new Set(guest.room_bookings.map(rb => rb.room_type_name))]
  const roomLabel = roomTypes.length > 1 ? 'Multiple types' : roomTypes[0] ?? '—'
  const roomNums  = guest.room_bookings.map(rb => `Room ${rb.room_number}`).join(', ')

  return (
    <Link
      href={`/dashboard/hotel/guests/${guest.id}`}
      className="flex flex-col md:grid md:grid-cols-[auto_1fr_minmax(160px,auto)_minmax(180px,auto)_minmax(120px,auto)_minmax(100px,auto)_80px]
        gap-3 items-start md:items-center px-4 py-3.5 hover:bg-secondary/20 transition-colors group"
    >
      {/* Avatar */}
      <Avatar className="h-10 w-10 border border-border/50 shrink-0">
        {guest.end_user.image && (
          <AvatarImage src={guest.end_user.image} alt={guest.end_user.name} className="object-cover" />
        )}
        <AvatarFallback className="bg-secondary text-secondary-foreground text-[13px] font-semibold">
          {initials(guest.end_user.name)}
        </AvatarFallback>
      </Avatar>

      {/* Guest info */}
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-foreground leading-none mb-1.5 truncate">
          {guest.end_user.name}
        </p>
        <p className="text-[12px] text-muted-foreground leading-none truncate">
          {guest.end_user.email}
        </p>
        {guest.end_user.phone && (
          <p className="text-[12px] text-muted-foreground leading-none mt-0.5 truncate">
            {guest.end_user.phone}
          </p>
        )}
      </div>

      {/* Booking reference + room */}
      <div className="md:hidden flex flex-wrap gap-x-4 gap-y-0.5 w-full">
        <span className="font-mono text-[12px] text-muted-foreground">{guest.booking_reference}</span>
      </div>
      <div className="hidden md:block">
        <p className="font-mono text-[12px] font-medium text-muted-foreground leading-none mb-1.5">
          {guest.booking_reference}
        </p>
        <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <BedDouble className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[140px]" title={roomNums}>{roomLabel}</span>
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate max-w-[140px]" title={roomNums}>
          {roomNums}
        </p>
      </div>

      {/* Stay dates */}
      <div className="flex items-start gap-2">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0 mt-0.5 hidden md:block" />
        <div>
          <p className="text-[13px] font-medium text-foreground leading-none mb-1.5">
            {format(new Date(guest.check_in), 'MMM d')}
            {' '}&ndash;{' '}
            {format(new Date(guest.check_out), 'MMM d, yyyy')}
          </p>
          <p className="text-[12px] text-muted-foreground leading-none">
            {n} night{n !== 1 ? 's' : ''} · {guest.guests} guest{guest.guests !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Status badge */}
      <div>
        <Badge
          variant="outline"
          className={cn(
            'text-[11px] font-semibold px-2 py-0.5 h-6 uppercase tracking-wider gap-1',
            cfg.badge,
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {cfg.label}
        </Badge>
      </div>

      {/* Total */}
      <div className="text-right">
        <p className="text-[14px] font-semibold text-foreground leading-none mb-1">
          ৳{guest.total_price.toLocaleString()}
        </p>
        <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-medium">
          {guest.rooms_count} room{guest.rooms_count !== 1 ? 's' : ''}
        </p>
      </div>

      {/* View arrow */}
      <div className="hidden md:flex justify-end">
        <span className="text-[12px] text-muted-foreground group-hover:text-foreground transition-colors font-medium">
          View →
        </span>
      </div>
    </Link>
  )
}
