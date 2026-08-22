import Image from "next/image";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectivePriceRange } from "@/lib/pricing-resolver";
import BookingClient from "./booking-client";
import { format } from "date-fns";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirm Your Booking | GhuriBangla",
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
  const variantIds = parseArrayParam(params["variant_ids[]"]);

  if (
    !params.hotel ||
    roomTypeIds.length === 0 ||
    quantities.length === 0 ||
    variantIds.length === 0 ||
    roomTypeIds.length !== quantities.length ||
    roomTypeIds.length !== variantIds.length ||
    !params.check_in ||
    !params.check_out ||
    !params.guests
  ) {
    redirect("/"); // Missing required params, back to home
  }

  const roomTypeIdsUnique = [...new Set(roomTypeIds.map((id) => Number(id)))];

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
  const variantIdsNum = variantIds.map(id => Number(id));
  const guests = Number(params.guests);

  if (
    roomTypeIdsNum.some(isNaN) ||
    quantitiesNum.some(isNaN) ||
    variantIdsNum.some(isNaN) ||
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
      id: { in: roomTypeIdsUnique },
      hotel_id: hotel.id,
    },
    include: {
      type_images: {
        take: 1,
      },
      room_variants: {
        where: { id: { in: variantIdsNum }, is_active: true },
        include: {
          pricing_rules: { where: { status: "ACTIVE" } },
        },
      },
    },
  });

  if (roomTypes.length !== roomTypeIdsUnique.length) redirect("/");

  const roomTypeMap = new Map(roomTypes.map(rt => [rt.id, rt]));
  const pricingByVariant = new Map(
    await Promise.all(variantIdsNum.map(async (variantId) => {
      const variant = roomTypes.flatMap((roomType) => roomType.room_variants).find((item) => item.id === variantId);
      if (!variant) redirect("/");
      return [variantId, await getEffectivePriceRange(variantId, checkIn, checkOut)] as const;
    }))
  );
  const roomSelections = roomTypeIdsNum.map((roomTypeId, index) => {
    const roomType = roomTypeMap.get(roomTypeId);
    const variant = roomType?.room_variants.find((item) => item.id === variantIdsNum[index]);
    if (!roomType || !variant) redirect("/");
    return {
      roomType,
      variant,
      variantId: variant.id,
      quantity: quantitiesNum[index],
      pricing: pricingByVariant.get(variant.id)!,
    };
  });

  const totalPrice = roomSelections.reduce(
    (sum, selection) => sum + selection.pricing.subtotal * selection.quantity,
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
                variantId: selection.variantId,
                quantity: selection.quantity,
                variantLabel: selection.variant.room_size || `Variant #${selection.variant.id}`,
                nightlyRates: selection.pricing.nights.map((night) => ({
                  date: night.date.toISOString(),
                  price: night.resolved.effectivePrice,
                  offerName: night.resolved.discount?.name || null,
                })),
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
                  {roomSelections.map((selection, index) => (
                    <div key={`${selection.roomType.id}-${selection.variantId}-${index}`} className="flex justify-between">
                      <span>
                        {selection.roomType.name} · {selection.variant.room_size || `Variant #${selection.variant.id}`} · TK {selection.pricing.subtotal.toLocaleString()} / room × {selection.quantity} room{selection.quantity !== 1 ? "s" : ""}
                      </span>
                      <span>TK {(selection.pricing.subtotal * selection.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxes & fees</span>
                    <span>Included</span>
                  </div>
                </div>
                <div className="mt-5 border-t border-border/50 pt-4">
                  <h4 className="mb-3 text-sm font-semibold">Nightly price breakdown</h4>
                  <div className="space-y-2 text-sm">
                    {roomSelections.flatMap((selection, selectionIndex) => selection.pricing.nights.map((night) => (
                      <div key={`${selection.variantId}-${night.date.toISOString()}-${selectionIndex}`} className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">
                          {format(night.date, "EEE, MMM d")}
                          {night.resolved.discount?.name ? ` · ${night.resolved.discount.name}` : ""}
                        </span>
                        <span className="font-medium">TK {night.resolved.effectivePrice.toLocaleString()}</span>
                      </div>
                    )))}
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
