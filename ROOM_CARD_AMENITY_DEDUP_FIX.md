# Room Type Card — Fix Duplicate Amenities, Fix Small Image, Fix Layering to Match Screenshot 2

**File to edit: `src/components/room/room-type-card.tsx` only.**
**Do not touch `room-detail-modal.tsx` — it already correctly lists the full amenity set and stays the destination for "view more."**

**Two separate problems, fixed together below: (1) amenities are duplicated between the header and every variant row, and (2) the header has no real hero image at all — it currently uses a tiny 44×44px thumbnail squeezed into the same row as the title and price, instead of a large standalone image like Screenshot 2. Fix order matters: do the layering/image restructure first (Changes 1–2 below), then the amenity dedup (Changes 3–6, renumbered from the original plan).**

---

## Why the image looks small — confirmed by reading the code

Lines 285–328 (`{/* Row 1: icon + name/desc + price + chevron */}`) lay out the cover image, the name/description, and the price/chevron **all inside one single horizontal flex row** (`flex items-start gap-3`). The "image" is just this:
```tsx
<div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
  ...
  <div className="relative w-11 h-11 rounded-xl overflow-hidden">
```
`w-11 h-11` is 44×44 pixels — a small icon-sized square, not a hero image. It's squeezed between the title and the price block because all three have to fit on one line. This is structurally different from Screenshot 2, which stacks a **full-width image on its own row**, with the name/description/stats/price sitting underneath it in a separate band. Resizing this 44px box alone won't fix it — the row it lives in is too cramped to ever hold a real image. The whole header needs to change from one horizontal row into two stacked sections.

---

## Amenity duplication — root cause, confirmed by reading the code

`room_properties` is fetched **once per room type**, in `src/app/api/public/hotels/[slug]/availability/route.ts`, and the exact same array is passed both:
- to the card header (`RoomTypeCard` prop `room_properties`, rendered at lines 351–371), and
- into every single `VariantRow` as the `amenities` prop (passed at line 389), which then renders `amenities.map(...)` again at lines 162–166.

There is no such thing as a "variant-specific amenity" in your data model — amenities belong to the room type, not to individual physical room variants. That means showing them twice isn't just visually noisy, it's structurally meaningless: the second list can never say anything different from the first. The fix is to stop passing amenities into the variant row at all, and instead show the 2–3 facts that actually *do* differ per variant: smoking, pets, refund policy, room number context.

---

## Change 1 — Replace the entire Row 1 block with a stacked hero image + lower info band

**Find lines 285–328, this entire block:**
```tsx
        {/* Row 1: icon + name/desc + price + chevron */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          {/* Square icon */}
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {coverImage ? (
              <div className="relative w-11 h-11 rounded-xl overflow-hidden">
                <Image src={coverImage} alt={name} fill sizes="44px" className="object-cover" />
              </div>
            ) : (
              <Bed className="h-5 w-5 text-primary" />
            )}
          </div>

          {/* Name + description */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              className="font-bold text-base text-foreground leading-tight cursor-pointer hover:text-primary transition-colors"
              onClick={e => { if (onViewDetails) { e.stopPropagation(); onViewDetails(); } }}
            >
              {name}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
            )}
          </div>

          {/* Price + chevron */}
          <div className="flex items-start gap-3 shrink-0">
            <div className="text-right pt-0.5">
              <p className="text-xs text-muted-foreground leading-none">from</p>
              <p className="text-2xl font-bold text-primary leading-tight mt-0.5">
                TK {Number(base_price).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">per night</p>
            </div>
            {/* Blue circle chevron */}
            <div className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-75",
              "bg-primary text-white"
            )}>
              <ChevronUp className={cn("h-4 w-4 transition-transform duration-75", !shouldExpand && "rotate-180")} />
            </div>
          </div>
        </div>
```

**Replace it with two stacked sections — a full-width hero image first, then a separate info band below it:**
```tsx
        {/* Hero image — full width, stacked above the info band, matching Screenshot 2 */}
        <div className="relative w-full h-37.5 sm:h-50 bg-muted overflow-hidden">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={name}
              fill
              sizes="(max-width: 640px) 100vw, 600px"
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Bed className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}
        </div>

        {/* Info band: name/description on the left, price + chevron on the right */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          {/* Name + description */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-bold text-base text-foreground leading-tight cursor-pointer hover:text-primary transition-colors"
              onClick={e => { if (onViewDetails) { e.stopPropagation(); onViewDetails(); } }}
            >
              {name}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            )}
          </div>

          {/* Price + chevron */}
          <div className="flex items-start gap-3 shrink-0">
            <div className="text-right pt-0.5">
              <p className="text-xs text-muted-foreground leading-none">from</p>
              <p className="text-2xl font-bold text-primary leading-tight mt-0.5">
                TK {Number(base_price).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">per night</p>
            </div>
            {/* Blue circle chevron */}
            <div className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-75",
              "bg-primary text-white"
            )}>
              <ChevronUp className={cn("h-4 w-4 transition-transform duration-75", !shouldExpand && "rotate-180")} />
            </div>
          </div>
        </div>
```

**What changed and why:**
- The image is no longer a 44px icon competing for space in a row with text and price. It is now its own full-width block (`w-full h-37.5 sm:h-50`, i.e. 150px tall on mobile, 200px tall from `sm:` up) sitting above everything else, exactly like the top photo in Screenshot 2.
- `sizes="(max-width: 640px) 100vw, 600px"` is updated because the image is now genuinely full-card-width, not a 44px thumbnail — the old `sizes="44px"` would have told Next.js to only ever load a tiny image file, which is wrong now that the image is large.
- The description's line clamp changed from `line-clamp-1` to `line-clamp-2` since the info band now has its own dedicated row with more breathing room, matching how Screenshot 2 allows two lines of description text under the title.
- `h-37.5` and `sm:h-50` are used instead of arbitrary pixel values because this file already uses fractional Tailwind sizes elsewhere — for example the variant row image at `w-32.5 sm:w-37.5` — so this keeps the same sizing convention instead of introducing a new arbitrary scale.

---

## Change 2 — No structural change needed to Row 2 (stats) or Row 3 (highlights), they now sit correctly under the new info band

Rows 2 and 3 (room size/occupancy/bed stats, and the amenity pills) already come immediately after Row 1 in the JSX and don't need to move. Once Change 1 is applied, they will automatically render directly below the new name/price info band, which already matches Screenshot 2's structure: hero image → name/description/stats → highlight pills. No edits needed here for layering — only Change 4 below (renumbered) touches the highlight pills row, for the amenity-count and styling fix, not for repositioning.

---

## Change 3 — Stop passing `amenities` into `VariantRow`

**Find, around line 389:**
```tsx
room_variants.map(variant => (
  <VariantRow
    key={variant.id}
    variant={variant}
    roomName={name}
    typeImages={type_images}
    bedTypes={room_bed_types}
    amenities={room_properties}
    quantity={selectedQuantities[variant.id] ?? 0}
    available={variant.available_count}
    onQtyChange={qty => onQuantityChange(variant.id, qty)}
    onViewDetails={onViewDetails}
    isGuestMismatch={isGuestMismatch}
    guestMismatchReason={guestMismatchReason}
  />
))
```

**Remove the `amenities={room_properties}` line entirely:**
```tsx
room_variants.map(variant => (
  <VariantRow
    key={variant.id}
    variant={variant}
    roomName={name}
    typeImages={type_images}
    bedTypes={room_bed_types}
    quantity={selectedQuantities[variant.id] ?? 0}
    available={variant.available_count}
    onQtyChange={qty => onQuantityChange(variant.id, qty)}
    onViewDetails={onViewDetails}
    isGuestMismatch={isGuestMismatch}
    guestMismatchReason={guestMismatchReason}
  />
))
```

---

## Change 4 — Remove `amenities` from `VariantRowProps` and the function signature

**Find, lines 54–66:**
```tsx
interface VariantRowProps {
  variant: RoomVariant;
  roomName: string;
  typeImages: RoomTypeImage[];
  bedTypes: RoomBedType[];
  amenities: RoomProperty[];
  quantity: number;
  available: number;
  onQtyChange: (qty: number) => void;
  onViewDetails?: () => void;
  isGuestMismatch?: boolean;
  guestMismatchReason?: string;
}

function VariantRow({
  variant, roomName, typeImages, bedTypes, amenities,
  quantity, available, onQtyChange, onViewDetails,
  isGuestMismatch, guestMismatchReason,
}: VariantRowProps) {
```

**Remove `amenities` from both the interface and the destructured parameters:**
```tsx
interface VariantRowProps {
  variant: RoomVariant;
  roomName: string;
  typeImages: RoomTypeImage[];
  bedTypes: RoomBedType[];
  quantity: number;
  available: number;
  onQtyChange: (qty: number) => void;
  onViewDetails?: () => void;
  isGuestMismatch?: boolean;
  guestMismatchReason?: string;
}

function VariantRow({
  variant, roomName, typeImages, bedTypes,
  quantity, available, onQtyChange, onViewDetails,
  isGuestMismatch, guestMismatchReason,
}: VariantRowProps) {
```

---

## Change 5 — Delete the duplicated amenity-checkmark block inside `VariantRow`

**Find, lines 155–167, this entire block:**
```tsx
          {/* Amenity checkmarks */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {variant.ac && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-primary/80 shrink-0" /> AC
              </span>
            )}
            {amenities.map((prop, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-primary/80 shrink-0" /> {prop.amenity.name}
              </span>
            ))}
          </div>
```

**Delete it entirely.** Keep the `variant.ac` flag — it is genuinely variant-specific and useful — but move it next to the smoking/pet flags instead of in its own amenity-style row, since AC is a per-room fact, not part of the type's general amenity list.

**Find, lines 140–153:**
```tsx
          {/* Guest / smoking / pet flags */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> 2 guests
            </span>
            <span className="flex items-center gap-1.5">
              <Cigarette className="h-3.5 w-3.5" />
              {variant.smoking_allowed ? "Smoking" : "No smoking"}
            </span>
            <span className="flex items-center gap-1.5">
              <PawPrint className="h-3.5 w-3.5" />
              {variant.pet_allowed ? "Pet friendly" : "No pets"}
            </span>
          </div>
```

**Replace with (adds AC as a 4th quick fact, replacing the deleted block above):**
```tsx
          {/* Guest / smoking / pet / AC flags */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> 2 guests
            </span>
            <span className="flex items-center gap-1.5">
              <Cigarette className="h-3.5 w-3.5" />
              {variant.smoking_allowed ? "Smoking" : "No smoking"}
            </span>
            <span className="flex items-center gap-1.5">
              <PawPrint className="h-3.5 w-3.5" />
              {variant.pet_allowed ? "Pet friendly" : "No pets"}
            </span>
            {variant.ac && (
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary/80" /> AC
              </span>
            )}
          </div>
```

This is the entire fix for the duplication. After Changes 1–3, the variant row shows only what's actually different per physical room: bed type in the title, guest/smoking/pet/AC flags, price, refund policy, and the quantity stepper — no amenity list at all. The full amenity list lives exactly once, in the header.

---

## Change 6 — Cap the header amenity pills and use a cleaner "Top highlights" label, matching Screenshot 2

Screenshot 2 labels this row "Top highlights" and shows exactly 4 pills plus a "+N more" pill in the same row style (not a separate link below). Right now your header shows up to 7 pills and the overflow is a plain text link sitting outside the pill row.

**Find, lines 350–371:**
```tsx
        {/* Row 3: amenity pill chips (bordered) */}
        {room_properties && room_properties.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {room_properties.slice(0, 7).map((prop, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border/40 rounded-full px-3 py-1"
              >
                <Check className="h-3 w-3 text-primary shrink-0" />
                {prop.amenity.name}
              </span>
            ))}
            {room_properties.length > 7 && (
              <button
                onClick={e => { e.stopPropagation(); if (onViewDetails) onViewDetails(); }}
                className="text-xs text-primary hover:underline"
              >
                +{room_properties.length - 7} more
              </button>
            )}
          </div>
        )}
```

**Replace with:**
```tsx
        {/* Row 3: top highlights — capped at 4, "+N more" pill matches the others visually */}
        {room_properties && room_properties.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-2">
              Top highlights
            </p>
            <div className="flex flex-wrap gap-2">
              {room_properties.slice(0, 4).map((prop, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border/40 rounded-full px-3 py-1"
                >
                  <Check className="h-3 w-3 text-primary shrink-0" />
                  {prop.amenity.name}
                </span>
              ))}
              {room_properties.length > 4 && (
                <button
                  onClick={e => { e.stopPropagation(); if (onViewDetails) onViewDetails(); }}
                  className="inline-flex items-center text-xs font-medium text-primary border border-primary/30 bg-primary/5 rounded-full px-3 py-1 hover:bg-primary/10 transition-colors"
                >
                  +{room_properties.length - 4} more
                </button>
              )}
            </div>
          </div>
        )}
```

This caps the count at 4 (matching Screenshot 2's "+4 more" exactly), adds the "Top highlights" label above the pills the way Screenshot 2 does, and turns the overflow into a pill-shaped button instead of a plain link, so it sits visually inside the same row instead of floating below it.

---

## Change 7 — Do NOT add a "View all N options" link

Screenshot 2 has a "View all 5 room options" link under its room rows because *its* card only shows the first 2 variants by default and hides the rest behind that link. Your card already shows every variant the moment it's expanded — there's nothing extra to reveal. **Do not add this link anywhere.** Your existing expand/collapse behaviour (the chevron at the top of the card) already serves the exact purpose that link serves in Screenshot 2, just at the room-type level instead of the variant level. Adding a second "view all" link inside an already-fully-expanded list would be redundant and confusing.

---

## What stays exactly as-is, confirmed correct, do not touch

- The big price + "from / per night" block — content and values unchanged by Change 1, it's only moved out of the old single row into the new info band underneath the hero image.
- The chevron toggle button — same logic, same classes, just relocated into the new info band alongside the price.
- Room size / occupancy / bed type stats row (originally lines 330–348) — already structurally equivalent to Screenshot 2's stats row, no changes needed beyond it now sitting under the new hero image automatically.
- Everything inside `room-detail-modal.tsx` — already the correct destination for "+N more" and the room name click, no changes needed there.
- The price, refund policy, and quantity stepper on the right side of each `VariantRow` — untouched, already correct.
- The variant row's own thumbnail image (the `w-32.5 sm:w-37.5` block inside `VariantRow`) — untouched. Only the room-type header's image was the small one; the per-variant image was already a reasonable size.

---

## Summary of all seven edits, in order

1. Replace Row 1 entirely: split the single horizontal row (44px icon + title + price + chevron) into a full-width hero image block on its own, followed by a separate info band containing name, description, price, and chevron underneath it.
2. No edit needed — confirm Rows 2 and 3 (stats and highlight pills) now sit correctly beneath the new info band without any repositioning.
3. Remove `amenities={room_properties}` from the `VariantRow` call inside the `.map()`.
4. Remove `amenities` from `VariantRowProps` interface and the function's destructured parameters.
5. Delete the "Amenity checkmarks" block inside `VariantRow`; move the `variant.ac` check into the guest/smoking/pet flags row instead.
6. Cap the header's amenity pills at 4, add a "Top highlights" label above them, and restyle the overflow count as a matching pill button instead of a plain text link.
7. Do not add a "View all N options" link — the existing expand/collapse chevron already serves that purpose at the room-type level.

No other files need to change. No props passed into `RoomTypeCard` from its parent need to change — `room_properties`, `room_bed_types`, `type_images`, and `base_price` are all still used exactly as before, just reorganized into the new stacked layout instead of one cramped row, and no longer duplicated into the variant rows.
