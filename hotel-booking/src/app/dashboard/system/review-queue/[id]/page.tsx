'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, X, FileText, ExternalLink, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FieldChange {
  id: number
  entityType: string
  entityId: number | null
  fieldName: string | null
  label: string
  previousValue: string | null
  proposedValue: string
  status: string
  rejectionReason: string | null
}

interface CaseDetail {
  id: number
  status: string
  hotel: { id: number; name: string; city: string | null; isFirstCase: boolean }
  submittedBy: string
  submittedByEmail: string
  submittedAt: string
  updatedAt: string
  fields: FieldChange[]
  documents: { document_type: string; file_url: string }[]
  amenitiesMap?: Record<number, string>
}

const SECTION_TITLE: Record<string, string> = {
  HOTEL: 'Hotel', HOTEL_OWNER: 'Owner', HOTEL_ADMIN: 'Hotel Admin',
  HOTEL_IMAGE: 'Gallery', HOTEL_DOCUMENT: 'Documents', AMENITY: 'Amenities',
  POLICY: 'Policies',
}

function renderDiffValue(
  field: FieldChange,
  rawValue: string | null,
  isProposed: boolean,
  amenitiesMap: Record<number, string> = {}
) {
  if (rawValue === null || rawValue === '' || rawValue === undefined) {
    return <em className="italic text-muted-foreground/60">(empty)</em>
  }

  let parsed: any = null
  try {
    parsed = JSON.parse(rawValue)
  } catch {
    parsed = rawValue
  }

  // 1. HOTEL_IMAGE
  if (field.entityType === 'HOTEL_IMAGE') {
    const images: Array<{ image_url?: string; is_cover?: boolean; sort_order?: number }> = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed !== null && parsed.image_url
      ? [parsed]
      : typeof rawValue === 'string' && (rawValue.startsWith('/') || rawValue.startsWith('http'))
      ? [{ image_url: rawValue, is_cover: field.fieldName === 'is_cover' }]
      : []

    if (images.length > 0) {
      return (
        <div className="flex flex-wrap gap-2 py-1">
          {images.map((img, i) => (
            <div key={i} className="group relative h-20 w-28 overflow-hidden rounded-md border border-border/60 bg-muted/40 shadow-sm">
              {img.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.image_url} alt={`Preview ${i + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No URL</div>
              )}
              {img.is_cover && (
                <span className="absolute left-1 top-1 rounded bg-amber-500/90 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white shadow">
                  Cover
                </span>
              )}
              {img.image_url && (
                <a
                  href={img.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <ExternalLink className="h-4 w-4 text-white" />
                </a>
              )}
            </div>
          ))}
        </div>
      )
    }

    if (field.fieldName === 'is_cover') {
      const isCover = parsed === true || rawValue === 'true'
      return (
        <span className={cn('inline-flex items-center gap-1 font-semibold text-xs', isCover ? 'text-amber-500' : 'text-muted-foreground')}>
          {isCover ? '⭐ Set as Cover Image' : 'Not Cover'}
        </span>
      )
    }

    if (field.fieldName === 'deleted') {
      return <span className="font-semibold text-xs text-red-500">Deleted</span>
    }
  }

  // 2. HOTEL_DOCUMENT
  if (field.entityType === 'HOTEL_DOCUMENT') {
    const docs: Array<{ document_type?: string; file_url?: string }> = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed !== null
      ? [parsed]
      : typeof rawValue === 'string' && (rawValue.startsWith('/') || rawValue.startsWith('http'))
      ? [{ document_type: 'DOCUMENT', file_url: rawValue }]
      : []

    if (docs.length > 0) {
      return (
        <div className="flex flex-col gap-2 py-1">
          {docs.map((doc, i) => {
            const typeLabel = (doc.document_type || 'DOCUMENT').replace(/_/g, ' ')
            return (
              <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card p-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-semibold truncate">{typeLabel}</span>
                </div>
                {doc.file_url ? (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 font-medium text-xs text-primary hover:bg-primary/20 transition-colors shrink-0"
                  >
                    <ExternalLink className="h-3 w-3" /> View / Download
                  </a>
                ) : (
                  <span className="text-[10px] text-muted-foreground">(No URL)</span>
                )}
              </div>
            )
          })}
        </div>
      )
    }
  }

  // 3. AMENITY
  if (field.entityType === 'AMENITY' && field.fieldName === 'selection') {
    const ids: number[] = Array.isArray(parsed) ? parsed : typeof parsed === 'number' ? [parsed] : []
    if (ids.length === 0) {
      return <em className="italic text-muted-foreground/60">(no amenities selected)</em>
    }
    return (
      <div className="flex flex-wrap gap-1.5 py-1">
        {ids.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-sm border border-border/80 bg-secondary/80 px-2 py-0.5 text-xs font-medium">
            {amenitiesMap[id] || `Amenity #${id}`}
          </span>
        ))}
      </div>
    )
  }

  // 4. URL string check
  if (typeof rawValue === 'string' && (rawValue.startsWith('http://') || rawValue.startsWith('https://'))) {
    return (
      <a href={rawValue} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline hover:opacity-80">
        {rawValue} <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    )
  }

  // 5. Default text output
  if (typeof parsed === 'object' && parsed !== null) {
    return <pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify(parsed, null, 2)}</pre>
  }

  return <span className="whitespace-pre-wrap text-xs">{String(parsed)}</span>
}

function formatRelative(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function CaseReviewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [c, setC] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [rejected, setRejected] = useState<Record<number, string>>({}) // fieldChangeId -> reason (local, unsaved)
  const [submitting, setSubmitting] = useState(false)
  const [rejectAllOpen, setRejectAllOpen] = useState(false)
  const [rejectAllReason, setRejectAllReason] = useState('')

  const load = useCallback(() => {
    fetch(`/api/system-admin/cases/${params.id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setC(d?.data ?? null))
      .finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="px-6 py-16 text-center text-sm text-muted-foreground">Loading…</div>
  if (!c) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">Case not found.</p>
        <Link href="/dashboard/system/review-queue" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to Review Queue
        </Link>
      </div>
    )
  }

  const readOnly = c.status !== 'PENDING'
  const pendingFields = c.fields.filter((f) => f.status === 'PENDING')
  const rejectedCount = Object.keys(rejected).length
  const willPublishCount = pendingFields.length - rejectedCount

  const toggleReject = (fieldId: number) => {
    setRejected((r) => {
      const next = { ...r }
      if (fieldId in next) delete next[fieldId]
      else next[fieldId] = ''
      return next
    })
  }

  const grouped = pendingFields.reduce<Record<string, FieldChange[]>>((acc, f) => {
    (acc[f.entityType] ??= []).push(f)
    return acc
  }, {})

  const handleApproveRemaining = async () => {
    if (Object.values(rejected).some((r) => !r.trim())) {
      alert('Every rejected field needs a reason before you can continue.')
      return
    }
    setSubmitting(true)
    try {
      for (const [fieldId, reason] of Object.entries(rejected)) {
        await fetch(`/api/system-admin/cases/${c.id}/field-changes/${fieldId}/reject`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        })
      }
      const res = await fetch(`/api/system-admin/cases/${c.id}/approve-remaining`, {
        method: 'POST', credentials: 'include',
      })
      const data = await res.json()
      if (data.success) router.push('/dashboard/system/review-queue')
      else alert(data.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRejectEntire = async () => {
    if (!rejectAllReason.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/system-admin/cases/${c.id}/reject-entire`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectAllReason }),
      })
      const data = await res.json()
      if (data.success) router.push('/dashboard/system/review-queue')
      else alert(data.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-4 pb-28">
      {/* Header strip */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 pb-3">
        <Link href="/dashboard/system/review-queue" className="rounded-sm border border-border/60 bg-secondary/40 p-1 hover:bg-secondary">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
        <span className="font-mono text-sm">CASE-{c.id}</span>
        <Link href={`/dashboard/system/hotels/${c.hotel.id}`} className="text-[13px] font-medium hover:underline">
          {c.hotel.name}
        </Link>
        <span className="text-xs text-muted-foreground">· {c.hotel.city ?? '—'}</span>
        <span className="text-xs text-muted-foreground">Submitted by {c.submittedBy}</span>
        {c.hotel.isFirstCase && (
          <span className="rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">
            First Publication
          </span>
        )}
        <div className="ml-auto">
          <span className={cn(
            'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
            c.status === 'PENDING' ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
              : c.status === 'APPROVED' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
              : 'border-red-500/40 bg-red-500/10 text-red-500',
          )}>
            {c.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* LEFT */}
        <div className="min-w-0 space-y-4">
          {/* Requested Changes */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold">Requested Changes</h2>
              <span className="text-[11px] text-muted-foreground">
                Reject any field you don't want to publish. Everything left pending will be approved.
              </span>
            </div>
            <div className="space-y-3">
              {Object.entries(grouped).map(([entityType, fields]) => (
                <div key={entityType} className="overflow-hidden rounded-md border border-border/60 bg-card">
                  <div className="border-b border-border/60 bg-secondary/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {SECTION_TITLE[entityType] ?? entityType}
                  </div>
                  {fields.map((f) => {
                    const isRejected = f.id in rejected
                    return (
                      <div key={f.id} className={cn('grid grid-cols-[160px_1fr_1fr_auto] gap-0 border-b border-border/40 last:border-b-0', isRejected && 'opacity-60')}>
                        <div className="border-r border-border/40 bg-secondary/30 px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                          {f.label}
                          {isRejected && (
                            <div className="mt-1 inline-flex items-center gap-1 rounded-sm border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-red-500">
                              <X className="h-3 w-3" /> Rejected
                            </div>
                          )}
                        </div>
                        <div className="border-r border-border/40 bg-red-500/[0.04] px-3 py-2 text-xs text-muted-foreground">
                          {renderDiffValue(f, f.previousValue, false, c.amenitiesMap)}
                        </div>
                        <div className={cn('bg-emerald-500/[0.06] px-3 py-2 text-xs', isRejected ? 'text-muted-foreground line-through' : 'text-emerald-500')}>
                          {renderDiffValue(f, f.proposedValue, true, c.amenitiesMap)}
                        </div>
                        <div className="flex items-center gap-1 px-2 py-2">
                          {!readOnly && (
                            <button
                              onClick={() => toggleReject(f.id)}
                              className={cn(
                                'rounded-sm border p-1 transition-colors',
                                isRejected ? 'border-red-500/40 bg-red-500/10 text-red-500' : 'border-border/60 text-muted-foreground hover:bg-secondary',
                              )}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              {pendingFields.length === 0 && (
                <p className="rounded-md border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
                  No pending fields on this case.
                </p>
              )}
            </div>
          </div>

          {/* Supporting Documents */}
          {c.documents.length > 0 && (
            <div>
              <h2 className="mb-2 text-[13px] font-semibold">Supporting Documents</h2>
              <div className="overflow-hidden rounded-md border border-border/60 bg-card">
                <ul className="divide-y divide-border/40 text-sm">
                  {c.documents.map((d, i) => (
                    <li key={i} className="flex items-center gap-3 px-3 py-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px]">{d.document_type}</div>
                      </div>
                      <a href={d.file_url} target="_blank" className="text-xs text-primary hover:underline">View</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <aside className="h-fit space-y-3 lg:sticky lg:top-16">
          <div className="rounded-md border border-border/60 bg-card p-3">
            <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Review Summary</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Modified fields</span><span className="font-mono tabular-nums">{pendingFields.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Will publish</span><span className="font-mono tabular-nums text-emerald-500">{willPublishCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Marked rejected</span><span className="font-mono tabular-nums text-red-500">{rejectedCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Submitted</span><span>{formatRelative(c.submittedAt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last update</span><span>{formatRelative(c.updatedAt)}</span></div>
            </div>
          </div>

          {/* Rejection Reasons — our addition, not in the dummy. Every field
              currently toggled to rejected shows here with its own reason
              input; these get submitted alongside Approve Remaining. */}
          {rejectedCount > 0 && (
            <div className="rounded-md border border-red-500/30 bg-card p-3">
              <div className="mb-2 text-[11px] uppercase tracking-wider text-red-500">Rejection Reasons</div>
              <div className="space-y-3">
                {Object.keys(rejected).map((fieldIdStr) => {
                  const fieldId = Number(fieldIdStr)
                  const field = c.fields.find((f) => f.id === fieldId)
                  return (
                    <div key={fieldId}>
                      <div className="mb-1 text-[11px] font-semibold">{field?.label ?? `Field ${fieldId}`}</div>
                      <textarea
                        value={rejected[fieldId]}
                        onChange={(e) => setRejected((r) => ({ ...r, [fieldId]: e.target.value }))}
                        placeholder="Why is this field being rejected?"
                        rows={2}
                        className="w-full resize-none rounded-sm border border-border/60 bg-secondary/30 p-2 text-xs outline-none placeholder:text-muted-foreground focus:border-red-500/60"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Sticky bottom action bar */}
      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-6 py-3">
            <div className="text-xs text-muted-foreground">
              {rejectedCount > 0
                ? `${rejectedCount} field${rejectedCount === 1 ? '' : 's'} marked rejected. Remaining ${willPublishCount} will be published on approve.`
                : `All ${pendingFields.length} field${pendingFields.length === 1 ? '' : 's'} will be published.`}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setRejectAllOpen(true)}
                disabled={submitting}
                className="inline-flex h-9 items-center gap-2 rounded-sm border border-red-500/40 bg-red-500/10 px-3 text-sm text-red-500 hover:bg-red-500/20"
              >
                <X className="h-4 w-4" /> Reject Entire Request
              </button>
              <button
                onClick={handleApproveRemaining}
                disabled={submitting || willPublishCount === 0}
                className="inline-flex h-9 items-center gap-2 rounded-sm bg-emerald-500/20 px-3 text-sm text-emerald-500 hover:bg-emerald-500/30 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Approve Remaining Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectAllOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm rounded-md border border-border/60 bg-card p-4">
            <h3 className="text-sm font-semibold">Reject entire request?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              The submitter will be notified and no fields will be applied.
            </p>
            <textarea
              value={rejectAllReason}
              onChange={(e) => setRejectAllReason(e.target.value)}
              placeholder="Reason for rejecting the entire case…"
              rows={3}
              className="mt-3 w-full resize-none rounded-sm border border-border/60 bg-secondary/30 p-2 text-xs outline-none placeholder:text-muted-foreground focus:border-red-500/60"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setRejectAllOpen(false)} className="rounded-sm border border-border/60 px-3 py-1.5 text-xs">Cancel</button>
              <button
                onClick={handleRejectEntire}
                disabled={!rejectAllReason.trim() || submitting}
                className="rounded-sm bg-red-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}