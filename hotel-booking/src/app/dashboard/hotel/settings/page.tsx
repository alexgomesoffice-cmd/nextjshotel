'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, Lock, Mail, Save, ShieldCheck, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

type ProfileForm = {
  name: string
  email: string
  phone: string
  dob: string
  nid_no: string
  passport: string
  address: string
}

type PasswordForm = {
  current_password: string
  new_password: string
  confirm_password: string
}

const emptyPasswordForm: PasswordForm = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggle: () => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
          autoComplete={id.includes('current') ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          onClick={onToggle}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export default function HotelAdminAccountSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: '',
    email: '',
    phone: '',
    dob: '',
    nid_no: '',
    passport: '',
    address: '',
  })
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm)
  const [showPassword, setShowPassword] = useState({
    current_password: false,
    new_password: false,
    confirm_password: false,
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/hotel-admin/profile', { credentials: 'include' })
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to load profile information')
        }

        const admin = data.data
        setProfileForm({
          name: admin.name || '',
          email: admin.email || '',
          phone: admin.detail?.phone || '',
          dob: admin.detail?.dob ? new Date(admin.detail.dob).toISOString().split('T')[0] : '',
          nid_no: admin.detail?.nid_no || '',
          passport: admin.detail?.passport || '',
          address: admin.detail?.address || '',
        })
      } catch (error) {
        toast({
          title: 'Unable to load profile',
          description: error instanceof Error ? error.message : 'Failed to fetch account details.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [toast])

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmedName = profileForm.name.trim()
    if (!trimmedName || trimmedName.length < 2) {
      toast({ title: 'Validation error', description: 'Full name must be at least 2 characters.', variant: 'destructive' })
      return
    }

    setSavingProfile(true)

    try {
      const payload = {
        name: trimmedName,
        phone: profileForm.phone.trim() || null,
        dob: profileForm.dob || null,
        nid_no: profileForm.nid_no.trim() || null,
        passport: profileForm.passport.trim() || null,
        address: profileForm.address.trim() || null,
      }

      const response = await fetch('/api/hotel-admin/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to update profile.')
      }

      toast({ title: 'Profile updated', description: 'Your account information has been saved.', variant: 'success' })
    } catch (error) {
      toast({
        title: 'Unable to update profile',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault()

    const { current_password, new_password, confirm_password } = passwordForm

    if (!current_password || !new_password || !confirm_password) {
      toast({ title: 'Validation error', description: 'Please complete all password fields.', variant: 'destructive' })
      return
    }

    if (new_password.length < 6) {
      toast({ title: 'Validation error', description: 'New password must be at least 6 characters.', variant: 'destructive' })
      return
    }

    if (new_password !== confirm_password) {
      toast({ title: 'Validation error', description: 'Passwords do not match.', variant: 'destructive' })
      return
    }

    if (current_password === new_password) {
      toast({ title: 'Validation error', description: 'New password must be different from the current password.', variant: 'destructive' })
      return
    }

    setSavingPassword(true)

    try {
      const response = await fetch('/api/hotel-admin/account/password', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password, new_password, confirm_password }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to update password.')
      }

      toast({ title: 'Password updated successfully.', description: 'Your password has been changed.', variant: 'success' })
      setPasswordForm(emptyPasswordForm)
      setShowPassword({ current_password: false, new_password: false, confirm_password: false })
    } catch (error) {
      toast({
        title: 'Unable to update password',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Account Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account information and security.</p>
      </header>

      <div className="space-y-6">
        <form onSubmit={handleProfileSave} className="space-y-5">
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">Profile</CardTitle>
                  <CardDescription className="mt-1">Your personal information used for your Hotel Admin account.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((current) => ({ ...current, name: e.target.value }))}
                    placeholder="Enter full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-address">Email Address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email-address"
                      value={profileForm.email}
                      readOnly
                      className="bg-muted/40 pl-9 text-muted-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input
                    id="phone-number"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((current) => ({ ...current, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={profileForm.dob}
                    onChange={(e) => setProfileForm((current) => ({ ...current, dob: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nid-number">NID Number</Label>
                  <Input
                    id="nid-number"
                    value={profileForm.nid_no}
                    onChange={(e) => setProfileForm((current) => ({ ...current, nid_no: e.target.value }))}
                    placeholder="Enter NID number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passport-number">Passport Number</Label>
                  <Input
                    id="passport-number"
                    value={profileForm.passport}
                    onChange={(e) => setProfileForm((current) => ({ ...current, passport: e.target.value }))}
                    placeholder="Enter passport number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="permanent-address">Permanent Address</Label>
                <Textarea
                  id="permanent-address"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm((current) => ({ ...current, address: e.target.value }))}
                  rows={4}
                  placeholder="Enter your permanent address"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingProfile} className="gap-2">
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        <form onSubmit={handlePasswordChange} className="space-y-5">
          <Card className="border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">Security</CardTitle>
                  <CardDescription className="mt-1">Manage your account password.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <PasswordField
                  id="current-password"
                  label="Current Password"
                  value={passwordForm.current_password}
                  onChange={(value) => setPasswordForm((current) => ({ ...current, current_password: value }))}
                  show={showPassword.current_password}
                  onToggle={() => setShowPassword((current) => ({ ...current, current_password: !current.current_password }))}
                />

                <PasswordField
                  id="new-password"
                  label="New Password"
                  value={passwordForm.new_password}
                  onChange={(value) => setPasswordForm((current) => ({ ...current, new_password: value }))}
                  show={showPassword.new_password}
                  onToggle={() => setShowPassword((current) => ({ ...current, new_password: !current.new_password }))}
                />

                <PasswordField
                  id="confirm-password"
                  label="Confirm New Password"
                  value={passwordForm.confirm_password}
                  onChange={(value) => setPasswordForm((current) => ({ ...current, confirm_password: value }))}
                  show={showPassword.confirm_password}
                  onToggle={() => setShowPassword((current) => ({ ...current, confirm_password: !current.confirm_password }))}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Lock className="h-3.5 w-3.5" />
                  Use at least 6 characters.
                </div>
                <Button type="submit" disabled={savingPassword} className="gap-2">
                  {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {savingPassword ? 'Changing password...' : 'Change Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
