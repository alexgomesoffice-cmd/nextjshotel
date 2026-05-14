# Hotel Admin Bookings + Bug Fixes — Complete Guide
**For VS Code Claude. Read entirely before writing a single line.**

---

## PART A — BUGS FOUND

---

### BUG 1 — `hotel-detail-client.tsx` is orphaned AND has broken import — causes TypeScript error
**File:** `src/components/room/hotel-detail-client.tsx`
**Error:** `Cannot find module '@/components/room/booking-sidebar'`

**Why:** `booking-sidebar.tsx` was correctly moved to `src/components/booking/`. But `hotel-detail-client.tsx` still imports it from the old path `@/components/room/booking-sidebar` which no longer exists. Nothing in the codebase imports `hotel-detail-client.tsx` — it is completely orphaned.

**Fix:** Delete `src/components/room/hotel-detail-client.tsx` entirely.
```
ACTION: DELETE the file src/components/room/hotel-detail-client.tsx
Do NOT modify it. Do NOT fix the import. Just delete it.
It is replaced by src/components/booking/room-selector.tsx which is correct.
```

---

### BUG 2 — Room types with 0 available rooms DISAPPEAR instead of showing as disabled
**Files:** `src/components/booking/room-selector.tsx` + `src/app/api/public/hotels/[slug]/availability/route.ts`

**Root cause (two places):**

**Place 1 — availability API returns room types with 0 variants:**
When dates are given and all rooms are booked, `room.room_details.length = 0`. The API still includes this room type in the response (correct) but with empty `room_variants`. 

**Place 2 — `filteredRoomTypes` in room-selector.tsx filters out room types with empty variants:**
```ts
// CURRENT — WRONG (line ~94 in room-selector.tsx)
return roomTypes.filter(rt =>
  rt.room_variants.some(v =>     // ← some() returns FALSE when room_variants is empty
    acFilter === "ac" ? v.ac : !v.ac
  )
);
```
When a room type has `room_variants = []`, `some()` always returns `false`, so the room type disappears from the list on any filter.

**Also:** Even on `acFilter === "all"`, no filtering happens — but `filteredRoomTypes.length === 0` check at the bottom shows "No rooms available" only when ALL room types are gone, not just some. The actual card itself has good logic when shown but `room_variants = []` and `available_rooms_count = 0` means the expanded section shows "No rooms currently available in this category." — which is the correct greyed-out disabled behaviour.

**The two fixes needed:**

**Fix A — `room-selector.tsx` filteredRoomTypes:** A room type with 0 variants should ALWAYS show (greyed out, unclickable). It must never be filtered out. Only filter by whether the remaining variants match the AC filter — but never remove the room type entirely.

Replace the `filteredRoomTypes` useMemo:
```ts
// REPLACE the existing filteredRoomTypes useMemo with:
const filteredRoomTypes = useMemo(() => {
  if (acFilter === "all") return roomTypes;
  // Keep ALL room types. If a room type has no variants matching the filter,
  // it still shows (with 0 variants = greyed out card), just not filtered OUT.
  // A room type is "relevant" to the AC filter if it has at least one matching variant.
  // But we still show it even if 0 match — to avoid rooms mysteriously disappearing.
  return roomTypes.map(rt => {
    if (rt.room_variants.length === 0) return rt; // keep as-is (already shows as unavailable)
    const matching = rt.room_variants.filter(v =>
      acFilter === "ac" ? v.ac : !v.ac
    );
    if (matching.length === 0) return rt; // return full room type, will show as greyed-out
    return { ...rt, room_variants: matching }; // only show matching variants
  });
}, [roomTypes, acFilter]);
```

**Fix B — `room-type-card.tsx` — when `available_rooms_count === 0`, show card as disabled:**
The card already shows `opacity-60 border-border/30` for `isGuestMismatch`. We need the same treatment for 0 available rooms. The card itself should NOT be expandable when there are 0 available rooms AND 0 variants.

In `RoomTypeCard`, add an `isUnavailable` condition (when `available_rooms_count === 0` AND `room_variants.length === 0`):
```ts
// In RoomTypeCard component, AFTER the existing props destructuring:
const isUnavailable = available_rooms_count === 0 && room_variants.length === 0;
const isDisabled = isGuestMismatch || isUnavailable;

// Change the card div className:
isDisabled
  ? "opacity-60 border-border/30"
  : ...

// Change the header onClick:
onClick={() => {
  if (!isDisabled) setIsExpanded(!isExpanded);
}}

// Change cursor class:
isDisabled && "cursor-not-allowed"
```

And add an unavailable reason in the expanded section (when expanded but isUnavailable):
```tsx
// Inside the {isExpanded && ...} block, at the top, add:
{isUnavailable && (
  <div className="px-4 py-6 text-center text-sm text-muted-foreground border-t border-border/20">
    <p className="font-medium mb-1">Not available for selected dates</p>
    <p className="text-xs">Try different check-in or check-out dates.</p>
  </div>
)}
```

But wait — `isUnavailable` rooms shouldn't be expandable at all. So change the condition to only expand if not unavailable. When `isUnavailable`, clicking the header shows nothing but also prevents expansion.

**Final correct behaviour:**
- `available_rooms_count > 0` + dates match: normal card, expandable, variants with +/- buttons
- `available_rooms_count === 0` + dates given: grey card, cursor-not-allowed, NOT expandable, header shows "Not available for selected dates" tooltip/subtitle  
- `isGuestMismatch`: grey card, expandable but +/- disabled with reason message

---

### BUG 3 — `photos-reviews-modal.tsx` ESLint errors — must fix
**File:** `src/components/hotel/photos-reviews-modal.tsx`

**Error 1 (line 28):** `setCurrentIndex` called synchronously inside `useEffect` — this causes cascading renders.
**Error 2 (line 44):** `handleNext` accessed before declared — `handleKeyDown` useCallback uses `handleNext` and `handlePrev` but they are declared AFTER the `useCallback`.
**Error 3 (line 45):** Same for `handlePrev`.
**Warning 1:** `Button` imported but never used.
**Warning 2:** `isFullscreen` state assigned but never used in JSX.

Full fixed file provided in PART D.

---

## PART B — HOTEL ADMIN BOOKING API ROUTES

All three files in `src/app/api/hotel-admin/bookings/` are 0 bytes. Fill them.

---

### FILE 1: `src/app/api/hotel-admin/bookings/route.ts`

```ts
// filepath: src/app/api/hotel-admin/bookings/route.ts
// GET: List all bookings for this hotel (hotel admin + sub admin + system admin)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN', 'SYSTEM_ADMIN'])
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const page     = parseInt(searchParams.get('page')   || '1')
    const limit    = parseInt(searchParams.get('limit')  || '15')
    const search   = searchParams.get('search')  || ''
    const status   = searchParams.get('status')  || ''
    const dateFrom = searchParams.get('date_from') || ''
    const dateTo   = searchParams.get('date_to')   || ''
    const sortBy   = searchParams.get('sort_by')   || 'created_at'
    const order    = (searchParams.get('order') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
    const skip     = (page - 1) * limit

    // SYSTEM_ADMIN can optionally filter by hotel_id; HOTEL_ADMIN is always scoped to their hotel
    const hotelId = payload.actor_type === 'SYSTEM_ADMIN'
      ? searchParams.get('hotel_id') ? parseInt(searchParams.get('hotel_id')!) : undefined
      : payload.hotel_id

    const where: any = {}
    if (hotelId) where.hotel_id = hotelId

    if (search) {
      where.OR = [
        { booking_reference: { contains: search } },
        { end_user: { name: { contains: search } } },
        { end_user: { email: { contains: search } } },
      ]
    }

    if (status) where.status = status

    if (dateFrom || dateTo) {
      where.check_in = {}
      if (dateFrom) where.check_in.gte = new Date(dateFrom)
      if (dateTo)   where.check_in.lte = new Date(dateTo)
    }

    const orderByMap: Record<string, any> = {
      created_at:  { created_at: order },
      check_in:    { check_in: order },
      total_price: { total_price: order },
    }

    const [bookings, total] = await Promise.all([
      prisma.user_bookings.findMany({
        where,
        skip,
        take: limit,
        include: {
          end_user: { select: { id: true, name: true, email: true } },
          room_bookings: {
            include: {
              room_type: { select: { name: true } },
              room_detail: { select: { room_number: true } },
            },
          },
        },
        orderBy: orderByMap[sortBy] ?? { created_at: 'desc' },
      }),
      prisma.user_bookings.count({ where }),
    ])

    const serialized = bookings.map(b => ({
      ...b,
      total_price:    Number(b.total_price),
      advance_amount: Number(b.advance_amount),
      check_in:       b.check_in.toISOString(),
      check_out:      b.check_out.toISOString(),
      created_at:     b.created_at.toISOString(),
      reserved_until: b.reserved_until?.toISOString() ?? null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        bookings: serialized,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error('[hotel-admin] GET /bookings error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
```

---

### FILE 2: `src/app/api/hotel-admin/bookings/[reference]/route.ts`

```ts
// filepath: src/app/api/hotel-admin/bookings/[reference]/route.ts
// GET: Full booking detail for a specific booking (must belong to this hotel)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

type Params = { params: Promise<{ reference: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN', 'SYSTEM_ADMIN'])
  if (error) return error

  try {
    const { reference } = await params

    const booking = await prisma.user_bookings.findUnique({
      where: { booking_reference: reference },
      include: {
        hotel: {
          select: {
            id: true, name: true,
            city: { select: { name: true } },
            images: { take: 1, orderBy: { sort_order: 'asc' }, select: { image_url: true } },
          },
        },
        end_user: {
          select: {
            id: true, name: true, email: true,
            end_user_details: {
              select: { phone: true, nid_no: true, passport: true, address: true, country: true },
            },
          },
        },
        room_bookings: {
          include: {
            room_type: { select: { id: true, name: true } },
            room_detail: { select: { id: true, room_number: true, floor: true, ac: true } },
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 })
    }

    // HOTEL_ADMIN and HOTEL_SUB_ADMIN can only see their own hotel's bookings
    if (payload.actor_type !== 'SYSTEM_ADMIN' && booking.hotel_id !== payload.hotel_id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const serialized = {
      ...booking,
      total_price:    Number(booking.total_price),
      advance_amount: Number(booking.advance_amount),
      check_in:       booking.check_in.toISOString(),
      check_out:      booking.check_out.toISOString(),
      created_at:     booking.created_at.toISOString(),
      reserved_until: booking.reserved_until?.toISOString() ?? null,
      room_bookings:  booking.room_bookings.map(rb => ({
        ...rb,
        price_per_night: Number(rb.price_per_night),
        subtotal:        Number(rb.subtotal),
      })),
    }

    return NextResponse.json({ success: true, data: serialized })
  } catch (error) {
    console.error('[hotel-admin] GET /bookings/[reference] error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
```

---

### FILE 3: `src/app/api/hotel-admin/bookings/[reference]/status/route.ts`

```ts
// filepath: src/app/api/hotel-admin/bookings/[reference]/status/route.ts
// PATCH: Update booking status — check_in, check_out, cancel, no_show
// Also updates room_trackers so rooms reflect new status immediately

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

type Params = { params: Promise<{ reference: string }> }

const patchSchema = z.object({
  action: z.enum(['check_in', 'check_out', 'cancel', 'no_show']),
})

// Which current statuses are allowed for each action
const ALLOWED_FROM: Record<string, string[]> = {
  check_in:  ['BOOKED'],
  check_out: ['CHECKED_IN'],
  cancel:    ['RESERVED', 'BOOKED', 'CHECKED_IN'],
  no_show:   ['BOOKED'],
}

const ACTION_TO_STATUS: Record<string, string> = {
  check_in:  'CHECKED_IN',
  check_out: 'CHECKED_OUT',
  cancel:    'CANCELLED',
  no_show:   'NO_SHOW',
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN', 'SYSTEM_ADMIN'])
  if (error) return error

  try {
    const { reference } = await params
    const body = await req.json()
    const validation = patchSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { action } = validation.data

    const booking = await prisma.user_bookings.findUnique({
      where: { booking_reference: reference },
      select: { id: true, status: true, hotel_id: true, booking_reference: true },
    })

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 })
    }

    // Scope check: hotel staff can only update their own hotel's bookings
    if (payload.actor_type !== 'SYSTEM_ADMIN' && booking.hotel_id !== payload.hotel_id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const allowedStatuses = ALLOWED_FROM[action]
    if (!allowedStatuses.includes(booking.status)) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot ${action.replace('_', '-')} a booking with status "${booking.status}". Allowed from: ${allowedStatuses.join(', ')}.`,
        },
        { status: 400 }
      )
    }

    const newStatus = ACTION_TO_STATUS[action]

    // Update booking + room_trackers in a transaction so availability is immediately correct
    await prisma.$transaction([
      prisma.user_bookings.update({
        where: { id: booking.id },
        data: { status: newStatus as any },
      }),
      prisma.room_trackers.updateMany({
        where: { booking_id: booking.id },
        data: { status: newStatus as any },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: `Booking ${booking.booking_reference} updated to ${newStatus}`,
    })
  } catch (error) {
    console.error('[hotel-admin] PATCH /bookings/[reference]/status error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
```

---

## PART C — HOTEL ADMIN BOOKING PAGES

---

### FILE 4: `src/app/dashboard/hotel/bookings/page.tsx`

```tsx
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
import { useToast } from '@/hooks/use-hooks'
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
  room_bookings: {
    room_type: { name: string }
    room_detail: { room_number: string }
  }[]
}

interface Pagination {
  page: number; limit: number; total: number; totalPages: number
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; badge: string; icon: React.ElementType }> = {
  RESERVED:    { label: 'Reserved',    badge: 'bg-amber-500/20  text-amber-700  border-amber-500/30',  icon: Clock        },
  BOOKED:      { label: 'Confirmed',   badge: 'bg-blue-500/20   text-blue-700   border-blue-500/30',   icon: CheckCircle2 },
  CHECKED_IN:  { label: 'Checked In',  badge: 'bg-green-500/20  text-green-700  border-green-500/30',  icon: LogIn        },
  CHECKED_OUT: { label: 'Checked Out', badge: 'bg-purple-500/20 text-purple-700 border-purple-500/30', icon: LogOut       },
  CANCELLED:   { label: 'Cancelled',   badge: 'bg-red-500/20    text-red-700    border-red-500/30',    icon: XCircle      },
  EXPIRED:     { label: 'Expired',     badge: 'bg-gray-500/20   text-gray-600   border-gray-500/30',   icon: AlertCircle  },
  NO_SHOW:     { label: 'No Show',     badge: 'bg-orange-500/20 text-orange-700 border-orange-500/30', icon: UserX        },
}

function nights(ci: string, co: string) {
  return Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86400000)
}

export default function HotelAdminBookingsPage() {
  const { toast } = useToast()
  const [bookings, setBookings]         = useState<Booking[]>([])
  const [pagination, setPagination]     = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 0 })
  const [loading, setLoading]           = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [sortBy,   setSortBy]   = useState('created_at')
  const [order,    setOrder]    = useState('desc')

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: pagination.page.toString(), limit: pagination.limit.toString(), sort_by: sortBy, order })
      if (search)   params.append('search',    search)
      if (status !== 'all') params.append('status', status)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo)   params.append('date_to',   dateTo)

      const res  = await fetch(`/api/hotel-admin/bookings?${params}`, { credentials: 'include' })
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

  useEffect(() => { fetchBookings() }, [fetchBookings])
  const resetPage = () => setPagination(p => ({ ...p, page: 1 }))

  async function performAction(reference: string, action: string) {
    const labels: Record<string, string> = { check_in: 'Check in', check_out: 'Check out', cancel: 'Cancel', no_show: 'No Show' }
    if ((action === 'cancel' || action === 'no_show') && !confirm(`${labels[action]} booking ${reference}?`)) return
    try {
      setActionLoading(reference + action)
      const res  = await fetch(`/api/hotel-admin/bookings/${reference}/status`, {
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

      {/* Filters */}
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

      {/* Table */}
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
                const cfg   = STATUS_CONFIG[booking.status]
                const Icon  = cfg.icon
                const n     = nights(booking.check_in, booking.check_out)
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
                    <TableCell className="font-semibold text-sm">৳{booking.total_price.toLocaleString()}</TableCell>
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

      {/* Pagination */}
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
```

---

### FILE 5: `src/app/dashboard/hotel/bookings/[reference]/page.tsx`

```tsx
// filepath: src/app/dashboard/hotel/bookings/[reference]/page.tsx
// Hotel Admin — Single Booking Detail
// Guest info, room details, price summary, action buttons

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Users, CalendarDays,
  Hash, LogIn, LogOut, XCircle, UserX,
  CheckCircle2, Clock, AlertCircle, BedDouble,
  MapPin, Banknote,
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-hooks'
import { cn } from '@/lib/utils'

type BookingStatus = 'RESERVED' | 'BOOKED' | 'EXPIRED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW'

interface BookingDetail {
  id: number; booking_reference: string; status: BookingStatus
  check_in: string; check_out: string; guests: number; rooms_count: number
  total_price: number; advance_amount: number; special_request: string | null
  payment_method: string | null; created_at: string; reserved_until: string | null
  hotel: { id: number; name: string; city: { name: string } | null; images: { image_url: string }[] }
  end_user: {
    id: number; name: string; email: string
    end_user_details: { phone: string | null; nid_no: string | null; passport: string | null; address: string | null; country: string | null } | null
  }
  room_bookings: {
    id: number; price_per_night: number; nights: number; subtotal: number
    room_type: { id: number; name: string }
    room_detail: { id: number; room_number: string; floor: number | null; ac: boolean }
  }[]
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; badge: string; icon: React.ElementType }> = {
  RESERVED:    { label: 'Reserved',    badge: 'bg-amber-500/20  text-amber-700  border-amber-500/30',  icon: Clock        },
  BOOKED:      { label: 'Confirmed',   badge: 'bg-blue-500/20   text-blue-700   border-blue-500/30',   icon: CheckCircle2 },
  CHECKED_IN:  { label: 'Checked In',  badge: 'bg-green-500/20  text-green-700  border-green-500/30',  icon: LogIn        },
  CHECKED_OUT: { label: 'Checked Out', badge: 'bg-purple-500/20 text-purple-700 border-purple-500/30', icon: LogOut       },
  CANCELLED:   { label: 'Cancelled',   badge: 'bg-red-500/20    text-red-700    border-red-500/30',    icon: XCircle      },
  EXPIRED:     { label: 'Expired',     badge: 'bg-gray-500/20   text-gray-600   border-gray-500/30',   icon: AlertCircle  },
  NO_SHOW:     { label: 'No Show',     badge: 'bg-orange-500/20 text-orange-700 border-orange-500/30', icon: UserX        },
}

export default function HotelAdminBookingDetailPage() {
  const { reference } = useParams<{ reference: string }>()
  const router  = useRouter()
  const { toast } = useToast()
  const [booking, setBooking]   = useState<BookingDetail | null>(null)
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState(false)

  const reload = async () => {
    const res  = await fetch(`/api/hotel-admin/bookings/${reference}`, { credentials: 'include' })
    const data = await res.json()
    if (data.success) setBooking(data.data)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [reference])

  async function performAction(action: string, label: string) {
    if ((action === 'cancel' || action === 'no_show') && !confirm(`${label} this booking?`)) return
    try {
      setActing(true)
      const res  = await fetch(`/api/hotel-admin/bookings/${reference}/status`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Done', description: data.message, variant: 'success' })
        await reload()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Action failed', variant: 'destructive' })
    } finally {
      setActing(false)
    }
  }

  if (loading) return (
    <div className="space-y-6 max-w-4xl">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  )

  if (!booking) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground mb-4">Booking not found</p>
      <Link href="/dashboard/hotel/bookings"><Button variant="outline">← Back</Button></Link>
    </div>
  )

  const cfg    = STATUS_CONFIG[booking.status]
  const Icon   = cfg.icon
  const n      = Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000)
  const svcFee = Math.round(booking.total_price * 0.1)

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono">{booking.booking_reference}</h1>
              <div className="flex items-center gap-1.5">
                <Icon className="h-4 w-4" />
                <Badge variant="outline" className={cn('text-xs', cfg.badge)}>{cfg.label}</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Created {format(new Date(booking.created_at), 'MMM d, yyyy · h:mm a')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {booking.status === 'BOOKED' && (
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700" disabled={acting} onClick={() => performAction('check_in', 'Check in')}>
              <LogIn className="h-4 w-4" /> Check In
            </Button>
          )}
          {booking.status === 'CHECKED_IN' && (
            <>
              <Button size="sm" className="gap-1.5" disabled={acting} onClick={() => performAction('check_out', 'Check out')}>
                <LogOut className="h-4 w-4" /> Check Out
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50" disabled={acting} onClick={() => performAction('no_show', 'No Show')}>
                <UserX className="h-4 w-4" /> No Show
              </Button>
            </>
          )}
          {['RESERVED', 'BOOKED', 'CHECKED_IN'].includes(booking.status) && (
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-red-300 hover:bg-red-50" disabled={acting} onClick={() => performAction('cancel', 'Cancel')}>
              <XCircle className="h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Guest */}
          <Card className="glass-strong">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" /> Guest Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Name', booking.end_user.name],
                ['Email', booking.end_user.email],
                booking.end_user.end_user_details?.phone ? ['Phone', booking.end_user.end_user_details.phone] : null,
                booking.end_user.end_user_details?.nid_no ? ['NID', booking.end_user.end_user_details.nid_no] : null,
                booking.end_user.end_user_details?.passport ? ['Passport', booking.end_user.end_user_details.passport] : null,
                booking.end_user.end_user_details?.country ? ['Country', booking.end_user.end_user_details.country] : null,
              ].filter(Boolean).map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
              {booking.special_request && (
                <div className="col-span-2 pt-2 border-t border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Special Request</p>
                  <p className="italic text-sm">{booking.special_request}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stay */}
          <Card className="glass-strong">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-primary" /> Stay Details</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                {booking.hotel.images[0] && <img src={booking.hotel.images[0].image_url} alt={booking.hotel.name} className="w-20 h-16 rounded-lg object-cover shrink-0" />}
                <div>
                  <p className="font-bold text-base">{booking.hotel.name}</p>
                  {booking.hotel.city && <p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{booking.hotel.city.name}</p>}
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4">
                {[['Check-in', format(new Date(booking.check_in), 'MMM d, yyyy')], ['Check-out', format(new Date(booking.check_out), 'MMM d, yyyy')], ['Nights', n.toString()], ['Guests', booking.guests.toString()], ['Rooms', booking.rooms_count.toString()]].map(([l, v]) => (
                  <div key={l}><p className="text-xs text-muted-foreground mb-0.5">{l}</p><p className="font-semibold">{v}</p></div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Room breakdown */}
          <Card className="glass-strong">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BedDouble className="h-4 w-4 text-primary" /> Room Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {booking.room_bookings.map(rb => (
                <div key={rb.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/40 text-sm">
                  <div>
                    <p className="font-medium">{rb.room_type.name}</p>
                    <p className="text-xs text-muted-foreground">Room {rb.room_detail.room_number}{rb.room_detail.floor != null ? ` · Floor ${rb.room_detail.floor}` : ''}{rb.room_detail.ac ? ' · AC' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">৳{rb.subtotal.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">৳{rb.price_per_night.toLocaleString()} × {rb.nights}n</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Price */}
          <Card className="glass-strong">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Banknote className="h-4 w-4 text-primary" /> Price Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳{(booking.total_price - svcFee).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span>৳{svcFee.toLocaleString()}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">৳{booking.total_price.toLocaleString()}</span></div>
              {booking.advance_amount > 0 && <div className="flex justify-between text-green-600"><span>Paid</span><span>৳{booking.advance_amount.toLocaleString()}</span></div>}
            </CardContent>
          </Card>

          {/* Meta */}
          <Card className="glass-strong">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Hash className="h-4 w-4 text-primary" /> Booking Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><p className="text-xs text-muted-foreground mb-0.5">Reference</p><p className="font-mono font-medium text-xs">{booking.booking_reference}</p></div>
              <div><p className="text-xs text-muted-foreground mb-0.5">Created</p><p>{format(new Date(booking.created_at), 'MMM d, yyyy · h:mm a')}</p></div>
              {booking.reserved_until && booking.status === 'RESERVED' && (
                <div><p className="text-xs text-muted-foreground mb-0.5">Hold Expires</p><p className="text-amber-600">{format(new Date(booking.reserved_until), 'h:mm a')}</p></div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

---

## PART D — photos-reviews-modal.tsx FIX

**File:** `src/components/hotel/photos-reviews-modal.tsx`

The three fixes needed:
1. Move `handlePrev` and `handleNext` ABOVE the `handleKeyDown` useCallback
2. Replace `setCurrentIndex` inside `useEffect` with `useEffect` depending on `initialIndex` using a ref or just `key` prop pattern — simplest fix is to use `useEffect` with the proper value outside
3. Remove unused `Button` import and `isFullscreen` state

**Replace the entire file with:**

```tsx
// filepath: src/components/hotel/photos-reviews-modal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

interface HotelImage {
  id: number;
  image_url: string;
  is_cover: boolean;
}

interface PhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: HotelImage[];
  initialIndex?: number;
}

const PhotosReviewsModal = ({ isOpen, onClose, images, initialIndex = 0 }: PhotosModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isOpen]);

  // Sync index when modal opens with a specific initialIndex
  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [isOpen, initialIndex]);

  // Declare nav functions BEFORE the useCallback that uses them
  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Keyboard navigation — declared AFTER handlePrev and handleNext
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "Escape")      onClose();
    if (e.key === "ArrowRight")  handleNext();
    if (e.key === "ArrowLeft")   handlePrev();
  }, [isOpen, onClose, handleNext, handlePrev]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  if (!isOpen || !images || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-10 bg-linear-to-b from-black/80 to-transparent">
        <div className="text-white/80 font-medium tracking-wider text-sm bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">
          {currentIndex + 1} / {images.length}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
            <Maximize2 className="h-5 w-5" />
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main Image */}
      <div className="relative w-full h-full max-h-screen flex items-center justify-center p-4 md:p-12">
        <div className="relative w-full h-full max-w-6xl max-h-[85vh] flex items-center justify-center">
          <Image
            src={images[currentIndex].image_url}
            alt={`Hotel photo ${currentIndex + 1}`}
            fill
            className="object-contain animate-in zoom-in-95 duration-300"
            sizes="100vw"
            priority
          />
        </div>
      </div>

      {/* Nav Arrows */}
      {images.length > 1 && (
        <>
          <button onClick={handlePrev} className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-110 border border-white/10">
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button onClick={handleNext} className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-110 border border-white/10">
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center gap-3 overflow-x-auto py-2 px-4 max-w-4xl mx-auto [&::-webkit-scrollbar]:hidden">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setCurrentIndex(idx)}
                className={`relative h-16 w-24 shrink-0 rounded-lg overflow-hidden transition-all duration-300 ${
                  currentIndex === idx ? "ring-2 ring-primary ring-offset-2 ring-offset-black scale-110 z-10" : "opacity-50 hover:opacity-100"
                }`}
              >
                <Image src={img.image_url} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" sizes="100px" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotosReviewsModal;
```

---

## PART E — COMPLETE ACTION LIST (In Order)

```
1. DELETE  src/components/room/hotel-detail-client.tsx           ← fixes TypeScript error
2. REPLACE src/components/hotel/photos-reviews-modal.tsx         ← fixes all ESLint errors
3. EDIT    src/components/room/room-type-card.tsx                 ← add isUnavailable logic (see Bug 2 Fix B)
4. EDIT    src/components/booking/room-selector.tsx               ← fix filteredRoomTypes (see Bug 2 Fix A)
5. REPLACE src/app/api/hotel-admin/bookings/route.ts              ← 0 bytes → full GET
6. REPLACE src/app/api/hotel-admin/bookings/[reference]/route.ts  ← 0 bytes → full GET detail
7. REPLACE src/app/api/hotel-admin/bookings/[reference]/status/route.ts ← 0 bytes → PATCH
8. REPLACE src/app/dashboard/hotel/bookings/page.tsx              ← 0 bytes → full list page
9. REPLACE src/app/dashboard/hotel/bookings/[reference]/page.tsx  ← 0 bytes → full detail page
```

---

## PART F — DO NOT TOUCH

```
src/components/booking/room-selector.tsx   ← only change filteredRoomTypes useMemo (step 4)
src/components/room/room-type-card.tsx     ← only add isUnavailable (step 3)
src/components/room/rooms-section-client.tsx  ✅ correct
src/components/booking/booking-sidebar.tsx    ✅ correct
src/app/(public)/hotels/[slug]/page.tsx       ✅ correct
src/app/api/public/hotels/[slug]/availability/route.ts ✅ correct
src/middleware.ts                             ✅ DO NOT TOUCH
src/lib/jwt.ts                                ✅ DO NOT TOUCH
All auth routes                               ✅ DO NOT TOUCH
```
