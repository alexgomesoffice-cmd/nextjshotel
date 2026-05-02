// ─────────────────────────────────────────────────────────────
// FILE 1: src/app/(public)/layout.tsx
// Wraps every public page with Navbar and Footer.
// (public) is a route group — does NOT appear in the URL.
// localhost:3000/ → (public)/page.tsx
// ─────────────────────────────────────────────────────────────

import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}


// ─────────────────────────────────────────────────────────────
// FILE 2: src/app/(public)/page.tsx
// This IS localhost:3000/
// Home page — placeholder until Day 7 when components are migrated.
// ─────────────────────────────────────────────────────────────

// export default function HomePage() {
//   return (
//     <div className="pt-20">
//       {/* HeroSection, DestinationsSection, FeaturedHotels, NewsletterSection go here */}
//       {/* Components migrated on Day 7 */}
//       <div className="min-h-screen flex items-center justify-center">
//         <p className="text-muted-foreground">Home page — Day 7</p>
//       </div>
//     </div>
//   )
// }


// ─────────────────────────────────────────────────────────────
// FILE 3: src/app/(auth)/layout.tsx
// Auth pages have no navbar or footer — clean centered layout.
// ─────────────────────────────────────────────────────────────

// export default function AuthLayout({ children }: { children: React.ReactNode }) {
//   return <>{children}</>
// }


// ─────────────────────────────────────────────────────────────
// FILE 4: src/app/(user)/layout.tsx
// Wraps user-only pages. Middleware already blocks non-END_USER,
// but layout also wraps with Navbar + Footer.
// ─────────────────────────────────────────────────────────────

// import Navbar from '@/components/layout/navbar'
// import Footer from '@/components/layout/footer'
//
// export default function UserLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <>
//       <Navbar />
//       <main className="min-h-screen pt-20">{children}</main>
//       <Footer />
//     </>
//   )
// }


// ─────────────────────────────────────────────────────────────
// FILE 5: src/app/dashboard/layout.tsx
// Thin wrapper — just renders children.
// Role-specific layout applied inside system/ hotel/ sub/ layouts.
// ─────────────────────────────────────────────────────────────

// export default function DashboardLayout({ children }: { children: React.ReactNode }) {
//   return <>{children}</>
// }


// ─────────────────────────────────────────────────────────────
// FILE 6: src/app/dashboard/page.tsx
// Role-based redirect. Reads /api/auth/me and sends each role
// to their correct dashboard.
// ─────────────────────────────────────────────────────────────

// 'use client'
// import { useEffect } from 'react'
// import { useRouter } from 'next/navigation'
//
// export default function DashboardPage() {
//   const router = useRouter()
//
//   useEffect(() => {
//     fetch('/api/auth/me', { credentials: 'include' })
//       .then((r) => r.json())
//       .then((data) => {
//         if (!data.success) { router.replace('/login'); return }
//         const map: Record<string, string> = {
//           SYSTEM_ADMIN:    '/dashboard/system',
//           HOTEL_ADMIN:     '/dashboard/hotel',
//           HOTEL_SUB_ADMIN: '/dashboard/sub',
//           END_USER:        '/',
//         }
//         router.replace(map[data.data.actor_type] ?? '/')
//       })
//       .catch(() => router.replace('/login'))
//   }, [router])
//
//   return (
//     <div className="min-h-screen flex items-center justify-center">
//       <p className="text-muted-foreground">Redirecting...</p>
//     </div>
//   )
// }


// ─────────────────────────────────────────────────────────────
// FILE 7: src/app/dashboard/system/layout.tsx
// Wraps all /dashboard/system/* pages in AdminLayout.
// ─────────────────────────────────────────────────────────────

// import AdminLayout from '@/components/layout/admin-layout'
// export default function SystemLayout({ children }: { children: React.ReactNode }) {
//   return <AdminLayout>{children}</AdminLayout>
// }


// ─────────────────────────────────────────────────────────────
// FILE 8: src/app/dashboard/system/page.tsx
// System admin overview — placeholder until Day 4.
// ─────────────────────────────────────────────────────────────

// export default function SystemAdminPage() {
//   return (
//     <div>
//       <h1 className="text-2xl font-bold mb-2">Overview</h1>
//       <p className="text-muted-foreground">System admin dashboard — Day 4</p>
//     </div>
//   )
// }


// ─────────────────────────────────────────────────────────────
// FILE 9: src/app/dashboard/hotel/layout.tsx
// ─────────────────────────────────────────────────────────────

// import HotelAdminLayout from '@/components/layout/hotel-admin-layout'
// export default function HotelLayout({ children }: { children: React.ReactNode }) {
//   return <HotelAdminLayout>{children}</HotelAdminLayout>
// }


// ─────────────────────────────────────────────────────────────
// FILE 10: src/app/dashboard/hotel/page.tsx
// ─────────────────────────────────────────────────────────────

// export default function HotelAdminPage() {
//   return (
//     <div>
//       <h1 className="text-2xl font-bold mb-2">Overview</h1>
//       <p className="text-muted-foreground">Hotel admin dashboard — Day 5</p>
//     </div>
//   )
// }


// ─────────────────────────────────────────────────────────────
// FILE 11: src/app/dashboard/sub/layout.tsx
// ─────────────────────────────────────────────────────────────

// import HotelSubAdminLayout from '@/components/layout/hotel-sub-admin-layout'
// export default function SubLayout({ children }: { children: React.ReactNode }) {
//   return <HotelSubAdminLayout>{children}</HotelSubAdminLayout>
// }


// ─────────────────────────────────────────────────────────────
// FILE 12: src/app/dashboard/sub/page.tsx
// ─────────────────────────────────────────────────────────────

// export default function SubAdminPage() {
//   return (
//     <div>
//       <h1 className="text-2xl font-bold mb-2">Overview</h1>
//       <p className="text-muted-foreground">Sub admin dashboard — Day 6</p>
//     </div>
//   )
// }


// ─────────────────────────────────────────────────────────────
// FILE 13: src/app/not-found.tsx
// Next.js convention — shown for any unmatched route.
// ─────────────────────────────────────────────────────────────

// import Link from 'next/link'
// import { Button } from '@/components/ui/button'
//
// export default function NotFound() {
//   return (
//     <div className="min-h-screen flex items-center justify-center bg-background">
//       <div className="text-center space-y-4">
//         <h1 className="text-8xl font-bold text-gradient">404</h1>
//         <h2 className="text-2xl font-semibold">Page Not Found</h2>
//         <p className="text-muted-foreground">The page you are looking for does not exist.</p>
//         <Link href="/">
//           <Button className="mt-4">Back to Home</Button>
//         </Link>
//       </div>
//     </div>
//   )
// }
