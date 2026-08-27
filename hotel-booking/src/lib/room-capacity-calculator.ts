/**
 * Room Capacity Calculator
 *
 * Determines if a room variant can accommodate a guest count,
 * calculates required rooms, and validates selections.
 *
 * Used by both search results and hotel detail pages to maintain consistency.
 */

/**
 * Calculate the minimum number of rooms required to accommodate a guest count.
 *
 * Example:
 *   requestedGuests = 8
 *   maxOccupancyPerRoom = 4
 *   returns 2 (ceil(8/4))
 */
export function calculateRequiredRooms(
  requestedGuests: number,
  maxOccupancyPerRoom: number
): number {
  if (maxOccupancyPerRoom <= 0 || requestedGuests <= 0) return 0;
  return Math.ceil(requestedGuests / maxOccupancyPerRoom);
}

/**
 * Check if a variant can accommodate the requested guests using available rooms.
 *
 * @param maxOccupancy - Max guests per room
 * @param availableCount - Number of physical rooms available for this variant
 * @param requestedGuests - Total guests needing accommodation
 * @param requestedRoomLimit - Maximum rooms the user wants to use (optional)
 * @returns true if variant can fulfill the request
 */
export function canVariantAccommodate(
  maxOccupancy: number | null,
  availableCount: number,
  requestedGuests: number,
  requestedRoomLimit?: number | null
): boolean {
  if (!maxOccupancy || maxOccupancy <= 0) return false;
  if (availableCount <= 0) return false;

  const requiredRooms = calculateRequiredRooms(requestedGuests, maxOccupancy);

  // Check availability
  if (requiredRooms > availableCount) return false;

  // Check requested room limit (if specified)
  if (requestedRoomLimit !== null && requestedRoomLimit !== undefined) {
    if (requiredRooms > requestedRoomLimit) return false;
  }

  return true;
}

/**
 * Get the recommended initial quantity for a variant.
 *
 * Returns the minimum rooms required to accommodate guests,
 * provided enough physical rooms are available.
 *
 * @returns Recommended quantity, or 0 if variant cannot accommodate
 */
export function getRecommendedQuantity(
  maxOccupancy: number | null,
  availableCount: number,
  requestedGuests: number,
  requestedRoomLimit?: number | null
): number {
  if (!canVariantAccommodate(maxOccupancy, availableCount, requestedGuests, requestedRoomLimit)) {
    return 0;
  }

  return calculateRequiredRooms(requestedGuests, maxOccupancy!);
}

/**
 * Get valid quantity range for a variant.
 *
 * Returns min and max quantities that would accommodate the requested guests.
 *
 * @returns { min, max } or null if variant cannot accommodate at all
 */
export function getValidQuantityRange(
  maxOccupancy: number | null,
  availableCount: number,
  requestedGuests: number,
  requestedRoomLimit?: number | null
): { min: number; max: number } | null {
  if (!maxOccupancy || maxOccupancy <= 0 || availableCount <= 0) return null;

  const minimumRequired = calculateRequiredRooms(requestedGuests, maxOccupancy);

  // Check if we have enough available rooms
  if (minimumRequired > availableCount) return null;

  const maxLimit = requestedRoomLimit !== null && requestedRoomLimit !== undefined
    ? requestedRoomLimit
    : availableCount;

  const maxAllowed = Math.min(availableCount, maxLimit);

  if (minimumRequired > maxAllowed) return null;

  return {
    min: minimumRequired,
    max: maxAllowed,
  };
}

/**
 * Validate if a selected quantity can accommodate the requested guests.
 *
 * @returns { valid, message } where message is empty if valid
 */
export function validateQuantity(
  selectedQuantity: number,
  maxOccupancy: number | null,
  requestedGuests: number,
  availableCount: number
): { valid: boolean; message: string } {
  if (selectedQuantity <= 0) {
    return { valid: false, message: "Select at least 1 room." };
  }

  if (!maxOccupancy || maxOccupancy <= 0) {
    return { valid: false, message: "Invalid room configuration." };
  }

  if (selectedQuantity > availableCount) {
    return {
      valid: false,
      message: `Only ${availableCount} room${availableCount !== 1 ? "s" : ""} available.`,
    };
  }

  const totalCapacity = selectedQuantity * maxOccupancy;

  if (totalCapacity < requestedGuests) {
    const required = calculateRequiredRooms(requestedGuests, maxOccupancy);
    return {
      valid: false,
      message: `${selectedQuantity} room${selectedQuantity !== 1 ? "s" : ""} accommodate${selectedQuantity === 1 ? "s" : ""} up to ${totalCapacity} guest${totalCapacity !== 1 ? "s" : ""}. Select at least ${required} room${required !== 1 ? "s" : ""}.`,
    };
  }

  return { valid: true, message: "" };
}

/**
 * Format a guest capacity message for display.
 *
 * Example outputs:
 *   "Up to 4 guests per room"
 *   "Accommodates 2 guests"
 */
export function formatCapacityMessage(
  maxOccupancy: number | null,
  selectedQuantity?: number
): string {
  if (!maxOccupancy || maxOccupancy <= 0) return "Room capacity unknown";

  if (selectedQuantity === undefined || selectedQuantity <= 1) {
    return `Up to ${maxOccupancy} guest${maxOccupancy !== 1 ? "s" : ""} per room`;
  }

  const total = selectedQuantity * maxOccupancy;
  return `${selectedQuantity} room${selectedQuantity !== 1 ? "s" : ""} accommodate${selectedQuantity === 1 ? "s" : ""} up to ${total} guest${total !== 1 ? "s" : ""}`;
}

/**
 * Format a recommendation message for display.
 *
 * Example:
 *   "2 rooms recommended for 8 guests"
 */
export function formatRecommendationMessage(
  requiredRooms: number,
  requestedGuests: number
): string {
  return `${requiredRooms} room${requiredRooms !== 1 ? "s" : ""} recommended for ${requestedGuests} guest${requestedGuests !== 1 ? "s" : ""}`;
}
