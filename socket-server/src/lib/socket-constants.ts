export const SOCKET_EVENTS = {
  joinHotel: "join:hotel",
  joinHotelAdmin: "join:hotel-admin",
  joinBooking: "join:booking",
} as const;

export function buildUserRoom(userId: string | number): string {
  return `user:${userId}`;
}

export function buildHotelAvailabilityRoom(hotelId: string | number): string {
  return `hotel:${hotelId}:availability`;
}

export function buildHotelAdminRoom(hotelId: string | number): string {
  return `hotel-admin:${hotelId}`;
}

export function buildBookingRoom(reference: string): string {
  return `booking:${reference}`;
}
