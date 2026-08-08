'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sparkles, BedDouble, Layers } from 'lucide-react'
import { RequestCard } from '@/components/hotel-admin/master-data/request-card'

export default function MasterDataRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const res = await fetch('/api/hotel-admin/master-data-requests', { credentials: 'include' })
    const data = await res.json()
    if (data.success) setRequests(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>

  const byCategory = (c: string) => requests.filter((r) => r.category === c)

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl sm:text-3xl font-bold">Master Data Requests</h1>
        <p className="text-muted-foreground text-sm max-w-2xl mt-1">
          Request a global item the System Admin creates manually if approved. Room types are created directly by you from the Rooms page.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RequestCard
          title="Amenities" description="Hotel or room amenity you'd like added"
          icon={Sparkles} accent="from-fuchsia-500 to-pink-600"
          category="AMENITY" requests={byCategory('AMENITY')} needsContext
          onSubmitted={fetchAll}
        />
        <RequestCard
          title="Bed Types" description="A bed type not yet in the global list"
          icon={BedDouble} accent="from-indigo-500 to-blue-600"
          category="BED_TYPE" requests={byCategory('BED_TYPE')}
          onSubmitted={fetchAll}
        />
        <RequestCard
          title="Room Facilities" description="A physical-room facility not yet available"
          icon={Layers} accent="from-orange-500 to-amber-600"
          category="ROOM_FACILITY" requests={byCategory('ROOM_FACILITY')}
          onSubmitted={fetchAll}
        />
      </div>
    </div>
  )
}