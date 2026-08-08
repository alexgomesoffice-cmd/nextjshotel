'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList, Send, Trash2, Clock, Check, X, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { KPI, SectionCard, Timeline, EmptyState } from '@/components/hotel-admin/drafts/draft-primitives'
import { GenericChangesTable, AmenityChanges, GalleryChanges, PolicyChanges, DocumentChanges, RoomTypeChanges } from '@/components/hotel-admin/drafts/change-cards'
import { SECTION_META, sectionKeyFor, SectionKey } from '@/lib/hotel-admin/sections'

export default function HotelAdminDraftCenterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentCase, setCurrentCase] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchCase = useCallback(async () => {
    const res = await fetch('/api/hotel-admin/cases', { credentials: 'include' })
    const data = await res.json()
    if (data.success) setCurrentCase(data.data.currentCase)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCase() }, [fetchCase])

  const discardField = async (id: number) => {
    const res = await fetch(`/api/hotel-admin/cases/field-changes/${id}`, { method: 'DELETE', credentials: 'include' })
    const data = await res.json()
    if (data.success) {
      toast({ title: 'Change discarded' })
      fetchCase()
    } else {
      toast({ title: 'Could not discard', description: data.message, variant: 'destructive' })
    }
  }

  const discardDraft = async () => {
    if (!confirm('Discard this entire draft? All unsubmitted changes will be permanently lost.')) return
    const res = await fetch('/api/hotel-admin/cases', { method: 'DELETE', credentials: 'include' })
    const data = await res.json()
    if (data.success) {
      toast({ title: 'Draft discarded' })
      router.push('/dashboard/hotel/listing')
    } else {
      toast({ title: 'Could not discard', description: data.message, variant: 'destructive' })
    }
  }

  const submitDraft = async () => {
    if (!confirm(`Submit your draft for review? This creates one Review Case containing ${fieldChanges.length} field${fieldChanges.length === 1 ? '' : 's'}. Editing will be locked until the System Admin reviews it.`)) return
    const res = await fetch('/api/hotel-admin/cases/submit', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (data.success) {
      toast({ title: 'Submitted for review', description: 'System admin will review your changes shortly.' })
      fetchCase()
    } else {
      toast({ title: 'Could not submit', description: data.message, variant: 'destructive' })
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading draft…</div>

  if (!currentCase) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Draft Center</h1>
          <p className="text-muted-foreground text-sm">All your pending listing changes in one place</p>
        </div>
        <Card>
          <CardContent className="p-10">
            <EmptyState
              icon={ClipboardList}
              title="No pending draft"
              description="Edits from Property appear here as a single draft awaiting review."
              action={<Button onClick={() => router.push('/dashboard/hotel/listing')}>Open Property</Button>}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  const fieldChanges: any[] = currentCase.field_changes ?? []
  const status: string = currentCase.status
  const isDrafting = status === 'DRAFTING'
  const isPending = status === 'PENDING'
  const canDiscardFields = isDrafting

  const approvedCount = fieldChanges.filter((f) => f.status === 'APPROVED').length
  const rejectedCount = fieldChanges.filter((f) => f.status === 'REJECTED').length
  const pendingCount = fieldChanges.filter((f) => f.status === 'PENDING').length

  // Group field changes by which Property section they came from.
  const grouped = new Map<SectionKey, any[]>()
  fieldChanges.forEach((fc) => {
    const key = sectionKeyFor(fc.entity_type, fc.field_name)
    grouped.set(key, [...(grouped.get(key) ?? []), fc])
  })

  const timelineItems = [
    { at: currentCase.created_at, label: 'Draft started', tone: undefined },
    ...(status !== 'DRAFTING' ? [{ at: currentCase.submitted_at, label: 'Submitted for review', tone: undefined }] : []),
    ...(currentCase.decided_at ? [{
      at: currentCase.decided_at,
      label: status === 'APPROVED' ? 'Approved by System Admin' : 'Rejected by System Admin',
      by: currentCase.decider?.name,
      tone: (status === 'APPROVED' ? 'green' : 'red') as 'green' | 'red',
    }] : []),
  ].reverse()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Draft Center</h1>
          <p className="text-muted-foreground text-sm">Track your pending listing changes and their review status</p>
        </div>
        <div className="flex gap-2">
          {isDrafting && (
            <Button variant="outline" size="sm" onClick={discardDraft}>
              <Trash2 className="h-4 w-4 mr-2" /> Discard Draft
            </Button>
          )}
          {isDrafting && (
            <Button size="sm" onClick={submitDraft}>
              <Send className="h-4 w-4 mr-2" /> Submit for Review
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPI title="Status" value={status.toLowerCase()} icon={ClipboardList} color="from-slate-500 to-slate-700" />
        <KPI title="Modified Fields" value={fieldChanges.length} icon={RefreshCw} color="from-blue-500 to-indigo-500" />
        <KPI title="Approved" value={approvedCount} icon={Check} color="from-green-500 to-emerald-500" />
        <KPI title="Rejected" value={rejectedCount} icon={X} color="from-red-500 to-rose-500" />
        <KPI title="Pending" value={pendingCount} icon={Clock} color="from-amber-500 to-orange-500"
          hint={currentCase.submitted_at && status !== 'DRAFTING' ? `Submitted ${new Date(currentCase.submitted_at).toLocaleDateString()}` : 'Not yet submitted'} />
      </div>

      {isPending && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Editing is locked while this draft is under review.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {Array.from(grouped.entries()).map(([key, changes]) => {
            const meta = SECTION_META[key]
            return (
              <SectionCard key={key} title={meta.title} description={meta.description} icon={meta.icon} accent={meta.accent}>
                {key === 'amenities' ? (
                  <AmenityChanges changes={changes} canDiscard={canDiscardFields} onDiscard={discardField} />
                ) : key === 'gallery' ? (
                  <GalleryChanges changes={changes} canDiscard={canDiscardFields} onDiscard={discardField} />
                ) : key === 'policies' ? (
                  <PolicyChanges changes={changes} canDiscard={canDiscardFields} onDiscard={discardField} />
                ) : key === 'business' ? (
                  <DocumentChanges changes={changes} canDiscard={canDiscardFields} onDiscard={discardField} />
                ) : key === 'roomTypes' ? (
                  <RoomTypeChanges changes={changes} canDiscard={canDiscardFields} onDiscard={discardField} />
                ) : (
                  <GenericChangesTable changes={changes} canDiscard={canDiscardFields} onDiscard={discardField} />
                )}
              </SectionCard>
            )
          })}
        </div>
        <aside>
          <SectionCard title="Timeline" icon={Clock}>
            <Timeline items={timelineItems as any} />
          </SectionCard>
        </aside>
      </div>
    </div>
  )
}