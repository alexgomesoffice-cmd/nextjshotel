'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CalendarDays, CheckCircle2, Clock3, Eye, Search, XCircle } from 'lucide-react'
import { OpsSectionHeader, OpsTable, OpsTh, OpsTd } from '@/components/admin/shared/primitives'
import { cn } from '@/lib/utils'

interface HotelRow {
  id: number
  name: string
  city: string | null
  approval_status: 'UNPUBLISHED' | 'PUBLISHED' | 'SUSPENDED'
  cover_image_url: string | null
  totalBookings: number
  reserved: number
  booked: number
  expired: number
  cancelled: number
  checkedIn: number
  checkedOut: number
  noShow: number
}

interface Summary {
  totalBookings: number
  reserved: number
  booked: number
  expired: number
  cancelled: number
  bookingValue: number
}

const STATUS_STYLE: Record<HotelRow['approval_status'], string> = {
  PUBLISHED: 'bg-emerald-500/15 text-emerald-600',
  UNPUBLISHED: 'bg-muted-foreground/15 text-muted-foreground',
  SUSPENDED: 'bg-red-500/15 text-red-600',
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

export default function SystemBookingsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<HotelRow[]>([])
  const [summary, setSummary] = useState<Summary>({ totalBookings: 0, reserved: 0, booked: 0, expired: 0, cancelled: 0, bookingValue: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/system-admin/bookings?view=hotels&search=${encodeURIComponent(search)}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        setRows(data.data.hotels ?? [])
        setSummary(data.data.summary ?? summary)
      }
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 200)
    return () => window.clearTimeout(timer)
  }, [load])

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <OpsSectionHeader
        title="Bookings"
        description="Monitor reservations across every property on the platform."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total Bookings" value={summary.totalBookings} icon={CalendarDays} className="text-primary" />
        <Stat label="Reserved" value={summary.reserved} icon={Clock3} className="text-amber-600" />
        <Stat label="Booked" value={summary.booked} icon={CheckCircle2} className="text-emerald-600" />
        <Stat label="Cancelled / Expired" value={summary.cancelled + summary.expired} icon={XCircle} className="text-muted-foreground" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search hotel or city…"
            className="h-8 w-full rounded-sm border border-border/60 bg-secondary/40 pl-8 pr-3 text-xs outline-none transition focus:border-primary/60"
          />
        </div>
        <p className="hidden text-[11px] text-muted-foreground sm:block">
          Booking value is the reservation total stored on the booking; it is not a payment status.
        </p>
      </div>

      <OpsTable>
        <thead>
          <tr>
            <OpsTh>Hotel</OpsTh>
            <OpsTh className="w-32">City</OpsTh>
            <OpsTh className="w-24 text-right">Bookings</OpsTh>
            <OpsTh className="w-24 text-right">Reserved</OpsTh>
            <OpsTh className="w-24 text-right">Booked</OpsTh>
            <OpsTh className="w-24 text-right">Expired</OpsTh>
            <OpsTh className="w-24 text-right">Cancelled</OpsTh>
            <OpsTh className="w-28">Property</OpsTh>
            <OpsTh className="w-12 text-center"> </OpsTh>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <tr key={index}>
                <OpsTd colSpan={9} className="h-11 animate-pulse bg-secondary/20" />
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <OpsTd colSpan={9} className="py-12 text-center text-xs text-muted-foreground">
                No hotels or bookings found.
              </OpsTd>
            </tr>
          ) : (
            rows.map((hotel) => (
              <tr
                key={hotel.id}
                className="cursor-pointer hover:bg-secondary/40"
                onClick={() => router.push(`/dashboard/system/bookings/hotel/${hotel.id}`)}
              >
                <OpsTd>
                  <div className="flex items-center gap-2.5">
                    {hotel.cover_image_url ? (
                      <img src={hotel.cover_image_url} alt="" className="h-8 w-10 rounded-sm object-cover" />
                    ) : (
                      <div className="grid h-8 w-10 place-items-center rounded-sm bg-secondary text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{hotel.name}</p>
                      <p className="text-[10px] text-muted-foreground">Hotel #{hotel.id}</p>
                    </div>
                  </div>
                </OpsTd>
                <OpsTd className="text-xs text-muted-foreground">{hotel.city ?? '—'}</OpsTd>
                <OpsTd className="text-right font-mono text-xs tabular-nums">{hotel.totalBookings}</OpsTd>
                <OpsTd className="text-right font-mono text-xs tabular-nums text-amber-600">{hotel.reserved}</OpsTd>
                <OpsTd className="text-right font-mono text-xs tabular-nums text-emerald-600">{hotel.booked}</OpsTd>
                <OpsTd className="text-right font-mono text-xs tabular-nums">{hotel.expired}</OpsTd>
                <OpsTd className="text-right font-mono text-xs tabular-nums">{hotel.cancelled}</OpsTd>
                <OpsTd>
                  <span className={cn('rounded-sm px-1.5 py-0.5 text-[10px] font-medium', STATUS_STYLE[hotel.approval_status])}>
                    {hotel.approval_status}
                  </span>
                </OpsTd>
                <OpsTd className="text-center">
                  <button
                    type="button"
                    aria-label={`View bookings for ${hotel.name}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      router.push(`/dashboard/system/bookings/hotel/${hotel.id}`)
                    }}
                    className="rounded-sm p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </OpsTd>
              </tr>
            ))
          )}
        </tbody>
      </OpsTable>
    </div>
  )
}
