// filepath: src/app/dashboard/hotel/guests/page.tsx
// Hotel Admin — Guest Management
// Guest-centric directory listing unique users who have bookings at this hotel.

'use client'

import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react'
import Link from 'next/link'
import {
  Search, ChevronLeft, ChevronRight,
  Users, RefreshCw, FilterX,
  UserCheck, BedDouble, CalendarDays,
  Clock
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

type BookingStatus = 'BOOKED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW' | 'CANCELLED' | 'RESERVED' | 'EXPIRED'

interface StayInfo {
  booking_reference: string
  status:            BookingStatus
  check_in:          string
  check_out:         string
  rooms:             string[]
}

interface GuestEntry {
  id:      number
  name:    string
  email:   string
  phone:   string | null
  avatar:  string | null
  summary: {
    totalStays:   number
    lastStayDate: string | null
    currentStay:  StayInfo | null
    upcomingStay: StayInfo | null
  }
}

interface Pagination {
  page: number; limit: number; total: number; totalPages: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
      <div className="hidden md:flex flex-col items-start gap-1.5 w-[200px]">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="hidden md:flex flex-col items-start gap-1.5 w-[140px]">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="hidden lg:flex flex-col items-center gap-1.5 w-[100px]">
        <Skeleton className="h-6 w-8 rounded-md" />
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

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'active' | 'upcoming' | 'previous'

  const resetPage = () => setPagination(p => ({ ...p, page: 1 }))

  const fetchRef = useRef<() => Promise<void>>(async () => {})

  const fetchGuests = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page:  pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (search) params.set('search', search)
      if (filter !== 'all') params.set('filter', filter)

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
  }, [pagination.page, pagination.limit, search, filter, toast])

  useLayoutEffect(() => {
    fetchRef.current = fetchGuests
  })

  useEffect(() => {
    void fetchRef.current()
  }, [pagination.page, pagination.limit, search, filter])

  const clearFilters = () => {
    setSearch(''); setFilter('all'); resetPage()
  }

  const hasFilters = search || filter !== 'all'

  // Summary Metrics (derive locally for simplicity or keep from API - but API returns paginated data.
  // We will just show the total unique guests from the pagination object).
  
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
            Manage hotel guests and view their current and previous stays.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && pagination.total > 0 && (
            <div className="bg-secondary/50 px-3 py-1.5 rounded-md border border-border/50 flex items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Unique Guests</span>
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

          {/* Filter */}
          <Select value={filter} onValueChange={v => { setFilter(v); resetPage() }}>
            <SelectTrigger id="guest-status-filter" className="h-10 w-full md:w-[220px] bg-background/50 border-border/50">
              <SelectValue placeholder="Guest Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Hotel Guests</SelectItem>
              <SelectItem value="active">Currently Staying (Checked In)</SelectItem>
              <SelectItem value="upcoming">Upcoming Stay (Booked)</SelectItem>
              <SelectItem value="previous">Previous Guests (Checked Out)</SelectItem>
            </SelectContent>
          </Select>

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
        <div className="hidden md:grid grid-cols-[1fr_minmax(200px,auto)_minmax(140px,auto)_minmax(100px,auto)_80px]
          gap-3 items-center px-4 py-2 bg-secondary/30 border-b border-border/30">
          <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground ml-14">Guest</div>
          <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Current / Upcoming Stay</div>
          <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Last Stay</div>
          <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground text-center">Total Stays</div>
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
                  ? 'No unique guests match your current filters.'
                  : 'You have no guests right now.'}
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
            {' '}· {pagination.total} unique guest{pagination.total !== 1 ? 's' : ''}
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
  
  const currentOrUpcoming = guest.summary.currentStay || guest.summary.upcomingStay
  
  return (
    <Link
      href={`/dashboard/hotel/guests/${guest.id}`}
      className="flex flex-col md:grid md:grid-cols-[1fr_minmax(200px,auto)_minmax(140px,auto)_minmax(100px,auto)_80px]
        gap-3 items-start md:items-center px-4 py-3.5 hover:bg-secondary/20 transition-colors group"
    >
      {/* Guest info */}
      <div className="flex items-center gap-4 min-w-0">
        <Avatar className="h-10 w-10 border border-border/50 shrink-0">
          {guest.avatar && (
            <AvatarImage src={guest.avatar} alt={guest.name} className="object-cover" />
          )}
          <AvatarFallback className="bg-secondary text-secondary-foreground text-[13px] font-semibold">
            {initials(guest.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-foreground leading-none mb-1.5 truncate">
            {guest.name}
          </p>
          <p className="text-[12px] text-muted-foreground leading-none truncate mb-1">
            {guest.email}
          </p>
          {guest.phone && (
            <p className="text-[12px] text-muted-foreground leading-none truncate">
              {guest.phone}
            </p>
          )}
        </div>
      </div>

      {/* Current/Upcoming Stay */}
      <div className="w-full md:w-auto">
        {currentOrUpcoming ? (
          <div>
            <Badge variant="outline" className={cn(
              'text-[10px] font-semibold px-1.5 py-0 uppercase tracking-wide mb-1.5',
              currentOrUpcoming.status === 'CHECKED_IN' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            )}>
              {currentOrUpcoming.status === 'CHECKED_IN' ? 'Current Stay' : 'Upcoming Stay'}
            </Badge>
            <div className="flex items-center gap-1.5 text-[12px] text-foreground font-medium mb-1">
              <BedDouble className="h-3 w-3 text-muted-foreground" />
              Room{currentOrUpcoming.rooms.length > 1 ? 's' : ''}: {currentOrUpcoming.rooms.length > 0 ? currentOrUpcoming.rooms.join(', ') : 'Unassigned'}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {format(new Date(currentOrUpcoming.check_in), 'MMM d')} – {format(new Date(currentOrUpcoming.check_out), 'MMM d')}
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground/60 italic">No current stay</p>
        )}
      </div>

      {/* Last Stay */}
      <div className="w-full md:w-auto flex items-start gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0 mt-0.5 hidden md:block" />
        <div>
          {guest.summary.lastStayDate ? (
            <>
              <p className="text-[13px] font-medium text-foreground leading-none mb-1">
                {format(new Date(guest.summary.lastStayDate), 'MMM d, yyyy')}
              </p>
            </>
          ) : (
            <p className="text-[12px] text-muted-foreground/60 italic">No previous stay</p>
          )}
        </div>
      </div>

      {/* Total Stays */}
      <div className="md:text-center">
        <Badge variant="secondary" className="text-[12px] font-semibold">
          {guest.summary.totalStays} {guest.summary.totalStays === 1 ? 'Stay' : 'Stays'}
        </Badge>
      </div>

      {/* Action */}
      <div className="hidden md:flex justify-end">
        <span className="text-[12px] text-muted-foreground group-hover:text-foreground transition-colors font-medium">
          View →
        </span>
      </div>
    </Link>
  )
}
