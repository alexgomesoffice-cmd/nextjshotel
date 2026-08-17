'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Save, Clock, ShieldCheck, Camera, Upload, ImageIcon, X, Plus, FileText,
  Trash2, CheckCircle2, Star,
} from 'lucide-react'
import { FieldDef } from './property-ui'

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

export const SectionInlineEditor = ({
  section, fields, pendingMap, editingLocked, hotel, onClose, onSaveFields, onRefetch,
}: {
  section: SectionMeta | null
  fields: FieldDef[]
  pendingMap: Map<string, { pendingValue: string; status: string; rejection_reason?: string | null }>
  editingLocked: boolean
  hotel: any
  onClose: () => void
  onSaveFields: (changes: { entityType: string; entityId: number | null; fieldName: string | null; previousValue: string; proposedValue: string }[]) => void
  onRefetch: () => void
}) => {
  const [buffer, setBuffer] = useState<Record<string, string>>({})
  const [selection, setSelection] = useState<number[]>(() => (hotel?.hotel_amenities ?? []).map((h: any) => h.amenity_id))
  const galleryCommitRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const registerGalleryCommit = useCallback((commit: () => Promise<void>) => {
    galleryCommitRef.current = commit
  }, [])
  if (!section) return null

  const isAmenities = section.key === 'amenities'
  const isGallery = section.key === 'gallery'
  const isPolicies = section.key === 'policies'
  const isBusiness = section.key === 'business'

  const keyOf = (f: FieldDef) => `${f.entityType}:${f.entityId}:${f.fieldName}`

  const handleDone = async () => {
    if (isAmenities) {
      const selectedIds = [...selection].sort()
      onSaveFields([{
        entityType: 'AMENITY', entityId: null, fieldName: 'selection',
        previousValue: JSON.stringify((hotel?.hotel_amenities ?? []).map((h: any) => h.amenity_id).sort()),
        proposedValue: JSON.stringify(selectedIds),
      }])
      onClose()
      return
    }

    if (isGallery) {
      await galleryCommitRef.current()
      onClose()
      return
    }

    const changes = fields
      .filter((f) => !f.locked)
      .map((f) => {
        const k = keyOf(f)
        const raw = buffer[k]
        const proposed = raw !== undefined ? raw : (pendingMap.get(k)?.pendingValue ?? f.currentValue)
        return {
          entityType: f.entityType,
          entityId: f.entityId,
          fieldName: f.fieldName,
          previousValue: f.currentValue,
          proposedValue: proposed,
        }
      })
      .filter((c) => c.proposedValue !== c.previousValue || pendingMap.has(`${c.entityType}:${c.entityId}:${c.fieldName}`))

    onSaveFields(changes)
    onClose()
  }

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4 space-y-4 animate-fade-in-up">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Editing {section.title}</p>
          <p className="text-xs text-muted-foreground">Current values stay live until the draft is approved.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="default" size="sm" disabled={editingLocked} onClick={handleDone}>
            <Save className="h-4 w-4 mr-2" /> Done
          </Button>
        </div>
      </div>

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

      {isGallery ? (
        <GalleryEditor hotel={hotel} disabled={editingLocked} onChanged={onRefetch} onCommitReady={registerGalleryCommit} />
      ) : isAmenities ? (
        <AmenitiesEditor hotel={hotel} disabled={editingLocked} selection={selection} setSelection={setSelection} />
      ) : isPolicies ? (
        <PoliciesEditor hotel={hotel} disabled={editingLocked} onStage={onSaveFields} />
      ) : isBusiness ? (
        <DocumentsEditor hotel={hotel} disabled={editingLocked} onChanged={onRefetch} />
      ) : (
        <div className="space-y-3">
          {fields.map((f) => (
            <InlineFieldEditor
              key={keyOf(f)}
              field={f}
              pending={pendingMap.get(keyOf(f))?.pendingValue}
              bufferValue={buffer[keyOf(f)]}
              onChange={(v) => setBuffer((prev) => ({ ...prev, [keyOf(f)]: v }))}
              disabled={editingLocked || f.locked}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const InlineFieldEditor = ({
  field, pending, bufferValue, onChange, disabled,
}: {
  field: FieldDef
  pending?: string
  bufferValue?: string
  onChange: (v: string) => void
  disabled?: boolean
}) => {
  const displayed = bufferValue ?? pending ?? field.currentValue
  const isDirty = displayed !== field.currentValue

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{field.label}</p>
          
        </div>
        {isDirty && !field.locked && (
          <span className="text-[10px] uppercase tracking-wide text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5">Changed</span>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Current value</Label>
          <div className="text-sm bg-muted/50 rounded-md px-3 py-2 border border-border/60 min-h-[40px] break-words">
            {field.currentValue || <span className="text-muted-foreground/60">—</span>}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">New value</Label>
          </div>
          {field.multiline ? (
            <Textarea rows={4} value={displayed} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
          ) : (
            <Input
              type={field.type ?? 'text'}
              step={field.step}
              min={field.min}
              max={field.max}
              value={displayed}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
            />
          )}
          {field.helper && <p className="text-[10px] text-muted-foreground">{field.helper}</p>}
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Amenities — checkbox picker, staged as one AMENITY selection change */
/* ================================================================== */

const AmenitiesEditor = ({ hotel, disabled, selection, setSelection }: { hotel: any; disabled: boolean; selection: number[]; setSelection: (ids: number[]) => void }) => {
  const [all, setAll] = useState<{ id: number; name: string }[] | null>(null)
  const selectedIds = (hotel?.hotel_amenities ?? []).map((h: any) => h.amenity_id)

  useEffect(() => {
    fetch('/api/hotel-admin/amenities', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAll(d?.data?.HOTEL ?? []))
      .catch(() => setAll([]))
  }, [])

  if (all === null) return <p className="text-sm text-muted-foreground">Loading amenities…</p>

  const toggle = (id: number) => {
    if (disabled) return
    setSelection(selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id])
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current amenities</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedIds.length === 0 ? (
              <span className="text-xs text-muted-foreground">No amenities selected</span>
            ) : (
              all.filter((a) => selectedIds.includes(a.id)).map((a) => (
                <span key={a.id} className="text-xs px-2.5 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-600">
                  {a.name}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">New selection</p>
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
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Gallery — uploads/deletes stage immediately per-action (own API)    */
/* ================================================================== */

const GalleryEditor = ({ hotel, disabled, onChanged, onCommitReady }: { hotel: any; disabled: boolean; onChanged: () => void; onCommitReady: (commit: () => Promise<void>) => void }) => {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const commitRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const [previewUrls, setPreviewUrls] = useState<{ url: string; name: string }[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingRemoveIds, setPendingRemoveIds] = useState<number[]>([])
  const [pendingCoverId, setPendingCoverId] = useState<number | null>(null)
  const [pendingPreviewCoverIndex, setPendingPreviewCoverIndex] = useState<number | null>(null)
  const images = hotel?.images ?? []
  const currentCoverId = (images.find((img: any) => img.is_cover)?.id) ?? null

  const upload = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const selectedFiles = Array.from(files)
    setPendingFiles((prev) => [...prev, ...selectedFiles])
    setPreviewUrls((prev) => [...prev, ...selectedFiles.map((f) => ({ url: URL.createObjectURL(f), name: f.name }))])
  }

  const remove = (id: number) => {
    setPendingRemoveIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const removePreview = (index: number) => {
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index))
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
    setPendingPreviewCoverIndex((prev) => (prev === index ? null : prev))
  }

  const setCover = (id: number) => {
    setPendingCoverId(id)
  }

  const setPreviewCover = (index: number) => {
    setPendingPreviewCoverIndex(index)
  }

  const commit = async () => {
    if (pendingFiles.length > 0) {
      setBusy(true)
      const fd = new FormData()
      pendingFiles.forEach((f) => fd.append('files', f))
      if (pendingPreviewCoverIndex !== null) {
        fd.append('set_as_cover_index', String(pendingPreviewCoverIndex))
      } else if (currentCoverId === null) {
        fd.append('set_as_cover', 'true')
      }
      try {
        const res = await fetch('/api/hotel-admin/hotel/images', { method: 'POST', credentials: 'include', body: fd })
        const data = await res.json()
        if (!data.success) {
          toast({ title: 'Upload failed', description: data.message, variant: 'destructive' })
          return
        }
      } finally {
        setBusy(false)
      }
    }

    for (const id of pendingRemoveIds) {
      const res = await fetch(`/api/hotel-admin/hotel/images/${id}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (!data.success) {
        toast({ title: 'Failed', description: data.message, variant: 'destructive' })
        return
      }
    }

    if (pendingCoverId !== null && pendingCoverId !== currentCoverId) {
      const res = await fetch(`/api/hotel-admin/hotel/images/${pendingCoverId}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_cover: true }),
      })
      const data = await res.json()
      if (!data.success) {
        toast({ title: 'Cover update failed', description: data.message, variant: 'destructive' })
        return
      }
    }

    toast({ title: 'Gallery changes staged', description: 'Pending review — live gallery unchanged until approval.' })
    setPendingFiles([])
    setPendingRemoveIds([])
    setPendingCoverId(null)
    setPendingPreviewCoverIndex(null)
    setPreviewUrls([])
    onChanged()
  }

  useEffect(() => {
    commitRef.current = commit
  }, [commit])

  useEffect(() => {
    onCommitReady(() => commitRef.current())
  }, [onCommitReady])

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Adding or removing photos creates pending gallery changes. Your live gallery remains active until approval.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current gallery</p>
          <div className="grid grid-cols-2 gap-2">
            {images.map((img: any) => (
              <div key={img.id} className="aspect-square rounded-lg bg-secondary/50 border border-border relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                {img.is_cover && (
                  <span className="absolute left-1 top-1 rounded-full bg-amber-500 text-black text-[10px] font-semibold px-1.5 py-0.5 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-black text-black" />
                    Cover
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Update gallery</p>
            <label className={cn(
              'inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground hover:border-emerald-500 transition',
              (disabled || busy) && 'opacity-50 pointer-events-none',
            )}>
              <Upload className="h-3.5 w-3.5" />
              <span>Upload</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Existing live images (excluding those marked for deletion) */}
            {images
              .filter((img: any) => !pendingRemoveIds.includes(img.id))
              .map((img: any) => {
                const isCover = pendingPreviewCoverIndex === null && (pendingCoverId === img.id || (pendingCoverId === null && img.is_cover))

                return (
                  <div key={img.id} className="aspect-square rounded-lg bg-secondary/50 border border-border relative overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                    {isCover && (
                      <span className="absolute left-1 top-1 rounded-full bg-amber-500 text-black text-[10px] font-semibold px-1.5 py-0.5 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-black text-black" />
                        Cover
                      </span>
                    )}
                    <div className="absolute inset-x-1 top-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        disabled={disabled || busy}
                        onClick={() => {
                          setPendingCoverId(img.id)
                          setPendingPreviewCoverIndex(null)
                        }}
                        className={cn(
                          'h-6 w-6 rounded-full border border-white/20 flex items-center justify-center transition',
                          isCover ? 'bg-amber-500 text-black' : 'bg-black/70 text-white hover:bg-black/90',
                        )}
                        title="Set as cover"
                      >
                        <Star className={cn('h-3.5 w-3.5', isCover ? 'fill-black text-black' : 'text-white')} />
                      </button>
                      <button
                        disabled={disabled || busy}
                        onClick={() => remove(img.id)}
                        className="h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                        title="Delete image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}

            {/* Newly uploaded file previews */}
            {previewUrls.map((preview, index) => {
              const isSelectedCover = pendingPreviewCoverIndex === index

              return (
                <div key={`${preview.name}-${index}`} className="aspect-square rounded-lg bg-secondary/50 border border-border relative overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview.url} alt={preview.name} className="h-full w-full object-cover" />
                  <span className="absolute left-1 top-1 rounded-full bg-emerald-500 text-black text-[10px] font-semibold px-1.5 py-0.5">
                    New
                  </span>
                  {isSelectedCover && (
                    <span className="absolute right-1 top-1 rounded-full bg-amber-500 text-black text-[10px] font-semibold px-1.5 py-0.5 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-black text-black" />
                      Cover
                    </span>
                  )}
                  <div className="absolute inset-x-1 top-1 flex items-center justify-end gap-1 opacity-100 transition">
                    <button
                      disabled={disabled || busy}
                      onClick={() => {
                        setPreviewCover(index)
                        setPendingCoverId(null)
                      }}
                      className={cn(
                        'h-6 w-6 rounded-full border border-white/20 flex items-center justify-center transition',
                        isSelectedCover ? 'bg-amber-500 text-black' : 'bg-black/70 text-white hover:bg-black/90',
                      )}
                      title="Set as cover"
                    >
                      <Star className={cn('h-3.5 w-3.5', isSelectedCover ? 'fill-black text-black' : 'text-white')} />
                    </button>
                    <button
                      disabled={disabled || busy}
                      onClick={() => removePreview(index)}
                      className="h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                      title="Remove preview"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {previewUrls.length === 0 && images.filter((img: any) => !pendingRemoveIds.includes(img.id)).length === 0 && (
            <div className="aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 bg-secondary/20">
              <Camera className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No photos yet</p>
            </div>
          )}
        </div>
      </div>
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