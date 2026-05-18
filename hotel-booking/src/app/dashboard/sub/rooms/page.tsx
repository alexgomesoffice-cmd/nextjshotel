'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Bed, CheckCircle2, AlertCircle, Wrench } from 'lucide-react'
import { useToast } from '@/hooks/use-hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface Room {
  id: number
  room_number: string
  floor: number
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE'
  price: string
  room_type: { name: string }
}

export default function SubAdminRoomsPage() {
  const { toast } = useToast()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status !== 'ALL') params.set('status', status)
      const res = await fetch(`/api/hotel-admin/rooms?${params.toString()}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setRooms(Array.isArray(data.data) ? data.data : data.data.rooms)
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Could not load room inventory', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [search, status, toast])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  const filteredRooms = useMemo(() => {
    return rooms.filter(room =>
      room.room_number.toLowerCase().includes(search.toLowerCase()) &&
      (status === 'ALL' || room.status === status)
    )
  }, [rooms, search, status])

  const getStatusBadge = (roomStatus: Room['status']) => {
    switch (roomStatus) {
      case 'AVAILABLE': return <Badge className="gap-1 bg-green-500/10 text-green-700 border-green-500/20">Available</Badge>
      case 'UNAVAILABLE': return <Badge className="gap-1 bg-red-500/10 text-red-700 border-red-500/20">Occupied</Badge>
      case 'MAINTENANCE': return <Badge className="gap-1 bg-amber-500/10 text-amber-700 border-amber-500/20">Maintenance</Badge>
      default: return <Badge>Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assigned Rooms</h1>
          <p className="text-muted-foreground mt-1">View room assignments and availability for your hotel.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <Input
            placeholder="Search room number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-[220px]"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="ALL">All statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="UNAVAILABLE">Occupied</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
          <Button onClick={fetchRooms} className="gap-2">
            <Search className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="glass-strong overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 5 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}><div className="h-4 w-full rounded bg-slate-200/70" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredRooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No rooms found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRooms.map(room => (
                  <TableRow key={room.id} className="hover:bg-secondary/30">
                    <TableCell>{room.room_number}</TableCell>
                    <TableCell>{room.room_type.name}</TableCell>
                    <TableCell>{room.floor}</TableCell>
                    <TableCell>{getStatusBadge(room.status)}</TableCell>
                    <TableCell className="text-right">৳{Number(room.price).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
