'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

      if (!data.success) {
        setError(data.message)
        return
      }

      // Store user name for UI display only (not for security)
      localStorage.setItem('user_name', data.data.user.name)

      // Redirect to callback URL or home
      router.push(callbackUrl)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
  <div className="min-h-screen w-full flex bg-background">
    {/* Left Image */}
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
      <img
        src="/loginImg.jpg"
        alt="Luxury Hotel"
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/20 to-transparent" />

      <div className="absolute top-8 left-8 z-10">
        <Link
          href="/"
          className="inline-flex items-center px-5 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold text-lg hover:bg-white/20 transition"
        >
          GhuriBangla
        </Link>
      </div>

      <div className="absolute bottom-16 left-12 text-white max-w-lg">
        <h2 className="text-5xl font-bold leading-tight">
          Find your perfect stay.
        </h2>

        <p className="mt-4 text-lg text-white/80">
          Book luxury hotels and unforgettable experiences around the world.
        </p>
      </div>
    </div>

    {/* Right Side */}
    <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background">

      <div className="w-full max-w-md">

        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="rounded-3xl border border-border bg-card shadow-2xl p-8">

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">
              Welcome Back
            </h1>

            <p className="text-muted-foreground mt-2">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            {error && (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Email */}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Password */}

            <div>

              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium"
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Dont have an account?{" "}
            <Link
              href="/register"
              className="text-primary font-medium hover:underline"
            >
              Register
            </Link>
          </p>

        </div>

      </div>

    </div>
  </div>
);
}