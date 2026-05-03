'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, Search, ShieldBan, ShieldCheck, ChevronLeft, ChevronRight,
  MailCheck, MailX, Eye, Ban,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-hooks'

interface EndUser {
  id: number
  name: string
  email: string
  is_active: boolean
  is_blocked: boolean
  email_verified: boolean
  last_login_at: string | null
  created_at: string
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<EndUser[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1, limit: 10, total: 0, totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [blockLoading, setBlockLoading] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [blockedFilter, setBlockedFilter] = useState<'all' | 'true' | 'false'>('all')
  const { toast } = useToast()

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (search) params.append('search', search)
      if (blockedFilter !== 'all') params.append('is_blocked', blockedFilter)

      const res = await fetch(`/api/system-admin/users?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setUsers(data.data.users)
        setPagination(data.data.pagination)
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, blockedFilter, toast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleToggleBlock = async (userId: number, currentlyBlocked: boolean) => {
    try {
      setBlockLoading(userId)
      const res = await fetch(`/api/system-admin/users/${userId}/block`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_blocked: !currentlyBlocked }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: data.message, variant: 'success' })
        await fetchUsers()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' })
    } finally {
      setBlockLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">End Users</h1>
          <p className="text-muted-foreground mt-1">Manage registered platform users</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-4 py-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{pagination.total} total users</span>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-strong">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Select value={blockedFilter} onValueChange={(v: 'all' | 'true' | 'false') => {
              setBlockedFilter(v)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="false">Active Only</SelectItem>
                <SelectItem value="true">Blocked Only</SelectItem>
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
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-secondary/50">
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      {user.email_verified ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm">
                          <MailCheck className="h-3.5 w-3.5" /> Verified
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                          <MailX className="h-3.5 w-3.5" /> Unverified
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.is_blocked
                            ? 'bg-red-500/20 text-red-700 border-red-500/30'
                            : 'bg-green-500/20 text-green-700 border-green-500/30'
                        }
                      >
                        {user.is_blocked ? 'Blocked' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title={user.is_blocked ? 'Unblock user' : 'Block user'}
                          onClick={() => handleToggleBlock(user.id, user.is_blocked)}
                          disabled={blockLoading === user.id}
                          className={
                            user.is_blocked
                              ? 'h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50'
                              : 'h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50'
                          }
                        >
                          {user.is_blocked ? <ShieldCheck className="h-4 w-4" /> : <ShieldBan className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View user">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
                Page {pagination.page} of {pagination.totalPages} • {pagination.total} total
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
