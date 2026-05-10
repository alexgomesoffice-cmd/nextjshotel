import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MapPin, Star, CheckCircle2 } from "lucide-react";

import HotelImagesGalleryClient from "./hotel-images-client";
import RoomsSectionClient from "@/components/room/rooms-section-client";
import { Button } from "@/components/ui/button";

// Revalidate every 1 hour (or use dynamic depending on booking frequency)
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hotel = await prisma.hotels.findUnique({
    where: { slug },
    select: { name: true, detail: { select: { short_description: true } } }
  });
  
  if (!hotel) return { title: 'Hotel Not Found' };
  
  return {
    title: `${hotel.name} | StayVista`,
    description: hotel.detail?.short_description || `Book your stay at ${hotel.name} with StayVista.`,
  };
}

export default async function HotelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  const hotel = await prisma.hotels.findUnique({
    where: { 
      slug,
      approval_status: 'PUBLISHED',
      deleted_at: null
    },
    include: {
      city: true,
      hotel_type: true,
      detail: true,
      images: {
        orderBy: { sort_order: 'asc' }
      },
      hotel_amenities: {
        include: {
          amenity: true
        }
      },
      custom_amenities: {
        where: { is_active: true }
      },
      room_types: {
        where: { is_active: true },
        include: {
          room_details: {
            where: { 
              status: 'AVAILABLE',
              deleted_at: null
            }
          },
          type_images: {
            orderBy: { sort_order: 'asc' }
          },
          room_bed_types: {
            include: {
              bed_type: true
            }
          },
          room_properties: {
            include: {
              amenity: true
            }
          }
        }
      }
    }
  });

  if (!hotel) {
    notFound();
  }

  const allAmenities = [
    ...(hotel.hotel_amenities || []).map(ha => ha.amenity.name),
    ...(hotel.custom_amenities || []).map(ca => ca.name)
  ];

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {hotel.hotel_type?.name}
                </span>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 ${hotel.detail?.star_rating && i < Number(hotel.detail.star_rating) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`} 
                    />
                  ))}
                </div>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">{hotel.name}</h1>
              <div className="flex items-center text-muted-foreground gap-2">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">{hotel.city?.name}</span>
                {hotel.address && <span>• {hotel.address}</span>}
              </div>
            </div>
            {hotel.detail?.guest_rating && (
              <div className="flex items-center gap-3 bg-secondary/30 p-3 rounded-2xl shrink-0 border border-border/50">
                <div className="flex flex-col items-end">
                  <span className="font-semibold text-sm">Guest Rating</span>
                  <span className="text-xs text-muted-foreground">Excellent</span>
                </div>
                <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {Number(hotel.detail.guest_rating).toFixed(1)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gallery */}
        <div className="mb-12">
          <HotelImagesGalleryClient images={hotel.images} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Description */}
            <section>
              <h2 className="text-2xl font-bold mb-4">About this property</h2>
              <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {hotel.detail?.description || hotel.detail?.short_description || "No description available."}
              </div>
            </section>

            {/* Amenities */}
            {allAmenities.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">Property Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                  {allAmenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Policies */}
            {(hotel.detail?.check_in_time || hotel.detail?.check_out_time || hotel.detail?.cancellation_policy) && (
              <section className="bg-secondary/20 p-6 rounded-3xl border border-border/50">
                <h2 className="text-xl font-bold mb-6">Good to know</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {hotel.detail?.check_in_time && (
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Check-in</p>
                      <p className="font-semibold">{hotel.detail.check_in_time}</p>
                    </div>
                  )}
                  {hotel.detail?.check_out_time && (
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Check-out</p>
                      <p className="font-semibold">{hotel.detail.check_out_time}</p>
                    </div>
                  )}
                  {hotel.detail?.cancellation_policy && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Cancellation Policy</p>
                      <p className="text-sm">{hotel.detail.cancellation_policy}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

          </div>

          {/* Map or Sidebar Content */}
          <div className="space-y-6">
             <div className="bg-muted w-full h-[300px] rounded-3xl flex items-center justify-center border border-border/50 shadow-sm relative overflow-hidden group">
               {/* Decorative Map Placeholder */}
               <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=New+York,NY&zoom=13&size=600x300&maptype=roadmap')] bg-cover bg-center opacity-20 grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:opacity-60"></div>
               <div className="relative z-10 flex flex-col items-center p-4 bg-background/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-lg group-hover:-translate-y-1 transition-transform">
                  <MapPin className="h-8 w-8 text-primary mb-2" />
                  <p className="font-semibold text-center">{hotel.city?.name}</p>
                  <Button variant="link" className="text-xs h-auto p-0 mt-1">View on map</Button>
               </div>
             </div>
          </div>
        </div>

        {/* Room Types */}
        <div className="mt-16 pt-12 border-t border-border/50">
          <h2 className="text-3xl font-bold mb-8">Available Rooms</h2>
          
          {hotel.room_types && hotel.room_types.length > 0 ? (
            <RoomsSectionClient
              roomTypes={hotel.room_types.map((room) => ({
                id: room.id,
                name: room.name,
                description: room.description,
                base_price: Number(room.base_price),
                max_occupancy: room.max_occupancy,
                room_size: room.room_size,
                type_images: room.type_images,
                room_bed_types: room.room_bed_types,
                room_properties: room.room_properties,
                available_rooms_count: room.room_details.length,
              }))}
              hotelSlug={hotel.slug}
            />
          ) : (
             <div className="flex flex-col items-center justify-center p-12 bg-secondary/20 rounded-3xl border border-border/50">
               <h3 className="text-xl font-semibold mb-2">No rooms available</h3>
               <p className="text-muted-foreground text-center">Currently there are no rooms available to book at this property.</p>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}
