import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, Building2, ChevronRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HotelCardProps {
  id: number;
  slug: string;
  name: string;
  city: string;
  hotel_type: string;
  star_rating?: number;
  guest_rating?: number;
  cover_image: string | null;
  short_description?: string;
  starting_price?: number;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

const HotelCard = ({
  slug,
  name,
  city,
  hotel_type,
  star_rating = 0,
  guest_rating = 0,
  cover_image,
  short_description,
  starting_price,
  checkIn,
  checkOut,
  guests,
}: HotelCardProps) => {
  const dateParams = checkIn && checkOut ? `?check_in=${checkIn}&check_out=${checkOut}&guests=${guests || 1}` : '';
  return (
    <Link href={`/hotels/${slug}${dateParams}`} className="group block h-full">
      <div className="relative h-full flex flex-col rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
        
        {/* Top Image Section */}
        <div className="relative h-56 w-full overflow-hidden bg-muted">
          {cover_image ? (
            <Image
              src={cover_image}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary/50">
              <Building2 className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />

          {/* Badges */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <span className="inline-flex items-center rounded-full bg-background/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
              {hotel_type}
            </span>
            <button className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition-colors">
              <Heart className="h-4 w-4" />
            </button>
          </div>

          {/* Location on image bottom */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center text-white">
             <MapPin className="h-4 w-4 mr-1 shrink-0" />
             <span className="text-sm font-medium truncate drop-shadow-md">{city}</span>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col grow p-5">
          <div className="flex justify-between items-start mb-2 gap-2">
            <h3 className="text-lg font-bold tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
              {name}
            </h3>
            
            {guest_rating > 0 && (
                <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md shrink-0">
                    <span className="font-bold text-sm">{Number(guest_rating).toFixed(1)}</span>
                </div>
            )}
          </div>

          {/* Stars */}
          <div className="flex items-center gap-0.5 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < Math.floor(star_rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 grow">
            {short_description || "Experience a wonderful stay with premium amenities and excellent service."}
          </p>

          {/* Footer (Price & CTA) */}
          <div className="pt-4 mt-auto border-t border-border/50 flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Starts from</span>
              <div className="flex items-baseline gap-1">
                {starting_price ? (
                  <>
                    <span className="text-lg font-bold text-foreground">
                      ৳{Number(starting_price).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">/ night</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">Price unavailable</span>
                )}
              </div>
            </div>
            
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
               <ChevronRight className="h-4 w-4 text-primary group-hover:text-primary-foreground transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default HotelCard;
