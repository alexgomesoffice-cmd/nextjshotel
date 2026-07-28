'use client'

import { useState } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const empty = {
  name: '', email: '', password: '', confirmPassword: '',
  phone: '', dob: '', address: '', nid_no: '', gender: '', passport: '',
}

export function AdminFormDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [form, setForm] = useState(empty)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const reset = () => {
    setForm(empty)
    setImageUrl(null)
    setErrors({})
    setServerError(null)
  }

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.onerror = reject
        r.readAsDataURL(file)
      })
      const res = await fetch('/api/system-admin/uploads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataUrl, filename: file.name, uploadSubDir: 'admins' }),
      })
      const data = await res.json()
      if (data.success) setImageUrl(data.url)
    } finally {
      setUploading(false)
    }
  }

  // Client-side validation — mirrors the server's createSystemAdminSchema
  // (name/email/password/phone/dob/address/nid_no required; gender/passport
  // optional). Image and confirm-password aren't part of the server schema
  // at all — confirm-password is purely a client-side typo safeguard.
  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Full name is required.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address.'
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters.'
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match.'
    if (!form.phone.trim()) e.phone = 'Phone number is required.'
    if (!form.dob) e.dob = 'Date of birth is required.'
    if (!form.address.trim()) e.address = 'Address is required.'
    if (!form.nid_no.trim()) e.nid_no = 'NID number is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    setServerError(null)
    if (!validate()) return
    setSaving(true)
    try {
      const res = await fetch('/api/system-admin/admins', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim(),
          dob: form.dob,
          address: form.address.trim(),
          nid_no: form.nid_no.trim(),
          gender: form.gender || undefined,
          passport: form.passport || undefined,
          image_url: imageUrl || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setServerError(data.message || 'Something went wrong.')
        return
      }
      reset()
      onSaved()
      onOpenChange(false)
    } catch {
      setServerError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const field = (
    key: keyof typeof empty,
    label: string,
    type = 'text',
    required = true,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input id={key} type={type} value={form[key]} onChange={set(key)} />
      {errors[key] && <p className="text-xs text-red-500">{errors[key]}</p>}
    </div>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New System Admin</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-border/60 bg-secondary/40">
              {imageUrl ? (
                <Image src={imageUrl} alt="" width={56} height={56} className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Photo (optional)</Label>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="block text-xs text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs"
              />
              {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field('name', 'Full Name')}
            {field('email', 'Email', 'email')}
            {field('password', 'Password', 'password')}
            {field('confirmPassword', 'Confirm Password', 'password')}
            {field('phone', 'Phone Number')}
            {field('dob', 'Date of Birth', 'date')}
            {field('nid_no', 'NID Number')}
            {field('gender', 'Gender', 'text', false)}
            {field('passport', 'Passport', 'text', false)}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
            <Input id="address" value={form.address} onChange={set('address')} />
            {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
          </div>

          {serverError && <p className="text-xs text-red-500">{serverError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? 'Creating…' : 'Create System Admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}