// filepath: src/app/dashboard/hotel/guests/[id]/page.tsx
/* eslint-disable @next/next/no-img-element */
// Hotel Admin — Guest Detail
// Full stay record: guest profile, booking summary, rooms (with variant images), historical pricing.

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ExternalLink, CalendarDays, Users,
  Hash, BedDouble, MapPin, Banknote,
  Phone, Mail, Globe, User, CheckCircle2,
  LogIn, LogOut, Clock, XCircle, AlertCircle, UserX,
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
// Room images are stored at arbitrary external URLs (Cloudinary / S3 paths)
// so we use a plain <img> tag and suppress the Next.js lint rule per file.

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = 'RESERVED' | 'BOOKED' | 'EXPIRED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW'
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

interface GuestDetail {
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
  reserved_until:    string | null
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
  room_bookings: RoomBooking[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BookingStatus, { label: string; badge: string; icon: React.ElementType }> = {
  RESERVED:    { label: 'Reserved',    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',   icon: Clock },
  BOOKED:      { label: 'Confirmed',   badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',     icon: CheckCircle2 },
  CHECKED_IN:  { label: 'Checked In',  badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: LogIn },
  CHECKED_OUT: { label: 'Checked Out', badge: 'bg-purple-500/10 text-purple-500 border-purple-500/20',   icon: LogOut },
  CANCELLED:   { label: 'Cancelled',   badge: 'bg-red-500/10 text-red-500 border-red-500/20',         icon: XCircle },
  EXPIRED:     { label: 'Expired',     badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20',      icon: AlertCircle },
  NO_SHOW:     { label: 'No Show',     badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: UserX },
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
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ─── Room Card ────────────────────────────────────────────────────────────────

function RoomBookingCard({ rb }: { rb: RoomBooking }) {
  const bedLabel = rb.room_variant.bed_types
    .map(bt => `${bt.count > 1 ? `${bt.count}× ` : ''}${bt.name}`)
    .join(' · ') || null

  const roomStatusLabel = rb.room_detail.status.replace('_', ' ')

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden bg-secondary/10">
      <div className="flex flex-col sm:flex-row gap-0">
        {/* Room image */}
        <div className="sm:w-44 h-36 sm:h-auto shrink-0 bg-secondary/40 relative overflow-hidden">
          {rb.room_variant.cover_image ? (
            <img
              src={rb.room_variant.cover_image}
              alt={rb.room_type_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <BedDouble className="h-10 w-10" />
            </div>
          )}
        </div>

        {/* Room info */}
        <div className="flex-1 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[15px] font-bold text-foreground">{rb.room_type_name}</p>
              {bedLabel && (
                <p className="text-[13px] text-muted-foreground mt-0.5">{bedLabel}</p>
              )}
              {rb.room_variant.room_size && (
                <p className="text-[12px] text-muted-foreground/70 mt-0.5">{rb.room_variant.room_size}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[13px] font-semibold text-foreground">Room {rb.room_detail.room_number}</p>
              {rb.room_detail.floor != null && (
                <p className="text-[12px] text-muted-foreground">Floor {rb.room_detail.floor}</p>
              )}
              <Badge variant="outline" className={cn('text-[10px] mt-1.5 uppercase tracking-wide font-semibold', ROOM_STATUS_BADGE[rb.room_detail.status])}>
                {roomStatusLabel}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
            {rb.room_variant.max_occupancy != null && (
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Up to {rb.room_variant.max_occupancy} guest{rb.room_variant.max_occupancy !== 1 ? 's' : ''}
              </span>
            )}
            {rb.room_variant.facilities.slice(0, 5).map(f => (
              <span key={f} className="px-2 py-0.5 rounded bg-secondary border border-border/40 text-foreground/70">{f}</span>
            ))}
            {rb.room_variant.facilities.length > 5 && (
              <span className="text-muted-foreground/60">+{rb.room_variant.facilities.length - 5} more</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Nightly Pricing Table ────────────────────────────────────────────────────

function NightlyRateTable({ rb }: { rb: RoomBooking }) {
  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <div className="px-4 py-2.5 bg-secondary/30 border-b border-border/30 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">
          Room {rb.room_detail.room_number} — {rb.room_type_name}
        </p>
        <p className="text-[12px] text-muted-foreground">{rb.nights} night{rb.nights !== 1 ? 's' : ''}</p>
      </div>
      <div className="divide-y divide-border/20">
        {rb.nightly_rates.map(nr => (
          <div key={nr.stay_date} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-secondary/10 transition-colors">
            <div className="flex items-center gap-4">
              <span className="text-[13px] font-medium text-foreground w-28 shrink-0">
                {format(new Date(nr.stay_date), 'MMM d, yyyy')}
              </span>
              {nr.pricing_rule_name ? (
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium uppercase tracking-wide">
                  {nr.pricing_rule_name}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground/60">Base rate</span>
              )}
            </div>
            <span className="text-[14px] font-semibold text-foreground">
              ৳{Number(nr.price).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-secondary/20 border-t border-border/30">
        <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">Room Subtotal</span>
        <span className="text-[15px] font-bold text-foreground">৳{rb.subtotal.toLocaleString()}</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HotelGuestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const { toast } = useToast()
  const [booking, setBooking] = useState<GuestDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/hotel-admin/guests/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success) setBooking(data.data)
        else toast({ title: 'Error', description: data.message, variant: 'destructive' })
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load guest', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [id, toast])

  if (loading) return <DetailSkeleton />

  if (!booking) {
    return (
      <div className="text-center py-24">
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
        <p className="text-base font-medium text-foreground mb-1">Guest not found</p>
        <p className="text-sm text-muted-foreground mb-6">This booking may not belong to your hotel.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/hotel/guests')}>
          ← Back to Guests
        </Button>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[booking.status]
  const StatusIcon = cfg.icon
  const n = nightCount(booking.check_in, booking.check_out)
  const grandTotal = booking.room_bookings.reduce((s, rb) => s + rb.subtotal, 0)

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
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{booking.guest.name}</h1>
            <Badge variant="outline" className={cn('gap-1.5 text-[12px] font-semibold px-2.5 py-1 uppercase tracking-wide', cfg.badge)}>
              <StatusIcon className="h-3.5 w-3.5" />
              {cfg.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{booking.booking_reference}</p>
        </div>

        <Button variant="outline" size="sm" className="gap-2 shrink-0" asChild>
          <Link href={`/dashboard/hotel/bookings/${booking.booking_reference}`}>
            <ExternalLink className="h-3.5 w-3.5" />
            View in Bookings
          </Link>
        </Button>
      </div>

      {/* ── Two-column: Guest + Stay ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Guest profile */}
        <div className="space-y-4">
          <Card className="border-border/50 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <User className="h-4 w-4" /> Guest
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16 border-2 border-border/50">
                  {booking.guest.image && (
                    <AvatarImage src={booking.guest.image} alt={booking.guest.name} className="object-cover" />
                  )}
                  <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-700">
                    {initials(booking.guest.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-foreground">{booking.guest.name}</p>
                  <p className="text-[12px] text-muted-foreground">{booking.guest.email}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <InfoRow label="Email"   value={booking.guest.email}   icon={Mail} />
                <InfoRow label="Phone"   value={booking.guest.phone ?? 'Not provided'} icon={Phone} />
                {booking.guest.dob && (
                  <InfoRow label="Date of Birth"
                    value={format(new Date(booking.guest.dob), 'MMM d, yyyy')}
                    icon={CalendarDays}
                  />
                )}
                <InfoRow label="Gender"  value={booking.guest.gender}  icon={User} />
                <InfoRow label="Country" value={booking.guest.country} icon={Globe} />
                <InfoRow label="Address" value={booking.guest.address} icon={MapPin} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Stay + Booking info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stay summary */}
          <Card className="border-border/50 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Stay
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Check-in',  value: format(new Date(booking.check_in), 'MMM d, yyyy') },
                  { label: 'Check-out', value: format(new Date(booking.check_out), 'MMM d, yyyy') },
                  { label: 'Nights',    value: n.toString() },
                  { label: 'Guests',    value: booking.guests.toString() },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">{label}</p>
                    <p className="text-[15px] font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              {booking.special_request && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Special Request</p>
                    <p className="text-sm text-foreground italic">{booking.special_request}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Booking info */}
          <Card className="border-border/50 bg-card/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <Hash className="h-4 w-4" /> Booking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Reference</p>
                  <p className="font-mono font-semibold text-foreground">{booking.booking_reference}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Status</p>
                  <Badge variant="outline" className={cn('gap-1 text-[11px] font-semibold uppercase tracking-wide', cfg.badge)}>
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Rooms</p>
                  <p className="font-semibold text-foreground">{booking.rooms_count}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Created</p>
                  <p className="text-foreground">{format(new Date(booking.created_at), 'MMM d, yyyy · h:mm a')}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Total</p>
                  <p className="text-[16px] font-bold text-foreground">৳{booking.total_price.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Rooms (full width) ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BedDouble className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Rooms ({booking.room_bookings.length})
          </h2>
        </div>
        <div className="space-y-3">
          {booking.room_bookings.map(rb => (
            <RoomBookingCard key={rb.id} rb={rb} />
          ))}
        </div>
      </div>

      {/* ── Pricing / nightly breakdown (full width) ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Pricing</h2>
        </div>
        <div className="space-y-3">
          {booking.room_bookings.map(rb => (
            <NightlyRateTable key={rb.id} rb={rb} />
          ))}
        </div>

        {/* Grand total */}
        {booking.room_bookings.length > 1 && (
          <div className="mt-3 rounded-xl border border-border/40 flex items-center justify-between px-5 py-4 bg-card/40">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Booking Total</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{booking.rooms_count} room{booking.rooms_count !== 1 ? 's' : ''} · {n} night{n !== 1 ? 's' : ''}</p>
            </div>
            <p className="text-[22px] font-bold text-foreground">৳{grandTotal.toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  )
}
