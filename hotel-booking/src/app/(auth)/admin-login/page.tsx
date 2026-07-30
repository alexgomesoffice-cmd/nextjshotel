'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, ArrowRight } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/system-admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.message)
        return
      }

      localStorage.setItem('admin_name', data.data.admin.name)
      localStorage.setItem('admin_role', 'SYSTEM_ADMIN')

      router.push('/dashboard/system')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-destructive/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-destructive rounded-xl blur-lg opacity-50" />
            <div className="relative bg-gradient-to-r from-primary to-destructive p-2.5 rounded-xl">
              <Shield className="h-6 w-6 text-white" />
            </div>
          </div>

          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-destructive bg-clip-text text-transparent">
            System Admin
          </span>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl">

          <h1 className="text-2xl font-bold text-center mb-2">
            Admin Login
          </h1>

          <p className="text-muted-foreground text-center mb-8">
            Sign in to the admin dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {error}
              </div>
            )}

            <div>
              <label className="block mb-2 text-sm font-medium">
                Email
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@system.com"
                className="w-full rounded-lg border border-border/50 bg-secondary/30 px-4 py-3 outline-none transition focus:border-primary"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">
                Password
              </label>

              <div className="relative">

                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border/50 bg-secondary/30 px-4 py-3 pr-12 outline-none transition focus:border-primary"
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
              disabled={loading}
              type="submit"
              className="w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}

              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

          </form>

        </div>
      </div>
    </div>
  )
}