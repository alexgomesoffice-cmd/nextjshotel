// Curated subset of lucide-react icon names relevant to hotel/room amenities.
// We store the icon NAME (a string, e.g. "Wifi") in amenities.icon — not a
// slug, and not a rendered element. The frontend looks the name up in
// lucide-react's export map to render the actual icon component.
//
// This list is deliberately curated (not all ~1500 lucide icons) so the
// picker stays fast and relevant rather than an overwhelming raw dump.
export const AMENITY_ICON_NAMES = [
  "Wifi", "Car", "ParkingCircle", "Utensils", "Coffee", "Wine", "Beer",
  "Martini", "Dumbbell", "Waves", "Bath", "ShowerHead", "Snowflake", "Wind",
  "Tv", "Phone", "Wrench", "Sparkles", "ShieldCheck", "Camera", "Lock",
  "KeyRound", "ArrowUpDown", "Accessibility", "Baby", "Dog",
  "Cigarette", "CigaretteOff", "Sun", "Umbrella", "TreePalm", "Mountain",
  "Bike", "Music", "PartyPopper", "ConciergeBell", "Luggage", "BedDouble",
  "Refrigerator", "Microwave", "WashingMachine", "Shirt", "Sofa", "Building2",
  "MapPin", "Clock", "CalendarDays", "CreditCard", "Banknote", "Users",
  "UserCheck", "HeartPulse", "Stethoscope", "Flame", "Droplets", "Gamepad2",
  "Briefcase", "Plane", "TrainFront", "Bus", "Ship", "Anchor", "Fish", "Printer"
] as const

export type AmenityIconName = (typeof AMENITY_ICON_NAMES)[number]