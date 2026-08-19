'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Eye, Search, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { OpsSectionHeader, OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { cn } from '@/lib/utils'

interface Booking {
  id: number
  booking_reference: string
  status: string
  check_in: string
  check_out: string
  guests: number
  rooms_count: number
  total_price: number
  created_at: string
  end_user: { id: number; name: string; email: string }
  room_bookings: { room_type: { name: string }; room_detail: { room_number: string } }[]
}

interface Hotel {
  id: number
  name: string
  address: string | null
  city: { name: string } | null
  approval_status: string
  cover_image_url: string | null
}

interface Summary {
  total: number
  reserved: number
  booked: number
  expired: number
  cancelled: number
  checkedIn: number
  checkedOut: number
  noShow: number
  bookingValue: number
}

const STATUS_STYLE: Record<string, string> = {
  RESERVED: 'bg-amber-500/15 text-amber-700',
  BOOKED: 'bg-emerald-500/15 text-emerald-700',
  EXPIRED: 'bg-muted-foreground/15 text-muted-foreground',
  CANCELLED: 'bg-red-500/15 text-red-600',
  CHECKED_IN: 'bg-blue-500/15 text-blue-600',
  CHECKED_OUT: 'bg-purple-500/15 text-purple-600',
  NO_SHOW: 'bg-orange-500/15 text-orange-600',
}

const STATUS_LABEL: Record<string, string> = {
  RESERVED: 'Reserved',
  BOOKED: 'Booked',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  CHECKED_IN: 'Checked In',
  CHECKED_OUT: 'Checked Out',
  NO_SHOW: 'No Show',
}

function nights(checkIn: string, checkOut: string) {
  return Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
}

function Stat({ label, value, icon: Icon, className }: { label: string; value: number; icon: React.ElementType; className?: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-card px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <Icon className={cn('h-3.5 w-3.5', className || 'text-muted-foreground')} />
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}

export default function SystemHotelBookingsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, reserved: 0, booked: 0, expired: 0, cancelled: 0, checkedIn: 0, checkedOut: 0, noShow: 0, bookingValue: 0 })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '15' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const res = await fetch(`/api/system-admin/hotels/${id}/bookings?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setHotel(data.data.hotel)
        setBookings(data.data.bookings ?? [])
        setSummary(data.data.summary ?? summary)
        setTotal(data.data.pagination?.total ?? 0)
        setTotalPages(data.data.pagination?.totalPages ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [id, page, search, status, dateFrom, dateTo])

  useEffect(() => { void load() }, [load])
  useEffect(() => { setPage(1) }, [search, status, dateFrom, dateTo])

  if (!hotel && !loading) {
    return <div className="px-6 py-5 text-sm text-muted-foreground">Hotel not found.</div>
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/system/bookings')} className="rounded-sm p-1.5 hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <OpsSectionHeader
            title={hotel?.name ?? 'Loading…'}
            description={`${hotel?.city?.name ?? '—'} · All reservations for this property.`}
          />
        </div>
        {hotel && (
          <button type="button" onClick={() => router.push(`/dashboard/system/hotels/${hotel.id}`)} className="hidden h-8 rounded-sm border border-border/60 px-3 text-xs hover:bg-secondary sm:block">
            View Hotel
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Total" value={summary.total} icon={CalendarDays} className="text-primary" />
        <Stat label="Reserved" value={summary.reserved} icon={Clock3} className="text-amber-600" />
        <Stat label="Booked" value={summary.booked} icon={CheckCircle2} className="text-emerald-600" />
        <Stat label="Cancelled" value={summary.cancelled} icon={XCircle} className="text-red-600" />
        <Stat label="Expired" value={summary.expired} icon={XCircle} />
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-card p-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search booking reference, guest name or email…" className="h-8 w-full rounded-sm border border-border/60 bg-secondary/40 pl-8 pr-3 text-xs outline-none focus:border-primary/60" />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-8 rounded-sm border border-border/60 bg-secondary/40 px-2 text-xs outline-none">
          <option value="">All statuses</option>
          <option value="RESERVED">Reserved</option>
          <option value="BOOKED">Booked</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="CHECKED_OUT">Checked Out</option>
          <option value="NO_SHOW">No Show</option>
        </select>
        <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-8 rounded-sm border border-border/60 bg-secondary/40 px-2 text-xs outline-none" aria-label="Check-in from" />
        <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-8 rounded-sm border border-border/60 bg-secondary/40 px-2 text-xs outline-none" aria-label="Check-in to" />
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{total.toLocaleString()} booking{total === 1 ? '' : 's'}</span>
        <span>Click a booking to inspect its stored details.</span>
      </div>

      <OpsTable>
        <thead>
          <tr>
            <OpsTh>Reference</OpsTh>
            <OpsTh>Guest</OpsTh>
            <OpsTh className="w-44">Stay</OpsTh>
            <OpsTh>Room</OpsTh>
            <OpsTh className="w-24 text-right">Guests</OpsTh>
            <OpsTh className="w-28 text-right">Booking Value</OpsTh>
            <OpsTh className="w-28">Status</OpsTh>
            <OpsTh className="w-12 text-center"> </OpsTh>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 7 }).map((_, index) => <tr key={index}><OpsTd colSpan={8} className="h-11 animate-pulse bg-secondary/20" /></tr>)
          ) : bookings.length === 0 ? (
            <tr><OpsTd colSpan={8} className="py-12 text-center text-xs text-muted-foreground">No bookings match the current filters.</OpsTd></tr>
          ) : bookings.map((booking) => {
            const bookingNights = nights(booking.check_in, booking.check_out)
            return (
              <tr key={booking.id} className="cursor-pointer hover:bg-secondary/40" onClick={() => router.push(`/dashboard/system/bookings/${booking.id}`)}>
                <OpsTd><span className="font-mono text-[11px] font-medium">{booking.booking_reference}</span></OpsTd>
                <OpsTd><p className="text-[12px] font-medium">{booking.end_user.name}</p><p className="max-w-[190px] truncate text-[10px] text-muted-foreground">{booking.end_user.email}</p></OpsTd>
                <OpsTd><p className="text-[11px] font-medium">{format(new Date(booking.check_in), 'MMM d, yyyy')} → {format(new Date(booking.check_out), 'MMM d, yyyy')}</p><p className="text-[10px] text-muted-foreground">{bookingNights} night{bookingNights === 1 ? '' : 's'}</p></OpsTd>
                <OpsTd><p className="text-[11px] font-medium">{booking.room_bookings[0]?.room_type.name ?? '—'}</p><p className="text-[10px] text-muted-foreground">{booking.room_bookings.length > 1 ? `${booking.room_bookings.length} rooms` : booking.room_bookings[0]?.room_detail.room_number ? `Room ${booking.room_bookings[0].room_detail.room_number}` : '—'}</p></OpsTd>
                <OpsTd className="text-right text-xs tabular-nums">{booking.guests}</OpsTd>
                <OpsTd className="text-right font-mono text-xs tabular-nums">৳{booking.total_price.toLocaleString()}</OpsTd>
                <OpsTd><span className={cn('rounded-sm px-1.5 py-0.5 text-[10px] font-medium', STATUS_STYLE[booking.status] ?? 'bg-secondary text-muted-foreground')}>{STATUS_LABEL[booking.status] ?? booking.status}</span></OpsTd>
                <OpsTd className="text-center"><Eye className="mx-auto h-3.5 w-3.5 text-muted-foreground" /></OpsTd>
              </tr>
            )
          })}
        </tbody>
      </OpsTable>

      <div className="flex items-center justify-between border-t border-border/60 pt-3">
        <p className="text-[11px] text-muted-foreground">Page {page} of {Math.max(totalPages, 1)}</p>
        <div className="flex gap-1">
          <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-sm border border-border/60 px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 hover:bg-secondary">Previous</button>
          <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-sm border border-border/60 px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 hover:bg-secondary">Next</button>
        </div>
      </div>
    </div>
  )
}
