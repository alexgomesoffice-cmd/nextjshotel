'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  KeyRound,
  Search,
  Building,
} from 'lucide-react'

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        {/* Floating dots */}
        <div className="absolute left-[12%] top-[20%] h-2 w-2 animate-pulse rounded-full bg-primary/40" />
        <div className="absolute right-[15%] top-[30%] h-3 w-3 animate-pulse rounded-full bg-primary/30 [animation-delay:1s]" />
        <div className="absolute bottom-[20%] left-[25%] h-2 w-2 animate-pulse rounded-full bg-primary/30 [animation-delay:2s]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-20">

          {/* LEFT — Animated illustration */}
          <div className="relative flex h-[420px] items-center justify-center">
            
            {/* Soft glow */}
            <div className="absolute h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

            {/* Dashed orbit */}
            <div className="absolute h-72 w-72 rounded-full border border-dashed border-primary/20 animate-[spin_18s_linear_infinite]" />

            {/* Main floating card */}
            <div className="relative z-10 flex h-64 w-52 -rotate-6 flex-col items-center justify-center rounded-3xl border bg-card shadow-2xl transition-transform duration-500 hover:rotate-0 animate-[float_4s_ease-in-out_infinite]">
              
              {/* Key icon */}
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <KeyRound
                  className="h-10 w-10 text-primary animate-[float_3s_ease-in-out_infinite]"
                />
              </div>

              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                  Hotel Key
                </p>

                <p className="mt-2 text-6xl font-black tracking-tighter text-primary">
                  404
                </p>
              </div>
            </div>

            {/* Floating compass */}
            <div className="absolute left-[8%] top-[20%] flex h-14 w-14 animate-[float_4s_ease-in-out_infinite] items-center justify-center rounded-2xl bg-card shadow-lg">
              <Compass className="h-6 w-6 text-primary" />
            </div>

            {/* Floating Building */}
            <div className="absolute right-[10%] top-[18%] animate-[float_3s_ease-in-out_infinite_1s]">
              <Building className="h-7 w-7 text-primary/60" />
            </div>

            {/* Floating search */}
            <div className="absolute bottom-[18%] right-[8%] flex h-14 w-14 animate-[float_4s_ease-in-out_infinite_0.5s] items-center justify-center rounded-2xl bg-card shadow-lg">
              <Search className="h-6 w-6 text-primary" />
            </div>

            {/* Small decorative dots */}
            <div className="absolute bottom-[15%] left-[15%] h-3 w-3 animate-bounce rounded-full bg-primary/40 [animation-delay:300ms]" />
            <div className="absolute right-[25%] top-[12%] h-2 w-2 animate-bounce rounded-full bg-primary/30 [animation-delay:700ms]" />
          </div>

          {/* RIGHT — Content */}
          <div className="text-center lg:text-left">

            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium shadow-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="text-muted-foreground">
                You've wandered off the map
              </span>
            </div>

            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              This Page
              <br />
              <span className="text-primary">doesn't exist.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Looks like you've checked into a page that isn't available.
              The good news? There are plenty of amazing stays waiting
              for you to discover.
            </p>

            {/* Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:justify-start">
              <Button asChild size="lg" className="group h-12 px-6">
                <Link href="/hotels">
                  <Search className="mr-2 h-4 w-4" />
                  Find Your Stay
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="h-12 px-6">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>

            {/* Helpful links */}
            <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm lg:justify-start">
              <Link
                href="/hotels"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Browse hotels
              </Link>

              <span className="text-border">•</span>

              <Link
                href="/destinations"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Explore destinations
              </Link>

              <span className="text-border">•</span>

              <Link
                href="/contact"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Need help?
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes shine {
          0% {
            transform: translateX(-120px) rotate(12deg);
          }
          50%,
          100% {
            transform: translateX(350px) rotate(12deg);
          }
        }
      `}</style>
    </main>
  )
}
