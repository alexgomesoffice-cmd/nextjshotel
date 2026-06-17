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
import { useToast } from '@/hooks/use-toast'
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
  RESERVED: { label: 'Reserved', badge: 'bg-amber-500/20  text-amber-700  border-amber-500/30', icon: Clock },
  BOOKED: { label: 'Confirmed', badge: 'bg-blue-500/20   text-blue-700   border-blue-500/30', icon: CheckCircle2 },
  CHECKED_IN: { label: 'Checked In', badge: 'bg-green-500/20  text-green-700  border-green-500/30', icon: LogIn },
  CHECKED_OUT: { label: 'Checked Out', badge: 'bg-purple-500/20 text-purple-700 border-purple-500/30', icon: LogOut },
  CANCELLED: { label: 'Cancelled', badge: 'bg-red-500/20    text-red-700    border-red-500/30', icon: XCircle },
  EXPIRED: { label: 'Expired', badge: 'bg-gray-500/20   text-gray-600   border-gray-500/30', icon: AlertCircle },
  NO_SHOW: { label: 'No Show', badge: 'bg-orange-500/20 text-orange-700 border-orange-500/30', icon: UserX },
}

export default function HotelAdminBookingDetailPage() {
  const { reference } = useParams<{ reference: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const reload = async () => {
    const res = await fetch(`/api/hotel-admin/bookings/${reference}`, { credentials: 'include' })
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
      const res = await fetch(`/api/hotel-admin/bookings/${reference}/status`, {
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
        <div className="lg:col-span-2 space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
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

  const cfg = STATUS_CONFIG[booking.status]
  const Icon = cfg.icon
  const n = Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000)
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
                    <p className="font-semibold">TK {rb.subtotal.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">TK {rb.price_per_night.toLocaleString()} × {rb.nights}n</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="glass-strong">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Banknote className="h-4 w-4 text-primary" /> Price Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>TK {(booking.total_price - svcFee).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span>TK{svcFee.toLocaleString()}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">TK {booking.total_price.toLocaleString()}</span></div>
              {booking.advance_amount > 0 && <div className="flex justify-between text-green-600"><span>Paid</span><span>TK {booking.advance_amount.toLocaleString()}</span></div>}
            </CardContent>
          </Card>

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