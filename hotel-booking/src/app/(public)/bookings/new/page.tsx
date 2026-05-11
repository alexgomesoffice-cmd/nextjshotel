import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BookingClient from "./booking-client";
import { format } from "date-fns";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirm Your Booking | StayVista",
  description: "Complete your reservation",
};

interface BookingPageProps {
  searchParams: Promise<{
    hotel?: string;
    room_type?: string;
    quantity?: string;
    check_in?: string;
    check_out?: string;
    guests?: string;
  }>;
}

export default async function BookingNewPage({ searchParams }: BookingPageProps) {
  const params = await searchParams;

  if (
    !params.hotel ||
    !params.room_type ||
    !params.check_in ||
    !params.check_out ||
    !params.quantity ||
    !params.guests
  ) {
    redirect("/"); // Missing required params, back to home
  }

  const checkIn = new Date(params.check_in);
  const checkOut = new Date(params.check_out);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    redirect("/"); // Invalid dates
  }

  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Fetch Hotel & Room Type Data
  const hotel = await prisma.hotels.findUnique({
    where: { slug: params.hotel },
    include: {
      detail: true,
      images: {
        where: { is_cover: true },
        take: 1,
      },
    },
  });

  if (!hotel) redirect("/");

  const roomType = await prisma.room_types.findUnique({
    where: { id: Number(params.room_type) },
    include: {
      type_images: {
        take: 1,
      },
      room_bed_types: {
        include: { bed_type: true },
      },
      room_properties: {
        include: { amenity: true },
      },
      room_details: {
        where: { status: "AVAILABLE", deleted_at: null }, // count physical rooms
      },
    },
  });

  if (!roomType || roomType.hotel_id !== hotel.id) redirect("/");

  const quantity = Number(params.quantity);
  const guests = Number(params.guests);
  
  if (roomType.room_details.length < quantity) {
    // Not enough physical rooms available conceptually (ignoring dates for a moment here, the API does exact checks)
    // For a robust system, we would check date overlaps here too.
  }

  const pricePerNight = Number(roomType.base_price);
  const totalPrice = pricePerNight * nights * quantity;

  // Since middleware protects this route, we know user is logged in.
  // We can fetch the user profile if needed, but for now we just pass data to the client component.

  return (
    <div className="min-h-screen bg-muted/30 pt-28 pb-20">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Review your booking</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          {/* Main Column */}
          <BookingClient
            bookingData={{
              hotelId: hotel.id,
              roomTypeId: roomType.id,
              checkIn: params.check_in,
              checkOut: params.check_out,
              guests: guests,
              quantity: quantity,
            }}
          />

          {/* Sidebar Summary */}
          <aside>
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm sticky top-32">
              <div className="flex gap-4 pb-6 border-b border-border/50">
                <div className="relative h-24 w-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                  {(roomType.type_images[0]?.image_url || hotel.images[0]?.image_url) && (
                    <Image
                      src={roomType.type_images[0]?.image_url || hotel.images[0]?.image_url}
                      alt={roomType.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg leading-tight mb-1">{hotel.name}</h3>
                  <p className="text-sm text-muted-foreground">{roomType.name}</p>
                </div>
              </div>

              <div className="py-6 space-y-4 border-b border-border/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Check-in</p>
                    <p className="font-medium">{format(checkIn, "EEE, MMM d, yyyy")}</p>
                    <p className="text-sm text-muted-foreground">{hotel.detail?.check_in_time || "14:00"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Check-out</p>
                    <p className="font-medium">{format(checkOut, "EEE, MMM d, yyyy")}</p>
                    <p className="text-sm text-muted-foreground">{hotel.detail?.check_out_time || "12:00"}</p>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-sm font-medium">Total length of stay:</p>
                  <p className="text-sm text-muted-foreground">{nights} night{nights !== 1 ? "s" : ""}</p>
                </div>
              </div>

              <div className="py-6 border-b border-border/50">
                <h3 className="font-semibold mb-4">Price details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>
                      ৳{pricePerNight.toLocaleString()} × {nights} night{nights !== 1 ? "s" : ""} × {quantity} room{quantity !== 1 ? "s" : ""}
                    </span>
                    <span>৳{totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxes & fees</span>
                    <span>Included</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-bold">Total Price</h3>
                    <p className="text-xs text-muted-foreground">Includes taxes and charges</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">৳{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
