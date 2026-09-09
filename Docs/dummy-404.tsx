import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Compass,
  KeyRound,
  MapPin,
  Search,
  Sparkles,
  Star,
} from 'lucide-react'

export default function NotFound() {
  return (
    <main className="hotel-404 relative min-h-screen overflow-hidden bg-[#07111f] text-white">

      {/* =========================================================
          BACKGROUND
      ========================================================= */}

      <div className="pointer-events-none absolute inset-0">

        {/* Ambient gradients */}
        <div className="absolute left-[-20%] top-[-20%] h-[700px] w-[700px] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse" />

        <div className="absolute bottom-[-30%] right-[-10%] h-[700px] w-[700px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse [animation-delay:2s]" />

        <div className="absolute left-[40%] top-[30%] h-[400px] w-[400px] rounded-full bg-indigo-500/5 blur-[100px]" />

        {/* Stars */}
        <div className="stars absolute inset-0 opacity-60" />

        {/* Shooting stars */}
        <div className="shooting-star absolute left-[10%] top-[15%]" />
        <div className="shooting-star absolute left-[65%] top-[8%] [animation-delay:3s]" />
        <div className="shooting-star absolute left-[80%] top-[45%] [animation-delay:6s]" />

        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      {/* =========================================================
          MAIN
      ========================================================= */}

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-16">

        <div className="grid w-full items-center gap-16 lg:grid-cols-[1.05fr_.95fr]">

          {/* =====================================================
              LEFT — ANIMATED HOTEL WORLD
              ===================================================== */}

          <div className="relative flex h-[520px] items-center justify-center lg:h-[650px]">

            {/* Huge rotating rings */}
            <div className="absolute h-[420px] w-[420px] rounded-full border border-cyan-400/10 animate-[spin_25s_linear_infinite]" />

            <div className="absolute h-[340px] w-[340px] rounded-full border border-dashed border-cyan-400/15 animate-[spin_18s_linear_infinite_reverse]" />

            <div className="absolute h-[500px] w-[500px] rounded-full border border-blue-400/5 animate-[spin_35s_linear_infinite]" />

            {/* Orbiting dots */}
            <div className="absolute h-[420px] w-[420px] animate-[spin_12s_linear_infinite]">
              <span className="absolute left-1/2 top-[-4px] h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_25px_#67e8f9]" />
            </div>

            <div className="absolute h-[340px] w-[340px] animate-[spin_8s_linear_infinite_reverse]">
              <span className="absolute bottom-[-3px] left-1/2 h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_20px_#60a5fa]" />
            </div>

            {/* =================================================
                FLOATING HOTEL KEY
                ================================================= */}

            <div className="key-float relative z-20">

              {/* Key glow */}
              <div className="absolute inset-[-50px] rounded-full bg-cyan-400/10 blur-[50px]" />

              {/* Card */}
              <div className="key-card relative flex h-[330px] w-[250px] rotate-[-8deg] flex-col overflow-hidden rounded-[36px] border border-white/15 bg-gradient-to-br from-white/[.14] via-white/[.06] to-white/[.02] p-7 shadow-[0_40px_100px_rgba(0,0,0,.5)] backdrop-blur-xl">

                {/* Card shine */}
                <div className="card-shine absolute inset-0" />

                {/* Top */}
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.35em] text-cyan-200/60">
                      HOTEL
                    </p>

                    <p className="mt-1 text-sm font-semibold tracking-wider">
                      ROOM KEY
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <KeyRound className="h-5 w-5 text-cyan-300" />
                  </div>
                </div>

                {/* Huge 404 */}
                <div className="relative mt-auto">
                  <p className="text-[92px] font-black leading-none tracking-[-.08em] text-transparent bg-gradient-to-br from-white via-cyan-100 to-cyan-400 bg-clip-text">
                    404
                  </p>

                  <div className="mt-3 h-px w-full bg-gradient-to-r from-cyan-400/60 to-transparent" />

                  <div className="mt-4 flex items-center justify-between text-xs text-white/40">
                    <span>ACCESS DENIED</span>
                    <span>ROOM ?</span>
                  </div>
                </div>

                {/* NFC symbol */}
                <div className="absolute bottom-7 right-7 opacity-20">
                  <div className="nfc-line" />
                  <div className="nfc-line [animation-delay:.2s]" />
                  <div className="nfc-line [animation-delay:.4s]" />
                </div>
              </div>

              {/* Key ring */}
              <div className="absolute -bottom-7 -right-12 flex h-20 w-20 items-center justify-center rounded-full border-[8px] border-cyan-300/70 shadow-[0_0_40px_rgba(34,211,238,.3)]">
                <div className="h-10 w-10 rounded-full border-4 border-cyan-300/30" />
              </div>
            </div>

            {/* =================================================
                FLOATING ELEMENTS
                ================================================= */}

            {/* Compass */}
            <div className="float-slow absolute left-[5%] top-[15%] flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[.06] shadow-2xl backdrop-blur-xl">
              <Compass className="h-7 w-7 text-cyan-300 animate-[spin_8s_linear_infinite]" />
            </div>

            {/* Map pin */}
            <div className="float-fast absolute bottom-[15%] left-[10%] flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[.06] backdrop-blur-xl">
              <MapPin className="h-6 w-6 text-blue-300" />
            </div>

            {/* Bed */}
            <div className="float-medium absolute right-[5%] top-[15%] flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[.06] backdrop-blur-xl">
              <BedDouble className="h-7 w-7 text-cyan-200" />
            </div>

            {/* Search */}
            <div className="float-slow absolute bottom-[12%] right-[8%] flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[.06] backdrop-blur-xl">
              <Search className="h-6 w-6 text-blue-300" />
            </div>

            {/* Sparkles */}
            <Sparkles className="absolute left-[25%] top-[8%] h-6 w-6 animate-pulse text-cyan-300/60" />

            <Star className="absolute bottom-[22%] right-[20%] h-5 w-5 animate-pulse text-cyan-300/40 [animation-delay:1s]" />

            <Sparkles className="absolute right-[28%] top-[7%] h-4 w-4 animate-pulse text-blue-300/50 [animation-delay:2s]" />

            {/* Floating room numbers */}
            <div className="room-number absolute left-[2%] top-[48%]">
              101
            </div>

            <div className="room-number absolute right-[1%] top-[43%] [animation-delay:2s]">
              404
            </div>

            <div className="room-number absolute bottom-[4%] left-[42%] [animation-delay:4s]">
              808
            </div>

            {/* Floor shadow */}
            <div className="absolute bottom-[7%] h-10 w-72 rounded-full bg-cyan-400/10 blur-2xl animate-pulse" />

          </div>

          {/* =====================================================
              RIGHT — CONTENT
              ===================================================== */}

          <div className="relative z-30 text-center lg:text-left">

            {/* Eyebrow */}
            <div className="reveal mb-6 inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-xs font-medium uppercase tracking-[.2em] text-cyan-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              </span>

              Lost in the lobby
            </div>

            {/* Heading */}
            <h1 className="reveal text-5xl font-black leading-[.95] tracking-[-.05em] sm:text-6xl lg:text-[76px]">

              <span className="block">
                This room
              </span>

              <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                doesn't exist.
              </span>
            </h1>

            {/* Description */}
            <p className="reveal mt-7 max-w-xl text-base leading-8 text-white/50 sm:text-lg">
              It looks like you've wandered into a room that was never
              checked in. The page may have moved, the link may be broken,
              or this little adventure simply took an unexpected turn.
            </p>

            {/* Buttons */}
            <div className="reveal mt-9 flex flex-col gap-3 sm:flex-row lg:justify-start">

              <Button
                asChild
                size="lg"
                className="group h-13 rounded-xl bg-cyan-400 px-7 font-semibold text-slate-950 shadow-[0_0_35px_rgba(34,211,238,.2)] transition-all hover:bg-cyan-300 hover:shadow-[0_0_50px_rgba(34,211,238,.35)]"
              >
                <Link href="/hotels">
                  <Search className="mr-2 h-4 w-4" />
                  Find a Hotel
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 rounded-xl border-white/10 bg-white/[.04] px-7 text-white hover:bg-white/[.08]"
              >
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back Home
                </Link>
              </Button>

            </div>

            {/* Quick links */}
            <div className="reveal mt-10 flex flex-wrap items-center justify-center gap-5 text-sm lg:justify-start">

              <Link
                href="/hotels"
                className="text-white/40 transition-colors hover:text-cyan-300"
              >
                Browse stays
              </Link>

              <span className="text-white/10">/</span>

              <Link
                href="/destinations"
                className="text-white/40 transition-colors hover:text-cyan-300"
              >
                Explore destinations
              </Link>

              <span className="text-white/10">/</span>

              <Link
                href="/contact"
                className="text-white/40 transition-colors hover:text-cyan-300"
              >
                Contact support
              </Link>

            </div>

          </div>

        </div>
      </div>

      {/* =========================================================
          GLOBAL CSS ANIMATIONS
      ========================================================= */}

      <style>{`
        @keyframes hotelFloat {
          0%, 100% {
            transform: translateY(0) rotate(-8deg);
          }

          50% {
            transform: translateY(-22px) rotate(-4deg);
          }
        }

        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-18px) rotate(4deg);
          }
        }

        @keyframes floatMedium {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }

          50% {
            transform: translateY(-25px) rotate(-5deg);
          }
        }

        @keyframes floatFast {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-14px);
          }
        }

        @keyframes shine {
          0% {
            transform: translateX(-160%) skewX(-20deg);
          }

          45%, 100% {
            transform: translateX(220%) skewX(-20deg);
          }
        }

        @keyframes shootingStar {
          0% {
            opacity: 0;
            transform: translate(0, 0) rotate(-35deg);
          }

          10% {
            opacity: 1;
          }

          30% {
            opacity: 0;
            transform: translate(260px, 180px) rotate(-35deg);
          }

          100% {
            opacity: 0;
          }
        }

        @keyframes reveal {
          from {
            opacity: 0;
            transform: translateY(30px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes roomFloat {
          0%, 100% {
            transform: translateY(0);
            opacity: .25;
          }

          50% {
            transform: translateY(-18px);
            opacity: .6;
          }
        }

        @keyframes nfcPulse {
          0%, 100% {
            opacity: .15;
            transform: scale(.9);
          }

          50% {
            opacity: .8;
            transform: scale(1.1);
          }
        }

        .hotel-404 .key-float {
          animation: hotelFloat 4s ease-in-out infinite;
        }

        .hotel-404 .float-slow {
          animation: floatSlow 5s ease-in-out infinite;
        }

        .hotel-404 .float-medium {
          animation: floatMedium 4s ease-in-out infinite;
        }

        .hotel-404 .float-fast {
          animation: floatFast 3s ease-in-out infinite;
        }

        .hotel-404 .card-shine {
          width: 80px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.16),
            transparent
          );
          transform: translateX(-160%) skewX(-20deg);
          animation: shine 5s ease-in-out infinite;
        }

        .hotel-404 .shooting-star {
          width: 120px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(103,232,249,.8),
            transparent
          );
          transform: rotate(-35deg);
          animation: shootingStar 8s linear infinite;
        }

        .hotel-404 .reveal {
          animation: reveal .9s cubic-bezier(.16,1,.3,1) both;
        }

        .hotel-404 .reveal:nth-child(2) {
          animation-delay: .15s;
        }

        .hotel-404 .reveal:nth-child(3) {
          animation-delay: .3s;
        }

        .hotel-404 .reveal:nth-child(4) {
          animation-delay: .45s;
        }

        .hotel-404 .room-number {
          color: rgba(103,232,249,.25);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: .25em;
          animation: roomFloat 5s ease-in-out infinite;
        }

        .hotel-404 .nfc-line {
          width: 3px;
          height: 15px;
          margin: 3px;
          display: inline-block;
          border-radius: 10px;
          background: rgba(103,232,249,.6);
          animation: nfcPulse 1.2s ease-in-out infinite;
        }

        .hotel-404 .stars {
          background-image:
            radial-gradient(circle, rgba(255,255,255,.7) 1px, transparent 1px),
            radial-gradient(circle, rgba(103,232,249,.4) 1px, transparent 1px);
          background-size: 140px 140px, 220px 220px;
          background-position: 0 0, 70px 90px;
        }

        @media (prefers-reduced-motion: reduce) {
          .hotel-404 *,
          .hotel-404 *::before,
          .hotel-404 *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </main>
  )
}
