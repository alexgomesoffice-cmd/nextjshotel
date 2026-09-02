'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Check } from 'lucide-react'
import { OpsSectionHeader } from '@/components/admin/shared/primitives'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Option { id: number; name: string }

// Reused for owner/admin photo and each document field. Documents restrict
// the file picker to .pdf/.jpg only (not .jpeg) per instruction, and are
// re-checked by extension server-side too.
function UploadField({
  label, required, accept, url, uploading, onUpload,
}: {
  label: string
  required?: boolean
  accept: string
  url: string | null
  uploading: boolean
  onUpload: (file: File) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
      <div className="flex items-center gap-2">
        <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-border/60 bg-secondary/40 px-2.5 text-xs hover:bg-secondary">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? 'Uploading…' : 'Choose file'}
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
        </label>
        {url && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3.5 w-3.5" /> Uploaded
          </span>
        )}
      </div>
    </div>
  )
}

const DOC_FIELDS = [
  { key: 'trade_license_url', label: 'Trade License' },
  { key: 'tax_certificate_url', label: 'Tax Certificate' },
  { key: 'tin_certificate_url', label: 'TIN Certificate' },
  { key: 'vat_certificate_url', label: 'VAT Certificate' },
  { key: 'business_document_url', label: 'Business Document' },
] as const

export default function AddHotelPage() {
  const router = useRouter()
  const [cities, setCities] = useState<Option[]>([])
  const [hotelTypes, setHotelTypes] = useState<Option[]>([])
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    hotel: { name: '', email: '', address: '', city_id: '', hotel_type_id: '', zip_code: '', map_location: '' },
    details: {
      star_rating: '', website: '', reception_no1: '', reception_no2: '',
      emergency_contact_name: '', emergency_contact_designation: '',
      emergency_contact_phone1: '', emergency_contact_phone2: '', emergency_contact_email: '',
      check_in_time: '14:00', check_out_time: '12:00',
    },
    owner: { full_name: '', phone: '', address: '', dob: '', nid_no: '', passport: '', email: '', photo_url: '' },
    admin: {
      admin_name: '', admin_email: '', admin_phone: '', admin_password: '',
      emergency_phone: '', dob: '', nid_no: '', passport: '', address: '', photo_url: '',
    },
    documents: {
      trade_license_url: '', tax_certificate_url: '', tin_certificate_url: '',
      vat_certificate_url: '', business_document_url: '',
    },
  })

  useEffect(() => {
    fetch('/api/system-admin/cities?limit=200', { credentials: 'include' })
      .then((r) => r.json()).then((d) => setCities(d?.data?.cities ?? []))
    fetch('/api/system-admin/hotel-types?limit=200', { credentials: 'include' })
      .then((r) => r.json()).then((d) => setHotelTypes(d?.data?.hotelTypes ?? d?.data ?? []))
  }, [])

  const setSection = (section: keyof typeof form, key: string, value: string) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], [key]: value } }))

  const upload = async (section: keyof typeof form, key: string, file: File) => {
    setUploadingKey(`${section}.${key}`)
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
        body: JSON.stringify({ data: dataUrl, filename: file.name, uploadSubDir: 'hotels' }),
      })
      const data = await res.json()
      if (data.success) setSection(section, key, data.url)
    } finally {
      setUploadingKey(null)
    }
  }

  // Client-side validation mirroring the server's createHotelSchema exactly
  // (mandatory/optional split as confirmed).
  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.hotel.name.trim()) e['hotel.name'] = 'Hotel name is required.'
    if (!/^\S+@\S+\.\S+$/.test(form.hotel.email)) e['hotel.email'] = 'Valid official email required.'
    if (!form.hotel.address.trim()) e['hotel.address'] = 'Full address is required.'
    if (!form.hotel.city_id) e['hotel.city_id'] = 'City is required.'
    if (!form.hotel.hotel_type_id) e['hotel.hotel_type_id'] = 'Hotel type is required.'
    if (!form.hotel.zip_code.trim()) e['hotel.zip_code'] = 'Zip code is required.'
    if (!form.details.star_rating) e['details.star_rating'] = 'Star rating is required.'
    if (!form.details.reception_no1.trim()) e['details.reception_no1'] = 'Reception No. 1 is required.'
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.details.check_in_time)) e['details.check_in_time'] = 'Enter a valid check-in time.'
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.details.check_out_time)) e['details.check_out_time'] = 'Enter a valid check-out time.'
    if (!form.owner.full_name.trim()) e['owner.full_name'] = "Owner's full name is required."
    if (!form.owner.phone.trim()) e['owner.phone'] = "Owner's phone is required."
    if (!form.owner.address.trim()) e['owner.address'] = "Owner's address is required."
    if (!form.admin.admin_name.trim()) e['admin.admin_name'] = 'Admin name is required.'
    if (!/^\S+@\S+\.\S+$/.test(form.admin.admin_email)) e['admin.admin_email'] = 'Valid admin email required.'
    if (!form.admin.admin_phone.trim()) e['admin.admin_phone'] = "Admin's phone is required."
    if (form.admin.admin_password.length < 6) e['admin.admin_password'] = 'Password must be at least 6 characters.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    setServerError(null)
    if (!validate()) return
    setSaving(true)
    try {
      const res = await fetch('/api/system-admin/hotels', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel: { ...form.hotel, city_id: Number(form.hotel.city_id), hotel_type_id: Number(form.hotel.hotel_type_id) },
          details: { ...form.details, star_rating: Number(form.details.star_rating) },
          owner: form.owner,
          admin: form.admin,
          documents: form.documents,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setServerError(data.message || 'Something went wrong.')
        return
      }
      router.push(`/dashboard/system/hotels/${data.data.hotel_id}`)
    } catch {
      setServerError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const err = (k: string) => errors[k] && <p className="text-xs text-red-500">{errors[k]}</p>

  return (
    <div className="mx-auto max-w-300 space-y-6 px-6 py-5">
      <OpsSectionHeader
        title="Add Hotel"
        description="Register a new property with owner, admin, business and emergency information."
      />

      {/* Basic Information */}
      <section className="space-y-3 rounded-md border border-border/60 p-4">
        <h3 className="text-sm font-semibold">Basic Information</h3>
        <p className="text-xs text-muted-foreground">Core property identity and public contact information.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Hotel Name <span className="text-red-500">*</span></Label>
            <Input value={form.hotel.name} onChange={(e) => setSection('hotel', 'name', e.target.value)} />
            {err('hotel.name')}
          </div>
          <div className="space-y-1.5">
            <Label>Hotel Type <span className="text-red-500">*</span></Label>
            <Select value={form.hotel.hotel_type_id} onValueChange={(v) => setSection('hotel', 'hotel_type_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {hotelTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {err('hotel.hotel_type_id')}
          </div>
          <div className="space-y-1.5">
            <Label>City <span className="text-red-500">*</span></Label>
            <Select value={form.hotel.city_id} onValueChange={(v) => setSection('hotel', 'city_id', v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {err('hotel.city_id')}
          </div>
          <div className="space-y-1.5">
            <Label>Star Rating <span className="text-red-500">*</span></Label>
            <Select value={form.details.star_rating} onValueChange={(v) => setSection('details', 'star_rating', v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} Star</SelectItem>)}
              </SelectContent>
            </Select>
            {err('details.star_rating')}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Full Address <span className="text-red-500">*</span></Label>
            <Input value={form.hotel.address} onChange={(e) => setSection('hotel', 'address', e.target.value)} />
            {err('hotel.address')}
          </div>
          <div className="space-y-1.5">
            <Label>Zip Code <span className="text-red-500">*</span></Label>
            <Input value={form.hotel.zip_code} onChange={(e) => setSection('hotel', 'zip_code', e.target.value)} />
            {err('hotel.zip_code')}
          </div>
          <div className="space-y-1.5">
            <Label>Official Email <span className="text-red-500">*</span></Label>
            <Input type="email" value={form.hotel.email} onChange={(e) => setSection('hotel', 'email', e.target.value)} />
            {err('hotel.email')}
          </div>
          <div className="space-y-1.5">
            <Label>Reception No. 1 <span className="text-red-500">*</span></Label>
            <Input value={form.details.reception_no1} onChange={(e) => setSection('details', 'reception_no1', e.target.value)} />
            {err('details.reception_no1')}
          </div>
          <div className="space-y-1.5">
            <Label>Reception No. 2</Label>
            <Input value={form.details.reception_no2} onChange={(e) => setSection('details', 'reception_no2', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={form.details.website} onChange={(e) => setSection('details', 'website', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Map Location</Label>
            <Input value={form.hotel.map_location} onChange={(e) => setSection('hotel', 'map_location', e.target.value)} placeholder="Google Maps link" />
          </div>
        </div>
      </section>

      {/* Stay Policy */}
      <section className="space-y-3 rounded-md border border-border/60 p-4">
        <h3 className="text-sm font-semibold">Stay Policy</h3>
        <p className="text-xs text-muted-foreground">Standard arrival and departure times for this property.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="check_in_time">Check-in Time</Label>
            <Input id="check_in_time" type="time" value={form.details.check_in_time} onChange={(e) => setSection('details', 'check_in_time', e.target.value)} />
            {err('details.check_in_time')}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="check_out_time">Check-out Time</Label>
            <Input id="check_out_time" type="time" value={form.details.check_out_time} onChange={(e) => setSection('details', 'check_out_time', e.target.value)} />
            {err('details.check_out_time')}
          </div>
        </div>
      </section>

      {/* Owner's Information */}
      <section className="space-y-3 rounded-md border border-border/60 p-4">
        <h3 className="text-sm font-semibold">Owner Information</h3>
        <p className="text-xs text-muted-foreground">Legal owner of the property.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Full Name <span className="text-red-500">*</span></Label>
            <Input value={form.owner.full_name} onChange={(e) => setSection('owner', 'full_name', e.target.value)} />
            {err('owner.full_name')}
          </div>
          <div className="space-y-1.5">
            <Label>Phone <span className="text-red-500">*</span></Label>
            <Input value={form.owner.phone} onChange={(e) => setSection('owner', 'phone', e.target.value)} />
            {err('owner.phone')}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Address <span className="text-red-500">*</span></Label>
            <Input value={form.owner.address} onChange={(e) => setSection('owner', 'address', e.target.value)} />
            {err('owner.address')}
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input type="date" value={form.owner.dob} onChange={(e) => setSection('owner', 'dob', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.owner.email} onChange={(e) => setSection('owner', 'email', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>NID Number</Label>
            <Input value={form.owner.nid_no} onChange={(e) => setSection('owner', 'nid_no', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Passport</Label>
            <Input value={form.owner.passport} onChange={(e) => setSection('owner', 'passport', e.target.value)} />
          </div>
        </div>
        <UploadField
          label="Owner Photo" accept="image/*"
          url={form.owner.photo_url || null}
          uploading={uploadingKey === 'owner.photo_url'}
          onUpload={(f) => upload('owner', 'photo_url', f)}
        />
      </section>

      {/* Hotel Admin Account */}
      <section className="space-y-3 rounded-md border border-border/60 p-4">
        <h3 className="text-sm font-semibold">Hotel Admin Account</h3>
        <p className="text-xs text-muted-foreground">Primary admin who will manage the hotel dashboard.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Admin Name <span className="text-red-500">*</span></Label>
            <Input value={form.admin.admin_name} onChange={(e) => setSection('admin', 'admin_name', e.target.value)} />
            {err('admin.admin_name')}
          </div>
          <div className="space-y-1.5">
            <Label>Email <span className="text-red-500">*</span></Label>
            <Input type="email" value={form.admin.admin_email} onChange={(e) => setSection('admin', 'admin_email', e.target.value)} />
            {err('admin.admin_email')}
          </div>
          <div className="space-y-1.5">
            <Label>Phone <span className="text-red-500">*</span></Label>
            <Input value={form.admin.admin_phone} onChange={(e) => setSection('admin', 'admin_phone', e.target.value)} />
            {err('admin.admin_phone')}
          </div>
          <div className="space-y-1.5">
            <Label>Emergency Phone</Label>
            <Input value={form.admin.emergency_phone} onChange={(e) => setSection('admin', 'emergency_phone', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Password <span className="text-red-500">*</span></Label>
            <Input type="password" value={form.admin.admin_password} onChange={(e) => setSection('admin', 'admin_password', e.target.value)} />
            {err('admin.admin_password')}
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input type="date" value={form.admin.dob} onChange={(e) => setSection('admin', 'dob', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>NID Number</Label>
            <Input value={form.admin.nid_no} onChange={(e) => setSection('admin', 'nid_no', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Passport</Label>
            <Input value={form.admin.passport} onChange={(e) => setSection('admin', 'passport', e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Address</Label>
            <Input value={form.admin.address} onChange={(e) => setSection('admin', 'address', e.target.value)} />
          </div>
        </div>
        <UploadField
          label="Admin Photo" accept="image/*"
          url={form.admin.photo_url || null}
          uploading={uploadingKey === 'admin.photo_url'}
          onUpload={(f) => upload('admin', 'photo_url', f)}
        />
      </section>

      {/* Business Information */}
      <section className="space-y-3 rounded-md border border-border/60 p-4">
        <h3 className="text-sm font-semibold">Hotel (Business Information)</h3>
        <p className="text-xs text-muted-foreground">
          All optional for now — may become mandatory later. PDF or JPG only.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {DOC_FIELDS.map((d) => (
            <UploadField
              key={d.key}
              label={d.label}
              accept=".pdf,.jpg"
              url={form.documents[d.key] || null}
              uploading={uploadingKey === `documents.${d.key}`}
              onUpload={(f) => upload('documents', d.key, f)}
            />
          ))}
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="space-y-3 rounded-md border border-border/60 p-4">
        <h3 className="text-sm font-semibold">Emergency Contact</h3>
        <p className="text-xs text-muted-foreground">Point of contact for critical incidents.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.details.emergency_contact_name} onChange={(e) => setSection('details', 'emergency_contact_name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Designation</Label>
            <Input value={form.details.emergency_contact_designation} onChange={(e) => setSection('details', 'emergency_contact_designation', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone 1</Label>
            <Input value={form.details.emergency_contact_phone1} onChange={(e) => setSection('details', 'emergency_contact_phone1', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone 2</Label>
            <Input value={form.details.emergency_contact_phone2} onChange={(e) => setSection('details', 'emergency_contact_phone2', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.details.emergency_contact_email} onChange={(e) => setSection('details', 'emergency_contact_email', e.target.value)} />
          </div>
        </div>
      </section>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <div className="flex justify-end gap-2 pb-6">
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving || !!uploadingKey}>
          {saving ? 'Creating…' : 'Create Hotel'}
        </Button>
      </div>
    </div>
  )
}