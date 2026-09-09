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

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-4 sm:px-6 sm:py-8 lg:px-6 lg:py-16">
        <div className="grid w-full items-center gap-4 sm:gap-8 lg:grid-cols-2 lg:gap-20">

          {/* LEFT — Animated illustration */}
          <div className="relative flex h-[220px] items-center justify-center sm:h-[320px] lg:h-[420px]">
            
            {/* Soft glow */}
            <div className="absolute h-48 w-48 rounded-full bg-primary/10 blur-3xl sm:h-64 sm:w-64 lg:h-72 lg:w-72" />

            {/* Dashed orbit */}
            <div className="absolute h-48 w-48 rounded-full border border-dashed border-primary/20 animate-[spin_18s_linear_infinite] sm:h-64 sm:w-64 lg:h-72 lg:w-72" />

            {/* Main floating card */}
            <div className="relative z-10 flex h-40 w-32 -rotate-6 flex-col items-center justify-center rounded-3xl border bg-card shadow-2xl transition-transform duration-500 hover:rotate-0 animate-[float_4s_ease-in-out_infinite] sm:h-56 sm:w-44 lg:h-64 lg:w-52">
              
              {/* Key icon */}
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 sm:mb-5 sm:h-20 sm:w-20">
                <KeyRound
                  className="h-7 w-7 text-primary animate-[float_3s_ease-in-out_infinite] sm:h-10 sm:w-10"
                />
              </div>

              <div className="text-center">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.25em]">
                  Hotel Key
                </p>

                <p className="mt-1 text-4xl font-black tracking-tighter text-primary sm:mt-2 sm:text-6xl">
                  404
                </p>
              </div>
            </div>

            {/* Floating compass */}
            <div className="absolute left-[8%] top-[20%] flex h-10 w-10 animate-[float_4s_ease-in-out_infinite] items-center justify-center rounded-2xl bg-card shadow-lg sm:h-14 sm:w-14">
              <Compass className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            </div>

            {/* Floating Building */}
            <div className="absolute right-[10%] top-[18%] animate-[float_3s_ease-in-out_infinite_1s]">
              <Building className="h-5 w-5 text-primary/60 sm:h-7 sm:w-7" />
            </div>

            {/* Floating search */}
            <div className="absolute bottom-[18%] right-[8%] flex h-10 w-10 animate-[float_4s_ease-in-out_infinite_0.5s] items-center justify-center rounded-2xl bg-card shadow-lg sm:h-14 sm:w-14">
              <Search className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            </div>

            {/* Small decorative dots */}
            <div className="absolute bottom-[15%] left-[15%] h-3 w-3 animate-bounce rounded-full bg-primary/40 [animation-delay:300ms]" />
            <div className="absolute right-[25%] top-[12%] h-2 w-2 animate-bounce rounded-full bg-primary/30 [animation-delay:700ms]" />
          </div>

          {/* RIGHT — Content */}
          <div className="text-center lg:text-left">

            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-sm sm:mb-5 sm:px-4 sm:py-2 sm:text-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="text-muted-foreground">
                You've wandered off the map
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              This Page
              <br />
              <span className="text-primary">doesn't exist.</span>
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-5 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-7 lg:mx-0">
              Looks like you've checked into a page that isn't available.
              The good news? There are plenty of amazing stays waiting
              for you to discover.
            </p>

            {/* Buttons */}
            <div className="mt-4 flex flex-row gap-2 sm:mt-8 sm:gap-3 lg:justify-start">
              <Button asChild size="lg" className="group h-10 min-w-0 flex-1 px-2 text-xs sm:h-12 sm:flex-none sm:px-6 sm:text-sm">
                <Link href="/hotels">
                  <Search className="mr-2 h-4 w-4" />
                  Find Your Stay
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="h-10 min-w-0 flex-1 px-2 text-xs sm:h-12 sm:flex-none sm:px-6 sm:text-sm">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>

            {/* Helpful links */}
            <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs sm:mt-10 sm:gap-x-6 sm:gap-y-2 sm:text-sm lg:justify-start">
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
    </main>
  )
}
