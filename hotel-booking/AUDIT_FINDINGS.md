# Application Audit Findings

**Audit scope:** General application review followed by a focused review of the System Admin and Hotel Admin panels. The Sub Admin panel was explicitly excluded.

**Audit date:** 2026-10-11

## Scope and approach

The review covered the Next.js application, its API routes, shared authentication and booking logic, Prisma schema and migrations, upload handlers, and the Socket.IO service. Safe local smoke tests and unauthenticated/malformed-input requests were used where possible. Admin-panel findings were primarily established by static code inspection.

No authenticated admin account or disposable admin dataset was available. No privileged writes were attempted: no accounts, hotels, bookings, rooms, cases, approvals, or uploaded files were created or changed during the audit. The findings below distinguish observed runtime behavior from code-path risks that were not exercised end to end.

## Findings

### Authentication and authorization

[fixed]
1. **Account status is not rechecked when using an already-issued token.** The shared API authentication path verifies the token, blacklist, and role, but does not appear to re-check whether the current account has since been blocked, deactivated, or deleted. A token issued before an account status change may therefore continue to authorize API requests until it expires or is otherwise revoked.
   - Evidence: `src/lib/auth-middleware.ts`
   - Status: Code-inspection finding; no authenticated token was available for runtime verification.

[not_fixed]
2. **Multiple role cookies are selected in fixed precedence.** If a browser has more than one role token cookie, the middleware selects according to a fixed order rather than explicitly resolving the intended session. This can cause a request to use a different role token than the user expects and makes mixed-role session behavior brittle.
   - Evidence: `src/lib/auth-middleware.ts`
   - Status: Code-inspection finding.

[fixed]
3. **Malformed login JSON returns an internal-server-error response.** A malformed JSON body was sent to the login endpoint and produced HTTP 500 rather than a client-input error.
   - Evidence: Login API request handling.
   - Status: Runtime-tested without credentials; no login was completed.


### Hotel discovery and search
[fixed]
4. **Malformed public-search pagination or price query values can produce HTTP 500.** Invalid page/price inputs were sent to public search; the server returned 500 instead of rejecting the parameters with a clear 4xx response.
   - Evidence: Public hotel search API parameter parsing.
   - Status: Runtime-tested with non-mutating requests.
[nothing-to-fix]
5. **Homepage smoke test succeeded.** The homepage returned HTTP 200 during the local check. This confirms only that the page loaded at that time; it does not establish that all destination, filter, image, or detail-page flows work correctly.
   - Status: Runtime-tested.

### Booking and inventory
[fixed]
6. **Requested guest capacity is not enforced during reservation creation.** The booking path does not appear to ensure that the requested guest count fits the selected room/room type capacity. A client may be able to reserve a room for more guests than it supports.
   - Evidence: Booking reservation and room-capacity validation paths.
   - Status: Code-inspection finding; no reservation was created.
[fixed]
7. **A confirmed-booking cancellation path may leave the physical room unavailable.** The cancellation logic can update the booking without restoring the associated room's availability/status. This risks leaving inventory unavailable after cancellation.
   - Evidence: Booking cancellation and room-status update paths.
   - Status: Code-inspection finding; no booking was cancelled.
[fixed]
8. **A customer-facing cancellation action was not found in the reviewed interface.** The booking/API behavior and the customer-facing UI do not appear to expose a corresponding cancel action in the flow inspected, which can prevent users from cancelling through the app even where a cancellation endpoint exists.
   - Evidence: Reviewed customer booking interface and cancellation paths.
   - Status: UI/API inspection; authenticated customer flow was not exercised.
[not-required]
9. **Availability endpoint accepts bad dates with a 400 response.** An invalid availability-date request was rejected with HTTP 400 in the safe runtime checks. This is the expected response for that tested invalid input.
   - Status: Runtime-tested; not a defect observed in that case.

### Socket.IO and real-time behavior

10. **Socket room access/isolation needs stronger authorization.** The socket service's room join/access paths present a risk that an authenticated client could subscribe to rooms or updates outside its authorized user/hotel scope if it can supply another room identifier. This could expose notifications or booking updates across accounts.
    - Evidence: Socket.IO authentication and room-join handling.
    - Status: Code-inspection finding; cross-account authenticated socket sessions were not available, so no unauthorized subscription was attempted.

11. **Socket health check succeeded.** The local Socket.IO `/health` endpoint returned HTTP 200 during the smoke test. This verifies service responsiveness only, not JWT enforcement, notification delivery, reconnection behavior, booking event consistency, or duplicate-event handling.
    - Status: Runtime-tested.

### Uploads

12. **Upload validation is inconsistent across routes.** Some upload paths do not consistently enforce file size, declared MIME type, or actual file-content validation. Depending on the route, malformed or oversized files may consume resources, fail late during processing, or be stored without being a valid image/document.
    - Evidence: General upload paths and `src/app/api/hotel-admin/hotel/images/route.ts`, `src/app/api/hotel-admin/room-types/[id]/images/route.ts`, and `src/app/api/hotel-admin/room-variants/[variantId]/images/route.ts`; see also the specific System Admin and Hotel Admin findings below.
    - Status: Code-inspection finding; no files were uploaded.

### System Admin and Hotel Admin panels

13. **Hotel Admin case staging accepts caller-controlled entity identifiers and field names without sufficiently narrow validation.** The staging route accepts generic `entityType`, `entityId`, and `fieldName` values. In the case engine, some image, document, and policy branches update or delete rows by global record ID without first ensuring the referenced row belongs to the case's hotel. A crafted case could therefore reference another hotel's record and, if approved, affect it.
    Some `HOTEL_OWNER`/`HOTEL_ADMIN` branches also use the caller-provided field name in dynamic Prisma updates; unless constrained to an explicit field allowlist, crafted field names may target unintended properties.
    - Evidence: `src/app/api/hotel-admin/cases/stage/route.ts`; `src/lib/case-engine.ts`
    - Status: Code-path risk. No case was submitted or approved; cross-hotel impact was not runtime-tested.

14. **Case approval applies changes sequentially without a transaction around the whole operation.** If one staged field change fails after earlier changes have already been applied, the case may be left partly applied while still appearing undecided/pending. Retrying may compound the partial state.
    - Evidence: `src/lib/case-engine.ts`, `approveRemaining`
    - Status: Code-inspection finding; no case approval was run.

15. **Hotel Admin can directly publish an unpublished hotel.** The Hotel Admin publish route sets the hotel's approval status to `PUBLISHED` if it is not already published or suspended. It does not appear to require an approved System Admin review or verify completion of the review prerequisites. If publication is intended to require approval, this endpoint bypasses that gate.
    - Evidence: `src/app/api/hotel-admin/hotel/publish/route.ts`
    - Status: Code-inspection finding; no hotel was published. Confirm whether this transition is intentional product behavior.

16. **Hotel Admin availability page/API are unimplemented.** The dashboard page renders `null`, and the corresponding API returns HTTP 501 with “Not implemented.” Availability management is therefore unavailable through this panel.
    - Evidence: `src/app/dashboard/hotel/availability/page.tsx`; `src/app/api/hotel-admin/availability/route.ts`
    - Status: Confirmed by code inspection.

17. **Several panel navigation links point to missing pages.** The Hotel Admin navigation includes Team, Reviews, and Activity Log routes that were absent from the dashboard route inventory. The System Admin Activity Log link was also absent from the route inventory. Selecting these links is expected to lead to a not-found page.
    - Evidence: `src/components/layout/hotel-admin-layout.tsx`; `src/components/layout/admin-layout.tsx`
    - Status: Route-inventory inspection; signed-in navigation was not clicked through.

18. **System Admin upload accepts a caller-provided upload subdirectory without a clear allowlist.** The endpoint joins the supplied `uploadSubDir` to the upload root, with no observed fixed set of permitted subdirectories. It also lacks an explicit size limit and strong content validation. A crafted path may escape the intended upload subfolder depending on path normalization and deployment filesystem behavior; oversized or invalid payloads can also consume resources or produce unusable files.
    - Evidence: `src/app/api/system-admin/uploads/route.ts`
    - Status: Code-inspection risk; no upload or filesystem write was attempted. Validate path containment and upload limits in a disposable environment before treating path escape as confirmed.

19. **Hotel Admin gallery upload can leave orphaned files when staging fails.** The route writes uploaded image files before the case-staging operation completes. If staging fails (for example, due to an existing pending case), the request can fail while the already-written files remain unused. The route also allows multiple files without a clear total-file or total-request size cap; per-image limits do not by themselves bound the whole request.
    - Evidence: `src/app/api/hotel-admin/hotel/images/route.ts`
    - Status: Code-inspection finding; no upload was attempted.

20. **Room-variant image uploads lack the same explicit size guard found in some other image routes.** The inspected variant-image route processes image data through Sharp but did not show a matching per-file size check. Large or malformed inputs may consume excess memory/CPU or fail as a generic server error.
    - Evidence: `src/app/api/hotel-admin/room-variants/[variantId]/images/route.ts`
    - Status: Code-inspection finding; no upload was attempted.

21. **Room-type updates do not validate submitted amenity IDs before replacing associations.** When amenity IDs are submitted, the route deletes the current associations and then recreates them. Invalid, nonexistent, or inactive IDs may cause the operation to fail; validate the submitted set before replacing existing associations and ensure the update is atomic.
    - Evidence: `src/app/api/hotel-admin/room-types/[id]/route.ts`
    - Status: Code-inspection finding; no room type was edited.

22. **Admin list pagination does not consistently validate or cap page/limit inputs.** System Admin hotel and case listing routes parse `page` and `limit` directly and use them for database pagination. Negative, nonnumeric, zero, or extremely large values may cause 500 responses or excessive database work if not rejected/capped.
    - Evidence: `src/app/api/system-admin/hotels/route.ts`; `src/app/api/system-admin/cases/route.ts`
    - Status: Code-inspection finding; these admin endpoints were not exercised with an authenticated session.

23. **Field-rejection endpoint does not enforce pending state.** The System Admin field rejection route checks that the field change belongs to the supplied case, but does not appear to require that the case and field change are still pending. A stale or repeated request may change recorded review state after a decision without undoing an already-applied live change.
    - Evidence: `src/app/api/system-admin/cases/[id]/field-changes/[fcId]/reject/route.ts`
    - Status: Code-inspection finding; no review action was submitted.

### Database and engineering checks

24. **No automated test files were found in the inspected project.** This limits regression coverage for the flows reviewed.
    - Status: Repository inspection.

25. **ESLint reported 206 errors.** This is a significant lint baseline and may obscure newly introduced issues. The individual lint findings were not reproduced in this report because they were not all mapped to the functional behaviors above.
    - Status: Tool check.

26. **Prisma schema validation, migration status, and TypeScript checks passed.** The Prisma schema validated, migration status reported the local history and database as up to date, and TypeScript checks passed for the app and Socket.IO service.
    - Status: Tool checks; these do not rule out runtime logic or authorization defects.

## Runtime checks performed

- Local homepage request: HTTP 200.
- Socket.IO `/health`: HTTP 200.
- Invalid registration/login fields and invalid availability dates: HTTP 400 in the tested cases.
- Malformed login JSON: HTTP 500.
- Malformed public search pagination/price parameters: HTTP 500.
- Unauthenticated protected API requests: HTTP 401.
- A protected dashboard request redirected to authentication.
- No authenticated admin or user mutations were performed.

These checks cover only the exact requests made and do not constitute end-to-end validation of every page or workflow.
Valid login/registration, logout, token expiry/revocation timing, and authenticated role switching were not exercised end to end. No seed-data correctness assessment was performed.

## Recommended order for remediation

1. Enforce ownership and allowlisted entity/field combinations when staging and applying hotel cases.
2. Make case approval and its status updates atomic; reject stale or repeated review actions.
3. Define and enforce the intended hotel publication approval lifecycle on the server.
4. Validate authorization for every Socket.IO room join against the authenticated principal.
5. Recheck current account status during authorization, and make multi-role token selection unambiguous.
6. Validate and cap pagination, search, JSON bodies, and booking guest capacity; return consistent 4xx errors for invalid input.
7. Make cancellation restore inventory consistently and expose the intended customer cancellation flow.
8. Harden uploads with canonical path containment, allowlisted destinations, file count/request/file-size limits, content validation, and cleanup on failed staging.
9. Complete or remove unimplemented dashboard pages and navigation destinations.
10. Add focused automated tests for authorization boundaries, case transitions, booking inventory, malformed input, and upload constraints; resolve the existing lint baseline.


# Jwt
jwt.ts is being used in the main places expected: the three login flows sign tokens, and page/API authorization, logout, and public favorite personalization verify them. Registration does not issue a token; it returns a message asking the user to log in, which is consistent with that flow.

However, token handling is not consistent across all consumers, and I found several issues around revocation, cookies, and expiry.

How it is used
signToken is called by end-user, hotel-admin/sub-admin, and System Admin login routes. The registration route does not call it.
verifyToken is used by the protected-page middleware, shared API auth middleware, logout, and optional authentication in public hotel/favorites APIs.
hashToken supports the database blacklist.
The Socket.IO service has its own copy of the verifier rather than importing this module.
Issues found
Logout revocation is not honored everywhere. API routes using requireAuth check the blacklist, but the dashboard middleware explicitly skips that check, and the Socket.IO auth middleware only verifies the JWT. A previously copied token can therefore still pass those checks until it expires, even after logout.

Logout revokes only one token but clears all role cookies. It selects the first available cookie—user, then hotel admin, then System Admin—blacklists that token, and clears all three cookies. If multiple role cookies exist, the other tokens are cleared from the browser but not revoked. See logout and the same fixed precedence in API auth.

Multiple role cookies can interfere with each other. The login routes set role-specific cookies but don’t clear cookies for other roles. Since the middleware always chooses token_user first, then token_hotel_admin, then token_system_admin, an older cookie can take precedence over the role the user just logged into. For example, a valid System Admin cookie may not be selected while a user cookie is still present.

JWT expiry and cookie lifetime are configured separately. signToken reads JWT_EXPIRES_IN in parseExpiresIn, while the login routes hard-code cookie maxAge to seven days. If the environment config differs from seven days, the cookie and token lifetimes won’t match.

Expiry validation is too permissive for malformed or incomplete signed tokens. verifyToken only rejects when payload.exp is truthy and less than the current time (line 139). It should require a valid numeric expiry and reject when the current time is equal to or greater than exp. Tokens created by signToken include exp, so this is primarily a verifier-contract weakness, also copied into the Socket.IO verifier—not a demonstrated way for an unauthenticated client to forge a token.

The app and Socket.IO service handle a missing secret differently. The app assumes JWT_SECRET exists (line 7); the Socket.IO service falls back to the literal change_this_secret in its JWT verifier. If the socket service runs without the secret configured, that fallback is unsafe. I did not inspect or disclose the local .env value.

Auth checks trust token claims rather than current account status. As noted in the earlier audit, the shared API middleware checks signature, blacklist, and allowed role, but does not re-check whether the account was subsequently blocked, deactivated, or deleted. That is an integration responsibility beyond jwt.ts itself.

Auth cookies lack the secure option. The login routes set httpOnly and sameSite, but do not set secure: true in production. This should be considered alongside the deployment’s HTTPS enforcement.

Conclusion
The module is wired into the expected login and verification flows, and its HMAC signing/verifying approach is internally consistent. The main concerns are inconsistent blacklist enforcement, single-token logout when multiple role cookies exist, fixed cookie precedence and lifetime, and the Socket.IO service’s separate verifier/default secret behavior.

# Image Upload Route Audit

**Scope:** Image/file upload handlers and their in-repository callers across End User, System Admin, Hotel Admin, and Sub Admin surfaces in `hotel-booking/src`. This is a static route/caller audit; no files were uploaded. Image URL fields and APIs that only read or save an already-existing URL are distinguished from binary upload handlers.

## Summary and counts

- **9 distinct image-upload URL patterns** have frontend callers: five Hotel Admin room/property routes and four System Admin routes.
- **1 additional image-upload URL pattern**, `POST /api/upload`, is an unused alias for the System Admin generic uploader.
- Therefore, **10 image-upload URL patterns exist in total**, of which one has no discovered UI caller.
- The Hotel Admin document endpoint is an additional file-upload API, but is listed separately because its purpose is hotel documents (PDF/JPG), not image galleries.
- No End User image-upload endpoint or UI caller was found. The End User image table exists in Prisma and is read by the profile API, but no app code was found that creates or updates those image rows.
- System Admin-created System Admin, Hotel Admin, and hotel-owner photos are uploaded through the generic System Admin uploader; these are not separate role-specific upload APIs.

## Route and caller inventory

| API route | Caller(s) found | Purpose and audit notes |
|---|---|---|
| `POST /api/hotel-admin/hotel/images` | `src/app/dashboard/hotel/images/page.tsx`; `src/components/hotel-admin/property/section-dialog.tsx` | Hotel gallery; uploaded files are staged for case review. |
| `POST /api/hotel-admin/room-types/[id]/images` | `src/app/dashboard/hotel/room-types/new/page.tsx`; `src/app/dashboard/hotel/room-types/[id]/page.tsx`; `src/components/hotel-admin/rooms/room-type-form-dialog.tsx` | Room-type gallery; writes image rows directly. |
| `POST /api/hotel-admin/room-variants/[variantId]/images` | `src/components/hotel-admin/rooms/variant-card.tsx` through `ImageManager` | Variant gallery; appends images directly. |
| `POST /api/hotel-admin/rooms/[id]/images` | `src/app/dashboard/sub/rooms/[id]/page.tsx` | Physical-room gallery; appends images directly. The route accepts both Hotel Admin and Sub Admin. |
| `POST /api/hotel-admin/rooms` | `src/app/dashboard/hotel/rooms/new/page.tsx`; `src/components/hotel-admin/rooms/room-form-dialog.tsx` | Room creation optionally accepts images and attaches them to the selected/shared variant gallery. This overlaps with the variant-image API's write behavior but also creates rooms and resolves variants. |
| `POST /api/system-admin/uploads` | `src/app/dashboard/system/hotels/new/page.tsx`; `src/app/dashboard/system/cities/city-form.tsx`; `src/components/admin/cities/city-form-dialog.tsx`; `src/components/admin/admins/admin-form-dialog.tsx` | Generic data-URL image writer. Used for hotel/city images and System Admin, Hotel Admin, and hotel-owner photos; user-provided `uploadSubDir` chooses the destination. The hotel-creation page also routes its document fields here, which causes the mismatch described below. |
| `POST /api/system-admin/hotel-types/[id]/image` | `src/components/admin/hotel-types/hotel-type-form-dialog.tsx` | Replaces a hotel-type image and updates its row using the shared storage helper; `DELETE` removes it. |
| `PATCH /api/system-admin/hero-banners/[id]` | `src/components/system-admin/hero-banners/hero-banner-card.tsx` via `src/app/dashboard/system/hero-banners/page.tsx` | Updates banner text and optionally uploads or removes the image in the same operation. |
| `POST /api/system-admin/web-gallery/login-registration/[kind]` | `src/app/dashboard/system/web-gallery/login-registration/page.tsx` | Replaces the login or registration background; `DELETE` removes it. |
| `POST /api/upload` | No caller found | Exact alias: `src/app/api/upload/route.ts` re-exports the same `POST` handler as `/api/system-admin/uploads`. No distinct behavior or UI use was found. |

### Related image data that does not have its own image-upload API

- **End User photos:** `/api/user/profile` returns active `end_user_images`, but its `PATCH` schema has no image field. End User registration also creates no image row. No `end_user_images.create` call or End User image-upload UI was found. The table appears unsupported by current app flows rather than served by an unlocated upload route.
- **System Admin photos:** The generic uploader stores the file; `POST /api/system-admin/admins` can then save the resulting `image_url`. System Admin profile and admin-edit APIs found in this audit do not upload or update a photo.
- **Hotel Admin and hotel-owner photos:** The System Admin hotel-creation form uploads these photos through `/api/system-admin/uploads` and passes the resulting URLs into `POST /api/system-admin/hotels`. Hotel Admin profile GET/PATCH routes do not expose photo updates.
- Other endpoints that select/return hotel, room, guest, or booking image URLs are read APIs, not upload handlers. APIs accepting `image_url` in JSON store a URL reference; they do not upload a file themselves.
- `POST /api/hotel-admin/documents` is an adjacent file-upload API, not an image gallery API. It is called by `src/components/hotel-admin/property/section-dialog.tsx`, is Hotel Admin-only, accepts `.pdf` or `.jpg` up to 5 MB, writes to `public/uploads/hotel-documents`, and stages the document reference for review.

## Inconsistencies and risks

1. **Validation differs substantially between upload handlers.**
   - Hotel gallery, room-type gallery, and physical-room gallery impose a 1 MB per-file limit but do not check MIME type before processing.
   - Room-variant image upload and room creation's optional image handling show no explicit per-file size or MIME allowlist before reading the file into memory and passing it to Sharp.
   - The generic System Admin uploader accepts `data:image/<type>;base64,...` but has no explicit size limit, strict allowlist, or decoded-content verification. It writes the decoded bytes as-is.
   - The shared helper `src/lib/public-image-storage.ts`, used by hotel-type and hero-banner images, enforces 1 MB, PNG/JPEG/WebP MIME, and decoded-format checks.
   - Login/registration backgrounds enforce 5 MB and PNG/JPEG/WebP MIME in their own route. The image constants in `src/lib/constants.ts` do not govern this handler.
   - The System Admin hotel-creation UI reuses an image-only upload function for its document fields. The file picker allows PDF/JPG, but the upload API only accepts `data:image/...`; PDF files are rejected as an invalid data format. The separate Hotel Admin document API does accept PDF/JPG, but the System Admin creation UI does not call it.

2. **The image-storage implementations are duplicated and have different failure cleanup.**
   - The shared helper removes incomplete output and its callers attempt to remove a newly stored image if a database write fails.
   - Several Hotel Admin routes write files directly with Sharp. In the hotel gallery route, files are written before case staging; a staging failure leaves the files behind. In room-type, variant, physical-room, and room-creation uploads, a later database failure can likewise leave newly written files without database records.
   - The auth-background route has custom replacement logic: it deletes the old file before the database update completes, so a later update failure can leave the old database URL pointing to a deleted file.
   - These differing lifecycles can produce orphaned files or broken image URLs.

3. **Storage paths are not governed by one consistent path configuration.**
   - `src/lib/constants.ts` defines `UPLOAD_DIRS`, `MAX_IMAGE_SIZE`, and `ALLOWED_IMAGE_TYPES`, but no imports/usages of those upload exports were found anywhere in `src`; only the unrelated auth constants from the same module are imported by login routes. The upload declarations are therefore currently configuration without effect.
   - The handlers instead hard-code their own directories and validation policies. `src/lib/public-image-storage.ts` also declares its own 1 MB and MIME/format constants rather than using `constants.ts`. No in-code rationale for this divergence was found.
   - `UPLOAD_DIRS.roomTypes` points to `public/uploads/rooms/types`, while room-type images are actually written to `public/uploads/room-types`. `UPLOAD_DIRS.roomUnits` points to `public/uploads/rooms/units`, while room/variant images are written to `public/uploads/rooms`.
   - `UPLOAD_DIRS.staffSysAdmin` points to `public/uploads/staff/sys-admin`, but the System Admin admin-photo caller uses the generic uploader with `uploadSubDir: 'admins'`. The owner and Hotel Admin photos use `uploadSubDir: 'hotels'`.
   - `UPLOAD_DIRS.hotels`, `cities`, `users`, `staffHotelAdmin`, and `staffSubAdmin` are likewise not referenced by active upload handlers. `cities` and several profile photos are instead written through the caller-selected generic subdirectory. No End User upload flow uses `UPLOAD_DIRS.users`.
   - The generic upload route may use an `UPLOAD_DIR` environment override for disk writes but always returns a URL rooted at `/uploads`; if the override points outside the application's served public uploads directory, the returned URL may not resolve to the stored file.

4. **Role permissions are inconsistent across room-image routes.**
   - The physical-room image route permits both `HOTEL_ADMIN` and `HOTEL_SUB_ADMIN` for uploads.
   - The room-variant upload route permits only `HOTEL_ADMIN` to POST, although its GET handler permits both roles.
   - Room creation with images and room-type image upload are Hotel Admin-only.
   - This is a potential permission mismatch: the schema’s documented Sub Admin responsibilities exclude room creation/management. Confirm intended Sub Admin image permissions.

5. **Confirmed duplicate/unused upload surface:** `/api/upload` re-exports the same System Admin-only handler as `/api/system-admin/uploads`; it has no found UI caller. It is a duplicate URL rather than a distinct implementation and is the clearest candidate for removal after confirming there are no external consumers.

6. **Overlapping behavior, but not a confirmed duplicate endpoint:** `POST /api/hotel-admin/rooms` can attach images to a variant gallery while creating rooms; `POST /api/hotel-admin/room-variants/[variantId]/images` appends images to an existing variant gallery. They both write `room_images` rows with `room_variant_id`, but support different workflows. Treating either API as unnecessary would require moving one UI workflow and verifying that room creation still handles new and matched variants correctly.

7. **A legacy upload utility appears unused.** `src/lib/upload.ts` has no imports or callers in `src`; it is Multer-based utility code, not a Next.js API route. Its policy also differs from active routes (JPEG/WebP only and a 1 MB limit despite a 5 MB comment). It appears to be dead/legacy code, not an additional active upload API.

## Follow-up

Before changing code, confirm the desired policy for per-file and total-request limits, allowed image formats, Sub Admin permissions, canonical storage destinations, and whether End User/profile-photo upload is intended. Confirm no external consumer relies on `/api/upload` before removing the alias. A later implementation should centralize validation/storage configuration and coordinate file cleanup with database/case writes.