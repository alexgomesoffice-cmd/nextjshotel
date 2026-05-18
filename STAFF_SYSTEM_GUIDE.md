# Hotel Admin Staff System + Sub Admin Pages — Complete Guide
**Read entirely before writing any code.**

---

## PART A — ARCHITECTURE UNDERSTANDING

### How the role system works

```
HOTEL_ADMIN
  ├── Full access to /dashboard/hotel/* (all hotel management)
  ├── Can create / block / delete HOTEL_SUB_ADMIN accounts
  └── Owns hotel: uses hotel_id from JWT payload

HOTEL_SUB_ADMIN  
  ├── Limited access: /dashboard/sub/rooms, /dashboard/sub/bookings only
  ├── Cannot access: hotel details, images, amenities, bed types, room types, staff, settings, pricing
  ├── Uses SAME API routes as HOTEL_ADMIN where allowed (hotel-admin/* already accepts HOTEL_SUB_ADMIN)
  └── Same hotel_id as the HOTEL_ADMIN who created them
```

### Key insight about API routes
**The hotel-admin API routes already include HOTEL_SUB_ADMIN in requireAuth** where sub admins are allowed to operate:
- `GET /api/hotel-admin/rooms` → already allows `['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN']`
- `GET /api/hotel-admin/bookings` → already allows `['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN', 'SYSTEM_ADMIN']`
- `PATCH /api/hotel-admin/bookings/[reference]/status` → already allows `['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN', 'SYSTEM_ADMIN']`

**The `src/app/api/hotel-sub-admin/` folder is a MISTAKE.** It contains duplicate empty files that will never be needed because the hotel-admin routes already handle sub admins. All 6 files in that folder are 0 bytes and should be deleted.

### What sub admin dashboard pages should do
Sub admin pages at `/dashboard/sub/*` must call `/api/hotel-admin/*` endpoints — NOT `/api/hotel-sub-admin/*`.

---

## PART B — FILES TO DELETE

```
DELETE: src/app/api/hotel-sub-admin/bookings/route.ts
DELETE: src/app/api/hotel-sub-admin/bookings/[reference]/route.ts
DELETE: src/app/api/hotel-sub-admin/bookings/[reference]/status/route.ts
DELETE: src/app/api/hotel-sub-admin/room/route.ts
DELETE: src/app/api/hotel-sub-admin/room/[id]/route.ts
DELETE: src/app/api/hotel-sub-admin/room/[id]/images/route.ts
```

After deletion, the entire `src/app/api/hotel-sub-admin/` directory will be empty. Delete the directory too.

**Reason:** All these routes would just duplicate hotel-admin routes. Sub admins already have access to hotel-admin routes where appropriate. Having separate empty routes creates confusion.

---

## PART C — STAFF API ROUTES

All 4 files in `src/app/api/hotel-admin/staff/` are 0 bytes. Fill them.

---

### FILE 1: `src/app/api/hotel-admin/staff/route.ts`

```ts
// filepath: src/app/api/hotel-admin/staff/route.ts
// GET:  List all sub admins for this hotel
// POST: Create a new hotel sub admin account

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const createStaffSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN'])
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''

    const staff = await prisma.hotel_sub_admins.findMany({
      where: {
        hotel_id: payload.hotel_id,
        deleted_at: null,
        ...(search ? {
          OR: [
            { name:  { contains: search } },
            { email: { contains: search } },
          ],
        } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        is_blocked: true,
        last_login_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    })

    const serialized = staff.map(s => ({
      ...s,
      last_login_at: s.last_login_at?.toISOString() ?? null,
      created_at:    s.created_at.toISOString(),
    }))

    return NextResponse.json({ success: true, data: serialized })
  } catch (err) {
    console.error('[hotel-admin] GET /staff error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN'])
  if (error) return error

  try {
    const body = await req.json()
    const validation = createStaffSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = validation.data

    // Email must be unique across both admin tables
    const [existingHotelAdmin, existingSubAdmin, existingSysAdmin] = await Promise.all([
      prisma.hotel_admins.findUnique({    where: { email } }),
      prisma.hotel_sub_admins.findFirst({ where: { email, deleted_at: null } }),
      prisma.system_admins.findUnique({   where: { email } }),
    ])

    if (existingHotelAdmin || existingSubAdmin || existingSysAdmin) {
      return NextResponse.json(
        { success: false, message: 'This email is already in use' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const staff = await prisma.hotel_sub_admins.create({
      data: {
        hotel_id:   payload.hotel_id!,
        name,
        email,
        password:   hashedPassword,
        role_id:    2, // HOTEL_SUB_ADMIN
        created_by: payload.actor_id,
        is_active:  true,
        is_blocked: false,
      },
      select: {
        id: true, name: true, email: true,
        is_active: true, is_blocked: true, created_at: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: { ...staff, created_at: staff.created_at.toISOString() },
      message: 'Staff member created successfully',
    })
  } catch (err) {
    console.error('[hotel-admin] POST /staff error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
```

---

### FILE 2: `src/app/api/hotel-admin/staff/[id]/route.ts`

```ts
// filepath: src/app/api/hotel-admin/staff/[id]/route.ts
// PATCH: Update staff member name (email/password changes handled separately)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  name: z.string().min(2).optional(),
})

export async function PATCH(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN'])
  if (error) return error

  try {
    const { id } = await params
    const staffId = parseInt(id)
    if (isNaN(staffId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const staff = await prisma.hotel_sub_admins.findUnique({
      where: { id: staffId },
      select: { hotel_id: true, deleted_at: true },
    })

    if (!staff || staff.deleted_at || staff.hotel_id !== payload.hotel_id) {
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 })
    }

    const body = await req.json()
    const validation = updateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const updated = await prisma.hotel_sub_admins.update({
      where: { id: staffId },
      data:  { ...validation.data, updated_at: new Date() },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json({ success: true, data: updated, message: 'Updated successfully' })
  } catch (err) {
    console.error('[hotel-admin] PATCH /staff/[id] error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
```

---

### FILE 3: `src/app/api/hotel-admin/staff/[id]/block/route.ts`

```ts
// filepath: src/app/api/hotel-admin/staff/[id]/block/route.ts
// PATCH: Toggle is_blocked for a staff member

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN'])
  if (error) return error

  try {
    const { id } = await params
    const staffId = parseInt(id)
    if (isNaN(staffId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const staff = await prisma.hotel_sub_admins.findUnique({
      where: { id: staffId },
      select: { hotel_id: true, deleted_at: true, is_blocked: true, name: true },
    })

    if (!staff || staff.deleted_at || staff.hotel_id !== payload.hotel_id) {
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 })
    }

    const newBlockedState = !staff.is_blocked

    await prisma.hotel_sub_admins.update({
      where: { id: staffId },
      data:  { is_blocked: newBlockedState, updated_at: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: `${staff.name} has been ${newBlockedState ? 'blocked' : 'unblocked'}`,
    })
  } catch (err) {
    console.error('[hotel-admin] PATCH /staff/[id]/block error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
```

---

### FILE 4: `src/app/api/hotel-admin/staff/[id]/delete/route.ts`

```ts
// filepath: src/app/api/hotel-admin/staff/[id]/delete/route.ts
// DELETE: Soft-delete a staff member (sets deleted_at)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-middleware'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN'])
  if (error) return error

  try {
    const { id } = await params
    const staffId = parseInt(id)
    if (isNaN(staffId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })
    }

    const staff = await prisma.hotel_sub_admins.findUnique({
      where: { id: staffId },
      select: { hotel_id: true, deleted_at: true, name: true },
    })

    if (!staff || staff.deleted_at || staff.hotel_id !== payload.hotel_id) {
      return NextResponse.json({ success: false, message: 'Staff member not found' }, { status: 404 })
    }

    await prisma.hotel_sub_admins.update({
      where: { id: staffId },
      data:  { deleted_at: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: `${staff.name} has been removed`,
    })
  } catch (err) {
    console.error('[hotel-admin] DELETE /staff/[id]/delete error:', err)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
```

---

## PART D — HOTEL ADMIN STAFF PAGES

---

### FILE 5: `src/app/dashboard/hotel/staff/page.tsx`
**Action: REPLACE (currently 0 bytes)**

```tsx
// filepath: src/app/dashboard/hotel/staff/page.tsx
// Hotel Admin — Staff Management
// List sub admins, block/unblock, delete, search
// Inline "Create Staff" form (same pattern as system admins page)

'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, Plus, Search, Trash2, ShieldOff, ShieldCheck,
  Clock, CheckCircle2, XCircle, RefreshCw, Mail, Key,
} from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-hooks'
import { cn } from '@/lib/utils'

interface StaffMember {
  id: number
  name: string
  email: string
  is_active: boolean
  is_blocked: boolean
  last_login_at: string | null
  created_at: string
}

export default function StaffPage() {
  const { toast }  = useToast()
  const [staff, setStaff]       = useState<StaffMember[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [form, setForm]         = useState({ name: '', email: '', password: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      const res  = await fetch(`/api/hotel-admin/staff?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) setStaff(data.data)
      else toast({ title: 'Error', description: data.message, variant: 'destructive' })
    } catch {
      toast({ title: 'Error', description: 'Failed to load staff', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [search, toast])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    const errors: Record<string, string> = {}
    if (!form.name.trim() || form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters'
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.email = 'Invalid email address'
    if (!form.password || form.password.length < 6) errors.password = 'Password must be at least 6 characters'

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      setSubmitting(true)
      const res  = await fetch('/api/hotel-admin/staff', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Success', description: 'Staff member created', variant: 'success' })
        setForm({ name: '', email: '', password: '' })
        setFormErrors({})
        setShowForm(false)
        fetchStaff()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create staff', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Block / Unblock ────────────────────────────────────────────────────────

  const handleToggleBlock = async (member: StaffMember) => {
    try {
      setActionLoading(member.id)
      const res  = await fetch(`/api/hotel-admin/staff/${member.id}/block`, {
        method: 'PATCH', credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Done', description: data.message, variant: 'success' })
        fetchStaff()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Action failed', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (member: StaffMember) => {
    if (!confirm(`Remove ${member.name} from your team? This cannot be undone.`)) return
    try {
      setActionLoading(member.id)
      const res  = await fetch(`/api/hotel-admin/staff/${member.id}/delete`, {
        method: 'DELETE', credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Done', description: data.message, variant: 'success' })
        fetchStaff()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Delete failed', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  // ── Status badge helper ────────────────────────────────────────────────────

  function getStatusBadge(member: StaffMember) {
    if (member.is_blocked)  return { label: 'Blocked', badge: 'bg-red-500/20 text-red-700 border-red-500/30', icon: XCircle }
    if (!member.is_active)  return { label: 'Inactive', badge: 'bg-gray-500/20 text-gray-600 border-gray-500/30', icon: Clock }
    return { label: 'Active', badge: 'bg-green-500/20 text-green-700 border-green-500/30', icon: CheckCircle2 }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staff</h1>
          <p className="text-muted-foreground mt-1">
            Manage sub admin accounts for your hotel
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStaff} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setShowForm(!showForm); setFormErrors({}) }} className="gap-2">
            <Plus className="h-4 w-4" />
            {showForm ? 'Cancel' : 'Add Staff'}
          </Button>
        </div>
      </div>

      {/* Create form — inline, same pattern as system admins */}
      {showForm && (
        <Card className="glass-strong border-primary/30">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              New Sub Admin Account
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sub admins can manage rooms and bookings. They cannot access hotel settings, staff, amenities, or pricing.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-name" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Full Name
                </Label>
                <Input
                  id="staff-name"
                  placeholder="e.g., Ahmed Rahman"
                  value={form.name}
                  onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setFormErrors(p => ({ ...p, name: '' })) }}
                  className={cn(formErrors.name && 'border-destructive')}
                />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-email" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email Address
                </Label>
                <Input
                  id="staff-email"
                  type="email"
                  placeholder="staff@yourhotel.com"
                  value={form.email}
                  onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setFormErrors(p => ({ ...p, email: '' })) }}
                  className={cn(formErrors.email && 'border-destructive')}
                />
                {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="staff-password" className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" /> Temporary Password
                </Label>
                <Input
                  id="staff-password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setFormErrors(p => ({ ...p, password: '' })) }}
                  className={cn(formErrors.password && 'border-destructive')}
                />
                {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setFormErrors({}); setForm({ name: '', email: '', password: '' }) }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting} className="gap-2">
                {submitting ? 'Creating...' : 'Create Sub Admin'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className="glass-strong">
        <CardContent className="pt-4 pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card className="glass-strong overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No staff members yet</p>
                    <p className="text-sm mt-1">Create a sub admin account to get started</p>
                  </TableCell>
                </TableRow>
              ) : staff.map(member => {
                const s    = getStatusBadge(member)
                const Icon = s.icon
                const isActing = actionLoading === member.id

                return (
                  <TableRow key={member.id} className="hover:bg-secondary/30">
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <Badge variant="outline" className={cn('text-xs', s.badge)}>{s.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.last_login_at
                        ? format(new Date(member.last_login_at), 'MMM d, yyyy · h:mm a')
                        : 'Never logged in'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(member.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Block / Unblock */}
                        <Button
                          variant="ghost" size="sm"
                          className={cn(
                            "h-8 gap-1.5 text-xs",
                            member.is_blocked
                              ? "text-green-600 hover:bg-green-50 hover:text-green-700"
                              : "text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                          )}
                          disabled={isActing}
                          onClick={() => handleToggleBlock(member)}
                          title={member.is_blocked ? 'Unblock' : 'Block'}
                        >
                          {member.is_blocked
                            ? <><ShieldCheck className="h-3.5 w-3.5" /> Unblock</>
                            : <><ShieldOff   className="h-3.5 w-3.5" /> Block</>
                          }
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:bg-red-50 hover:text-red-700"
                          disabled={isActing}
                          onClick={() => handleDelete(member)}
                          title="Remove staff member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Access info card */}
      <Card className="glass-strong border-border/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Sub Admin Access</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sub admins can view and manage <strong>Rooms</strong> and <strong>Bookings</strong> only.
                They login via the same hotel login page and are redirected to <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">/dashboard/sub</code>.
                They cannot access hotel details, images, amenities, room types, staff, settings, or pricing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## PART E — SUB ADMIN DASHBOARD PAGES

Sub admin pages MUST call `/api/hotel-admin/*` — NOT `/api/hotel-sub-admin/*`.

---

### FILE 6: `src/app/dashboard/sub/rooms/page.tsx`
**Action: REPLACE (currently 0 bytes)**

```tsx
// filepath: src/app/dashboard/sub/rooms/page.tsx
// Hotel Sub Admin — Rooms page
// IMPORTANT: Calls /api/hotel-admin/rooms — sub admin is allowed by that route's requireAuth

'use client'

// This page is intentionally a redirect/wrapper to the hotel admin rooms page logic.
// Sub admin uses the SAME API as hotel admin for rooms.
// We duplicate the rooms page here because sub admin has a different layout (/dashboard/sub).

import { useEffect, useState, useCallback } from 'react'
import {
  Bed, Search, ChevronLeft, ChevronRight,
  CheckCircle2, Wrench, XCircle, RefreshCw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-hooks'
import { cn } from '@/lib/utils'

interface Room {
  id: number
  room_number: string
  floor: number | null
  price: number
  ac: boolean
  smoking_allowed: boolean
  pet_allowed: boolean
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE'
  room_type: { id: number; name: string }
}

const STATUS_CONFIG = {
  AVAILABLE:   { label: 'Available',   badge: 'bg-green-500/20 text-green-700 border-green-500/30', icon: CheckCircle2 },
  UNAVAILABLE: { label: 'Unavailable', badge: 'bg-gray-500/20  text-gray-600  border-gray-500/30',  icon: XCircle      },
  MAINTENANCE: { label: 'Maintenance', badge: 'bg-amber-500/20 text-amber-700 border-amber-500/30', icon: Wrench       },
}

export default function SubAdminRoomsPage() {
  const { toast } = useToast()
  const [rooms, setRooms]     = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('all')
  const [page, setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]     = useState(0)

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '15' })
      if (search) params.append('search', search)
      if (status !== 'all') params.append('status', status)

      // Sub admin uses HOTEL ADMIN API — it allows HOTEL_SUB_ADMIN role
      const res  = await fetch(`/api/hotel-admin/rooms?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setRooms(data.data.rooms)
        setTotalPages(data.data.pagination.totalPages)
        setTotal(data.data.pagination.total)
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load rooms', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, search, status, toast])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rooms</h1>
          <p className="text-muted-foreground mt-1">{total} rooms total</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRooms} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="glass-strong">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search room number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-10 h-10" />
            </div>
            <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="h-10"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-strong overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead>Room No.</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Price/Night</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => (<TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>))}</TableRow>
                ))
              ) : rooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Bed className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No rooms found</p>
                  </TableCell>
                </TableRow>
              ) : rooms.map(room => {
                const cfg  = STATUS_CONFIG[room.status]
                const Icon = cfg.icon
                return (
                  <TableRow key={room.id} className="hover:bg-secondary/30">
                    <TableCell className="font-semibold">{room.room_number}</TableCell>
                    <TableCell className="text-sm">{room.room_type.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{room.floor != null ? `Floor ${room.floor}` : '—'}</TableCell>
                    <TableCell className="font-medium">৳{Number(room.price).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        {room.ac && <span className="text-xs bg-blue-500/10 text-blue-700 border border-blue-500/20 rounded-full px-2 py-0.5">AC</span>}
                        {room.smoking_allowed && <span className="text-xs bg-secondary rounded-full px-2 py-0.5 text-muted-foreground">Smoking</span>}
                        {room.pet_allowed && <span className="text-xs bg-secondary rounded-full px-2 py-0.5 text-muted-foreground">Pets</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <Badge variant="outline" className={cn('text-xs', cfg.badge)}>{cfg.label}</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <Card className="glass-strong">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="gap-1"><ChevronLeft className="h-4 w-4" /> Previous</Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="gap-1">Next <ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

### FILE 7: `src/app/dashboard/sub/bookings/page.tsx`
**Action: REPLACE (currently 0 bytes)**

```tsx
// filepath: src/app/dashboard/sub/bookings/page.tsx
// Hotel Sub Admin — Bookings page
// IMPORTANT: Calls /api/hotel-admin/bookings — sub admin is allowed by that route's requireAuth

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Search, ChevronLeft, ChevronRight, Eye,
  CalendarDays, Users, Hash, LogIn, LogOut,
  XCircle, UserX, CheckCircle2, Clock, AlertCircle, RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-hooks'
import { cn } from '@/lib/utils'

type BookingStatus = 'RESERVED' | 'BOOKED' | 'EXPIRED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW'

interface Booking {
  id: number; booking_reference: string; status: BookingStatus
  check_in: string; check_out: string; guests: number; rooms_count: number
  total_price: number; created_at: string
  end_user: { id: number; name: string; email: string }
  room_bookings: { room_type: { name: string }; room_detail: { room_number: string } }[]
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; badge: string; icon: React.ElementType }> = {
  RESERVED:    { label: 'Reserved',    badge: 'bg-amber-500/20  text-amber-700  border-amber-500/30',  icon: Clock        },
  BOOKED:      { label: 'Confirmed',   badge: 'bg-blue-500/20   text-blue-700   border-blue-500/30',   icon: CheckCircle2 },
  CHECKED_IN:  { label: 'Checked In',  badge: 'bg-green-500/20  text-green-700  border-green-500/30',  icon: LogIn        },
  CHECKED_OUT: { label: 'Checked Out', badge: 'bg-purple-500/20 text-purple-700 border-purple-500/30', icon: LogOut       },
  CANCELLED:   { label: 'Cancelled',   badge: 'bg-red-500/20    text-red-700    border-red-500/30',    icon: XCircle      },
  EXPIRED:     { label: 'Expired',     badge: 'bg-gray-500/20   text-gray-600   border-gray-500/30',   icon: AlertCircle  },
  NO_SHOW:     { label: 'No Show',     badge: 'bg-orange-500/20 text-orange-700 border-orange-500/30', icon: UserX        },
}

export default function SubAdminBookingsPage() {
  const { toast } = useToast()
  const [bookings, setBookings]   = useState<Booking[]>([])
  const [loading, setLoading]     = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [status, setStatus]       = useState('all')
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]         = useState(0)

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString(), limit: '15' })
      if (search) params.append('search', search)
      if (status !== 'all') params.append('status', status)

      // Sub admin uses HOTEL ADMIN API — already allows HOTEL_SUB_ADMIN
      const res  = await fetch(`/api/hotel-admin/bookings?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setBookings(data.data.bookings)
        setTotalPages(data.data.pagination.totalPages)
        setTotal(data.data.pagination.total)
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load bookings', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, search, status, toast])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  async function performAction(reference: string, action: string) {
    if ((action === 'cancel' || action === 'no_show') && !confirm(`Perform ${action} on booking ${reference}?`)) return
    try {
      setActionLoading(reference + action)
      const res  = await fetch(`/api/hotel-admin/bookings/${reference}/status`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Done', description: data.message, variant: 'success' })
        fetchBookings()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Action failed', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bookings</h1>
          <p className="text-muted-foreground mt-1">{total} total bookings</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBookings} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="glass-strong">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Reference or guest..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-10 h-10" />
            </div>
            <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="h-10"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-strong overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Rooms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}</TableRow>
                ))
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <Hash className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No bookings found</p>
                  </TableCell>
                </TableRow>
              ) : bookings.map(booking => {
                const cfg   = STATUS_CONFIG[booking.status]
                const Icon  = cfg.icon
                const n     = Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000)
                const rooms = [...new Set(booking.room_bookings.map(rb => rb.room_type.name))].join(', ')
                const isActing = actionLoading?.startsWith(booking.booking_reference)

                return (
                  <TableRow key={booking.id} className="hover:bg-secondary/30">
                    <TableCell><span className="font-mono text-xs font-medium">{booking.booking_reference}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{booking.end_user.name}</p>
                          <p className="text-xs text-muted-foreground">{booking.end_user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{format(new Date(booking.check_in), 'MMM d')} – {format(new Date(booking.check_out), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-muted-foreground">{n} night{n !== 1 ? 's' : ''} · {booking.guests} guest{booking.guests !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground max-w-28 truncate">{rooms || '—'}</p>
                      <p className="text-xs text-muted-foreground">{booking.rooms_count} room{booking.rooms_count !== 1 ? 's' : ''}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <Badge variant="outline" className={cn('text-xs', cfg.badge)}>{cfg.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/hotel/bookings/${booking.booking_reference}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View detail"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {booking.status === 'BOOKED' && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:bg-green-50" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'check_in')} title="Check in"><LogIn className="h-4 w-4" /></Button>
                        )}
                        {booking.status === 'CHECKED_IN' && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'check_out')} title="Check out"><LogOut className="h-4 w-4" /></Button>
                        )}
                        {booking.status === 'BOOKED' && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'no_show')} title="No Show"><UserX className="h-4 w-4" /></Button>
                        )}
                        {['RESERVED', 'BOOKED', 'CHECKED_IN'].includes(booking.status) && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-red-50" disabled={!!isActing} onClick={() => performAction(booking.booking_reference, 'cancel')} title="Cancel"><XCircle className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 && (
        <Card className="glass-strong">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="gap-1"><ChevronLeft className="h-4 w-4" /> Previous</Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="gap-1">Next <ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

---

## PART F — COMPLETE ACTION LIST (In Order)

```
1.  DELETE  src/app/api/hotel-sub-admin/bookings/route.ts
2.  DELETE  src/app/api/hotel-sub-admin/bookings/[reference]/route.ts
3.  DELETE  src/app/api/hotel-sub-admin/bookings/[reference]/status/route.ts
4.  DELETE  src/app/api/hotel-sub-admin/room/route.ts
5.  DELETE  src/app/api/hotel-sub-admin/room/[id]/route.ts
6.  DELETE  src/app/api/hotel-sub-admin/room/[id]/images/route.ts
7.  DELETE  the now-empty src/app/api/hotel-sub-admin/ directory
8.  REPLACE src/app/api/hotel-admin/staff/route.ts           ← GET + POST
9.  REPLACE src/app/api/hotel-admin/staff/[id]/route.ts      ← PATCH (update name)
10. REPLACE src/app/api/hotel-admin/staff/[id]/block/route.ts ← PATCH toggle block
11. REPLACE src/app/api/hotel-admin/staff/[id]/delete/route.ts ← DELETE soft
12. REPLACE src/app/dashboard/hotel/staff/page.tsx            ← Full staff list + create form
13. REPLACE src/app/dashboard/sub/rooms/page.tsx              ← Sub admin rooms (calls hotel-admin API)
14. REPLACE src/app/dashboard/sub/bookings/page.tsx           ← Sub admin bookings (calls hotel-admin API)
```

---

## PART G — DO NOT TOUCH

```
src/middleware.ts                              ✅ Correct — /dashboard/sub → HOTEL_SUB_ADMIN
src/lib/auth-middleware.ts                     ✅ Correct
src/app/api/auth/hotel/login/route.ts          ✅ Correct — handles both HOTEL_ADMIN and HOTEL_SUB_ADMIN
src/components/layout/hotel-sub-admin-layout.tsx ✅ Correct
src/app/dashboard/sub/layout.tsx               ✅ Correct — wraps with HotelSubAdminLayout
src/app/api/hotel-admin/rooms/route.ts         ✅ Already allows HOTEL_SUB_ADMIN
src/app/api/hotel-admin/bookings/route.ts      ✅ Already allows HOTEL_SUB_ADMIN
src/app/api/hotel-admin/bookings/[reference]/status/route.ts ✅ Already allows HOTEL_SUB_ADMIN
src/app/dashboard/hotel/staff/new/page.tsx     ✅ Keep — can redirect to staff page or be unused
```

---

## PART H — SUB ADMIN BOOKING DETAIL PAGE NOTE

The sub admin booking list page links to `/dashboard/hotel/bookings/${reference}` for the detail view.
This is intentional — the hotel admin booking detail page is accessible to sub admins (middleware for
`/dashboard/hotel/*` only allows `HOTEL_ADMIN`, so this needs one small change).

**Fix in `src/middleware.ts`:**

```ts
// CHANGE this line:
'/dashboard/hotel':  ['HOTEL_ADMIN'],

// TO:
'/dashboard/hotel':  ['HOTEL_ADMIN', 'HOTEL_SUB_ADMIN'],
```

Wait — this would give sub admins access to ALL hotel admin pages.

**Better approach:** Keep the link pointing to a sub admin booking detail page instead:
In `SubAdminBookingsPage`, change the View link:
```tsx
href={`/dashboard/sub/bookings/${booking.booking_reference}`}
```

And create `src/app/dashboard/sub/bookings/[reference]/page.tsx` that is identical to the hotel admin booking detail page but under the sub dashboard. Just copy the hotel admin booking detail page content.
```
COPY: src/app/dashboard/hotel/bookings/[reference]/page.tsx
  TO: src/app/dashboard/sub/bookings/[reference]/page.tsx
  CHANGE the "Back" link to go to /dashboard/sub/bookings
  CHANGE: router.back() → router.push('/dashboard/sub/bookings')
```
