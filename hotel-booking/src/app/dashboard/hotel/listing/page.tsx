'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Hotel, MapPin, Phone, Sparkles, ClipboardList, Send, Save, Trash2,
  Building2, UserCircle2, ShieldCheck, ImageIcon, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  PropertyHero, PendingReviewBanner, UnsubmittedBanner, RejectedBanner,
  SectionShell, Row, FieldDef,
} from '@/components/hotel-admin/property/property-ui'
import { sectionKeyFor } from '@/lib/hotel-admin/sections'
import { SectionEditDialog } from '@/components/hotel-admin/property/section-dialog'

type SectionKey = 'general' | 'location' | 'contacts' | 'amenities' | 'gallery' | 'policies' | 'business' | 'owner' | 'admin'

const SECTIONS: { key: SectionKey; title: string; description: string; icon: any; accent: string; requiresApproval?: boolean; approvalNote?: string }[] = [
  { key: 'general', title: 'General Information', icon: Hotel, accent: 'from-emerald-500 to-green-600', description: 'Public identity of your hotel' },
  { key: 'location', title: 'Location', icon: MapPin, accent: 'from-sky-500 to-blue-600', description: 'Where guests will find you' },
  { key: 'contacts', title: 'Contact Information', icon: Phone, accent: 'from-cyan-500 to-teal-600', description: 'Phones, email and emergency contact' },
  { key: 'amenities', title: 'Amenities', icon: Sparkles, accent: 'from-fuchsia-500 to-pink-600', description: 'Everything guests can enjoy' },
  { key: 'gallery', title: 'Gallery', icon: ImageIcon, accent: 'from-orange-500 to-amber-600', description: 'Photo library' },
  { key: 'policies', title: 'Policies', icon: ClipboardList, accent: 'from-lime-500 to-emerald-600', description: 'Your own house rules and policies' },
  { key: 'business', title: 'Business & Documents', icon: Building2, accent: 'from-slate-500 to-slate-700', description: 'Legal documents verified by the System Admin',
    requiresApproval: true, approvalNote: 'Documents are verified by the System Administrator before publishing.' },
  { key: 'owner', title: 'Owner Information', icon: UserCircle2, accent: 'from-purple-500 to-fuchsia-600', description: 'Identity of the property owner',
    requiresApproval: true, approvalNote: 'Owner identity changes require System Administrator verification.' },
  { key: 'admin', title: 'Hotel Admin Information', icon: ShieldCheck, accent: 'from-teal-500 to-emerald-600', description: 'Your management profile on record',
    requiresApproval: true, approvalNote: 'Login email is locked. Change your password from Account Settings.' },
]

function fieldsFor(key: SectionKey, hotel: any): FieldDef[] {
  const d = hotel?.detail ?? {}
  const owner = hotel?.owner_detail ?? {}
  const admin = hotel?.hotel_admin ?? {}
  const adminDetail = admin?.detail ?? {}
  const dateStr = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : '')

  switch (key) {
    case 'general':
      return [
        { entityType: 'HOTEL', entityId: null, fieldName: 'name', label: 'Hotel Name', currentValue: hotel?.name ?? '' },
        { entityType: 'HOTEL', entityId: null, fieldName: 'star_rating', label: 'Star Rating', currentValue: d.star_rating != null ? String(d.star_rating) : '', type: 'number', step: '0.5', min: '1', max: '5' },
        { entityType: 'HOTEL', entityId: null, fieldName: 'description', label: 'Description', currentValue: d.description ?? '', multiline: true },
        { entityType: 'HOTEL', entityId: null, fieldName: 'hotel_type', label: 'Hotel Type', currentValue: hotel?.hotel_type?.name ?? '', locked: true, helper: 'Contact System Admin to change.' },
      ]
    case 'location':
      return [
        { entityType: 'HOTEL', entityId: null, fieldName: 'address', label: 'Full Address', currentValue: hotel?.address ?? '', multiline: true },
        { entityType: 'HOTEL', entityId: null, fieldName: 'zip_code', label: 'Zip / Postal Code', currentValue: hotel?.zip_code ?? '' },
        { entityType: 'HOTEL', entityId: null, fieldName: 'map_location', label: 'Map Location', currentValue: hotel?.map_location ?? '', helper: 'Paste a Google Maps link.' },
        { entityType: 'HOTEL', entityId: null, fieldName: 'city', label: 'City', currentValue: hotel?.city?.name ?? '', locked: true, helper: 'Contact System Admin to change.' },
      ]
    case 'contacts':
      return [
        { entityType: 'HOTEL', entityId: null, fieldName: 'email', label: 'Official Email', currentValue: hotel?.email ?? '', type: 'email' },
        { entityType: 'HOTEL', entityId: null, fieldName: 'reception_no1', label: 'Reception Number 1', currentValue: d.reception_no1 ?? '' },
        { entityType: 'HOTEL', entityId: null, fieldName: 'reception_no2', label: 'Reception Number 2', currentValue: d.reception_no2 ?? '' },
        { entityType: 'HOTEL', entityId: null, fieldName: 'website', label: 'Website', currentValue: d.website ?? '' },
        { entityType: 'HOTEL', entityId: null, fieldName: 'emergency_contact_name', label: 'Emergency Contact Name', currentValue: d.emergency_contact_name ?? '' },
        { entityType: 'HOTEL', entityId: null, fieldName: 'emergency_contact_designation', label: 'Emergency Contact Designation', currentValue: d.emergency_contact_designation ?? '' },
        { entityType: 'HOTEL', entityId: null, fieldName: 'emergency_contact_phone1', label: 'Emergency Phone 1', currentValue: d.emergency_contact_phone1 ?? '' },
        { entityType: 'HOTEL', entityId: null, fieldName: 'emergency_contact_phone2', label: 'Emergency Phone 2', currentValue: d.emergency_contact_phone2 ?? '' },
        { entityType: 'HOTEL', entityId: null, fieldName: 'emergency_contact_email', label: 'Emergency Contact Email', currentValue: d.emergency_contact_email ?? '', type: 'email' },
      ]
    case 'owner':
      return [
        { entityType: 'HOTEL_OWNER', entityId: null, fieldName: 'full_name', label: 'Full Name', currentValue: owner.full_name ?? '' },
        { entityType: 'HOTEL_OWNER', entityId: null, fieldName: 'phone', label: 'Phone', currentValue: owner.phone ?? '' },
        { entityType: 'HOTEL_OWNER', entityId: null, fieldName: 'email', label: 'Email', currentValue: owner.email ?? '', type: 'email' },
        { entityType: 'HOTEL_OWNER', entityId: null, fieldName: 'dob', label: 'Date of Birth', currentValue: dateStr(owner.dob), type: 'date' },
        { entityType: 'HOTEL_OWNER', entityId: null, fieldName: 'nid_no', label: 'National ID (NID)', currentValue: owner.nid_no ?? '' },
        { entityType: 'HOTEL_OWNER', entityId: null, fieldName: 'passport', label: 'Passport', currentValue: owner.passport ?? '' },
        { entityType: 'HOTEL_OWNER', entityId: null, fieldName: 'address', label: 'Address', currentValue: owner.address ?? '', multiline: true },
      ]
    case 'admin':
      return [
        { entityType: 'HOTEL_ADMIN', entityId: null, fieldName: 'name', label: 'Admin Name', currentValue: admin.name ?? '' },
        { entityType: 'HOTEL_ADMIN', entityId: null, fieldName: 'email', label: 'Email', currentValue: admin.email ?? '', locked: true, helper: 'Change your email is not possible. Contact support if needed.' },
        { entityType: 'HOTEL_ADMIN', entityId: null, fieldName: 'phone', label: 'Phone', currentValue: adminDetail.phone ?? '' },
        { entityType: 'HOTEL_ADMIN', entityId: null, fieldName: 'dob', label: 'Date of Birth', currentValue: dateStr(adminDetail.dob), type: 'date' },
        { entityType: 'HOTEL_ADMIN', entityId: null, fieldName: 'nid_no', label: 'National ID (NID)', currentValue: adminDetail.nid_no ?? '' },
        { entityType: 'HOTEL_ADMIN', entityId: null, fieldName: 'passport', label: 'Passport', currentValue: adminDetail.passport ?? '' },
        { entityType: 'HOTEL_ADMIN', entityId: null, fieldName: 'address', label: 'Address', currentValue: adminDetail.address ?? '', multiline: true },
        { entityType: 'HOTEL_ADMIN', entityId: null, fieldName: 'emergency_contact1', label: 'Emergency Phone 1', currentValue: adminDetail.emergency_contact1 ?? '' },
        { entityType: 'HOTEL_ADMIN', entityId: null, fieldName: 'emergency_contact2', label: 'Emergency Phone 2', currentValue: adminDetail.emergency_contact2 ?? '' },
      ]
    default:
      return []
  }
}

export default function HotelAdminPropertyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [hotel, setHotel] = useState<any>(null)
  const [currentCase, setCurrentCase] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<SectionKey>('general')
  const [openSection, setOpenSection] = useState<SectionKey | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const [hotelRes, caseRes] = await Promise.all([
      fetch('/api/hotel-admin/hotel', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/hotel-admin/cases', { credentials: 'include' }).then((r) => r.json()),
    ])
    if (hotelRes?.success) setHotel(hotelRes.data)
    if (caseRes?.success) setCurrentCase(caseRes.data.currentCase)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const status: string | undefined = currentCase?.status
  const pendingReview = status === 'PENDING'
  const isDrafting = status === 'DRAFTING'
  const isRejected = status === 'REJECTED'
  const fieldChanges: any[] = currentCase?.field_changes ?? []
  const rejectedCount = fieldChanges.filter((f) => f.status === 'REJECTED').length

  const pendingMap = useMemo(() => {
    const m = new Map<string, { pendingValue: string; status: string; rejection_reason?: string | null }>()
    fieldChanges.forEach((fc) => {
      const k = `${fc.entity_type}:${fc.entity_id}:${fc.field_name}`
      m.set(k, { pendingValue: fc.proposed_value, status: fc.status, rejection_reason: fc.rejection_reason })
    })
    return m
  }, [fieldChanges])

  const sectionCounts = (key: SectionKey) => {
    const matching = fieldChanges.filter((f) => sectionKeyFor(f.entity_type, f.field_name) === key)
    return {
      pending: matching.filter((f) => f.status === 'PENDING').length,
      rejected: matching.filter((f) => f.status === 'REJECTED').length,
    }
  }

  const totalFieldCount = fieldChanges.length

  const stageChanges = async (changes: { entityType: string; entityId: number | null; fieldName: string | null; previousValue: any; proposedValue: any }[]) => {
    if (changes.length === 0) {
      toast({ title: 'No changes to save' })
      return
    }
    const res = await fetch('/api/hotel-admin/cases/stage', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes }),
    })
    const data = await res.json()
    if (data.success) {
      toast({ title: 'Changes saved to draft', description: 'Live listing untouched — submit when ready.' })
      setOpenSection(null)
      fetchAll()
    } else {
      toast({ title: 'Could not save', description: data.message, variant: 'destructive' })
    }
  }

  const submitForReview = async () => {
    if (!confirm(`Submit your draft for review? This creates one Review Case containing ${totalFieldCount} field${totalFieldCount === 1 ? '' : 's'}. Editing will be locked until the System Admin reviews it.`)) return
    const res = await fetch('/api/hotel-admin/cases/submit', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (data.success) {
      toast({ title: 'Submitted for review', description: 'The System Admin will review your changes.' })
      fetchAll()
    } else {
      toast({ title: 'Could not submit', description: data.message, variant: 'destructive' })
    }
  }

  const discardDraft = async () => {
    if (!confirm('Discard this draft? All unsubmitted changes will be permanently lost.')) return
    const res = await fetch('/api/hotel-admin/cases', { method: 'DELETE', credentials: 'include' })
    const data = await res.json()
    if (data.success) {
      toast({ title: 'Draft discarded' })
      fetchAll()
    } else {
      toast({ title: 'Could not discard', description: data.message, variant: 'destructive' })
    }
  }

  if (loading || !hotel) {
    return <div className="p-8 text-sm text-muted-foreground">Loading property…</div>
  }

  const pendingName = pendingMap.get('HOTEL:null:name')?.pendingValue

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 animate-fade-in-up">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Property</h1>
          <p className="text-muted-foreground text-sm max-w-2xl mt-1">
            Manage every aspect of your hotel&apos;s public information. Changes are first saved as Drafts.
            Submitting creates <span className="font-medium text-foreground">one Review Case</span> that will be reviewed by the System Admin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/hotel/drafts')}>
            <ClipboardList className="h-4 w-4 mr-2" /> Draft Center
          </Button>
          {isDrafting && (
            <Button variant="ghost" size="sm" onClick={discardDraft}>
              <Trash2 className="h-4 w-4 mr-2" /> Discard Draft
            </Button>
          )}
          <Button variant="default" size="sm" disabled={!isDrafting} onClick={submitForReview}>
            <Send className="h-4 w-4 mr-2" /> Submit For Review
          </Button>
        </div>
      </div>

      {pendingReview && (
        <PendingReviewBanner fieldCount={totalFieldCount} submittedAt={currentCase?.submitted_at} onOpen={() => router.push('/dashboard/hotel/drafts')} />
      )}
      {isDrafting && (
        <UnsubmittedBanner fieldCount={totalFieldCount} onSubmit={submitForReview} />
      )}
      {isRejected && rejectedCount > 0 && (
        <RejectedBanner fieldCount={rejectedCount} />
      )}

      <PropertyHero hotel={hotel} pendingName={pendingName} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SectionKey)}>
        <TabsList className="flex-wrap h-auto">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.key} value={s.key} className="gap-1.5">
              <s.icon className="h-3.5 w-3.5" /> {s.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {SECTIONS.map((s) => {
          const counts = sectionCounts(s.key)
          return (
            <TabsContent key={s.key} value={s.key} className="mt-4">
              <SectionShell
                title={s.title}
                description={s.description}
                icon={s.icon}
                accent={s.accent}
                requiresApproval={s.requiresApproval}
                pendingCount={counts.pending}
                rejectedCount={counts.rejected}
                editingLocked={pendingReview}
                onEdit={() => setOpenSection(s.key)}
              >
                <SectionPreview sectionKey={s.key} hotel={hotel} pendingMap={pendingMap} />
              </SectionShell>
            </TabsContent>
          )
        })}
      </Tabs>

      <SectionEditDialog
        section={SECTIONS.find((s) => s.key === openSection) ?? null}
        fields={openSection ? fieldsFor(openSection, hotel) : []}
        pendingMap={pendingMap}
        editingLocked={pendingReview}
        hotel={hotel}
        onClose={() => setOpenSection(null)}
        onSaveFields={stageChanges}
        onRefetch={fetchAll}
      />

    </div>
  )
}

/* ---- Read-only preview body per section, shown inside each tab's card ---- */

function SectionPreview({ sectionKey, hotel, pendingMap }: { sectionKey: SectionKey; hotel: any; pendingMap: Map<string, { pendingValue: string }> }) {
  const p = (entityType: string, fieldName: string, entityId: number | null = null) => pendingMap.get(`${entityType}:${entityId}:${fieldName}`)?.pendingValue
  const d = hotel?.detail ?? {}

  switch (sectionKey) {
    case 'general':
      return (
        <div className="grid grid-cols-2 gap-4">
          <Row label="Hotel Name" value={hotel?.name} pending={p('HOTEL', 'name')} />
          <Row label="Hotel Type" value={hotel?.hotel_type?.name} />
          <Row label="Star Rating" value={d.star_rating != null ? String(d.star_rating) : ''} pending={p('HOTEL', 'star_rating')} />
          <div className="col-span-2">
            <Row label="Description" value={d.description} pending={p('HOTEL', 'description')} />
          </div>
        </div>
      )
    case 'location':
      return (
        <div className="grid grid-cols-2 gap-4">
          <Row label="City" value={hotel?.city?.name} />
          <Row label="Zip Code" value={hotel?.zip_code} pending={p('HOTEL', 'zip_code')} />
          <div className="col-span-2">
            <Row label="Address" value={hotel?.address} pending={p('HOTEL', 'address')} />
          </div>
          <div className="col-span-2">
            <Row label="Map Location" value={hotel?.map_location} pending={p('HOTEL', 'map_location')} />
          </div>
        </div>
      )
    case 'contacts':
      return (
        <div className="grid grid-cols-2 gap-4">
          <Row label="Email" value={hotel?.email} pending={p('HOTEL', 'email')} />
          <Row label="Reception 1" value={d.reception_no1} pending={p('HOTEL', 'reception_no1')} />
          <Row label="Reception 2" value={d.reception_no2} pending={p('HOTEL', 'reception_no2')} />
          <Row label="Website" value={d.website} pending={p('HOTEL', 'website')} />
          <Row label="Emergency Contact" value={d.emergency_contact_name} pending={p('HOTEL', 'emergency_contact_name')} />
          <Row label="Emergency Phone" value={d.emergency_contact_phone1} pending={p('HOTEL', 'emergency_contact_phone1')} />
        </div>
      )
    case 'amenities': {
      const items = (hotel?.hotel_amenities ?? []).map((h: any) => h.amenity?.name).filter(Boolean)
      return (
        <div className="flex flex-wrap gap-1.5">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No amenities selected yet.</p>}
          {items.map((a: string) => (
            <span key={a} className="text-[11px] px-2.5 py-1 rounded-full bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 text-foreground border border-fuchsia-500/20">{a}</span>
          ))}
        </div>
      )
    }
    case 'gallery': {
      const images = hotel?.images ?? []
      return (
        <div className="grid grid-cols-4 gap-2">
          {images.slice(0, 8).map((img: any) => (
            <div key={img.id} className="aspect-square rounded-lg bg-secondary/50 border border-border overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
          {images.length === 0 && <p className="text-sm text-muted-foreground col-span-4">No photos yet.</p>}
        </div>
      )
    }
    case 'policies': {
      const policies = hotel?.policies ?? []
      return (
        <div className="space-y-2">
          {policies.length === 0 && <p className="text-sm text-muted-foreground">No policies yet.</p>}
          {policies.map((pol: any) => (
            <div key={pol.id} className="text-sm">
              <span className="font-medium">{pol.name}</span>
              <span className="text-muted-foreground"> — {pol.description}</span>
            </div>
          ))}
        </div>
      )
    }
    case 'business': {
      const documents = hotel?.documents ?? []
      return (
        <div className="grid grid-cols-2 gap-2">
          {documents.length === 0 && <p className="text-sm text-muted-foreground col-span-2">No documents uploaded yet.</p>}
          {documents.slice(0, 6).map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/60 bg-secondary/30 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium truncate">{doc.document_type.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      )
    }
    case 'owner': {
      const owner = hotel?.owner_detail ?? {}
      return (
        <div className="grid grid-cols-2 gap-4">
          <Row label="Full Name" value={owner.full_name} pending={p('HOTEL_OWNER', 'full_name')} />
          <Row label="Phone" value={owner.phone} pending={p('HOTEL_OWNER', 'phone')} />
          <Row label="Email" value={owner.email} pending={p('HOTEL_OWNER', 'email')} />
          <Row label="NID" value={owner.nid_no} pending={p('HOTEL_OWNER', 'nid_no')} />
        </div>
      )
    }
    case 'admin': {
      const admin = hotel?.hotel_admin ?? {}
      const adminDetail = admin?.detail ?? {}
      return (
        <div className="grid grid-cols-2 gap-4">
          <Row label="Admin Name" value={admin.name} pending={p('HOTEL_ADMIN', 'name')} />
          <Row label="Email" value={admin.email} />
          <Row label="Phone" value={adminDetail.phone} pending={p('HOTEL_ADMIN', 'phone')} />
          <Row label="Address" value={adminDetail.address} pending={p('HOTEL_ADMIN', 'address')} />
        </div>
      )
    }
    default:
      return null
  }
}