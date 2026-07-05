'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/end-user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.message || 'Login failed')
        setLoading(false)
        return
      }

      localStorage.setItem('user_name', data.data.user.name)

      setLoading(false)
      router.push(callbackUrl)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full">

      {/* Background */}
      <img
        src="/loginImg.jpg"
        alt="Hotel"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 " />

      {/*  GLASS MORPHISM BRAND (TOP LEFT) */}
      <Link
        href="/"
        className="absolute top-4 left-1/2 -translate-x-1/2
    lg:top-8 lg:left-8 lg:translate-x-0

    z-20
    px-4 py-2 lg:px-5 lg:py-2
    rounded-full

    bg-white/10 backdrop-blur-xl
    border border-white/20

    text-white font-semibold tracking-wide
    shadow-lg shadow-black/30

    hover:bg-white/20 transition

    text-base lg:text-2xl"
      >
        GhuriBangla
      </Link>

      {/* MAIN LAYOUT */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">

        {/* LEFT TEXT */}
        <div className="hidden lg:flex lg:w-1/2 items-center px-16">
          <div className="text-white max-w-xl">
            <h1 className="text-5xl font-bold leading-tight">
              Find your perfect stay.
            </h1>
            <p className="mt-6 text-lg text-white/80">
              Discover luxury hotels, unique stays, and unforgettable experiences around the world.
            </p>
          </div>
        </div>

        {/* MOBILE HEADER */}
        <div className="lg:hidden text-center text-white px-6 pt-20 pb-10">
          <h1 className="text-3xl font-bold">
            Find your perfect stay
          </h1>
          <p className="mt-3 text-white/80 text-sm">
            Book luxury hotels and experiences anywhere in the world
          </p>
        </div>

        {/* FORM SIDE */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12 lg:pb-0">

          <div className="w-full max-w-md">

            <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-2xl shadow-2xl p-8">

              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white">
                  Welcome Back
                </h2>
                <p className="text-white/70 mt-2">
                  Sign in to continue
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
                  {error}
                </div>
              )}

              {/* FORM */}
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Email */}
                <div>
                  <label className="text-sm text-white/80">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1 w-full rounded-xl px-4 py-3 bg-white/10 border border-white/20 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center">
                    <label className="text-sm text-white/80">Password</label>

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-white/70 hover:text-white"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="mt-1 w-full rounded-xl px-4 py-3 bg-white/10 border border-white/20 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>

                {/* BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl py-3 font-semibold bg-white text-black hover:bg-white/90 transition disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

              </form>

              {/* FOOTER */}
              <p className="text-center text-white/70 text-sm mt-6">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-white underline">
                  Register
                </Link>
              </p>

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}