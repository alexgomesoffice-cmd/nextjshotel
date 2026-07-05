'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/end-user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.message || 'Registration failed')
        return
      }

      router.push('/login?registered=true')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
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

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Layout */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">

        {/* LEFT SIDE */}
        <div className="hidden lg:flex lg:w-1/2 items-center px-16">
          <div className="text-white max-w-xl">

            <h1 className="text-5xl font-bold leading-tight">
              Create your account.
            </h1>

            <p className="mt-6 text-lg text-white/80">
              Join us and start booking luxury hotels, unique stays, and unforgettable experiences around the world.
            </p>

          </div>
        </div>

        {/* MOBILE HEADER */}
        <div className="lg:hidden text-center text-white px-6 pt-20 pb-10">
          <h1 className="text-3xl font-bold">
            Create your account
          </h1>
          <p className="mt-3 text-white/80 text-sm">
            Join and start booking amazing stays
          </p>
        </div>

        {/* FORM SIDE */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12 lg:pb-0">

          <div className="w-full max-w-md">

            <div className="rounded-3xl border border-white/20 bg-white/10 backdrop-blur-2xl shadow-2xl p-8">

              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white">
                  Sign Up
                </h2>
                <p className="text-white/70 mt-2">
                  Create your free account
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

                {/* NAME */}
                <div>
                  <label className="text-sm text-white/80">Full Name</label>
                  <input
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                    className="mt-1 w-full rounded-xl px-4 py-3 bg-white/10 border border-white/20 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label className="text-sm text-white/80">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="mt-1 w-full rounded-xl px-4 py-3 bg-white/10 border border-white/20 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="text-sm text-white/80">Password</label>
                  <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    minLength={6}
                    required
                    className="mt-1 w-full rounded-xl px-4 py-3 bg-white/10 border border-white/20 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>

                {/* CONFIRM PASSWORD */}
                <div>
                  <label className="text-sm text-white/80">Confirm Password</label>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
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
                  {loading ? 'Creating account...' : 'Sign Up'}
                </button>

              </form>

              {/* FOOTER */}
              <p className="text-center text-white/70 text-sm mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-white underline">
                  Sign In
                </Link>
              </p>

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}