'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  User, Mail, Phone, MapPin, Calendar, Shield, Edit2, Save, X,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-hooks'

interface UserDetail {
  dob: string | null
  gender: string | null
  phone: string | null
  address: string | null
  country: string | null
  nid_no: string | null
  passport: string | null
  emergency_contact: string | null
}

interface UserProfile {
  id: number
  name: string
  email: string
  email_verified: boolean
  created_at: string
  detail: UserDetail | null
  images: { id: number; image_url: string }[]
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Edit form state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    dob: '',
    gender: '',
    address: '',
    country: 'Bangladesh',
    nid_no: '',
    passport: '',
    emergency_contact: '',
  })

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/user/profile', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        const p: UserProfile = data.data
        setProfile(p)
        setForm({
          name: p.name || '',
          phone: p.detail?.phone || '',
          dob: p.detail?.dob ? new Date(p.detail.dob).toISOString().split('T')[0] : '',
          gender: p.detail?.gender || '',
          address: p.detail?.address || '',
          country: p.detail?.country || 'Bangladesh',
          nid_no: p.detail?.nid_no || '',
          passport: p.detail?.passport || '',
          emergency_contact: p.detail?.emergency_contact || '',
        })
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || undefined,
          detail: {
            phone: form.phone || null,
            dob: form.dob || null,
            gender: form.gender || null,
            address: form.address || null,
            country: form.country || null,
            nid_no: form.nid_no || null,
            passport: form.passport || null,
            emergency_contact: form.emergency_contact || null,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Saved', description: 'Profile updated successfully', variant: 'success' })
        setEditing(false)
        await fetchProfile()
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save profile', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (profile) {
      setForm({
        name: profile.name || '',
        phone: profile.detail?.phone || '',
        dob: profile.detail?.dob ? new Date(profile.detail.dob).toISOString().split('T')[0] : '',
        gender: profile.detail?.gender || '',
        address: profile.detail?.address || '',
        country: profile.detail?.country || 'Bangladesh',
        nid_no: profile.detail?.nid_no || '',
        passport: profile.detail?.passport || '',
        emergency_contact: profile.detail?.emergency_contact || '',
      })
    }
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card className="glass-strong"><CardContent className="pt-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent></Card>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information</p>
        </div>
        {!editing ? (
          <Button variant="outline" className="gap-2" onClick={() => setEditing(true)}>
            <Edit2 className="h-4 w-4" /> Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleCancelEdit} disabled={saving}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button className="gap-2" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Account Info Card */}
      <Card className="glass-strong">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" /> Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary text-2xl font-bold">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{profile.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{profile.email}</span>
                {profile.email_verified ? (
                  <Badge variant="outline" className="bg-green-500/20 text-green-700 border-green-500/30 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-500/30 text-xs">
                    Unverified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Member since {new Date(profile.created_at).toLocaleDateString('en-BD', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Details Card */}
      <Card className="glass-strong">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" /> Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Full Name</Label>
              {editing ? (
                <Input id="p-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              ) : (
                <p className="text-sm font-medium py-2">{profile.name || '—'}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="p-phone" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Phone
              </Label>
              {editing ? (
                <Input id="p-phone" placeholder="+880..." value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              ) : (
                <p className="text-sm font-medium py-2">{profile.detail?.phone || '—'}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <Label htmlFor="p-dob" className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Date of Birth
              </Label>
              {editing ? (
                <Input id="p-dob" type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} />
              ) : (
                <p className="text-sm font-medium py-2">
                  {profile.detail?.dob ? new Date(profile.detail.dob).toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </p>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <Label>Gender</Label>
              {editing ? (
                <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium py-2">{profile.detail?.gender || '—'}</p>
              )}
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <Label htmlFor="p-country" className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Country
              </Label>
              {editing ? (
                <Input id="p-country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
              ) : (
                <p className="text-sm font-medium py-2">{profile.detail?.country || 'Bangladesh'}</p>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="space-y-1.5">
              <Label htmlFor="p-emergency">Emergency Contact</Label>
              {editing ? (
                <Input id="p-emergency" placeholder="Name or phone" value={form.emergency_contact} onChange={(e) => setForm((f) => ({ ...f, emergency_contact: e.target.value }))} />
              ) : (
                <p className="text-sm font-medium py-2">{profile.detail?.emergency_contact || '—'}</p>
              )}
            </div>

            {/* Address — full width */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="p-address">Address</Label>
              {editing ? (
                <Input id="p-address" placeholder="Your address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              ) : (
                <p className="text-sm font-medium py-2">{profile.detail?.address || '—'}</p>
              )}
            </div>
          </div>

          <Separator className="my-5" />

          {/* ID Documents */}
          <div>
            <p className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Identity Documents
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="p-nid">NID Number</Label>
                {editing ? (
                  <Input id="p-nid" placeholder="National ID" value={form.nid_no} onChange={(e) => setForm((f) => ({ ...f, nid_no: e.target.value }))} />
                ) : (
                  <p className="text-sm font-medium py-2">{profile.detail?.nid_no || '—'}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-passport">Passport Number</Label>
                {editing ? (
                  <Input id="p-passport" placeholder="Passport number" value={form.passport} onChange={(e) => setForm((f) => ({ ...f, passport: e.target.value }))} />
                ) : (
                  <p className="text-sm font-medium py-2">{profile.detail?.passport || '—'}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
