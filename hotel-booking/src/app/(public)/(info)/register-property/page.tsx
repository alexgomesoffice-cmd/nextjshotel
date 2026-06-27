'use client'

import { useState } from 'react'
import { Building2, MapPin, Phone, Mail, User, FileText, ChevronRight, CheckCircle2 } from 'lucide-react'

export default function RegisterPropertyPage() {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    // Contact
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    // Property
    property_name: '',
    property_type: '',
    city: '',
    address: '',
    total_rooms: '',
    // Message
    message: '',
  })

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Wire to an API route when ready
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="max-w-2xl">
        <div className="flex flex-col items-center text-center py-16 px-8 rounded-3xl border border-border/50 bg-secondary/20 space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold">Request Received</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            Thank you for your interest in listing on GhuriBangla. Our partnerships
            team will review your submission and reach out to{' '}
            <span className="text-foreground font-medium">{form.contact_email}</span>{' '}
            within 2–3 business days.
          </p>
          <button
            onClick={() => { setSubmitted(false); setForm({ contact_name: '', contact_email: '', contact_phone: '', property_name: '', property_type: '', city: '', address: '', total_rooms: '', message: '' }) }}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Submit another request
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Register Your Property</h1>
          <p className="text-sm text-muted-foreground">List your hotel on GhuriBangla and reach more guests</p>
        </div>
      </div>

      {/* Why list with us */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Listing fee',       sub: 'Listing fee will be applicable' },
          { label: 'Full control',          sub: 'Manage rooms & rates' },
          { label: 'Direct bookings',       sub: 'Guests pay you directly' },
        ].map(({ label, sub }) => (
          <div key={label} className="p-4 rounded-2xl border border-border/50 bg-secondary/20 text-center">
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section: Your contact info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-border/50">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Contact Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Full Name"
              required
              placeholder="e.g. Rahim Uddin"
              value={form.contact_name}
              onChange={v => set('contact_name', v)}
            />
            <Field
              label="Email Address"
              required
              type="email"
              placeholder="you@example.com"
              value={form.contact_email}
              onChange={v => set('contact_email', v)}
            />
          </div>

          <Field
            label="Phone Number"
            required
            type="tel"
            placeholder="+880 1XXX-XXXXXX"
            value={form.contact_phone}
            onChange={v => set('contact_phone', v)}
          />
        </div>

        {/* Section: Property info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-border/50">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Property Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Property Name"
              required
              placeholder="e.g. Hotel Sunrise Cox's Bazar"
              value={form.property_name}
              onChange={v => set('property_name', v)}
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Property Type <span className="text-destructive">*</span>
              </label>
              <select
                required
                value={form.property_type}
                onChange={e => set('property_type', e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
              >
                <option value="" disabled>Select type</option>
                <option value="hotel">Hotel</option>
                <option value="resort">Resort</option>
                <option value="guesthouse">Guest House</option>
                <option value="boutique">Boutique Hotel</option>
                <option value="motel">Motel</option>
                <option value="hostel">Hostel</option>
                <option value="villa">Villa / Bungalow</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="City"
              required
              placeholder="e.g. Cox's Bazar"
              value={form.city}
              onChange={v => set('city', v)}
              icon={<MapPin className="h-4 w-4" />}
            />
            <Field
              label="NID"
              required
              type="number"
              placeholder="xxxxxxx"
              value={form.nid}
              onChange={v => set('nid', v)}
            />
          </div>

          <Field
            label="Full Address"
            placeholder="Street, area, city, postcode"
            value={form.address}
            onChange={v => set('address', v)}
            icon={<MapPin className="h-4 w-4" />}
          />
        </div>

        {/* Section: Message */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-border/50">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Additional Information</h2>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              rows={4}
              placeholder="Tell us anything else about your property — facilities, star rating, special features, or questions you have about the listing process."
              value={form.message}
              onChange={e => set('message', e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            By submitting, you agree to our{' '}
            <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
          </p>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Submit Request <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Reusable field component (local to this file) ─────────────────────────────
interface FieldProps {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  icon?: React.ReactNode
}

function Field({ label, placeholder, value, onChange, type = 'text', required, icon }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
        <input
          type={type}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full rounded-xl border border-border/60 bg-background py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${icon ? 'pl-9 pr-3' : 'px-3'}`}
        />
      </div>
    </div>
  )
}