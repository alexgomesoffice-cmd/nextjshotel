// filepath: src/components/layout/footer.tsx
// Ported from MERN Footer.tsx
// Changes:
//   - import Link from 'next/link'  (was react-router-dom)
//   - Link href=  (was to=)
//   - No 'use client' needed — no state or hooks

import Link from 'next/link'
import { Hotel } from 'lucide-react'

const Footer = () => {
  const footerLinks = {
    Support: [
      { name: 'Help Center', href: '/help' },
      { name: 'Cancellation', href: '/cancellation' },
      { name: 'Contact Us', href: '/contact' },
      { name: 'Register Your Property', href: '/register-property' },
    ],
    Legal: [
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'Licenses', href: '/licenses' },
    ],
    Company: [
      { name: 'About Us', href: '/about' },
      
    ],
  }

  //const socialLinks = [
    //{ icon: Facebook, href: '#', label: 'Facebook' },
    //{ icon: Twitter, href: '#', label: 'Twitter' },
    //{ icon: Instagram, href: '#', label: 'Instagram' },
    //{ icon: Linkedin, href: '#', label: 'LinkedIn' },
  //]

  return (
    <footer className="relative pt-20 border-t border-border bg-card/50">
      {/* Gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="bg-linear-to-r from-primary to-accent p-2.5 rounded-xl">
                <Hotel className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-gradient">GhuriBangla</span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Your favorite hotel booking experience. Discover extraordinary stays
              and create unforgettable memories around the world.
            </p>
            
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom section */}
        {/*<div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 GhuriBangla. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary"
              >
                <social.icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>*/}
      </div>
    </footer>
  )
}

export default Footer