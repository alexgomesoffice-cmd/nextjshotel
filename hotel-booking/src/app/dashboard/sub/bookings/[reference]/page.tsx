'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  LogIn,
  LogOut,
  XCircle,
  UserX,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'

import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

type BookingStatus =
  | 'RESERVED'
  | 'BOOKED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'NO_SHOW'

interface BookingDetail {
  id: number
  booking_reference: string
  status: BookingStatus
  check_in: string
  check_out: string
  guests: number
  rooms_count: number
  total_price: number
  advance_amount: number
  special_request: string | null
  payment_method: string | null
  created_at: string
  reserved_until: string | null

  hotel: {
    id: number
    name: string
    city: {
      name: string
    } | null
    images: {
      image_url: string
    }[]
  }

  end_user: {
    id: number
    name: string
    email: string

    end_user_details: {
      phone: string | null
      nid_no: string | null
      passport: string | null
      address: string | null
      country: string | null
    } | null
  }

  room_bookings: {
    id: number
    price_per_night: number
    nights: number
    subtotal: number

    room_type: {
      id: number
      name: string
    }

    room_detail: {
      id: number
      room_number: string
      floor: number | null
      ac: boolean
    }
  }[]
}

const STATUS_CONFIG: Record<
  BookingStatus,
  {
    label: string
    badge: string
    icon: React.ElementType
  }
> = {
  RESERVED: {
    label: 'Reserved',
    badge: 'bg-amber-500/20 text-amber-700 border-amber-500/30',
    icon: Clock
  },

  BOOKED: {
    label: 'Confirmed',
    badge: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
    icon: CheckCircle2
  },

  CHECKED_IN: {
    label: 'Checked In',
    badge: 'bg-green-500/20 text-green-700 border-green-500/30',
    icon: LogIn
  },

  CHECKED_OUT: {
    label: 'Checked Out',
    badge: 'bg-purple-500/20 text-purple-700 border-purple-500/30',
    icon: LogOut
  },

  CANCELLED: {
    label: 'Cancelled',
    badge: 'bg-red-500/20 text-red-700 border-red-500/30',
    icon: XCircle
  },

  EXPIRED: {
    label: 'Expired',
    badge: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
    icon: AlertCircle
  },

  NO_SHOW: {
    label: 'No Show',
    badge: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
    icon: UserX
  }
}

export default function SubAdminBookingDetailPage() {
  const { reference } = useParams<{ reference: string }>()

  const router = useRouter()
  const { toast } = useToast()

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/hotel-admin/bookings/${reference}`, {
        credentials: 'include'
      })

      const data = await res.json()

      if (data.success) {
        setBooking(data.data)
      } else {
        toast({
          title: 'Error',
          description: data.message,
          variant: 'destructive'
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load booking',
        variant: 'destructive'
      })
    }
  }, [reference, toast])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      await reload()
      setLoading(false)
    })()
  }, [reload])

  async function performAction(action: string, label: string) {
    if (
      (action === 'cancel' || action === 'no_show') &&
      !confirm(`${label} this booking?`)
    ) {
      return
    }

    try {
      setActing(true)

      const res = await fetch(
        `/api/hotel-admin/bookings/${reference}/status`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action })
        }
      )

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Done',
          description: data.message,
          variant: 'success'
        })

        await reload()
      } else {
        toast({
          title: 'Error',
          description: data.message,
          variant: 'destructive'
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Action failed',
        variant: 'destructive'
      })
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-9 w-48" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton
                key={i}
                className="h-40 w-full rounded-2xl"
              />
            ))}
          </div>

          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />

        <h2 className="text-xl font-semibold">
          Booking not found
        </h2>

        <Link href="/dashboard/sub/bookings">
          <Button variant="link" className="mt-4">
            Back to bookings
          </Button>
        </Link>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[booking.status]
  const Icon = cfg.icon

  const nights = Math.ceil(
    (new Date(booking.check_out).getTime() -
      new Date(booking.check_in).getTime()) /
    86400000
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-3xl font-bold">
              {booking.booking_reference}
            </h1>

            <p className="text-sm text-muted-foreground">
              Booking details
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Icon className="h-5 w-5" />

          <Badge className={cfg.badge}>
            {cfg.label}
          </Badge>
        </div>
      </div>

      {/* Booking Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Guest Info */}
          <div className="glass-strong rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-lg">Guest Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{booking.end_user.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{booking.end_user.email}</p>
              </div>
              {booking.end_user.end_user_details?.phone && (
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{booking.end_user.end_user_details.phone}</p>
                </div>
              )}
              {booking.end_user.end_user_details?.nid_no && (
                <div>
                  <p className="text-muted-foreground">NID</p>
                  <p className="font-medium">{booking.end_user.end_user_details.nid_no}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stay Info */}
          <div className="glass-strong rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-lg">Stay Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Check In</p>
                <p className="font-medium">{format(new Date(booking.check_in), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Check Out</p>
                <p className="font-medium">{format(new Date(booking.check_out), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nights</p>
                <p className="font-medium">{nights}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Guests</p>
                <p className="font-medium">{booking.guests}</p>
              </div>
            </div>
          </div>

          {/* Rooms */}
          <div className="glass-strong rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-lg">Rooms</h2>
            {booking.room_bookings.map(rb => (
              <div key={rb.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{rb.room_type.name}</p>
                  <p className="text-sm text-muted-foreground">Room {rb.room_detail.room_number}{rb.room_detail.floor ? ` · Floor ${rb.room_detail.floor}` : ''}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">৳{rb.subtotal.toLocaleString()}</p>
                  <p className="text-muted-foreground">৳{rb.price_per_night.toLocaleString()} × {rb.nights}n</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Price & Actions */}
        <div className="space-y-4">
          <div className="glass-strong rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold">Payment</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">৳{booking.total_price.toLocaleString()}</span>
              </div>
              {booking.advance_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Advance Paid</span>
                  <span>৳{booking.advance_amount.toLocaleString()}</span>
                </div>
              )}
              {booking.payment_method && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span>{booking.payment_method}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Actions */}
          {(booking.status === 'RESERVED' || booking.status === 'BOOKED') && (
            <div className="glass-strong rounded-2xl p-5 space-y-2">
              <h2 className="font-semibold mb-3">Actions</h2>
              {booking.status === 'BOOKED' && (
                <Button
                  className="w-full gap-2"
                  disabled={acting}
                  onClick={() => performAction('check_in', 'Check in')}
                >
                  <LogIn className="h-4 w-4" /> Check In
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive"
                disabled={acting}
                onClick={() => performAction('cancel', 'Cancel')}
              >
                <XCircle className="h-4 w-4" /> Cancel Booking
              </Button>
            </div>
          )}

          {booking.status === 'CHECKED_IN' && (
            <div className="glass-strong rounded-2xl p-5 space-y-2">
              <h2 className="font-semibold mb-3">Actions</h2>
              <Button
                className="w-full gap-2"
                disabled={acting}
                onClick={() => performAction('check_out', 'Check out')}
              >
                <LogOut className="h-4 w-4" /> Check Out
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 text-orange-600"
                disabled={acting}
                onClick={() => performAction('no_show', 'No show')}
              >
                <UserX className="h-4 w-4" /> Mark No Show
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}