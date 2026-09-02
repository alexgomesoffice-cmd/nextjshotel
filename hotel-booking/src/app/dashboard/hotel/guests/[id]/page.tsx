// filepath: src/app/dashboard/hotel/guests/[id]/page.tsx
/* eslint-disable @next/next/no-img-element */
// Hotel Admin — Guest Detail
// Guest profile + all hotel-specific booking/stay history.

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ExternalLink, CalendarDays, Users,
  BedDouble, MapPin, Banknote,
  Phone, Mail, Globe, User, CheckCircle2,
  LogIn, LogOut, XCircle, UserX,
  History,
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = 'BOOKED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW' | 'CANCELLED'
type RoomStatus    = 'AVAILABLE' | 'BOOKED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'MAINTENANCE'

interface NightlyRate {
  stay_date:          string
  price:              number
  pricing_rule_name:  string | null
}

interface RoomBooking {
  id:              number
  price_per_night: number
  nights:          number
  subtotal:        number
  room_type_name:  string
  room_variant: {
    id:            number
    price:         number
    room_size:     string | null
    max_occupancy: number | null
    cover_image:   string | null
    bed_types:     { name: string; count: number }[]
    facilities:    string[]
  }
  room_detail: {
    id:          number
    room_number: string
    floor:       number | null
    status:      RoomStatus
  }
  nightly_rates: NightlyRate[]
}

interface BookingRecord {
  id:                number
  booking_reference: string
  status:            BookingStatus
  check_in:          string
  check_out:         string
  guests:            number
  rooms_count:       number
  total_price:       number
  special_request:   string | null
  created_at:        string
  room_bookings:     RoomBooking[]
}

interface GuestData {
  guest: {
    id:      number
    name:    string
    email:   string
    image:   string | null
    phone:   string | null
    dob:     string | null
    gender:  string | null
    address: string | null
    country: string | null
  }
  currentStays:   BookingRecord[]
  upcomingStays:  BookingRecord[]
  previousStays:  BookingRecord[]
  bookingHistory: BookingRecord[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BookingStatus, { label: string; badge: string; icon: React.ElementType }> = {
  BOOKED:      { label: 'Upcoming',    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',     icon: CheckCircle2 },
  CHECKED_IN:  { label: 'Current Stay', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: LogIn },
  CHECKED_OUT: { label: 'Completed',    badge: 'bg-purple-500/10 text-purple-500 border-purple-500/20',   icon: LogOut },
  CANCELLED:   { label: 'Cancelled',    badge: 'bg-red-500/10 text-red-500 border-red-500/20',         icon: XCircle },
  NO_SHOW:     { label: 'No Show',      badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: UserX },
}

const ROOM_STATUS_BADGE: Record<RoomStatus, string> = {
  AVAILABLE:   'bg-green-500/10 text-green-600 border-green-500/20',
  BOOKED:      'bg-blue-500/10 text-blue-500 border-blue-500/20',
  CHECKED_IN:  'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  CHECKED_OUT: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  MAINTENANCE: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nightCount(ci: string, co: string) {
  return Math.max(1, Math.round((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000))
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 text-sm">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />}
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">{label}</p>
        <p className="font-medium text-foreground break-words">{value}</p>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-48" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ─── Booking Card (for history) ────────────────────────────────────────────────

function StayRecordCard({ booking }: { booking: BookingRecord }) {
  const cfg = STATUS_CONFIG[booking.status]
  const StatusIcon = cfg.icon
  const n = nightCount(booking.check_in, booking.check_out)
  const isCanceledOrNoShow = booking.status === 'CANCELLED' || booking.status === 'NO_SHOW'

  return (
    <Card className={cn('border-border/50 overflow-hidden', isCanceledOrNoShow ? 'bg-secondary/5 border-dashed' : 'bg-card/40')}>
      <div className="px-5 py-3.5 bg-secondary/10 border-b border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn('gap-1 text-[11px] font-semibold uppercase tracking-wide', cfg.badge)}>
            <StatusIcon className="h-3.5 w-3.5" />
            {cfg.label}
          </Badge>
          <span className="font-mono text-sm font-semibold text-foreground">{booking.booking_reference}</span>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
          <Link href={`/dashboard/hotel/bookings/${booking.booking_reference}`}>
            View Booking <ExternalLink className="h-3 w-3" />
          </Link>
        </Button>
      </div>
      <CardContent className="p-0">
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Check-in</p>
            <p className="text-sm font-semibold text-foreground">{format(new Date(booking.check_in), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Check-out</p>
            <p className="text-sm font-semibold text-foreground">{format(new Date(booking.check_out), 'MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Duration</p>
            <p className="text-sm font-medium text-foreground">{n} night{n !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Total</p>
            <p className="text-[15px] font-bold text-foreground">৳{booking.total_price.toLocaleString()}</p>
          </div>
        </div>

        {/* Room Information nested */}
        <div className="px-5 pb-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5" /> Rooms Booked ({booking.rooms_count})
          </p>
          <div className="space-y-3">
            {booking.room_bookings.map(rb => (
              <div key={rb.id} className="flex flex-col sm:flex-row gap-4 bg-secondary/5 rounded-lg border border-border/40 p-3">
                <div className="sm:w-32 h-20 shrink-0 rounded bg-secondary/40 relative overflow-hidden">
                  {rb.room_variant.cover_image ? (
                    <img src={rb.room_variant.cover_image} alt={rb.room_type_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                      <BedDouble className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">{rb.room_type_name}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">Room {rb.room_detail.room_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-semibold text-foreground">৳{rb.subtotal.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground">৳{rb.price_per_night.toLocaleString()} / night</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HotelGuestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState<GuestData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/hotel-admin/guests/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data)
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load guest', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [id, toast])

  if (loading) return <DetailSkeleton />

  if (!data) {
    return (
      <div className="text-center py-24">
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
        <p className="text-base font-medium text-foreground mb-1">Guest not found</p>
        <p className="text-sm text-muted-foreground mb-6">This guest may not have any bookings at your hotel.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/hotel/guests')}>
          ← Back to Guests
        </Button>
      </div>
    )
  }

  const actualStaysCount = data.currentStays.length + data.previousStays.length
  
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto w-full">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost" size="sm"
              onClick={() => router.push('/dashboard/hotel/guests')}
              className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Guests
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{data.guest.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Guest Profile & History</p>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Guest profile */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/40 sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <User className="h-4 w-4" /> Guest Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Avatar & Summary */}
              <div className="flex flex-col items-center text-center space-y-3">
                <Avatar className="h-24 w-24 border-2 border-border/50 shadow-sm">
                  {data.guest.image && (
                    <AvatarImage src={data.guest.image} alt={data.guest.name} className="object-cover" />
                  )}
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-700">
                    {initials(data.guest.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xl font-bold text-foreground">{data.guest.name}</p>
                  <p className="text-[13px] text-muted-foreground">{data.guest.email}</p>
                </div>
                
                <div className="flex items-center justify-center gap-3 pt-2 w-full">
                  <div className="bg-secondary/40 border border-border/50 rounded-lg px-4 py-2 flex-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Actual Stays</p>
                    <p className="text-xl font-bold text-foreground">{actualStaysCount}</p>
                  </div>
                  <div className="bg-secondary/40 border border-border/50 rounded-lg px-4 py-2 flex-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Total Bookings</p>
                    <p className="text-xl font-bold text-foreground">{data.bookingHistory.length}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3.5">
                <InfoRow label="Email"   value={data.guest.email}   icon={Mail} />
                <InfoRow label="Phone"   value={data.guest.phone ?? 'Not provided'} icon={Phone} />
                {data.guest.dob && (
                  <InfoRow label="Date of Birth"
                    value={format(new Date(data.guest.dob), 'MMM d, yyyy')}
                    icon={CalendarDays}
                  />
                )}
                <InfoRow label="Gender"  value={data.guest.gender}  icon={User} />
                <InfoRow label="Country" value={data.guest.country} icon={Globe} />
                <InfoRow label="Address" value={data.guest.address} icon={MapPin} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Stay History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active / Upcoming Stays */}
          {(data.currentStays.length > 0 || data.upcomingStays.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-lg font-bold tracking-tight">Active & Upcoming</h2>
              </div>
              
              {data.currentStays.map(stay => (
                <StayRecordCard key={stay.id} booking={stay} />
              ))}
              {data.upcomingStays.map(stay => (
                <StayRecordCard key={stay.id} booking={stay} />
              ))}
            </div>
          )}

          {/* Historical Stays */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-bold tracking-tight">Booking History</h2>
            </div>
            
            {data.bookingHistory.length === 0 ? (
              <p className="text-muted-foreground italic text-sm">No historical bookings found.</p>
            ) : (
              <div className="space-y-4">
                {data.bookingHistory
                  .filter(b => b.status !== 'CHECKED_IN' && b.status !== 'BOOKED') // already shown above
                  .map(stay => (
                  <StayRecordCard key={stay.id} booking={stay} />
                ))}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  )
}
