'use client'

import { useEffect, useState } from 'react'
import { X, ImageIcon, FileText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FieldReviewBadge } from './draft-primitives'
import { labelFor } from '@/lib/hotel-admin/sections'

type FC = {
  id: number
  entity_type: string
  entity_id: number | null
  field_name: string | null
  previous_value: string | null
  proposed_value: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejection_reason?: string | null
}

const safeParse = (v: string | null | undefined) => {
  if (!v) return null
  try { return JSON.parse(v) } catch { return v }
}

/* ---- Generic row: Field / Current / Pending / Status + discard cross ---- */
export const FieldChangeRow = ({ fc, canDiscard, onDiscard }: { fc: FC; canDiscard: boolean; onDiscard: (id: number) => void }) => (
  <tr className="border-b border-border/40 align-top">
    <td className="py-3 pr-4 font-medium">{labelFor(fc.entity_type, fc.field_name)}</td>
    <td className="py-3 pr-4 text-muted-foreground line-clamp-2">{fc.previous_value || '—'}</td>
    <td className="py-3 pr-4 line-clamp-2">{fc.proposed_value}</td>
    <td className="py-3 pr-4">
      <FieldReviewBadge state={fc.status} />
      {fc.rejection_reason && <p className="text-xs text-destructive mt-1">{fc.rejection_reason}</p>}
    </td>
    <td className="py-3 pl-2 text-right">
      {canDiscard && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDiscard(fc.id)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </td>
  </tr>
)

export const GenericChangesTable = ({ changes, canDiscard, onDiscard }: { changes: FC[]; canDiscard: boolean; onDiscard: (id: number) => void }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs uppercase text-muted-foreground border-b border-border">
          <th className="text-left py-2 pr-4">Field</th>
          <th className="text-left py-2 pr-4">Current</th>
          <th className="text-left py-2 pr-4">Pending</th>
          <th className="text-left py-2 pr-4">Status</th>
          <th className="py-2"></th>
        </tr>
      </thead>
      <tbody>
        {changes.map((fc) => <FieldChangeRow key={fc.id} fc={fc} canDiscard={canDiscard} onDiscard={onDiscard} />)}
      </tbody>
    </table>
  </div>
)

/* ---- Amenities: before/after chip diff ---- */
export const AmenityChanges = ({ changes, canDiscard, onDiscard }: { changes: FC[]; canDiscard: boolean; onDiscard: (id: number) => void }) => {
  const [names, setNames] = useState<Record<number, string>>({})
  useEffect(() => {
    fetch('/api/hotel-admin/amenities', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const map: Record<number, string> = {}
        ;(d?.data?.HOTEL ?? []).forEach((a: any) => { map[a.id] = a.name })
        setNames(map)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-4">
      {changes.map((fc) => {
        const prev: number[] = safeParse(fc.previous_value) ?? []
        const next: number[] = safeParse(fc.proposed_value) ?? []
        const added = next.filter((id) => !prev.includes(id))
        const removed = prev.filter((id) => !next.includes(id))
        return (
          <div key={fc.id} className="rounded-xl border border-border/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-3.5 w-3.5" /> Amenity Selection</div>
              <div className="flex items-center gap-2">
                <FieldReviewBadge state={fc.status} />
                {canDiscard && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDiscard(fc.id)}><X className="h-3.5 w-3.5" /></Button>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {added.map((id) => <span key={`a${id}`} className="text-[11px] px-2 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">+ {names[id] ?? `#${id}`}</span>)}
              {removed.map((id) => <span key={`r${id}`} className="text-[11px] px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 line-through">{names[id] ?? `#${id}`}</span>)}
            </div>
            {fc.rejection_reason && <p className="text-xs text-destructive">{fc.rejection_reason}</p>}
          </div>
        )
      })}
    </div>
  )
}

/* ---- Gallery: thumbnail previews, added vs removed ---- */
export const GalleryChanges = ({ changes, canDiscard, onDiscard }: { changes: FC[]; canDiscard: boolean; onDiscard: (id: number) => void }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {changes.map((fc) => {
      const isDeletion = fc.field_name === 'deleted'
      const url = isDeletion ? fc.previous_value : (safeParse(fc.proposed_value)?.image_url ?? fc.proposed_value)
      return (
        <div key={fc.id} className="relative rounded-xl overflow-hidden border border-border/60">
          <div className="aspect-video bg-secondary/50 relative">
            {url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className={`h-full w-full object-cover ${isDeletion ? 'opacity-40 grayscale' : ''}`} />
            )}
            <span className={`absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isDeletion ? 'bg-destructive/80 text-white' : 'bg-green-500/80 text-white'}`}>
              {isDeletion ? 'Removing' : 'Adding'}
            </span>
            {canDiscard && (
              <button onClick={() => onDiscard(fc.id)} className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="p-2 flex items-center justify-between">
            <FieldReviewBadge state={fc.status} />
          </div>
          {fc.rejection_reason && <p className="text-xs text-destructive px-2 pb-2">{fc.rejection_reason}</p>}
        </div>
      )
    })}
  </div>
)

/* ---- Policies: proposed / removed policy cards ---- */
export const PolicyChanges = ({ changes, canDiscard, onDiscard }: { changes: FC[]; canDiscard: boolean; onDiscard: (id: number) => void }) => (
  <div className="space-y-3">
    {changes.map((fc) => {
      const isDeletion = fc.field_name === 'deleted'
      const data = isDeletion ? safeParse(fc.previous_value) : safeParse(fc.proposed_value)
      return (
        <div key={fc.id} className={`rounded-xl border p-4 ${isDeletion ? 'border-destructive/30 bg-destructive/5' : 'border-border/60'}`}>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${isDeletion ? 'line-through text-muted-foreground' : ''}`}>{data?.name ?? 'Policy'}</p>
            <div className="flex items-center gap-2">
              <FieldReviewBadge state={fc.status} />
              {canDiscard && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDiscard(fc.id)}><X className="h-3.5 w-3.5" /></Button>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{data?.description}</p>
          {fc.rejection_reason && <p className="text-xs text-destructive mt-1">{fc.rejection_reason}</p>}
        </div>
      )
    })}
  </div>
)

/* ---- Business & Documents: file cards ---- */
const DOC_LABELS: Record<string, string> = {
  TRADE_LICENSE: 'Trade License', TAX_CERTIFICATE: 'Tax Certificate', TIN_CERTIFICATE: 'TIN Certificate',
  VAT_CERTIFICATE: 'VAT Registration', BUSINESS_DOCUMENT: 'Business Document',
  OWNER_DOCUMENT: "Owner's Document", ADMIN_DOCUMENT: "Admin's Document",
}

export const DocumentChanges = ({ changes, canDiscard, onDiscard }: { changes: FC[]; canDiscard: boolean; onDiscard: (id: number) => void }) => (
  <div className="space-y-3">
    {changes.map((fc) => {
      const isReplace = fc.field_name === 'file_url'
      const data = isReplace ? null : safeParse(fc.proposed_value)
      const label = isReplace ? 'Document' : (DOC_LABELS[data?.document_type] ?? data?.document_type)
      const newUrl = isReplace ? fc.proposed_value : data?.file_url
      return (
        <div key={fc.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
          <div className="w-9 h-9 rounded-lg bg-secondary/50 text-muted-foreground flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{label}</p>
            <a href={newUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block">View proposed file</a>
          </div>
          <FieldReviewBadge state={fc.status} />
          {canDiscard && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDiscard(fc.id)}><X className="h-3.5 w-3.5" /></Button>}
          {fc.rejection_reason && <p className="text-xs text-destructive">{fc.rejection_reason}</p>}
        </div>
      )
    })}
  </div>
)