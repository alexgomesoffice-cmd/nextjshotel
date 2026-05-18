'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Trash2, Search, UserPlus, ShieldCheck, Lock, Unlock } from 'lucide-react'
import { useToast } from '@/hooks/use-hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface StaffMember {
  id: number
  name: string
  email: string
  is_active: boolean
  is_blocked: boolean
  last_login_at: string | null
  created_at: string
}

export default function HotelStaffPage() {
  const { toast } = useToast()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/hotel-admin/staff?${params.toString()}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setStaff(data.data)
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Unable to load staff members', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => {
    const loadStaff = async () => {
      await fetchStaff()
    }

    void loadStaff()
  }, [fetchStaff])

  const filteredStaff = useMemo(() => {
    if (!search) return staff
    return staff.filter(member =>
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase())
    )
  }, [search, staff])

  const refresh = () => fetchStaff()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name || !email || !password) {
      toast({ title: 'Validation', description: 'All fields are required' })
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/hotel-admin/staff', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: data.message, variant: 'success' })
        setName('')
        setEmail('')
        setPassword('')
        fetchStaff()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create staff member', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleBlock = async (id: number) => {
    try {
      const res = await fetch(`/api/hotel-admin/staff/${id}/block`, {
        method: 'PATCH', credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Updated', description: data.message, variant: 'success' })
        fetchStaff()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Action failed', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this staff member?')) return
    try {
      const res = await fetch(`/api/hotel-admin/staff/${id}/delete`, {
        method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Deleted', description: data.message, variant: 'success' })
        fetchStaff()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete staff', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hotel Staff</h1>
          <p className="text-muted-foreground mt-1">Create, block, and manage hotel sub-admins.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-sm"
          />
          <Button onClick={refresh} className="gap-2">
            <Search className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="glass-strong">
        <CardHeader>
          <CardTitle>Add Sub-Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <Input placeholder="Full name" value={name} onChange={(event) => setName(event.target.value)} />
            <Input placeholder="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" disabled={submitting} className="gap-2">
                <UserPlus className="h-4 w-4" /> Create Staff
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-strong overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 5 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}><div className="h-4 rounded bg-slate-200/70" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No staff members found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map(member => (
                  <TableRow key={member.id} className="hover:bg-secondary/30">
                    <TableCell>{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge className="gap-1" variant={member.is_blocked ? 'destructive' : 'secondary'}>
                        {member.is_blocked ? <Lock className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />} 
                        {member.is_blocked ? 'Blocked' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>{member.last_login_at ?? 'Never'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleToggleBlock(member.id)} className="gap-2">
                        {member.is_blocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {member.is_blocked ? 'Unblock' : 'Block'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(member.id)} className="gap-2">
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </TableCell>
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
