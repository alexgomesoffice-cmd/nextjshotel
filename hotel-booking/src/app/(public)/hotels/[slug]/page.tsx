import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import * as LucideIcons from "lucide-react";
import { MapPin, Star, CheckCircle2 } from "lucide-react";
import {
  Clock,
  Phone,
  Globe,
  Shield,
  type LucideIcon,
} from "lucide-react";
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
    title: `${hotel.name} | GhuriBangla`,
    description: hotel.detail?.short_description || `Book your stay at ${hotel.name} with GhuriBangla.`,
  };
}

function buildRoomDetailWhere() {
  return { status: 'AVAILABLE' as const, deleted_at: null };
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

function AmenityIcon({ iconName, className }: { iconName?: string | null; className?: string }) {

  const resolvedName = iconName?.trim();
  const IconComponent = resolvedName
  ? (LucideIcons as unknown as Record<string, LucideIcon | undefined>)[resolvedName]
  : undefined;

  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  return <CheckCircle2 className={className} />;
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
            where: buildRoomDetailWhere(),
            include: {
              room_images: {
                orderBy: { sort_order: 'asc' }
              },
              room_trackers: {
                where: {
                  status: { in: ['RESERVED', 'BOOKED', 'CHECKED_IN'] },
                  ...(search.check_in && search.check_out
                    ? {
                        check_in: { lt: new Date(search.check_out) },
                        check_out: { gt: new Date(search.check_in) },
                      }
                    : {}),
                },
                select: {
                  status: true,
                  check_in: true,
                  check_out: true,
                },
              },
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
    ...(hotel.hotel_amenities || []).map((ha) => ({
      name: ha.amenity.name,
      icon: ha.amenity.icon,
    })),
    ...(hotel.custom_amenities || []).map((ca) => ({
      name: ca.name,
      icon: ca.icon,
    }))
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
                const room_variants = groupRoomVariants(room.room_details, {
                checkIn: search.check_in,
                checkOut: search.check_out,
              })
              const available_rooms_count = room_variants.reduce((sum, variant) => sum + variant.available_count, 0)
              return {
                id: room.id,
                hotel_id: hotel.id,
                name: room.name,
                description: room.description,
                base_price: Number(room.base_price),
                max_occupancy: room.max_occupancy,
                room_size: room.room_size,
                type_images: room.type_images,
                room_bed_types: room.room_bed_types,
                room_properties: room.room_properties,
                available_rooms_count,
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
          <section className="glass mt-24 rounded-2xl shadow-md">
            <h2 className="text-2xl font-bold m-6 rounded ">About this property</h2>
            <ExpandableDescription
              text={hotel.detail?.description || hotel.detail?.short_description}
              maxLines={3}
            />
          </section>

          {/* Amenities */}
          {allAmenities.length > 0 && (
            <section className="glass p-6 rounded-2xl shadow-md">
              <h2 className="text-2xl font-bold mb-6 ">Property Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                {allAmenities.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-3 glass rounded-2xl p-3 text-sm font-medium text-muted-foreground shadow-md hover:border-primary/40 ">
                    <AmenityIcon iconName={amenity.icon} className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm font-medium">{amenity.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Contact & Web */}
          {/* Things to know */}
{/* Things to know */}
{/* Things to know */}
{(
  hotel.detail?.check_in_time ||
  hotel.detail?.check_out_time ||
  hotel.detail?.cancellation_policy ||
  hotel.detail?.reception_no1 ||
  hotel.detail?.reception_no2 ||
  hotel.detail?.website
) && (
  <section className="glass rounded-3xl p-8 shadow-md">
    <h2 className="text-2xl font-bold mb-8">Things to know</h2>

    {/* Top Cards */}
    <div className="grid gap-6 lg:grid-cols-2">

      {/* Check In / Out */}
      {(hotel.detail?.check_in_time || hotel.detail?.check_out_time) && (
        <div className="rounded-2xl border border-border/60 bg-background/40 p-6 transition-all hover:border-primary/40 hover:shadow-lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-semibold text-lg">
                Check-in & Check-out
              </h3>
              <p className="text-sm text-muted-foreground">
                Hotel timings
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {hotel.detail?.check_in_time && (
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <span className="text-muted-foreground">
                  Check-in
                </span>

                <span className="font-semibold">
                  {formatTime12(hotel.detail.check_in_time)}
                </span>
              </div>
            )}

            {hotel.detail?.check_out_time && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Check-out
                </span>

                <span className="font-semibold">
                  {formatTime12(hotel.detail.check_out_time)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact */}
      {(hotel.detail?.reception_no1 ||
        hotel.detail?.reception_no2 ||
        hotel.detail?.website) && (
        <div className="rounded-2xl border border-border/60 bg-background/40 p-6 transition-all hover:border-primary/40 hover:shadow-lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-semibold text-lg">
                Contact
              </h3>
              <p className="text-sm text-muted-foreground">
                Reach the property
              </p>
            </div>
          </div>

          <div className="space-y-4">

            {hotel.detail?.reception_no1 && (
              <a
                href={`tel:${hotel.detail.reception_no1}`}
                className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="text-muted-foreground">
                  Reception
                </span>

                <span className="font-medium">
                  {hotel.detail.reception_no1}
                </span>
              </a>
            )}

            {hotel.detail?.reception_no2 && (
              <a
                href={`tel:${hotel.detail.reception_no2}`}
                className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="text-muted-foreground">
                  Alternate
                </span>

                <span className="font-medium">
                  {hotel.detail.reception_no2}
                </span>
              </a>
            )}

            {hotel.detail?.website && (
              <a
                href={
                  hotel.detail.website.startsWith("http")
                    ? hotel.detail.website
                    : `https://${hotel.detail.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  Website
                </span>

                <span className="truncate max-w-[180px] font-medium text-primary">
                  {hotel.detail.website.replace(/^https?:\/\//, "")}
                </span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Cancellation */}
    {hotel.detail?.cancellation_policy && (
      <div className="mt-6 rounded-2xl border border-border/60 bg-background/40 p-6 transition-all hover:border-primary/40 hover:shadow-lg">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-semibold text-lg">
              Cancellation Policy
            </h3>

            <p className="text-sm text-muted-foreground">
              Booking terms
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-background/50 p-5">
          <p className="leading-7 text-muted-foreground">
            {hotel.detail.cancellation_policy}
          </p>
        </div>
      </div>
    )}
  </section>


)}
        </div>
      </div>
    </div>
  );
}
