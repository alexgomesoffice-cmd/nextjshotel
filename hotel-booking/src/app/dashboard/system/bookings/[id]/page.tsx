'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BedDouble, Building2, CalendarDays, Clock3, Hash, MapPin, UserRound } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface BookingDetail {
  id: number
  booking_reference: string
  status: string
  check_in: string
  check_out: string
  guests: number
  rooms_count: number
  special_request: string | null
  reserved_until: string | null
  total_price: number
  created_at: string
  updated_at: string
  hotel: {
    id: number
    name: string
    slug: string
    address: string | null
    approval_status: string
    city: { name: string } | null
    star_rating: number | null
    check_in_time: string
    check_out_time: string
    cover_image_url: string | null
  }
  end_user: {
    id: number
    name: string
    email: string
    detail: {
      phone: string | null
      country: string | null
      address: string | null
      gender: string | null
    } | null
  }
  room_bookings: {
    id: number
    price_per_night: number
    nights: number
    subtotal: number
    room_type: { id: number; name: string }
    room_variant: {
      id: number
      room_size: string | null
      max_occupancy: number | null
      bed_types: { count: number; bed_type: { name: string } }[]
      facilities: { facility: { name: string } }[]
      variant_images: { image_url: string; is_cover: boolean }[]
    }
    room_detail: { id: number; room_number: string; floor: number | null; status: string }
  }[]
}

const STATUS_STYLE: Record<string, string> = {
  RESERVED: 'bg-amber-500/15 text-amber-700 border-amber-500/20',
  BOOKED: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20',
  EXPIRED: 'bg-muted-foreground/15 text-muted-foreground border-border/60',
  CANCELLED: 'bg-red-500/15 text-red-600 border-red-500/20',
  CHECKED_IN: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
  CHECKED_OUT: 'bg-purple-500/15 text-purple-600 border-purple-500/20',
  NO_SHOW: 'bg-orange-500/15 text-orange-600 border-orange-500/20',
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

export default function SystemBookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch(`/api/system-admin/bookings/${id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => { if (data.success) setBooking(data.data) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5"><div className="h-8 w-64 animate-pulse rounded bg-secondary" /><div className="grid gap-4 lg:grid-cols-3"><div className="h-72 animate-pulse rounded-md bg-secondary" /><div className="h-72 animate-pulse rounded-md bg-secondary" /><div className="h-72 animate-pulse rounded-md bg-secondary" /></div></div>

  if (!booking) return <div className="px-6 py-5 text-sm text-muted-foreground">Booking not found.</div>

  const stayNights = nights(booking.check_in, booking.check_out)

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-6 py-5">
      <div className="flex items-start gap-3 border-b border-border/60 pb-3">
        <button onClick={() => router.back()} className="mt-0.5 rounded-sm p-1.5 hover:bg-secondary"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-base font-semibold">{booking.booking_reference}</h1>
            <span className={cn('rounded-sm border px-1.5 py-0.5 text-[10px] font-medium', STATUS_STYLE[booking.status] ?? 'bg-secondary text-muted-foreground')}>
              {STATUS_LABEL[booking.status] ?? booking.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Booking #{booking.id} · Created {format(new Date(booking.created_at), 'MMM d, yyyy · h:mm a')}</p>
        </div>
        <button onClick={() => router.push(`/dashboard/system/hotels/${booking.hotel.id}`)} className="hidden h-8 rounded-sm border border-border/60 px-3 text-xs hover:bg-secondary sm:block">View Hotel</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><UserRound className="h-4 w-4 text-primary" /> Guest Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 text-xs sm:grid-cols-2">
              <Info label="Name" value={booking.end_user.name} />
              <Info label="Email" value={booking.end_user.email} />
              <Info label="Phone" value={booking.end_user.detail?.phone ?? '—'} />
              <Info label="Country" value={booking.end_user.detail?.country ?? '—'} />
              <Info label="Gender" value={booking.end_user.detail?.gender ?? '—'} />
              <Info label="Guest ID" value={`#${booking.end_user.id}`} mono />
              {booking.end_user.detail?.address && <div className="sm:col-span-2"><Info label="Address" value={booking.end_user.detail.address} /></div>}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-primary" /> Hotel & Stay</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center gap-3">
                {booking.hotel.cover_image_url ? <img src={booking.hotel.cover_image_url} alt="" className="h-12 w-16 rounded-sm object-cover" /> : <div className="grid h-12 w-16 place-items-center rounded-sm bg-secondary"><Building2 className="h-4 w-4 text-muted-foreground" /></div>}
                <div>
                  <p className="font-semibold">{booking.hotel.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{booking.hotel.city?.name ?? '—'}</p>
                  {booking.hotel.address && <p className="mt-0.5 text-muted-foreground">{booking.hotel.address}</p>}
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Info label="Check-in" value={format(new Date(booking.check_in), 'MMM d, yyyy')} />
                <Info label="Check-out" value={format(new Date(booking.check_out), 'MMM d, yyyy')} />
                <Info label="Nights" value={stayNights.toString()} />
                <Info label="Guests" value={booking.guests.toString()} />
              </div>
              <div className="flex flex-wrap gap-4 border-t border-border/40 pt-3 text-muted-foreground">
                <span>Hotel check-in: <strong className="text-foreground">{booking.hotel.check_in_time}</strong></span>
                <span>Hotel check-out: <strong className="text-foreground">{booking.hotel.check_out_time}</strong></span>
                <span>Rooms: <strong className="text-foreground">{booking.rooms_count}</strong></span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><BedDouble className="h-4 w-4 text-primary" /> Reserved Rooms</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {booking.room_bookings.map((room) => (
                <div key={room.id} className="rounded-md border border-border/50 bg-secondary/20 p-3">
                  <div className="flex gap-3">
                    {room.room_variant.variant_images[0]?.image_url ? <img src={room.room_variant.variant_images[0].image_url} alt="" className="h-16 w-20 rounded-sm object-cover" /> : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{room.room_type.name}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">Variant #{room.room_variant.id} · Physical room {room.room_detail.room_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-xs font-semibold">৳{room.subtotal.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">৳{room.price_per_night.toLocaleString()} × {room.nights} nights</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                        {room.room_variant.room_size && <span>{room.room_variant.room_size}</span>}
                        {room.room_variant.max_occupancy != null && <span>Max {room.room_variant.max_occupancy} guests</span>}
                        {room.room_variant.bed_types.map((bed, index) => <span key={`${bed.bed_type.name}-${index}`}>{bed.count} × {bed.bed_type.name}</span>)}
                        {room.room_variant.facilities.map((facility) => <span key={facility.facility.name}>{facility.facility.name}</span>)}
                        {room.room_detail.floor != null && <span>Floor {room.room_detail.floor}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {booking.special_request && (
            <Card className="border-border/60 shadow-none">
              <CardHeader className="pb-3"><CardTitle className="text-sm">Special Request</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground">{booking.special_request}</CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4 text-primary" /> Booking Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-xs">
              <Row label="Booking reference" value={booking.booking_reference} mono />
              <Row label="Status" value={STATUS_LABEL[booking.status] ?? booking.status} />
              <Row label="Rooms" value={booking.rooms_count.toString()} />
              <Row label="Guests" value={booking.guests.toString()} />
              <Separator />
              <Row label="Total booking value" value={`৳${booking.total_price.toLocaleString()}`} strong />
              <p className="text-[10px] text-muted-foreground">This is the total stored on the reservation. The project does not currently have a payment-status field in the booking model.</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4 text-primary" /> Reservation Record</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-xs">
              <Row label="Created" value={format(new Date(booking.created_at), 'MMM d, yyyy · h:mm a')} />
              <Row label="Last updated" value={format(new Date(booking.updated_at), 'MMM d, yyyy · h:mm a')} />
              {booking.status === 'RESERVED' && booking.reserved_until && (
                <Row label="Reservation hold expires" value={format(new Date(booking.reserved_until), 'MMM d, yyyy · h:mm a')} strong />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Hash className="h-4 w-4 text-primary" /> Internal IDs</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Booking ID" value={`#${booking.id}`} mono />
              <Row label="Guest ID" value={`#${booking.end_user.id}`} mono />
              <Row label="Hotel ID" value={`#${booking.hotel.id}`} mono />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('font-medium', mono && 'font-mono')}>{value}</p>
    </div>
  )
}

function Row({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('text-right', mono && 'font-mono', strong && 'font-semibold text-primary')}>{value}</span>
    </div>
  )
}
