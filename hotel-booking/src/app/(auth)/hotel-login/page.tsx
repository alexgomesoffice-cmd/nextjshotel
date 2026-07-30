'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Hotel, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function HotelLoginPage() {
  const router = useRouter()

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
      const res = await fetch('/api/auth/hotel/login', {
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

      // Store admin info for UI display only
      localStorage.setItem('admin_name', data.data.admin.name)
      localStorage.setItem('admin_role', data.data.admin.role)
      localStorage.setItem('hotel_id', data.data.admin.hotel_id.toString())

      // Redirect based on role
      if (data.data.admin.role === 'HOTEL_ADMIN') {
        router.push('/dashboard/hotel')
      } else {
        router.push('/dashboard/sub')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
  <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">

    {/* Background */}
    <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
    <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />

    <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">

      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur-lg opacity-50" />

          <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 p-2.5 rounded-xl">
            <Hotel className="h-6 w-6 text-white" />
          </div>
        </div>

        <span className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
          Hotel System Admin
        </span>
      </div>

      {/* Glass Card */}
      <div className="glass rounded-2xl p-8 shadow-2xl">

        <h1 className="text-2xl font-bold text-center mb-2">
          Hotel Admin Login
        </h1>

        <p className="text-muted-foreground text-center mb-8">
          Sign in to manage your hotel
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@hotel.com"
              className="w-full rounded-lg border border-border/50 bg-secondary/30 px-4 py-3 outline-none transition focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Password
            </label>

            <div className="relative">

              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border/50 bg-secondary/30 px-4 py-3 pr-12 outline-none transition focus:border-green-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>

            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 py-3 font-medium text-white transition hover:from-green-600 hover:to-emerald-600 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}

            <ArrowRight
              size={18}
              className="transition-transform"
            />
          </button>

        </form>

      </div>
    </div>
  </div>
)
}