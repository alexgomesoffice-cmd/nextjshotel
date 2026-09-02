'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit2,
  Save,
  X,
  CheckCircle2,
  CreditCard,
  HeartPulse,
  Globe2,
  LockKeyhole,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

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

function getInitials(name: string) {
  if (!name) return 'U'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const { toast } = useToast()

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

  const populateForm = (p: UserProfile) => {
    setForm({
      name: p.name || '',
      phone: p.detail?.phone || '',
      dob: p.detail?.dob
        ? new Date(p.detail.dob).toISOString().split('T')[0]
        : '',
      gender: p.detail?.gender || '',
      address: p.detail?.address || '',
      country: p.detail?.country || 'Bangladesh',
      nid_no: p.detail?.nid_no || '',
      passport: p.detail?.passport || '',
      emergency_contact: p.detail?.emergency_contact || '',
    })
  }

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)

      const res = await fetch('/api/user/profile', {
        credentials: 'include',
      })

      const data = await res.json()

      if (data.success) {
        const p: UserProfile = data.data

        setProfile(p)
        populateForm(p)
      } else {
        toast({
          title: 'Error',
          description: data.message,
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSave = async () => {
    try {
      setSaving(true)

      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
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
        toast({
          title: 'Profile updated',
          description: 'Your profile has been updated successfully.',
          variant: 'success',
        })

        setEditing(false)
        await fetchProfile()
      } else {
        toast({
          title: 'Error',
          description: data.message,
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save profile',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (profile) {
      populateForm(profile)
    }

    setEditing(false)
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>

          <Skeleton className="h-36 w-full rounded-xl" />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Skeleton className="h-[500px] rounded-xl" />
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-full">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
        {/* Page heading */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              My Profile
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage your personal information and account details.
            </p>
          </div>

          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={() => setEditing(true)}
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>

              <Button
                size="sm"
                className="h-9 gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        {/* Profile header */}
        <Card className="overflow-hidden border-border/60 bg-card shadow-sm">
          <div className="relative">
            {/* subtle background */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/[0.08] via-primary/[0.03] to-transparent" />

            <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
              {/* Avatar */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xl font-semibold text-primary">
                {getInitials(profile.name)}
              </div>

              {/* User information */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    {profile.name}
                  </h2>

                  {profile.email_verified ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-500/20 bg-amber-500/10 text-amber-400"
                    >
                      Email unverified
                    </Badge>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {profile.email}
                  </span>

                  <span className="hidden text-border sm:inline">•</span>

                  <span>
                    Member since{' '}
                    {new Date(profile.created_at).toLocaleDateString('en-BD', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Main layout */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Main information */}
          <div className="min-w-0 space-y-6">
            {/* Personal Information */}
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="border-b border-border/50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>

                  <div>
                    <CardTitle className="text-sm font-semibold">
                      Personal information
                    </CardTitle>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Your basic personal and contact information.
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                  {/* Full name */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="p-name"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Full name
                    </Label>

                    {editing ? (
                      <Input
                        id="p-name"
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            name: e.target.value,
                          }))
                        }
                        className="h-10"
                      />
                    ) : (
                      <div className="flex min-h-10 items-center text-sm font-medium text-foreground">
                        {profile.name || '—'}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="p-email"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Email address
                    </Label>

                    <div className="flex min-h-10 items-center">
                      <div className="flex w-full items-center justify-between gap-3 rounded-md border border-border/40 bg-muted/20 px-3 py-2.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {profile.email}
                        </span>

                        <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="p-phone"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Phone number
                    </Label>

                    {editing ? (
                      <Input
                        id="p-phone"
                        placeholder="+880..."
                        value={form.phone}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            phone: e.target.value,
                          }))
                        }
                        className="h-10"
                      />
                    ) : (
                      <div className="flex min-h-10 items-center text-sm font-medium text-foreground">
                        {profile.detail?.phone || '—'}
                      </div>
                    )}
                  </div>

                  {/* Date of birth */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="p-dob"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Date of birth
                    </Label>

                    {editing ? (
                      <Input
                        id="p-dob"
                        type="date"
                        value={form.dob}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            dob: e.target.value,
                          }))
                        }
                        className="h-10"
                      />
                    ) : (
                      <div className="flex min-h-10 items-center text-sm font-medium text-foreground">
                        {formatDate(profile.detail?.dob)}
                      </div>
                    )}
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Gender
                    </Label>

                    {editing ? (
                      <Select
                        value={form.gender}
                        onValueChange={(value) =>
                          setForm((f) => ({
                            ...f,
                            gender: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex min-h-10 items-center text-sm font-medium text-foreground">
                        {profile.detail?.gender || '—'}
                      </div>
                    )}
                  </div>

                  {/* Country */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="p-country"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <Globe2 className="h-3.5 w-3.5" />
                      Country
                    </Label>

                    {editing ? (
                      <Input
                        id="p-country"
                        value={form.country}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            country: e.target.value,
                          }))
                        }
                        className="h-10"
                      />
                    ) : (
                      <div className="flex min-h-10 items-center text-sm font-medium text-foreground">
                        {profile.detail?.country || 'Bangladesh'}
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label
                      htmlFor="p-address"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Address
                    </Label>

                    {editing ? (
                      <Input
                        id="p-address"
                        placeholder="Your address"
                        value={form.address}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            address: e.target.value,
                          }))
                        }
                        className="h-10"
                      />
                    ) : (
                      <div className="flex min-h-10 items-center text-sm font-medium text-foreground">
                        {profile.detail?.address || '—'}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Identity Documents */}
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="border-b border-border/50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                    <CreditCard className="h-4 w-4" />
                  </div>

                  <div>
                    <CardTitle className="text-sm font-semibold">
                      Identity documents
                    </CardTitle>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Identification information associated with your account.
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* NID */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="p-nid"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      NID number
                    </Label>

                    {editing ? (
                      <Input
                        id="p-nid"
                        placeholder="National ID"
                        value={form.nid_no}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            nid_no: e.target.value,
                          }))
                        }
                        className="h-10"
                      />
                    ) : (
                      <div className="flex min-h-10 items-center text-sm font-medium text-foreground">
                        {profile.detail?.nid_no || '—'}
                      </div>
                    )}
                  </div>

                  {/* Passport */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="p-passport"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Passport number
                    </Label>

                    {editing ? (
                      <Input
                        id="p-passport"
                        placeholder="Passport number"
                        value={form.passport}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            passport: e.target.value,
                          }))
                        }
                        className="h-10"
                      />
                    ) : (
                      <div className="flex min-h-10 items-center text-sm font-medium text-foreground">
                        {profile.detail?.passport || '—'}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Account status */}
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="border-b border-border/50 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Shield className="h-4 w-4" />
                  </div>

                  <div>
                    <CardTitle className="text-sm font-semibold">
                      Account
                    </CardTitle>

                    <p className="text-[11px] text-muted-foreground">
                      Your account status
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Email status
                  </span>

                  {profile.email_verified ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    >
                      Verified
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-500/20 bg-amber-500/10 text-amber-400"
                    >
                      Unverified
                    </Badge>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    Member since
                  </span>

                  <span className="text-right text-sm font-medium text-foreground">
                    {new Date(profile.created_at).toLocaleDateString('en-BD', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Emergency contact */}
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="border-b border-border/50 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                    <HeartPulse className="h-4 w-4" />
                  </div>

                  <div>
                    <CardTitle className="text-sm font-semibold">
                      Emergency contact
                    </CardTitle>

                    <p className="text-[11px] text-muted-foreground">
                      Used when assistance is needed
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                {editing ? (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="p-emergency"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Contact information
                    </Label>

                    <Input
                      id="p-emergency"
                      placeholder="Name or phone number"
                      value={form.emergency_contact}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          emergency_contact: e.target.value,
                        }))
                      }
                      className="h-10"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Contact
                    </p>

                    <p className="mt-1.5 text-sm font-medium text-foreground">
                      {profile.detail?.emergency_contact || 'Not provided'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Privacy / account note */}
            <div className="rounded-xl border border-border/60 bg-muted/[0.12] p-5">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                <div>
                  <p className="text-sm font-medium text-foreground">
                    Your information
                  </p>

                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    Keep your contact and identification information accurate
                    so we can provide a better experience and reach you when
                    necessary.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile save bar */}
        {editing && (
          <div className="mt-6 flex justify-end gap-2 border-t border-border/50 pt-5 lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              <X className="mr-2 h-3.5 w-3.5" />
              Cancel
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="mr-2 h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}