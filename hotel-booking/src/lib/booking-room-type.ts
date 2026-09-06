export const ONE_ROOM_TYPE_BOOKING_MESSAGE =
  "One booking can only contain rooms from one room type. Please select rooms from a single room type.";

export class OneRoomTypeBookingError extends Error {
  constructor() {
    super(ONE_ROOM_TYPE_BOOKING_MESSAGE);
    this.name = "OneRoomTypeBookingError";
  }
}

export function hasMultipleRoomTypes(roomTypeIds: Iterable<number>) {
  return new Set(roomTypeIds).size > 1;
}