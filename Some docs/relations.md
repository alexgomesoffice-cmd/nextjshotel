============================================================
                    SYSTEM ADMIN
============================================================

system_admins (1) ─────> (1) system_admin_details

system_admins (1) ─────> (N) system_admin_images

system_admins (1) ─────> (N) system_admins
                         └── created_by

system_admins (1) ─────> (N) hotels
                         └── created_by

system_admins (1) ─────> (N) hotel_admins
                         └── created_by

system_admins (1) ─────> (N) cases
                         └── decided_by


============================================================
                       END USER
============================================================

end_users (1) ─────> (1) end_user_details

end_users (1) ─────> (N) end_user_images

end_users (1) ─────> (N) user_bookings

end_users (1) ─────> (N) user_favourites


============================================================
                         ROLES
============================================================

roles (1) ─────> (N) hotel_admins

roles (1) ─────> (N) hotel_sub_admins


============================================================
                     HOTEL ADMIN
============================================================

hotel_admins (N) ─────> (1) roles

hotel_admins (N) ─────> (1) hotels

hotel_admins (N) ─────> (1) system_admins
                         └── created_by

hotel_admins (1) ─────> (1) hotel_admin_details

hotel_admins (1) ─────> (N) hotel_admin_images

hotel_admins (1) ─────> (N) hotel_sub_admins
                         └── created_by

hotel_admins (1) ─────> (N) cases
                         └── submitted_by


============================================================
                   HOTEL SUB ADMIN
============================================================

hotel_sub_admins (N) ─────> (1) roles

hotel_sub_admins (N) ─────> (1) hotels

hotel_sub_admins (N) ─────> (1) hotel_admins
                            └── created_by

hotel_sub_admins (1) ─────> (1) hotel_sub_admin_details

hotel_sub_admins (1) ─────> (N) hotel_sub_admin_images


============================================================
                        CITIES
============================================================

cities (1) ─────> (N) hotels

hotels (N) ─────> (1) cities


============================================================
                     HOTEL TYPES
============================================================

hotel_types (1) ─────> (N) hotels

hotels (N) ─────> (1) hotel_types


============================================================
                        HOTELS
============================================================

hotels (N) ─────> (1) cities

hotels (N) ─────> (1) hotel_types

hotels (N) ─────> (1) system_admins
                  └── created_by

hotels (1) ─────> (1) hotel_admins

hotels (1) ─────> (1) hotel_details

hotels (1) ─────> (N) hotel_images

hotels (1) ─────> (N) hotel_amenities

hotels (1) ─────> (N) hotel_sub_admins

hotels (1) ─────> (N) room_types

hotels (1) ─────> (N) user_bookings

hotels (1) ─────> (1) hotel_owner_details

hotels (1) ─────> (N) hotel_documents

hotels (1) ─────> (N) policies

hotels (1) ─────> (N) cases

hotels (1) ─────> (N) master_data_requests

hotels (1) ─────> (N) user_favourites


============================================================
                    HOTEL DETAILS
============================================================

hotel_details (1) ─────> (1) hotels


============================================================
                     HOTEL IMAGES
============================================================

hotel_images (N) ─────> (1) hotels


============================================================
                 HOTEL OWNER DETAILS
============================================================

hotel_owner_details (1) ─────> (1) hotels

hotel_owner_details (1) ─────> (N) hotel_owner_images

hotel_owner_images (N) ─────> (1) hotel_owner_details


============================================================
                  HOTEL DOCUMENTS
============================================================

hotel_documents (N) ─────> (1) hotels


============================================================
                       POLICIES
============================================================

policies (N) ─────> (1) hotels


============================================================
                      AMENITIES
============================================================

amenities (1) ─────> (N) hotel_amenities

amenities (1) ─────> (N) room_type_amenities


============================================================
                  HOTEL AMENITIES
============================================================

hotel_amenities (N) ─────> (1) hotels

hotel_amenities (N) ─────> (1) amenities

                    ↓

hotels (N) ─────> (N) amenities


============================================================
                     BED TYPES
============================================================

bed_types (1) ─────> (N) room_variant_bed_types


============================================================
                  ROOM FACILITIES
============================================================

room_facilities (1) ─────> (N) room_variant_facilities


============================================================
                   ROOM TYPES
============================================================

room_types (N) ─────> (1) hotels

room_types (1) ─────> (N) room_variants

room_types (1) ─────> (N) room_images

room_types (1) ─────> (N) room_type_amenities

room_types (1) ─────> (N) room_bookings


============================================================
              ROOM TYPE AMENITIES
============================================================

room_type_amenities (N) ─────> (1) room_types

room_type_amenities (N) ─────> (1) amenities

                    ↓

room_types (N) ─────> (N) amenities


============================================================
                  ROOM VARIANTS
============================================================

room_variants (N) ─────> (1) room_types

room_variants (1) ─────> (N) room_details

room_variants (1) ─────> (N) room_bookings

room_variants (1) ─────> (N) room_images

room_variants (1) ─────> (N) room_variant_facilities

room_variants (1) ─────> (N) room_variant_bed_types

room_variants (1) ─────> (N) pricing_rules


============================================================
             ROOM VARIANT FACILITIES
============================================================

room_variant_facilities (N) ─────> (1) room_variants

room_variant_facilities (N) ─────> (1) room_facilities

                    ↓

room_variants (N) ─────> (N) room_facilities


============================================================
              ROOM VARIANT BED TYPES
============================================================

room_variant_bed_types (N) ─────> (1) room_variants

room_variant_bed_types (N) ─────> (1) bed_types

                    ↓

room_variants (N) ─────> (N) bed_types


============================================================
                    ROOM DETAILS
============================================================

room_details (N) ─────> (1) room_variants

room_details (1) ─────> (N) room_images

room_details (1) ─────> (N) room_trackers

room_details (1) ─────> (N) room_bookings


============================================================
                    ROOM IMAGES
============================================================

room_images (N) ─────> (1) room_types

room_images (N) ─────> (1) room_variants

room_images (N) ─────> (1) room_details


============================================================
                   PRICING RULES
============================================================

pricing_rules (N) ─────> (1) room_variants


============================================================
                    USER BOOKINGS
============================================================

user_bookings (N) ─────> (1) end_users

user_bookings (N) ─────> (1) hotels

user_bookings (1) ─────> (N) room_bookings

user_bookings (1) ─────> (N) room_trackers


============================================================
                    ROOM BOOKINGS
============================================================

room_bookings (N) ─────> (1) user_bookings

room_bookings (N) ─────> (1) room_types

room_bookings (N) ─────> (1) room_variants

room_bookings (N) ─────> (1) room_details

room_bookings (1) ─────> (N) room_booking_nightly_rates


============================================================
              NIGHTLY BOOKING RATES
============================================================

room_booking_nightly_rates (N) ─────> (1) room_bookings


============================================================
                    ROOM TRACKERS
============================================================

room_trackers (N) ─────> (1) user_bookings

room_trackers (N) ─────> (1) room_details


============================================================
                 MASTER DATA REQUEST
============================================================

master_data_requests (N) ─────> (1) hotels

requested_by ─────> hotel_admins
                 [application-level reference]

resolved_by ─────> system_admins
                 [application-level reference]

created_entity_id ─────> amenities / bed_types / room_facilities
                         [polymorphic, no FK]


============================================================
                        CASES
============================================================

cases (N) ─────> (1) hotels

cases (N) ─────> (1) hotel_admins
                 └── submitted_by

cases (N) ─────> (1) system_admins
                 └── decided_by

cases (1) ─────> (N) case_field_changes


============================================================
                 CASE FIELD CHANGES
============================================================

case_field_changes (N) ─────> (1) cases

case_field_changes
        └── entity_type + entity_id
                ↓
        hotels / hotel_owner_details /
        hotel_admin_details / hotel_images /
        hotel_documents / amenities / policies
                [polymorphic, no FK]


============================================================
               SYSTEM ADMIN ACTIVITY LOG
============================================================

system_admin_activity_logs

actor_id ─────> system_admins
[application-level reference]


============================================================
              HOTEL ADMIN ACTIVITY LOG
============================================================

hotel_admin_activity_logs

hotel_id ─────> hotels

actor_id + actor_type
        ├──> hotel_admins
        └──> hotel_sub_admins

[application-level reference]


============================================================
                END USER ACTIVITY LOG
============================================================

end_user_activity_logs

actor_id ─────> end_users
[application-level reference]


============================================================
             SYSTEM ADMIN NOTIFICATIONS
============================================================

system_admin_notifications

recipient_id ─────> system_admins
[application-level reference]


============================================================
              HOTEL ADMIN NOTIFICATIONS
============================================================

hotel_admin_notifications

recipient_id + recipient_type
        ├──> hotel_admins
        └──> hotel_sub_admins

[application-level reference]


============================================================
               END USER NOTIFICATIONS
============================================================

end_user_notifications

recipient_id ─────> end_users
[application-level reference]


============================================================
                 BLACKLISTED TOKENS
============================================================

blacklisted_tokens

actor_id + actor_type
        ├──> system_admins
        ├──> hotel_admins
        ├──> hotel_sub_admins
        └──> end_users

[application-level reference]


============================================================
                  AUTH BACKGROUNDS
============================================================

auth_backgrounds

        └── standalone


============================================================
                    HERO BANNERS
============================================================

hero_banners

        └── standalone


============================================================
                  USER FAVOURITES
============================================================

user_favourites (N) ─────> (1) end_users

user_favourites (N) ─────> (1) hotels

                    ↓

end_users (N) ─────> (N) hotels