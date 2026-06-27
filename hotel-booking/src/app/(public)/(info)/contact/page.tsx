import { Phone, Mail, MapPin } from 'lucide-react'

export const metadata = { title: 'Contact Us | GhuriBangla' }

export default function ContactPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Phone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contact Us</h1>
          <p className="text-sm text-muted-foreground">We are here to help</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Mail,   label: 'Email',   value: 'support@ghuribangla.com' },
          { icon: Phone,  label: 'Phone',   value: '+880 1800-000000' },
          { icon: MapPin, label: 'Address', value: 'Dhaka, Bangladesh' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col items-center text-center p-4 rounded-2xl border border-border/50 bg-secondary/20">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xs font-medium">{value}</p>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl border border-border/50 bg-secondary/20 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Send us a message</h2>
          <p className="text-sm text-muted-foreground">We will get back to you within 24 hours.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              placeholder="Your name"
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Message</label>
          <textarea
            rows={4}
            placeholder="How can we help?"
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>
        <button className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          Send Message
        </button>
      </div>
    </div>
  )
}