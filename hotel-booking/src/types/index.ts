export type JwtPayload = {
  actor_id: number
  actor_type: 'SYSTEM_ADMIN' | 'HOTEL_ADMIN' | 'HOTEL_SUB_ADMIN' | 'END_USER'
  hotel_id?: number   // only for HOTEL_ADMIN and HOTEL_SUB_ADMIN
  iat: number
  exp: number
}