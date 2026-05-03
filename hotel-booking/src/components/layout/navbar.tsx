'use client'

// filepath: src/components/layout/navbar.tsx
// Ported from MERN Navbar.tsx
// Changes:
//   - 'use client' added
//   - import Link from 'next/link'
//   - useNavigate → useRouter, useLocation → usePathname (from 'next/navigation')
//   - getLoggedInUser() removed — user fetched from /api/auth/me on mount
//   - handleLogout calls POST /api/auth/logout (clears HttpOnly cookie server-side)
//   - theme toggle removed (dark theme is applied globally via globals.css)
//   - custom event 'stayvista-auth-change' replaced with storage event on 'user_name'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X, Hotel, User, CalendarDays, Settings, LogOut, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
//import { useToast } from '@/hooks/use-toast'
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
  const router = useRouter()
 // const { toast } = useToast()
  const { theme, toggleTheme } = useTheme()
  // Scroll listener
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
  ]

  const initials = user
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : ''

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        isScrolled
          ? 'bg-background/70 backdrop-blur-xl shadow-lg shadow-background/20 border-b border-border/30'
          : 'bg-background/30 backdrop-blur-md'
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-r from-primary to-accent rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative bg-linear-to-r from-primary to-accent p-2.5 rounded-xl">
                <Hotel className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <span className="text-2xl font-bold text-linear-to-r">StayVista</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.path}
                className={cn(
                  'relative text-sm font-medium transition-colors duration-300 hover:text-primary',
                  pathname === link.path ? 'text-primary' : 'text-muted-foreground'
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
          <div className="hidden md:flex items-center gap-3">

            <button
              onClick={toggleTheme}
              className="relative p-2.5 rounded-xl glass transition-all duration-300 hover:scale-110 hover:bg-primary/10 group overflow-hidden"
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 dark:hidden" />
              <Moon className="h-5 w-5 hidden dark:block" />
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 px-3 py-2 rounded-xl glass hover:bg-primary/10 transition-all duration-300">
                    <div className="w-9 h-9 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary-foreground">{initials}</span>
                    </div>
                    <span className="text-sm font-medium max-w-30 truncate">{user.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2">
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
            className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'md:hidden absolute top-full left-0 right-0 bg-background/80 backdrop-blur-xl overflow-hidden transition-all duration-300',
          isMobileMenuOpen ? 'max-h-125 border-b border-border/30' : 'max-h-0'
        )}
      >
        <div className="container mx-auto px-4 py-4 space-y-4">
          {navLinks.map((link, index) => (
            <Link
              key={link.name}
              href={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                'block py-2 text-sm font-medium transition-colors',
                pathname === link.path ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-border flex flex-col gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">{initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground">
                  <User className="h-4 w-4" /> Profile
                </Link>
                <Link href="/bookings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground">
                  <CalendarDays className="h-4 w-4" /> My Bookings
                </Link>
                <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground">
                  <Settings className="h-4 w-4" /> Settings
                </Link>
                <button
                  onClick={() => { handleLogout(); setIsMobileMenuOpen(false) }}
                  className="flex items-center gap-2 py-2 text-sm text-destructive"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </>
            ) : (
              <div className="flex gap-3">
                <Link href="/login" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">Log in</Button>
                </Link>
                <Link href="/register" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full">Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar