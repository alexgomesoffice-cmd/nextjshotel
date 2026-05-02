// filepath: src/app/dashboard/system/hotels/page.tsx
// UPDATED: Shows unsuspend button when hotel is SUSPENDED

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, Search,
  Eye, Edit, Trash2,
  CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight,
  Star, MapPin, User,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-hooks'
import { cn } from '@/lib/utils'

interface Hotel {
  id: number
  name: string
  slug: string
  city?: {
    id: number
    name: string
  } | null
  hotelType?: {
    id: number
    name: string
  } | null
  starRating?: number
  approval_status: 'DRAFT' | 'PUBLISHED' | 'SUSPENDED'
  createdAt: string
  hotelAdmin?: {
    id: number
    name: string
    email: string
  } | null
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

const statusConfig = {
  DRAFT: {
    label: 'Draft',
    badge: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
    icon: Clock,
  },
  PUBLISHED: {
    label: 'Published',
    badge: 'bg-green-500/20 text-green-700 border-green-500/30',
    icon: CheckCircle2,
  },
  SUSPENDED: {
    label: 'Suspended',
    badge: 'bg-red-500/20 text-red-700 border-red-500/30',
    icon: AlertCircle,
  },
}

export default function HotelsListPage() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null)
  const [suspendLoading, setSuspendLoading] = useState<number | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'DRAFT' | 'PUBLISHED' | 'SUSPENDED'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'status'>('created')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { toast } = useToast()

  // Fetch hotels
  const fetchHotels = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        order: sortOrder,
      })

      if (search) params.append('search', search)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const res = await fetch(`/api/system-admin/hotels?${params}`, {
        credentials: 'include',
      })
      const data = await res.json()

      if (data.success) {
        setHotels(data.data.hotels)
        setPagination(data.data.pagination)
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to load hotels',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to fetch hotels:', error)
      toast({
        title: 'Error',
        description: 'Failed to load hotels',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, statusFilter, sortBy, sortOrder, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHotels()
  }, [fetchHotels])

  // Handle search
  const handleSearch = (value: string) => {
    setSearch(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  // Handle delete hotel
  const handleDeleteHotel = async (hotelId: number) => {
    if (!confirm('Are you sure you want to delete this hotel?')) return

    try {
      setDeleteLoading(hotelId)
      const res = await fetch(`/api/system-admin/hotels/${hotelId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Hotel deleted successfully',
          variant: 'success',
        })
        await fetchHotels()
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to delete hotel',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to delete hotel:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete hotel',
        variant: 'destructive',
      })
    } finally {
      setDeleteLoading(null)
    }
  }

  // Handle suspend/unsuspend hotel - TOGGLES between SUSPENDED and PUBLISHED
  const handleToggleSuspend = async (hotelId: number) => {
    try {
      setSuspendLoading(hotelId)
      const res = await fetch(`/api/system-admin/hotels/${hotelId}/suspend`, {
        method: 'PATCH',
        credentials: 'include',
      })
      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message,
          variant: 'success',
        })
        await fetchHotels()
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to toggle hotel status',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to toggle suspend status:', error)
      toast({
        title: 'Error',
        description: 'Failed to toggle hotel status',
        variant: 'destructive',
      })
    } finally {
      setSuspendLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hotels</h1>
          <p className="text-muted-foreground mt-1">Manage all registered hotels</p>
        </div>
        <Link href="/dashboard/system/hotels/new">
          <Button className="gap-2">
            <Building2 className="h-4 w-4" />
            Add Hotel
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="glass-strong">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or city..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(v: 'all' | 'DRAFT' | 'PUBLISHED' | 'SUSPENDED') => {
                setStatusFilter(v)
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(v) => {
                const [by, order] = v.split('-')
                setSortBy(by as 'name' | 'created' | 'status')
                setSortOrder(order as 'asc' | 'desc')
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created-desc">Newest</SelectItem>
                <SelectItem value="created-asc">Oldest</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="status-desc">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-strong overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead>Hotel Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : hotels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">No hotels found</p>
                  </TableCell>
                </TableRow>
              ) : (
                hotels.map((hotel) => {
                  const statusConfig_ = statusConfig[hotel.approval_status]
                  const StatusIcon = statusConfig_.icon
                  const isSuspended = hotel.approval_status === 'SUSPENDED'

                  return (
                    <TableRow key={hotel.id} className="hover:bg-secondary/50">
                      <TableCell className="font-medium">{hotel.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {hotel.city?.name || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{hotel.hotelType?.name || 'N/A'}</TableCell>
                      <TableCell>
                        {hotel.starRating ? (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: hotel.starRating }).map((_, i) => (
                              <Star
                                key={i}
                                className="h-3 w-3 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className="h-3.5 w-3.5" />
                          <Badge variant="outline" className={statusConfig_.badge}>
                            {statusConfig_.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>{hotel.hotelAdmin?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(hotel.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/system/hotels/${hotel.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/system/hotels/${hotel.id}/edit`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>

                          {/* Suspend/Unsuspend Button - TOGGLES */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title={isSuspended ? 'Unsuspend' : 'Suspend'}
                            onClick={() => handleToggleSuspend(hotel.id)}
                            disabled={suspendLoading === hotel.id}
                            className={cn(
                              'h-8 w-8 p-0',
                              isSuspended
                                ? 'text-green-600 hover:text-green-700 hover:bg-green-50' // Green when suspended (to unsuspend)
                                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' // Amber when active (to suspend)
                            )}
                          >
                            <AlertCircle className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete"
                            onClick={() => handleDeleteHotel(hotel.id)}
                            disabled={deleteLoading === hotel.id}
                            className="h-8 w-8 p-0 text-destructive hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <Card className="glass-strong">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} •{' '}
                {pagination.total} total hotels
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}