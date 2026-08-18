'use client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState,useCallback,useEffect } from 'react'

interface HotelRow{
  id: number
  name: string
  city: string
  totalBookings: number
  totalRevenue: number
}



export default function SystemBookingsPage() {
  const router = useRouter
  const [rows,setRows]= useState<HotelRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback ((): void => {
    setLoading(true)
    fetch(`/api/public/hotels?status=PUBLISHED`)
    .then((r)=>r.json())
    .then((data)=>setRows(data.data.hotels))
    .finally(()=>setLoading(false))
  },[])
    useEffect(() => { load() }, [load])
  return (
    <div className="space-y-4 px-6 py-3">
      <div className="flex items-center justify-between ">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-muted-foreground">See all bookings on this platform</p>
        </div>
      </div>
    </div>
  )
}