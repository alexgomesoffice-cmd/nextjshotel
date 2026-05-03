'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Shield, Plus, Search, Trash2, ChevronLeft, ChevronRight,
  UserCheck, CheckCircle2, Clock, X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-hooks'

interface SystemAdmin {
  id: number
  name: string
  email: string
  is_active: boolean
  is_blocked: boolean
  created_at: string
  last_login_at: string | null
  creator: { name: string } | null
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<SystemAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  // Create admin form state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/system-admin/admins', { credentials: 'include' })
      const data = await res.json()
      if (data.success) setAdmins(data.data)
      else toast({ title: 'Error', description: data.message, variant: 'destructive' })
    } catch {
      toast({ title: 'Error', description: 'Failed to load admins', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAdmins() }, [fetchAdmins])

  const filtered = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  )

  const validate = () => {
    const errors: Record<string, string> = {}
    if (!form.name.trim() || form.name.length < 2) errors.name = 'Name must be at least 2 characters'
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.email = 'Enter a valid email'
    if (!form.password || form.password.length < 6) errors.password = 'Password must be at least 6 characters'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      setSubmitting(true)
      const res = await fetch('/api/system-admin/admins', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'System admin created', variant: 'success' })
        setForm({ name: '', email: '', password: '' })
        setShowForm(false)
        await fetchAdmins()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create admin', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Admins</h1>
          <p className="text-muted-foreground mt-1">Manage platform administrators</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Admin'}
        </Button>
      </div>

      {/* Create Admin Form */}
      {showForm && (
        <Card className="glass-strong animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" /> Create System Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Admin name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={formErrors.name ? 'border-destructive' : ''}
                />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={formErrors.email ? 'border-destructive' : ''}
                />
                {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
              </div>
              <div className="space-y-1">
                <Label>Password <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className={formErrors.password ? 'border-destructive' : ''}
                />
                {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
              </div>
              <div className="md:col-span-3 flex justify-end">
                <Button type="submit" disabled={submitting} className="gap-2 min-w-36">
                  {submitting ? 'Creating...' : 'Create Admin'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className="glass-strong">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search admins by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
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
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    {search ? 'No admins match your search' : 'No system admins found'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((admin) => (
                  <TableRow key={admin.id} className="hover:bg-secondary/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{admin.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{admin.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          admin.is_blocked
                            ? 'bg-red-500/20 text-red-700 border-red-500/30'
                            : admin.is_active
                            ? 'bg-green-500/20 text-green-700 border-green-500/30'
                            : 'bg-gray-500/20 text-gray-600 border-gray-500/30'
                        }
                      >
                        {admin.is_blocked ? 'Blocked' : admin.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {admin.creator ? (
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" /> {admin.creator.name}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Seeded
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {admin.last_login_at ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(admin.last_login_at).toLocaleDateString()}
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(admin.created_at).toLocaleDateString()}
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