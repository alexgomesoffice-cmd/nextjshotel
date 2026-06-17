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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseArrayParam(param?: string | string[]): string[] {
  if (!param) return [];
  return Array.isArray(param) ? param : [param];
}

export default async function BookingNewPage({ searchParams }: BookingPageProps) {
  const params = await searchParams;

  const roomTypeIds = parseArrayParam(params["room_type_ids[]"]).length
    ? parseArrayParam(params["room_type_ids[]"])
    : parseArrayParam(params.room_type);
  const quantities = parseArrayParam(params["quantities[]"]).length
    ? parseArrayParam(params["quantities[]"])
    : parseArrayParam(params.quantity);

  if (
    !params.hotel ||
    roomTypeIds.length === 0 ||
    quantities.length === 0 ||
    roomTypeIds.length !== quantities.length ||
    !params.check_in ||
    !params.check_out ||
    !params.guests
  ) {
    redirect("/"); // Missing required params, back to home
  }

  const checkIn = new Date(params.check_in as string);
  const checkOut = new Date(params.check_out as string);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    redirect("/"); // Invalid dates
  }

  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
  );

  const roomTypeIdsNum = roomTypeIds.map(id => Number(id));
  const quantitiesNum = quantities.map(qty => Number(qty));
  const guests = Number(params.guests);

  if (
    roomTypeIdsNum.some(isNaN) ||
    quantitiesNum.some(isNaN) ||
    quantitiesNum.some(qty => qty < 1) ||
    isNaN(guests) ||
    guests < 1
  ) {
    redirect("/");
  }

  // Fetch Hotel & Room Type Data
  const hotel = await prisma.hotels.findUnique({
    where: { slug: params.hotel as string },
    include: {
      detail: true,
      images: {
        where: { is_cover: true },
        take: 1,
      },
    },
  });

  if (!hotel) redirect("/");

  const roomTypes = await prisma.room_types.findMany({
    where: {
      id: { in: roomTypeIdsNum },
      hotel_id: hotel.id,
    },
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
        where: { status: "AVAILABLE", deleted_at: null },
      },
    },
  });

  if (roomTypes.length !== roomTypeIdsNum.length) redirect("/");

  const roomTypeMap = new Map(roomTypes.map(rt => [rt.id, rt]));
  const roomSelections = roomTypeIdsNum.map((roomTypeId, index) => {
    const roomType = roomTypeMap.get(roomTypeId);
    if (!roomType) redirect("/");
    return {
      roomType,
      quantity: quantitiesNum[index],
    };
  });

  const totalPrice = roomSelections.reduce(
    (sum, selection) => sum + Number(selection.roomType.base_price) * nights * selection.quantity,
    0
  );

  const selectedRoomImages = roomSelections
    .map(selection => selection.roomType.type_images[0]?.image_url)
    .filter(Boolean) as string[];
  const coverImage = selectedRoomImages[0] || hotel.images[0]?.image_url;

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
              roomSelections: roomSelections.map(selection => ({
                roomTypeId: selection.roomType.id,
                quantity: selection.quantity,
              })),
              checkIn: params.check_in as string,
              checkOut: params.check_out as string,
              guests,
            }}
          />

          {/* Sidebar Summary */}
          <aside>
            <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm sticky top-32">
              <div className="flex gap-4 pb-6 border-b border-border/50">
                <div className="relative h-24 w-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                  {coverImage && (
                    <Image
                      src={coverImage}
                      alt={hotel.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg leading-tight mb-1">{hotel.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {roomSelections.map(selection => selection.roomType.name).join(", ")}
                  </p>
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
                <div className="space-y-3 text-sm">
                  {roomSelections.map(selection => (
                    <div key={selection.roomType.id} className="flex justify-between">
                      <span>
                        {selection.roomType.name} · TK {Number(selection.roomType.base_price).toLocaleString()} × {nights} night{nights !== 1 ? "s" : ""} × {selection.quantity} room{selection.quantity !== 1 ? "s" : ""}
                      </span>
                      <span>TK {(Number(selection.roomType.base_price) * nights * selection.quantity).toLocaleString()}</span>
                    </div>
                  ))}
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
                  <span className="text-2xl font-bold text-primary">TK {totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
