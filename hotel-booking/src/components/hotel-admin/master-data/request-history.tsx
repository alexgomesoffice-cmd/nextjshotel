'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Clock, CheckCircle2, XCircle } from 'lucide-react'

type Req = {
  id: number
  name: string
  note: string
  category: 'AMENITY' | 'BED_TYPE' | 'ROOM_FACILITY'
  context: 'HOTEL' | 'ROOM' | null
  status: 'PENDING' | 'FULFILLED' | 'DISMISSED'
  resolution_note: string | null
  created_at: string
  resolved_at: string | null
}

const CATEGORY_LABEL: Record<string, string> = { AMENITY: 'Amenity', BED_TYPE: 'Bed Type', ROOM_FACILITY: 'Room Facility' }

export const RequestHistory = ({ requests }: { requests: Req[] }) => {
  const [tab, setTab] = useState<'PENDING' | 'FULFILLED' | 'DISMISSED'>('PENDING')

  const counts = {
    PENDING: requests.filter((r) => r.status === 'PENDING').length,
    FULFILLED: requests.filter((r) => r.status === 'FULFILLED').length,
    DISMISSED: requests.filter((r) => r.status === 'DISMISSED').length,
  }
  const visible = requests.filter((r) => r.status === tab)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['PENDING', 'FULFILLED', 'DISMISSED'] as const).map((t) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={cn('text-xs px-3 py-1.5 rounded-full border transition',
              tab === t ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600' : 'border-border text-muted-foreground')}
          >
            {t === 'PENDING' ? 'Pending' : t === 'FULFILLED' ? 'Fulfilled' : 'Dismissed'} ({counts[t]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No {tab.toLowerCase()} requests.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/60 p-4 flex items-start gap-3">
              <div className={cn(
                'p-2 rounded-lg shrink-0',
                r.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600' : r.status === 'FULFILLED' ? 'bg-green-500/10 text-green-600' : 'bg-secondary text-muted-foreground',
              )}>
                {r.status === 'PENDING' ? <Clock className="h-4 w-4" /> : r.status === 'FULFILLED' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{r.name}</p>
                  <span className="text-[10px] text-muted-foreground uppercase">{CATEGORY_LABEL[r.category]}{r.context ? ` · ${r.context}` : ''}</span>
                </div>
                {r.status === 'PENDING' && <p className="text-xs text-muted-foreground mt-0.5">Requested {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>}
                {r.status === 'FULFILLED' && <p className="text-xs text-green-600 mt-0.5">Created · Fulfilled {r.resolved_at && new Date(r.resolved_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>}
                {r.status === 'DISMISSED' && (
                  <div className="mt-0.5">
                    <p className="text-xs text-muted-foreground">Dismissed {r.resolved_at && new Date(r.resolved_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                    {r.resolution_note && <p className="text-xs text-muted-foreground mt-1">Reason: {r.resolution_note}</p>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}