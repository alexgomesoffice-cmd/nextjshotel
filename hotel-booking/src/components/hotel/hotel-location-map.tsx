import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

type HotelLocationMapProps = {
  mapUrl?: string | null
  className?: string
}

function isGoogleMapsEmbedUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'www.google.com' && url.pathname === '/maps/embed'
  } catch {
    return false
  }
}

export default function HotelLocationMap({ mapUrl, className }: HotelLocationMapProps) {
  if (!mapUrl?.trim() || !isGoogleMapsEmbedUrl(mapUrl)) {
    return (
      <div className={cn('flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-secondary/20 text-sm text-muted-foreground', className)}>
        <MapPin className="h-5 w-5" />
        <span>Hotel location map is not available.</span>
      </div>
    )
  }

  return (
    <iframe
      src={mapUrl}
      title="Hotel location on Google Maps"
      className={cn('w-full rounded-md border border-border/60', className)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
    />
  )
}