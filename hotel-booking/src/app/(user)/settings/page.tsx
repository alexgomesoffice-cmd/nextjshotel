'use client'

import { useState } from 'react'
import {
  Lock, Bell, Shield, Eye, EyeOff, Save, LogOut, Trash2, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-hooks'

export default function UserSettingsPage() {
  const { toast } = useToast()

  // Change password form
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false })
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({})
  const [savingPw, setSavingPw] = useState(false)

  // Notification prefs (UI only — stored client-side)
  const [notifications, setNotifications] = useState({
    bookingConfirmation: true,
    statusUpdates: true,
    promotions: false,
    newsletter: false,
  })

  const validatePw = () => {
    const errors: Record<string, string> = {}
    if (!pwForm.current) errors.current = 'Current password is required'
    if (!pwForm.newPw || pwForm.newPw.length < 6) errors.newPw = 'New password must be at least 6 characters'
    if (pwForm.newPw !== pwForm.confirm) errors.confirm = 'Passwords do not match'
    if (pwForm.current === pwForm.newPw) errors.newPw = 'New password must differ from current'
    setPwErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validatePw()) return
    try {
      setSavingPw(true)
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.newPw }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Password changed', description: 'Your password has been updated', variant: 'success' })
        setPwForm({ current: '', newPw: '', confirm: '' })
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to change password', variant: 'destructive' })
    } finally {
      setSavingPw(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/end-user/logout', { method: 'POST', credentials: 'include' })
      window.location.href = '/login'
    } catch {
      toast({ title: 'Error', description: 'Failed to logout', variant: 'destructive' })
    }
  }

  const PwInput = ({
    id, label, field,
  }: { id: string; label: string; field: 'current' | 'newPw' | 'confirm' }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={showPw[field] ? 'text' : 'password'}
          placeholder="••••••••"
          value={pwForm[field]}
          onChange={(e) => setPwForm((f) => ({ ...f, [field]: e.target.value }))}
          className={`pr-10 ${pwErrors[field] ? 'border-destructive' : ''}`}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setShowPw((s) => ({ ...s, [field]: !s[field] }))}
        >
          {showPw[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {pwErrors[field] && <p className="text-xs text-destructive">{pwErrors[field]}</p>}
    </div>
  )

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and security</p>
      </div>

      {/* Change Password */}
      <Card className="glass-strong">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-primary" /> Change Password
          </CardTitle>
          <CardDescription>Use a strong password that you don&apos;t use elsewhere</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <PwInput id="pw-current" label="Current Password" field="current" />
            <PwInput id="pw-new" label="New Password" field="newPw" />
            <PwInput id="pw-confirm" label="Confirm New Password" field="confirm" />
            <div className="flex justify-end">
              <Button type="submit" disabled={savingPw} className="gap-2">
                <Save className="h-4 w-4" />
                {savingPw ? 'Saving...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="glass-strong">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" /> Notification Preferences
          </CardTitle>
          <CardDescription>Choose what updates you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'bookingConfirmation' as const, label: 'Booking Confirmations', desc: 'Get notified when your reservation is confirmed' },
            { key: 'statusUpdates' as const, label: 'Status Updates', desc: 'Alerts for check-in reminders and booking changes' },
            { key: 'promotions' as const, label: 'Promotions & Deals', desc: 'Special offers and discounts from hotels' },
            { key: 'newsletter' as const, label: 'Newsletter', desc: 'Monthly travel tips and destination highlights' },
          ].map((item, idx) => (
            <div key={item.key}>
              {idx > 0 && <Separator className="mb-4" />}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <Switch
                  id={`notif-${item.key}`}
                  checked={notifications[item.key]}
                  onCheckedChange={(v) => setNotifications((n) => ({ ...n, [item.key]: v }))}
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button variant="outline" className="gap-2" onClick={() =>
              toast({ title: 'Saved', description: 'Notification preferences updated', variant: 'success' })
            }>
              <Save className="h-4 w-4" /> Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="glass-strong">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" /> Account Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sign out of all devices</p>
              <p className="text-xs text-muted-foreground mt-0.5">This will revoke all active sessions</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="glass-strong border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-xs text-muted-foreground mt-0.5">Permanently delete your account and all your data</p>
            </div>
            <Button
              variant="destructive" size="sm" className="gap-2"
              onClick={() => toast({ title: 'Contact support', description: 'Please contact support to delete your account', variant: 'destructive' })}
            >
              <Trash2 className="h-4 w-4" /> Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
