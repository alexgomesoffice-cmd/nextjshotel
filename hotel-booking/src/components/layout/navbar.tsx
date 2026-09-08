'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Hotel, User, CalendarDays, Settings, LogOut, Sun, Moon, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from '@/hooks/use-theme'
interface AuthUser {
  name: string
  email: string
}

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const pathname = usePathname()
  const isHome = pathname === '/'
  const router = useRouter()
  const { toast } = useToast()
  const { theme, toggleTheme, isInitialized } = useTheme()


  // Scroll listener
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!isMobileMenuOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileMenuOpen])

  // Fetch current user from /api/auth/me
  // Falls back to null (shows login/signup) if not logged in or not an END_USER
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        const data = await res.json()
        if (data.success && data.data.actor_type === 'END_USER') {
          setUser({ name: data.data.name, email: data.data.email })
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      }
    }
    fetchUser()
  }, [pathname]) // re-check on every route change

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore — clear state regardless
    }
    setUser(null)
    // toast({ title: 'Logged out', description: 'You have been signed out successfully.' })
    router.push('/')
  }

  const navLinks = [
    { name: 'Stay', path: '/' },
    { name: 'Explore', path: '/hotels' },
    { name: 'Destinations', path: '/destinations' },
    { name: 'Car Rental', path: '/car-rental' },
    { name: 'Attractions', path: '/attract' },
    { name: 'Blog', path: '/all-blog' },

    
  ]

  const initials = user
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : ''

  return (
<>
<nav
  className={cn(
    "fixed inset-x-0 top-0 z-50 w-full max-w-[100vw] border-0 outline-none transition-all duration-500 ease-out bg-background/40",

    // Smooth background layer
    "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-full",
    "before:bg-background before:transition-opacity before:duration-500 before:ease-out",

    isScrolled
      ? "before:opacity-80 backdrop-blur-xl shadow-sm shadow-foreground/5"
      : isHome
        ? theme === "light"
          ? "before:opacity-0 backdrop-blur-[2px] shadow-none"
          : "before:opacity-0 backdrop-blur-[2px] shadow-none"
        : "before:opacity-80 backdrop-blur-md shadow-none"
  )}
>

      <div className="container mx-auto min-w-0 max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-[72px] min-w-0 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-r from-primary to-accent rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative bg-linear-to-r from-primary to-accent p-2.5 rounded-xl">
                <Hotel className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <span className="truncate text-2xl font-bold text-foreground">GhuriBangla</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden xl:flex items-center gap-6 2xl:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.path}
                className={cn(
                  'relative text-sm font-medium transition-colors duration-300 hover:text-primary',
                  pathname === link.path
                    ? 'text-primary'
                    : 'text-foreground hover:text-foreground'
                )}
              >
                {link.name}
                {pathname === link.path && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-linear-to-r from-primary to-accent rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden xl:flex items-center gap-3">

            <button
              onClick={toggleTheme}
              className="relative p-2.5 rounded-xl transition-all duration-500 hover:scale-110 group overflow-hidden flex items-center justify-center border-none backdrop-blur-sm bg-background/30 hover:bg-primary/10"
              aria-label="Toggle theme"
            >
              {isInitialized && (

                <>
                  <Sun
  className={cn(
    "h-5 w-5 text-white transition-all duration-500",
    theme === "dark"
      ? "rotate-0 scale-100 opacity-100"
      : "rotate-90 scale-0 opacity-0"
  )}
/>

<Moon
  className={cn(
    "absolute h-5 w-5  transition-all duration-500",
    theme === "light"
      ? "rotate-0 scale-100 opacity-100"
      : "-rotate-90 scale-0 opacity-0"
  )}
/>

                </>
              )}
              <span className="absolute inset-0 rounded-xl bg-linear-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>


            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 px-3 py-2 rounded-xl border-none outline-none ring-0 bg-background/30 hover:bg-primary/10 transition-all duration-300 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                    <div className="w-9 h-9 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary-foreground">{initials}</span>
                    </div>
                    <span className="text-sm font-medium max-w-30 truncate">{user.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="mt-2 w-56 border border-foreground/10 bg-background/70 backdrop-blur-sm shadow-xl">
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/profile')} className="gap-2 cursor-pointer">
                    <User className="h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/bookings')} className="gap-2 cursor-pointer">
                    <CalendarDays className="h-4 w-4" /> My Bookings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/favorites')} className="gap-2 cursor-pointer">
                    <Heart className="h-4 w-4" /> Favorites
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="hover:scale-105 transition-transform">
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="default" className="animate-pulse-glow">Sign up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-foreground/15 bg-background/35 text-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 active:scale-95 xl:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            <span className="relative block h-4 w-5" aria-hidden="true">
              <span className={cn(
                'absolute left-0 top-1/2 h-0.5 w-5 origin-center rounded-full bg-current transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                isMobileMenuOpen ? '-translate-y-1/2 rotate-45' : '-translate-y-[7px] rotate-0'
              )} />
              <span className={cn(
                'absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 origin-center rounded-full bg-current transition-[transform,opacity] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                isMobileMenuOpen ? 'scale-x-75 opacity-0' : 'scale-x-100 opacity-100'
              )} />
              <span className={cn(
                'absolute left-0 top-1/2 h-0.5 w-5 origin-center rounded-full bg-current transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                isMobileMenuOpen ? '-translate-y-1/2 -rotate-45' : 'translate-y-[6px] rotate-0'
              )} />
            </span>
          </button>
        </div>
      </div>
    </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          'fixed inset-x-0 top-[72px] bottom-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ease-out xl:hidden',
          isMobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div
        className={cn(
          'fixed inset-y-2 right-2 top-[80px] z-[60] w-[calc(100vw-1rem)] max-w-[26rem] overflow-hidden rounded-2xl border border-foreground/12 bg-card/95 shadow-2xl shadow-black/25 backdrop-blur-2xl transition-[transform,opacity,visibility] duration-300 ease-out motion-reduce:transition-none sm:right-4 sm:w-[calc(100vw-2rem)] xl:hidden',
          isMobileMenuOpen
            ? 'pointer-events-auto visible translate-x-0 opacity-100'
            : 'pointer-events-none invisible translate-x-4 opacity-0'
        )}
        id="mobile-navigation"
        aria-hidden={!isMobileMenuOpen}
      >
        <div key={isMobileMenuOpen ? 'open' : 'closed'} className="relative z-10 flex h-full max-h-[calc(100dvh-80px)] flex-col overflow-y-auto overscroll-contain px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6">
          <div className="mb-5 flex items-center justify-between border-b border-border/70 pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Explore</p>
              <p className="mt-1 text-sm text-muted-foreground">Find your next stay</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--color-primary)/0.8)]" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-2 gap-x-3">
            <div className="space-y-1">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">Navigation</p>
              {navLinks.slice(0, 3).map((link, index) => (
                <Link
                  key={link.name}
                  href={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'mobile-menu-item flex min-h-10 items-center rounded-lg border border-transparent px-3 text-sm font-medium transition-all duration-200 hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 active:bg-secondary',
                    pathname === link.path ? 'border-primary/20 bg-primary/10 text-primary' : 'text-foreground/80'
                  )}
                  style={{ animationDelay: `${index * 28}ms` }}
                >
                  {pathname === link.path && <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="space-y-1">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">Travel & content</p>
              {navLinks.slice(3).map((link, index) => (
                <Link
                  key={link.name}
                  href={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'mobile-menu-item flex min-h-10 items-center rounded-lg border border-transparent px-3 text-sm font-medium transition-all duration-200 hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 active:bg-secondary',
                    pathname === link.path ? 'border-primary/20 bg-primary/10 text-primary' : 'text-foreground/80'
                  )}
                  style={{ animationDelay: `${(index + 3) * 28}ms` }}
                >
                  {pathname === link.path && <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-border/70 pt-5">
            {user ? (
              <>
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-border/70 bg-background/35 px-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-accent shadow-lg shadow-primary/20">
                    <span className="text-xs font-bold text-primary-foreground">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="mobile-menu-item flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground">
                    <User className="h-4 w-4" /> Profile
                  </Link>
                  <Link href="/bookings" onClick={() => setIsMobileMenuOpen(false)} className="mobile-menu-item flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground">
                    <CalendarDays className="h-4 w-4" /> My Bookings
                  </Link>
                  <Link href="/favorites" onClick={() => setIsMobileMenuOpen(false)} className="mobile-menu-item flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600">
                    <Heart className="h-4 w-4" /> Favorites
                  </Link>
                  <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className="mobile-menu-item flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground">
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false) }}
                    className="mobile-menu-item flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                  <button
                    onClick={toggleTheme}
                    className="mobile-menu-item flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                    aria-label="Toggle theme"
                  >
                    {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    {theme === 'light' ? 'Dark mode' : 'Light mode'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-3">
                <Link href="/login" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="h-11 w-full">Log in</Button>
                </Link>
                <Link href="/register" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button size="sm" className="h-11 w-full">Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Navbar