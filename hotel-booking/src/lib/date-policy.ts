/**
 * Centralized date policy for hotel bookings.
 * This is the single source of truth for booking date rules.
 * 
 * RULES:
 * 1. Search window: 3 calendar months from today
 * 2. Maximum stay: 21 nights using [check_in, check_out) convention
 * 
 * CONVENTION:
 * - All dates are treated as calendar dates (YYYY-MM-DD)
 * - check_in is the first booked night
 * - check_out is NOT a booked night
 * - nights = dates from check_in up to, but not including, check_out
 * 
 * Example:
 * - Sep 1 → Sep 22 = 21 nights (VALID)
 * - Sep 1 → Sep 23 = 22 nights (INVALID)
 */

/**
 * Maximum number of calendar months allowed in search window
 */
export const MAX_SEARCH_MONTHS = 3;

/**
 * Maximum number of nights allowed in a single booking
 */
export const MAX_STAY_NIGHTS = 21;

/**
 * Normalizes a date to midnight in the local timezone.
 * This ensures consistent date comparisons.
 */
function normalizeDate(date: Date | string): Date {
  let d: Date;
  if (typeof date === "string") {
    d = new Date(date);
  } else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }

  // Set to midnight in local timezone
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the start of the booking window (earliest allowed check-in date).
 * This is today at midnight.
 */
export function getBookingWindowStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get the end of the booking window (latest allowed check-out date).
 * This is 3 calendar months from today at midnight.
 * 
 * Important: "3 calendar months" means:
 * - Today: 2026-09-01
 * - Upper boundary: 2026-12-01 (first day of the 4th month)
 * 
 * So the last valid check-in/check-out dates are 2026-11-30.
 */
export function getBookingWindowEnd(): Date {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  // Add 3 calendar months
  end.setMonth(end.getMonth() + MAX_SEARCH_MONTHS);

  return end;
}

/**
 * Check if a date is within the allowed booking window.
 * 
 * @param date - The date to check
 * @returns true if the date is within [windowStart, windowEnd)
 */
export function isDateWithinBookingWindow(date: Date | string): boolean {
  try {
    const d = normalizeDate(date);
    const windowStart = getBookingWindowStart();
    const windowEnd = getBookingWindowEnd();

    return d >= windowStart && d < windowEnd;
  } catch {
    return false;
  }
}

/**
 * Calculate the number of nights between check-in and check-out.
 * Uses the [check_in, check_out) convention.
 * 
 * @param checkIn - First booked night
 * @param checkOut - First unbooked night
 * @returns Number of nights (always >= 0)
 * 
 * Example:
 * - Sep 1 → Sep 22 = 21 nights
 * - Sep 1 → Sep 1 = 0 nights
 */
export function getStayNights(checkIn: Date | string, checkOut: Date | string): number {
  try {
    const ci = normalizeDate(checkIn);
    const co = normalizeDate(checkOut);

    if (co <= ci) {
      return 0; // Invalid, but return 0 rather than negative
    }

    const diff = co.getTime() - ci.getTime();
    const nights = Math.floor(diff / (1000 * 60 * 60 * 24));

    return Math.max(0, nights);
  } catch {
    return 0;
  }
}

/**
 * Check if a stay length is within the maximum allowed.
 * 
 * @param checkIn - First booked night
 * @param checkOut - First unbooked night
 * @returns true if nights <= MAX_STAY_NIGHTS
 */
export function isStayWithinMaximum(checkIn: Date | string, checkOut: Date | string): boolean {
  try {
    const nights = getStayNights(checkIn, checkOut);
    return nights <= MAX_STAY_NIGHTS && nights > 0;
  } catch {
    return false;
  }
}

/**
 * Validate a complete booking date range.
 * Checks:
 * 1. Both dates are valid
 * 2. check_out > check_in
 * 3. check_in is within booking window
 * 4. check_out is within booking window
 * 5. stay length <= MAX_STAY_NIGHTS
 * 
 * @param checkIn - First booked night
 * @param checkOut - First unbooked night
 * @returns { isValid, message } - Validation result with user-friendly message
 */
export function validateBookingDateRange(
  checkIn: Date | string,
  checkOut: Date | string,
): { isValid: boolean; message: string } {
  try {
    const ci = normalizeDate(checkIn);
    const co = normalizeDate(checkOut);

    // Check if check_out > check_in
    if (co <= ci) {
      return {
        isValid: false,
        message: "Check-out date must be after check-in date.",
      };
    }

    // Check if check_in is within booking window
    if (!isDateWithinBookingWindow(ci)) {
      return {
        isValid: false,
        message: "Check-in date must be within the next 3 months.",
      };
    }

    // Check if check_out is within booking window
    if (!isDateWithinBookingWindow(co)) {
      return {
        isValid: false,
        message: "Check-out date must be within the next 3 months.",
      };
    }

    // Check stay length
    const nights = getStayNights(ci, co);
    if (nights === 0) {
      return {
        isValid: false,
        message: "You must book at least 1 night.",
      };
    }

    if (nights > MAX_STAY_NIGHTS) {
      return {
        isValid: false,
        message: `Your stay cannot be longer than ${MAX_STAY_NIGHTS} nights (3 weeks).`,
      };
    }

    return {
      isValid: true,
      message: "",
    };
  } catch (error) {
    return {
      isValid: false,
      message: "Invalid date format. Please use YYYY-MM-DD.",
    };
  }
}

/**
 * Get the maximum allowed check-out date for a given check-in date.
 * This is check_in + MAX_STAY_NIGHTS.
 * 
 * @param checkIn - The check-in date
 * @returns The maximum allowed check-out date
 */
export function getMaxCheckOutDate(checkIn: Date | string): Date {
  const ci = normalizeDate(checkIn);
  const maxCheckOut = new Date(ci);
  maxCheckOut.setDate(maxCheckOut.getDate() + MAX_STAY_NIGHTS);
  return maxCheckOut;
}

/**
 * Constrain a check-out date to be within:
 * 1. Not before check_in + 1 day
 * 2. Not after check_in + MAX_STAY_NIGHTS
 * 3. Not after booking window end
 * 
 * @param checkIn - The check-in date
 * @param checkOut - The requested check-out date
 * @returns The constrained check-out date
 */
export function constrainCheckOutDate(checkIn: Date | string, checkOut: Date | string): Date {
  const ci = normalizeDate(checkIn);
  const co = normalizeDate(checkOut);
  const windowEnd = getBookingWindowEnd();
  const maxCheckOut = getMaxCheckOutDate(ci);

  // Minimum: check_in + 1 day
  const minCheckOut = new Date(ci);
  minCheckOut.setDate(minCheckOut.getDate() + 1);

  // Return the constrained date
  if (co < minCheckOut) return minCheckOut;
  if (co > maxCheckOut) return maxCheckOut;
  if (co > windowEnd) return windowEnd;

  return co;
}
