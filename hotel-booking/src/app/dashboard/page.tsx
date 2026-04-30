'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
   const router = useRouter()

   useEffect(() => {
     fetch('/api/auth/me', { credentials: 'include' })
       .then((r) => r.json())
       .then((data) => {
        if (!data.success) { router.replace('/login'); return }
         const map: Record<string, string> = {
           SYSTEM_ADMIN:    '/dashboard/system',
           HOTEL_ADMIN:     '/dashboard/hotel',
           HOTEL_SUB_ADMIN: '/dashboard/sub',
           END_USER:        '/',
         }
         router.replace(map[data.data.actor_type] ?? '/')
       })
       .catch(() => router.replace('/login'))
   }, [router])

   return (
     <div className="min-h-screen flex items-center justify-center">
       <p className="text-muted-foreground">Redirecting...</p>
     </div>
   )
 }