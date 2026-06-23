import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MapPin, Star, CheckCircle2 } from "lucide-react";

import HotelImagesGalleryClient from "./hotel-images-client";
import RoomSelector from "@/components/booking/room-selector";
import ExpandableDescription from "@/components/hotel/expandable-description";
import { groupRoomVariants } from "@/lib/room-grouping";

// Force fresh DB read on every request — availability data must be live
export const dynamic = 'force-dynamic';

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

function buildRoomDetailWhere(checkIn?: string, checkOut?: string) {
  const where: Record<string, unknown> = { status: 'AVAILABLE', deleted_at: null };
  if (checkIn && checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (!isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())) {
      where.room_trackers = {
        none: {
          status: { in: ['RESERVED', 'BOOKED', 'CHECKED_IN'] },
          check_in: { lt: checkOutDate },
          check_out: { gt: checkInDate },
        }
      };
    }
  }
  return where;
}

function formatTime12(time?: string | null) {
  if (!time) return null;
  const normalized = time.trim();
  if (/\b(am|pm)\b/i.test(normalized)) return normalized;
  const [hoursStr, minutesStr = '00'] = normalized.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return normalized;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = ((hours + 11) % 12) + 1;
  const paddedMinutes = String(minutes).padStart(2, '0');
  return `${hour12}:${paddedMinutes} ${period}`;
}

export default async function HotelDetailPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ slug: string }>,
  searchParams: Promise<{ check_in?: string; check_out?: string; guests?: string; room_type?: string }>
}) {
  const { slug } = await params;
  const search = await searchParams;
  
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
            where: buildRoomDetailWhere(search.check_in, search.check_out),
            include: {
              room_images: {
                orderBy: { sort_order: 'asc' }
              }
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
        {/* Available Rooms + Booking Sidebar */}
        <div id="rooms" className="pt-12 border-t border-border/50 scroll-mt-28">
          {hotel.room_types && hotel.room_types.length > 0 ? (
            <RoomSelector
              roomTypes={hotel.room_types.map((room) => {
                const room_variants = groupRoomVariants(room.room_details)
                return {
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
                  room_variants,
                }
              })}
              hotelSlug={hotel.slug}
              checkIn={search.check_in}
              checkOut={search.check_out}
              guests={search.guests ? parseInt(search.guests) : 1}
              focusRoomTypeId={search.room_type ? parseInt(search.room_type) : undefined}
            />

          ) : (
            <div className="flex flex-col items-center justify-center p-12 bg-secondary/20 rounded-3xl border border-border/50">
              <h3 className="text-xl font-semibold mb-2">No rooms available</h3>
              <p className="text-muted-foreground text-center">
                Currently there are no rooms available to book at this property.
              </p>
            </div>
          )}
        </div>
        {/* About, Amenities, Policies — full width, no sidebar */}
        <div className="space-y-12 mb-12">

          {/* Description */}
          <section>
            <h2 className="text-2xl font-bold mb-4 pt-24">About this property</h2>
            <ExpandableDescription 
              text={hotel.detail?.description || hotel.detail?.short_description}
              maxLines={3}
            />
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

          {/* Contact & Web */}
          {(hotel.detail?.reception_no1 || hotel.detail?.reception_no2 || hotel.detail?.website) && (
            <section>
              <h2 className="text-xl font-bold mb-4">Contact & Links</h2>
              <div className="flex flex-wrap gap-3">
                {hotel.detail?.reception_no1 && (
                  <a
                    href={`tel:${hotel.detail.reception_no1}`}
                    className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/40 transition-all group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.63 4.35 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Reception</p>
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{hotel.detail.reception_no1}</p>
                    </div>
                  </a>
                )}

                {hotel.detail?.reception_no2 && (
                  <a
                    href={`tel:${hotel.detail.reception_no2}`}
                    className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/40 transition-all group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.63 4.35 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Alternate</p>
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{hotel.detail.reception_no2}</p>
                    </div>
                  </a>
                )}

                {hotel.detail?.website && (
                  <a
                    href={hotel.detail.website.startsWith('http') ? hotel.detail.website : `https://${hotel.detail.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/40 transition-all group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Website</p>
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-[160px]">
                        {hotel.detail.website.replace(/^https?:\/\//, '')}
                      </p>
                    </div>
                  </a>
                )}
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
                    <p className="font-semibold">{formatTime12(hotel.detail.check_in_time)}</p>
                  </div>
                )}
                {hotel.detail?.check_out_time && (
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Check-out</p>
                    <p className="font-semibold">{formatTime12(hotel.detail.check_out_time)}</p>
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
      </div>
    </div>
  );
}
