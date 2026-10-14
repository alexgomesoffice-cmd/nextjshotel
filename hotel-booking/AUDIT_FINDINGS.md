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

8. **A customer-facing cancellation action was not found in the reviewed interface.** The booking/API behavior and the customer-facing UI do not appear to expose a corresponding cancel action in the flow inspected, which can prevent users from cancelling through the app even where a cancellation endpoint exists.
   - Evidence: Reviewed customer booking interface and cancellation paths.
   - Status: UI/API inspection; authenticated customer flow was not exercised.

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