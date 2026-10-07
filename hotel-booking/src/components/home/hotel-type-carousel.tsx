"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Building2 } from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Skeleton } from "@/components/ui/skeleton"

interface HotelType {
  id: number
  name: string
  image_url: string | null
}

export default function HotelTypeCarousel() {
  const [hotelTypes, setHotelTypes] = useState<HotelType[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHotelTypes = async () => {
      try {
        const response = await fetch("/api/public/hotel-types")
        if (!response.ok) throw new Error("Failed to fetch hotel types")

        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setHotelTypes(result.data)
        }
      } catch (error) {
        console.error("Failed to fetch hotel types:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHotelTypes()
  }, [])

  if (isLoading) {
    return (
      <section className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-56 rounded-2xl" />)}
          </div>
        </div>
      </section>
    )
  }

  if (hotelTypes.length === 0) return null

  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Carousel opts={{ align: "start", loop: hotelTypes.length > 4 }} aria-label="Hotel types">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Explore by{" "}
                <span className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
                 Property Type
              </span>
              </h2>
              <p className="mt-2 text-muted-foreground">Find a stay that fits the way you travel.</p>
            </div>
            <div className="hidden gap-2 sm:flex">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </div>
          <CarouselContent className="-ml-4">
            {hotelTypes.map((hotelType) => (
              <CarouselItem key={hotelType.id} className="pl-4 basis-4/5 sm:basis-1/2 lg:basis-1/4">
                <Link
                  href={`/search?hotel_types=${encodeURIComponent(hotelType.name)}`}
                  className="group relative block h-56 overflow-hidden rounded-2xl border border-border/60 bg-secondary/30 shadow-sm transition-shadow hover:shadow-lg"
                >
                  {hotelType.image_url ? (
                    <Image
                      src={hotelType.image_url}
                      alt={hotelType.name}
                      fill
                      sizes="(max-width: 640px) 80vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/50">
                      <Building2 className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <h3 className="absolute inset-x-0 bottom-0 p-5 text-xl font-semibold text-white">{hotelType.name}</h3>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  )
}
