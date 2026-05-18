'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, CalendarDays, Users, Hash, RefreshCw, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-hooks'

interface Booking {
  id: number
  booking_reference: string
  status: string
  check_in: string
  check_out: string
  guests: number
  total_price: number
  end_user: { name: string; email: string }
  room_bookings: { room_type: { name: string } }[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const STATUS_LABELS: Record<string, { label: string; style: string }> = {
  RESERVED: { label: 'Reserved', style: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  BOOKED: { label: 'Confirmed', style: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  CHECKED_IN: { label: 'Checked In', style: 'bg-green-500/10 text-green-700 border-green-500/20' },
  CHECKED_OUT: { label: 'Checked Out', style: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  CANCELLED: { label: 'Cancelled', style: 'bg-red-500/10 text-red-700 border-red-500/20' },
  EXPIRED: { label: 'Expired', style: 'bg-slate-500/10 text-slate-700 border-slate-500/20' },
  NO_SHOW: { label: 'No Show', style: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
}

function statusBadge(status: string) {
  const config = STATUS_LABELS[status] ?? { label: status, style: 'bg-gray-100 text-gray-700' }
  return <Badge className={config.style}>{config.label}</Badge>
}

export default function SubAdminBookingsPage() {
  const { toast } = useToast()

  const [bookings, setBookings] = useState<Booking[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: pagination.page.toString(), limit: pagination.limit.toString() })
      if (search) params.set('search', search)
      if (status !== 'all') params.set('status', status)

      const res = await fetch(`/api/hotel-admin/bookings?${params.toString()}`, { credentials: 'include' })
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
  }, [pagination.page, pagination.limit, search, status, toast])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const nextPage = () => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))
  const prevPage = () => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))
  const resetPage = () => setPagination(prev => ({ ...prev, page: 1 }))

  useEffect(() => {
    resetPage()
  }, [search, status])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bookings</h1>
          <p className="text-muted-foreground mt-1">View bookings assigned to your hotel.</p>
        </div>
        <Button variant="outline" onClick={fetchBookings} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="glass-strong">
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search reference or guest" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => { setSearch(''); setStatus('all'); resetPage() }}>Clear</Button>
            <span className="text-sm text-muted-foreground">{pagination.total} bookings</span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-strong overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 6 }).map((__ , cellIndex) => (
                      <TableCell key={cellIndex}><div className="h-4 w-full rounded bg-slate-200/70" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No bookings found.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map(booking => (
                  <TableRow key={booking.id} className="hover:bg-secondary/30">
                    <TableCell>{booking.booking_reference}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{booking.end_user.name}</div>
                      <div className="text-xs text-muted-foreground">{booking.end_user.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{format(new Date(booking.check_in), 'MMM d')} – {format(new Date(booking.check_out), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-muted-foreground">{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</div>
                    </TableCell>
                    <TableCell>{statusBadge(booking.status)}</TableCell>
                    <TableCell className="text-right">৳{booking.total_price.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/hotel/bookings/${booking.booking_reference}`}>
                        <Button size="sm" variant="outline" className="gap-2">
                          <Eye className="h-4 w-4" /> View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={pagination.page <= 1} onClick={prevPage}>Previous</Button>
        <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
        <Button variant="outline" disabled={pagination.page >= pagination.totalPages} onClick={nextPage}>Next</Button>
      </div>
    </div>
  )
}
