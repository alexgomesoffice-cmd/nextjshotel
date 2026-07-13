# MyHotels Socket Architecture - Security Review & AI Instructions

## Goal
Implement **only** the security improvements below.

- Do NOT redesign the architecture.
- Keep **Next.js + Prisma/MySQL = Source of Truth**.
- Keep **Socket Server = Authentication + Real-time Delivery**.

## Critical Change
### Remove `/api/socket-auth`
Do not expose the JWT to browser JavaScript.
Use the HTTP-only cookie during the Socket.IO handshake.
Read the Cookie header in Socket.IO middleware, verify the JWT, and attach the authenticated user to `socket.data.user`.

## Other Required Changes
1. Verify JWT in Socket.IO middleware before `io.on('connection')`.
2. Never trust `userId` from the client. Always use `socket.data.user.userId`.
3. Secure the internal broadcast endpoint with an internal secret/API key.
4. Validate every socket event payload with Zod.
5. The server decides room names and performs `socket.join()`.
6. Perform authorization checks before privileged actions.
7. Apply rate limiting to sensitive events.
8. Never log JWTs, cookies, or secrets.
9. Create a typed `AuthenticatedUser` interface for `socket.data.user`.
10. Centralize event names and room builders into constants/helpers.
11. Emit socket events only after a successful database transaction.

## Instructions for AI
Read the existing project and implement ONLY the changes listed above.
Do not refactor unrelated code.
Do not redesign the architecture.
Do not move business logic from Next.js to the Socket Server.
After each change, explain what changed and why.
