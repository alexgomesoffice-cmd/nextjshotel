'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Save, Clock, ShieldCheck, Camera, Upload, ImageIcon, X, Plus, FileText,
  Trash2, CheckCircle2,
} from 'lucide-react'
import { FieldEditor, FieldDef } from './property-ui'

const DOCUMENT_TYPES: { key: string; label: string }[] = [
  { key: 'TRADE_LICENSE', label: 'Trade License' },
  { key: 'TAX_CERTIFICATE', label: 'Tax Certificate' },
  { key: 'TIN_CERTIFICATE', label: 'TIN Certificate' },
  { key: 'VAT_CERTIFICATE', label: 'VAT Registration' },
  { key: 'BUSINESS_DOCUMENT', label: 'Business Document' },
  { key: 'OWNER_DOCUMENT', label: "Owner's Information Document" },
  { key: 'ADMIN_DOCUMENT', label: "Admin's Information Document" },
]

type SectionMeta = {
  key: string
  title: string
  description: string
  icon: any
  accent: string
  requiresApproval?: boolean
  approvalNote?: string
}

export const SectionEditDialog = ({
  section, fields, pendingMap, editingLocked, hotel, onClose, onSaveFields, onRefetch,
}: {
  section: SectionMeta | null
  fields: FieldDef[]
  pendingMap: Map<string, { pendingValue: string; status: string; rejection_reason?: string | null }>
  editingLocked: boolean
  hotel: any
  onClose: () => void
  onSaveFields: (changes: { entityType: string; entityId: number | null; fieldName: string; previousValue: string; proposedValue: string }[]) => void
  onRefetch: () => void
}) => {
  const [buffer, setBuffer] = useState<Record<string, string>>({})
  if (!section) return null

  const isAmenities = section.key === 'amenities'
  const isGallery = section.key === 'gallery'
  const isPolicies = section.key === 'policies'
  const isBusiness = section.key === 'business'

  const keyOf = (f: FieldDef) => `${f.entityType}:${f.entityId}:${f.fieldName}`

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full sm:max-w-[600px] max-h-[85vh] p-0 flex flex-col gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl bg-gradient-to-br shrink-0', section.accent)}>
              <section.icon className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Edit {section.title}</DialogTitle>
              <DialogDescription className="mt-0.5">
                Changes are saved to your draft — not to the live listing.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pt-4 space-y-3">
          {editingLocked && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 p-3 text-xs flex gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              Editing is temporarily locked while your submission is under review.
            </div>
          )}
          {section.requiresApproval && !editingLocked && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-700 p-3 text-xs flex gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {section.approvalNote}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 custom-scrollbar">
          {isGallery ? (
            <GalleryEditor hotel={hotel} disabled={editingLocked} onChanged={onRefetch} />
          ) : isAmenities ? (
            <AmenitiesEditor hotel={hotel} disabled={editingLocked} onStage={onSaveFields} />
          ) : isPolicies ? (
            <PoliciesEditor hotel={hotel} disabled={editingLocked} onStage={onSaveFields} />
          ) : isBusiness ? (
            <DocumentsEditor hotel={hotel} disabled={editingLocked} onChanged={onRefetch} />
          ) : (
            fields.map((f) => (
              <FieldEditor
                key={keyOf(f)}
                field={f}
                pending={pendingMap.get(keyOf(f))?.pendingValue}
                bufferValue={buffer[keyOf(f)]}
                onChange={(v) => setBuffer({ ...buffer, [keyOf(f)]: v })}
                disabled={editingLocked || f.locked}
              />
            ))
          )}
        </div>

        {!isGallery && !isAmenities && !isPolicies && !isBusiness && (
          <DialogFooter className="border-t border-border p-4 flex-row items-center justify-between gap-3 bg-background/60">
            <p className="text-[11px] text-muted-foreground">
              {editingLocked ? 'Locked' : 'Live values remain active until approval'}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                variant="default"
                disabled={editingLocked}
                onClick={() => {
                  const changes = fields
                    .filter((f) => !f.locked)
                    .map((f) => {
                      const k = keyOf(f)
                      const raw = buffer[k]
                      const proposed = raw !== undefined ? raw : (pendingMap.get(k)?.pendingValue ?? f.currentValue)
                      return { entityType: f.entityType, entityId: f.entityId, fieldName: f.fieldName, previousValue: f.currentValue, proposedValue: proposed }
                    })
                    .filter((c) => c.proposedValue !== c.previousValue || pendingMap.has(`${c.entityType}:${c.entityId}:${c.fieldName}`))
                  onSaveFields(changes)
                }}
              >
                <Save className="h-4 w-4 mr-2" /> Save Draft
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/* Amenities — checkbox picker, staged as one AMENITY selection change */
/* ================================================================== */

const AmenitiesEditor = ({ hotel, disabled, onStage }: { hotel: any; disabled: boolean; onStage: (changes: any[]) => void }) => {
  const [all, setAll] = useState<{ id: number; name: string }[] | null>(null)
  const selectedIds = (hotel?.hotel_amenities ?? []).map((h: any) => h.amenity_id)
  const [selection, setSelection] = useState<number[]>(selectedIds)

  useEffect(() => {
    fetch('/api/hotel-admin/amenities', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAll(d?.data?.HOTEL ?? []))
      .catch(() => setAll([]))
  }, [])

  if (all === null) return <p className="text-sm text-muted-foreground">Loading amenities…</p>

  const toggle = (id: number) => {
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {all.map((a) => {
          const checked = selection.includes(a.id)
          return (
            <button
              key={a.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(a.id)}
              className={cn(
                'text-xs px-2.5 py-1.5 rounded-full border inline-flex items-center gap-1.5 transition',
                checked
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                  : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground',
              )}
            >
              {checked && <CheckCircle2 className="h-3 w-3" />}
              {a.name}
            </button>
          )
        })}
      </div>
      <div className="flex justify-end">
        <Button
          variant="default"
          size="sm"
          disabled={disabled}
          onClick={() =>
            onStage([{
              entityType: 'AMENITY', entityId: null, fieldName: 'selection',
              previousValue: JSON.stringify(selectedIds.sort()), proposedValue: JSON.stringify(selection.sort()),
            }])
          }
        >
          <Save className="h-4 w-4 mr-2" /> Save Draft
        </Button>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Gallery — uploads/deletes stage immediately per-action (own API)    */
/* ================================================================== */

const GalleryEditor = ({ hotel, disabled, onChanged }: { hotel: any; disabled: boolean; onChanged: () => void }) => {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const images = hotel?.images ?? []

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    const fd = new FormData()
    Array.from(files).forEach((f) => fd.append('files', f))
    try {
      const res = await fetch('/api/hotel-admin/hotel/images', { method: 'POST', credentials: 'include', body: fd })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Photo proposed', description: 'Pending review — live gallery unchanged.' })
        onChanged()
      } else {
        toast({ title: 'Upload failed', description: data.message, variant: 'destructive' })
      }
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/hotel-admin/hotel/images/${id}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Removal proposed', description: 'Pending review — live gallery unchanged.' })
        onChanged()
      } else {
        toast({ title: 'Failed', description: data.message, variant: 'destructive' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Adding or removing photos creates pending gallery changes. Your live gallery remains active until approval.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img: any) => (
          <div key={img.id} className="aspect-square rounded-lg bg-secondary/50 border border-border relative overflow-hidden group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.image_url} alt="" className="h-full w-full object-cover" />
            <button
              disabled={disabled || busy}
              onClick={() => remove(img.id)}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <label className={cn(
          'aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-emerald-500 transition cursor-pointer',
          (disabled || busy) && 'opacity-50 pointer-events-none',
        )}>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          <Upload className="h-5 w-5" />
        </label>
      </div>
      {images.length === 0 && (
        <div className="aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 bg-secondary/20">
          <Camera className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No photos yet</p>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* Policies — hotel-authored list, staged (create / edit / delete)     */
/* ================================================================== */

const PoliciesEditor = ({ hotel, disabled, onStage }: { hotel: any; disabled: boolean; onStage: (changes: any[]) => void }) => {
  const policies = hotel?.policies ?? []
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {policies.map((p: any) => (
          <div key={p.id} className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{p.name}</p>
              <Button
                variant="ghost" size="sm" disabled={disabled}
                onClick={() => onStage([{ entityType: 'POLICY', entityId: p.id, fieldName: 'deleted', previousValue: JSON.stringify({ name: p.name, description: p.description }), proposedValue: 'true' }])}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{p.description}</p>
          </div>
        ))}
        {policies.length === 0 && <p className="text-sm text-muted-foreground">No policies yet — add your first one below.</p>}
      </div>

      <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
        <p className="text-xs font-semibold">Add a new policy</p>
        <Input placeholder="Policy name (e.g. Pet Policy)" value={newName} onChange={(e) => setNewName(e.target.value)} disabled={disabled} />
        <Textarea placeholder="Describe the policy…" rows={3} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} disabled={disabled} />
        <div className="flex justify-end">
          <Button
            variant="outline" size="sm" disabled={disabled || !newName.trim() || !newDesc.trim()}
            onClick={() => {
              onStage([{ entityType: 'POLICY', entityId: null, fieldName: null, previousValue: '', proposedValue: JSON.stringify({ name: newName, description: newDesc }) }])
              setNewName(''); setNewDesc('')
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Propose Policy
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Business & Documents — one upload slot per DocumentType             */
/* ================================================================== */

const DocumentsEditor = ({ hotel, disabled, onChanged }: { hotel: any; disabled: boolean; onChanged: () => void }) => {
  const { toast } = useToast()
  const [busyType, setBusyType] = useState<string | null>(null)
  const documents: any[] = hotel?.documents ?? []

  const upload = async (documentType: string, file: File | null, existingId?: number) => {
    if (!file) return
    setBusyType(documentType)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('document_type', documentType)
    if (existingId) fd.append('existing_id', String(existingId))
    try {
      const res = await fetch('/api/hotel-admin/documents', { method: 'POST', credentials: 'include', body: fd })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Document proposed', description: 'Pending review — live document unchanged.' })
        onChanged()
      } else {
        toast({ title: 'Upload failed', description: data.message, variant: 'destructive' })
      }
    } finally {
      setBusyType(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-700 p-3 text-xs flex gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Replacing any document creates a pending change. The live document remains active until approval.
      </div>
      {DOCUMENT_TYPES.map(({ key, label }) => {
        const doc = documents.find((d) => d.document_type === key)
        const busy = busyType === key
        return (
          <div key={key} className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3">
            <div className="w-9 h-9 rounded-lg bg-secondary/50 text-muted-foreground flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground truncate">
                {doc ? 'Uploaded — optional to replace' : 'Not uploaded yet — optional'}
              </p>
            </div>
            <label className={cn('shrink-0', (disabled || busy) && 'opacity-50 pointer-events-none')}>
              <input
                type="file"
                accept=".pdf,.jpg"
                className="hidden"
                onChange={(e) => upload(key, e.target.files?.[0] ?? null, doc?.id)}
              />
              <Button asChild variant="outline" size="sm" disabled={disabled || busy}>
                <span><Upload className="h-3.5 w-3.5 mr-1.5" /> {doc ? 'Replace' : 'Upload'}</span>
              </Button>
            </label>
          </div>
        )
      })}
    </div>
  )
}