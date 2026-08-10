/**
 * Parses bulk room-number input, supporting ranges ("301-305"),
 * comma-separated lists ("301,302,305"), and a mix ("301-303,305,310").
 * Numeric ranges only (a range needs both sides to parse as integers) —
 * non-numeric room numbers ("A1", "PH-1") are only usable comma-separated,
 * not as part of a range. Returns a de-duplicated, order-preserving list.
 */
export function parseRoomNumberInput(input: string): { roomNumbers: string[]; error?: string } {
  const segments = input.split(',').map((s) => s.trim()).filter(Boolean)
  if (segments.length === 0) return { roomNumbers: [], error: 'At least one room number is required' }

  const result: string[] = []
  const seen = new Set<string>()

  for (const segment of segments) {
    const rangeMatch = segment.match(/^(\d+)\s*-\s*(\d+)$/)
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10)
      const end = parseInt(rangeMatch[2], 10)
      if (end < start) {
        return { roomNumbers: [], error: `Invalid range "${segment}" — end must be greater than or equal to start` }
      }
      if (end - start > 500) {
        return { roomNumbers: [], error: `Range "${segment}" is too large (max 500 rooms per range)` }
      }
      // Preserve zero-padding width from the start value, e.g. "301"-"305" or "01"-"05".
      const width = rangeMatch[1].length
      for (let n = start; n <= end; n++) {
        const num = String(n).padStart(width, '0')
        if (!seen.has(num)) { seen.add(num); result.push(num) }
      }
    } else {
      if (!seen.has(segment)) { seen.add(segment); result.push(segment) }
    }
  }

  if (result.length === 0) return { roomNumbers: [], error: 'No valid room numbers found' }
  return { roomNumbers: result }
}