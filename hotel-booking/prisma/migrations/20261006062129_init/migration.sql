-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('SYSTEM_ADMIN', 'HOTEL_ADMIN', 'HOTEL_SUB_ADMIN', 'END_USER');

-- CreateEnum
CREATE TYPE "AmenityContext" AS ENUM ('HOTEL', 'ROOM');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('UNPUBLISHED', 'PUBLISHED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('RESERVED', 'BOOKED', 'EXPIRED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TrackerStatus" AS ENUM ('RESERVED', 'BOOKED', 'EXPIRED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'CHECKED_IN', 'CHECKED_OUT', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('DRAFTING', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FieldChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('TRADE_LICENSE', 'TAX_CERTIFICATE', 'TIN_CERTIFICATE', 'VAT_CERTIFICATE', 'BUSINESS_DOCUMENT', 'OWNER_DOCUMENT', 'ADMIN_DOCUMENT');

-- CreateEnum
CREATE TYPE "CaseEntityType" AS ENUM ('HOTEL', 'HOTEL_OWNER', 'HOTEL_ADMIN', 'HOTEL_IMAGE', 'HOTEL_DOCUMENT', 'AMENITY', 'POLICY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CASE_SUBMITTED', 'CASE_APPROVED', 'CASE_REJECTED', 'FIELD_REJECTED', 'NEW_BOOKING', 'BOOKING_CANCELLED', 'NEW_REVIEW', 'DOCUMENT_EXPIRING', 'ACCOUNT_BLOCKED', 'MASTER_DATA_REQUEST', 'GENERAL');

-- CreateEnum
CREATE TYPE "MasterDataCategory" AS ENUM ('AMENITY', 'BED_TYPE', 'ROOM_FACILITY');

-- CreateEnum
CREATE TYPE "MasterDataRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "PricingRuleStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "role_name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admins" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER,
    "last_login_at" TIMESTAMP(3),
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "password_reset_token" VARCHAR(255),
    "password_reset_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "system_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admin_details" (
    "id" SERIAL NOT NULL,
    "system_admin_id" INTEGER NOT NULL,
    "dob" DATE,
    "gender" VARCHAR(20),
    "address" TEXT,
    "nid_no" VARCHAR(50),
    "passport" VARCHAR(50),
    "phone" VARCHAR(32),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_admin_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admin_images" (
    "id" SERIAL NOT NULL,
    "system_admin_id" INTEGER NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_admin_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255),
    "name" VARCHAR(150) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "password_reset_token" VARCHAR(255),
    "password_reset_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "end_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_user_details" (
    "id" SERIAL NOT NULL,
    "end_user_id" INTEGER NOT NULL,
    "dob" DATE,
    "gender" VARCHAR(20),
    "address" TEXT,
    "country" VARCHAR(100) DEFAULT 'Bangladesh',
    "nid_no" VARCHAR(50),
    "passport" VARCHAR(50),
    "phone" VARCHAR(32),
    "emergency_contact" VARCHAR(100),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "end_user_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_user_images" (
    "id" SERIAL NOT NULL,
    "end_user_id" INTEGER NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "end_user_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "email" VARCHAR(150),
    "address" TEXT,
    "city_id" INTEGER,
    "hotel_type_id" INTEGER,
    "zip_code" VARCHAR(20),
    "map_location" TEXT,
    "created_by" INTEGER NOT NULL,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'UNPUBLISHED',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_details" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "description" TEXT,
    "reception_no1" VARCHAR(32),
    "reception_no2" VARCHAR(32),
    "star_rating" DECIMAL(2,1),
    "guest_rating" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "website" VARCHAR(255),
    "check_in_time" VARCHAR(5) NOT NULL DEFAULT '14:00',
    "check_out_time" VARCHAR(5) NOT NULL DEFAULT '12:00',
    "advance_deposit_percent" INTEGER NOT NULL DEFAULT 0,
    "emergency_contact_name" VARCHAR(150),
    "emergency_contact_designation" VARCHAR(100),
    "emergency_contact_phone1" VARCHAR(32),
    "emergency_contact_phone2" VARCHAR(32),
    "emergency_contact_email" VARCHAR(150),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_images" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_admins" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL DEFAULT 1,
    "hotel_id" INTEGER NOT NULL,
    "created_by" INTEGER,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "password_reset_token" VARCHAR(255),
    "password_reset_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "hotel_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_admin_details" (
    "id" SERIAL NOT NULL,
    "hotel_admin_id" INTEGER NOT NULL,
    "dob" DATE,
    "phone" VARCHAR(32),
    "nid_no" VARCHAR(50),
    "passport" VARCHAR(50),
    "address" TEXT,
    "manager_name" VARCHAR(150),
    "manager_phone" VARCHAR(32),
    "emergency_contact1" VARCHAR(100),
    "emergency_contact2" VARCHAR(100),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_admin_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_admin_images" (
    "id" SERIAL NOT NULL,
    "hotel_admin_id" INTEGER NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_admin_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_sub_admins" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL DEFAULT 2,
    "hotel_id" INTEGER NOT NULL,
    "created_by" INTEGER,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "password_reset_token" VARCHAR(255),
    "password_reset_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "hotel_sub_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_sub_admin_details" (
    "id" SERIAL NOT NULL,
    "hotel_sub_admin_id" INTEGER NOT NULL,
    "phone" VARCHAR(32),
    "nid_no" VARCHAR(50),
    "passport" VARCHAR(50),
    "address" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_sub_admin_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_sub_admin_images" (
    "id" SERIAL NOT NULL,
    "hotel_sub_admin_id" INTEGER NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_sub_admin_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "icon" VARCHAR(100),
    "context" "AmenityContext" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_amenities" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "amenity_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bed_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_facilities" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_data_requests" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "category" "MasterDataCategory" NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "context" "AmenityContext",
    "note" TEXT NOT NULL,
    "status" "MasterDataRequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolved_by" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "created_entity_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_data_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type_amenities" (
    "id" SERIAL NOT NULL,
    "room_type_id" INTEGER NOT NULL,
    "amenity_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_type_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_variants" (
    "id" SERIAL NOT NULL,
    "room_type_id" INTEGER NOT NULL,
    "signature_hash" VARCHAR(64) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "room_size" VARCHAR(50),
    "max_occupancy" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_variant_facilities" (
    "id" SERIAL NOT NULL,
    "room_variant_id" INTEGER NOT NULL,
    "facility_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_variant_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_variant_bed_types" (
    "id" SERIAL NOT NULL,
    "room_variant_id" INTEGER NOT NULL,
    "bed_type_id" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_variant_bed_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_details" (
    "id" SERIAL NOT NULL,
    "room_variant_id" INTEGER NOT NULL,
    "room_number" VARCHAR(50) NOT NULL,
    "floor" INTEGER,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "room_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_images" (
    "id" SERIAL NOT NULL,
    "image_url" TEXT NOT NULL,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "room_type_id" INTEGER,
    "room_variant_id" INTEGER,
    "room_detail_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" SERIAL NOT NULL,
    "room_variant_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" DECIMAL(12,2) NOT NULL,
    "status" "PricingRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_bookings" (
    "id" SERIAL NOT NULL,
    "booking_reference" VARCHAR(64) NOT NULL,
    "end_user_id" INTEGER NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "guests" INTEGER NOT NULL DEFAULT 1,
    "rooms_count" INTEGER NOT NULL DEFAULT 1,
    "special_request" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'RESERVED',
    "reserved_until" TIMESTAMP(3),
    "total_price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_bookings" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "room_type_id" INTEGER NOT NULL,
    "room_variant_id" INTEGER NOT NULL,
    "room_detail_id" INTEGER NOT NULL,
    "price_per_night" DECIMAL(12,2) NOT NULL,
    "nights" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_booking_nightly_rates" (
    "id" SERIAL NOT NULL,
    "room_booking_id" INTEGER NOT NULL,
    "stay_date" DATE NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "pricing_rule_id" INTEGER,
    "pricing_rule_name" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_booking_nightly_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_trackers" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "room_detail_id" INTEGER NOT NULL,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "status" "TrackerStatus" NOT NULL DEFAULT 'RESERVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_trackers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklisted_tokens" (
    "id" SERIAL NOT NULL,
    "token_hash" VARCHAR(500) NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blacklisted_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_owner_details" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "dob" DATE,
    "nid_no" VARCHAR(50),
    "passport" VARCHAR(50),
    "email" VARCHAR(150),
    "phone" VARCHAR(32) NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_owner_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_owner_images" (
    "id" SERIAL NOT NULL,
    "hotel_owner_detail_id" INTEGER NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_owner_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_documents" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "submitted_by" INTEGER NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'DRAFTING',
    "summary" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_by" INTEGER,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_field_changes" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "entity_type" "CaseEntityType" NOT NULL,
    "entity_id" INTEGER,
    "field_name" VARCHAR(100),
    "previous_value" TEXT,
    "proposed_value" TEXT NOT NULL,
    "status" "FieldChangeStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_field_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admin_activity_logs" (
    "id" SERIAL NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "action" VARCHAR(150) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" INTEGER,
    "metadata" JSONB,
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_admin_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_admin_activity_logs" (
    "id" SERIAL NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "action" VARCHAR(150) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" INTEGER,
    "metadata" JSONB,
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_admin_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_user_activity_logs" (
    "id" SERIAL NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "action" VARCHAR(150) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" INTEGER,
    "metadata" JSONB,
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "end_user_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admin_notifications" (
    "id" SERIAL NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "related_entity_type" VARCHAR(100),
    "related_entity_id" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_admin_notifications" (
    "id" SERIAL NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "recipient_type" "ActorType" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "related_entity_type" VARCHAR(100),
    "related_entity_id" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_user_notifications" (
    "id" SERIAL NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "related_entity_type" VARCHAR(100),
    "related_entity_id" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "end_user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hero_banners" (
    "id" SERIAL NOT NULL,
    "slot" INTEGER NOT NULL,
    "image_url" VARCHAR(500),
    "eyebrow" VARCHAR(100),
    "title" VARCHAR(255),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favourites" (
    "id" SERIAL NOT NULL,
    "end_user_id" INTEGER NOT NULL,
    "hotel_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favourites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_role_name_key" ON "roles"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "system_admins_email_key" ON "system_admins"("email");

-- CreateIndex
CREATE INDEX "system_admins_email_idx" ON "system_admins"("email");

-- CreateIndex
CREATE INDEX "system_admins_created_by_idx" ON "system_admins"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_details_system_admin_id_key" ON "system_admin_details"("system_admin_id");

-- CreateIndex
CREATE INDEX "system_admin_images_system_admin_id_idx" ON "system_admin_images"("system_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "end_users_email_key" ON "end_users"("email");

-- CreateIndex
CREATE INDEX "end_users_email_idx" ON "end_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "end_user_details_end_user_id_key" ON "end_user_details"("end_user_id");

-- CreateIndex
CREATE INDEX "end_user_images_end_user_id_idx" ON "end_user_images"("end_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_types_name_key" ON "hotel_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_slug_key" ON "hotels"("slug");

-- CreateIndex
CREATE INDEX "hotels_approval_status_idx" ON "hotels"("approval_status");

-- CreateIndex
CREATE INDEX "hotels_city_id_idx" ON "hotels"("city_id");

-- CreateIndex
CREATE INDEX "hotels_hotel_type_id_idx" ON "hotels"("hotel_type_id");

-- CreateIndex
CREATE INDEX "hotels_created_by_idx" ON "hotels"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_details_hotel_id_key" ON "hotel_details"("hotel_id");

-- CreateIndex
CREATE INDEX "hotel_images_hotel_id_idx" ON "hotel_images"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_admins_hotel_id_key" ON "hotel_admins"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_admins_email_key" ON "hotel_admins"("email");

-- CreateIndex
CREATE INDEX "hotel_admins_email_idx" ON "hotel_admins"("email");

-- CreateIndex
CREATE INDEX "hotel_admins_created_by_idx" ON "hotel_admins"("created_by");

-- CreateIndex
CREATE INDEX "hotel_admins_role_id_idx" ON "hotel_admins"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_admin_details_hotel_admin_id_key" ON "hotel_admin_details"("hotel_admin_id");

-- CreateIndex
CREATE INDEX "hotel_admin_images_hotel_admin_id_idx" ON "hotel_admin_images"("hotel_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_sub_admins_email_key" ON "hotel_sub_admins"("email");

-- CreateIndex
CREATE INDEX "hotel_sub_admins_email_idx" ON "hotel_sub_admins"("email");

-- CreateIndex
CREATE INDEX "hotel_sub_admins_hotel_id_idx" ON "hotel_sub_admins"("hotel_id");

-- CreateIndex
CREATE INDEX "hotel_sub_admins_created_by_idx" ON "hotel_sub_admins"("created_by");

-- CreateIndex
CREATE INDEX "hotel_sub_admins_role_id_idx" ON "hotel_sub_admins"("role_id");

-- CreateIndex
CREATE INDEX "hotel_sub_admins_is_blocked_idx" ON "hotel_sub_admins"("is_blocked");

-- CreateIndex
CREATE INDEX "hotel_sub_admins_deleted_at_idx" ON "hotel_sub_admins"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_sub_admin_details_hotel_sub_admin_id_key" ON "hotel_sub_admin_details"("hotel_sub_admin_id");

-- CreateIndex
CREATE INDEX "hotel_sub_admin_images_hotel_sub_admin_id_idx" ON "hotel_sub_admin_images"("hotel_sub_admin_id");

-- CreateIndex
CREATE INDEX "amenities_context_idx" ON "amenities"("context");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_name_context_key" ON "amenities"("name", "context");

-- CreateIndex
CREATE INDEX "hotel_amenities_hotel_id_idx" ON "hotel_amenities"("hotel_id");

-- CreateIndex
CREATE INDEX "hotel_amenities_amenity_id_idx" ON "hotel_amenities"("amenity_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_amenities_hotel_id_amenity_id_key" ON "hotel_amenities"("hotel_id", "amenity_id");

-- CreateIndex
CREATE UNIQUE INDEX "bed_types_name_key" ON "bed_types"("name");

-- CreateIndex
CREATE INDEX "room_types_hotel_id_idx" ON "room_types"("hotel_id");

-- CreateIndex
CREATE INDEX "room_types_is_active_idx" ON "room_types"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_hotel_id_name_key" ON "room_types"("hotel_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "room_facilities_name_key" ON "room_facilities"("name");

-- CreateIndex
CREATE INDEX "master_data_requests_hotel_id_idx" ON "master_data_requests"("hotel_id");

-- CreateIndex
CREATE INDEX "master_data_requests_status_idx" ON "master_data_requests"("status");

-- CreateIndex
CREATE INDEX "room_type_amenities_room_type_id_idx" ON "room_type_amenities"("room_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_type_amenities_room_type_id_amenity_id_key" ON "room_type_amenities"("room_type_id", "amenity_id");

-- CreateIndex
CREATE INDEX "room_variants_room_type_id_idx" ON "room_variants"("room_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_variants_room_type_id_signature_hash_key" ON "room_variants"("room_type_id", "signature_hash");

-- CreateIndex
CREATE INDEX "room_variant_facilities_room_variant_id_idx" ON "room_variant_facilities"("room_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_variant_facilities_room_variant_id_facility_id_key" ON "room_variant_facilities"("room_variant_id", "facility_id");

-- CreateIndex
CREATE INDEX "room_variant_bed_types_room_variant_id_idx" ON "room_variant_bed_types"("room_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_variant_bed_types_room_variant_id_bed_type_id_key" ON "room_variant_bed_types"("room_variant_id", "bed_type_id");

-- CreateIndex
CREATE INDEX "room_details_room_variant_id_idx" ON "room_details"("room_variant_id");

-- CreateIndex
CREATE INDEX "room_details_status_idx" ON "room_details"("status");

-- CreateIndex
CREATE UNIQUE INDEX "room_details_room_variant_id_room_number_deleted_at_key" ON "room_details"("room_variant_id", "room_number", "deleted_at");

-- CreateIndex
CREATE INDEX "room_images_room_type_id_idx" ON "room_images"("room_type_id");

-- CreateIndex
CREATE INDEX "room_images_room_variant_id_idx" ON "room_images"("room_variant_id");

-- CreateIndex
CREATE INDEX "room_images_room_detail_id_idx" ON "room_images"("room_detail_id");

-- CreateIndex
CREATE INDEX "pricing_rules_room_variant_id_idx" ON "pricing_rules"("room_variant_id");

-- CreateIndex
CREATE INDEX "pricing_rules_start_date_end_date_idx" ON "pricing_rules"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "pricing_rules_status_idx" ON "pricing_rules"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_bookings_booking_reference_key" ON "user_bookings"("booking_reference");

-- CreateIndex
CREATE INDEX "user_bookings_booking_reference_idx" ON "user_bookings"("booking_reference");

-- CreateIndex
CREATE INDEX "user_bookings_end_user_id_status_idx" ON "user_bookings"("end_user_id", "status");

-- CreateIndex
CREATE INDEX "user_bookings_hotel_id_check_in_check_out_idx" ON "user_bookings"("hotel_id", "check_in", "check_out");

-- CreateIndex
CREATE INDEX "user_bookings_reserved_until_idx" ON "user_bookings"("reserved_until");

-- CreateIndex
CREATE INDEX "room_bookings_booking_id_idx" ON "room_bookings"("booking_id");

-- CreateIndex
CREATE INDEX "room_bookings_room_type_id_idx" ON "room_bookings"("room_type_id");

-- CreateIndex
CREATE INDEX "room_bookings_room_variant_id_idx" ON "room_bookings"("room_variant_id");

-- CreateIndex
CREATE INDEX "room_bookings_room_detail_id_idx" ON "room_bookings"("room_detail_id");

-- CreateIndex
CREATE INDEX "room_booking_nightly_rates_room_booking_id_idx" ON "room_booking_nightly_rates"("room_booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_booking_nightly_rates_room_booking_id_stay_date_key" ON "room_booking_nightly_rates"("room_booking_id", "stay_date");

-- CreateIndex
CREATE INDEX "room_trackers_room_detail_id_check_in_check_out_idx" ON "room_trackers"("room_detail_id", "check_in", "check_out");

-- CreateIndex
CREATE INDEX "room_trackers_booking_id_idx" ON "room_trackers"("booking_id");

-- CreateIndex
CREATE INDEX "room_trackers_status_idx" ON "room_trackers"("status");

-- CreateIndex
CREATE INDEX "room_trackers_check_in_idx" ON "room_trackers"("check_in");

-- CreateIndex
CREATE UNIQUE INDEX "room_trackers_room_detail_id_check_in_check_out_status_key" ON "room_trackers"("room_detail_id", "check_in", "check_out", "status");

-- CreateIndex
CREATE UNIQUE INDEX "blacklisted_tokens_token_hash_key" ON "blacklisted_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "blacklisted_tokens_token_hash_idx" ON "blacklisted_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "blacklisted_tokens_expires_at_idx" ON "blacklisted_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "blacklisted_tokens_actor_id_actor_type_idx" ON "blacklisted_tokens"("actor_id", "actor_type");

-- CreateIndex
CREATE INDEX "policies_hotel_id_idx" ON "policies"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_owner_details_hotel_id_key" ON "hotel_owner_details"("hotel_id");

-- CreateIndex
CREATE INDEX "hotel_owner_images_hotel_owner_detail_id_idx" ON "hotel_owner_images"("hotel_owner_detail_id");

-- CreateIndex
CREATE INDEX "hotel_documents_hotel_id_idx" ON "hotel_documents"("hotel_id");

-- CreateIndex
CREATE INDEX "hotel_documents_document_type_idx" ON "hotel_documents"("document_type");

-- CreateIndex
CREATE INDEX "cases_hotel_id_idx" ON "cases"("hotel_id");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_submitted_by_idx" ON "cases"("submitted_by");

-- CreateIndex
CREATE INDEX "case_field_changes_case_id_idx" ON "case_field_changes"("case_id");

-- CreateIndex
CREATE INDEX "case_field_changes_status_idx" ON "case_field_changes"("status");

-- CreateIndex
CREATE INDEX "case_field_changes_entity_type_entity_id_idx" ON "case_field_changes"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "system_admin_activity_logs_actor_id_idx" ON "system_admin_activity_logs"("actor_id");

-- CreateIndex
CREATE INDEX "system_admin_activity_logs_entity_type_entity_id_idx" ON "system_admin_activity_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "system_admin_activity_logs_created_at_idx" ON "system_admin_activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "hotel_admin_activity_logs_hotel_id_idx" ON "hotel_admin_activity_logs"("hotel_id");

-- CreateIndex
CREATE INDEX "hotel_admin_activity_logs_actor_id_actor_type_idx" ON "hotel_admin_activity_logs"("actor_id", "actor_type");

-- CreateIndex
CREATE INDEX "hotel_admin_activity_logs_entity_type_entity_id_idx" ON "hotel_admin_activity_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "hotel_admin_activity_logs_created_at_idx" ON "hotel_admin_activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "end_user_activity_logs_actor_id_idx" ON "end_user_activity_logs"("actor_id");

-- CreateIndex
CREATE INDEX "end_user_activity_logs_entity_type_entity_id_idx" ON "end_user_activity_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "end_user_activity_logs_created_at_idx" ON "end_user_activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "system_admin_notifications_recipient_id_is_read_idx" ON "system_admin_notifications"("recipient_id", "is_read");

-- CreateIndex
CREATE INDEX "system_admin_notifications_created_at_idx" ON "system_admin_notifications"("created_at");

-- CreateIndex
CREATE INDEX "hotel_admin_notifications_recipient_id_recipient_type_is_re_idx" ON "hotel_admin_notifications"("recipient_id", "recipient_type", "is_read");

-- CreateIndex
CREATE INDEX "hotel_admin_notifications_created_at_idx" ON "hotel_admin_notifications"("created_at");

-- CreateIndex
CREATE INDEX "end_user_notifications_recipient_id_is_read_idx" ON "end_user_notifications"("recipient_id", "is_read");

-- CreateIndex
CREATE INDEX "end_user_notifications_created_at_idx" ON "end_user_notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "hero_banners_slot_key" ON "hero_banners"("slot");

-- CreateIndex
CREATE INDEX "user_favourites_end_user_id_idx" ON "user_favourites"("end_user_id");

-- CreateIndex
CREATE INDEX "user_favourites_hotel_id_idx" ON "user_favourites"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favourites_end_user_id_hotel_id_key" ON "user_favourites"("end_user_id", "hotel_id");

-- AddForeignKey
ALTER TABLE "system_admins" ADD CONSTRAINT "system_admins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "system_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_admin_details" ADD CONSTRAINT "system_admin_details_system_admin_id_fkey" FOREIGN KEY ("system_admin_id") REFERENCES "system_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_admin_images" ADD CONSTRAINT "system_admin_images_system_admin_id_fkey" FOREIGN KEY ("system_admin_id") REFERENCES "system_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_user_details" ADD CONSTRAINT "end_user_details_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_user_images" ADD CONSTRAINT "end_user_images_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_hotel_type_id_fkey" FOREIGN KEY ("hotel_type_id") REFERENCES "hotel_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "system_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_details" ADD CONSTRAINT "hotel_details_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_images" ADD CONSTRAINT "hotel_images_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_admins" ADD CONSTRAINT "hotel_admins_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_admins" ADD CONSTRAINT "hotel_admins_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_admins" ADD CONSTRAINT "hotel_admins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "system_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_admin_details" ADD CONSTRAINT "hotel_admin_details_hotel_admin_id_fkey" FOREIGN KEY ("hotel_admin_id") REFERENCES "hotel_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_admin_images" ADD CONSTRAINT "hotel_admin_images_hotel_admin_id_fkey" FOREIGN KEY ("hotel_admin_id") REFERENCES "hotel_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_sub_admins" ADD CONSTRAINT "hotel_sub_admins_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_sub_admins" ADD CONSTRAINT "hotel_sub_admins_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_sub_admins" ADD CONSTRAINT "hotel_sub_admins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "hotel_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_sub_admin_details" ADD CONSTRAINT "hotel_sub_admin_details_hotel_sub_admin_id_fkey" FOREIGN KEY ("hotel_sub_admin_id") REFERENCES "hotel_sub_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_sub_admin_images" ADD CONSTRAINT "hotel_sub_admin_images_hotel_sub_admin_id_fkey" FOREIGN KEY ("hotel_sub_admin_id") REFERENCES "hotel_sub_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_amenities" ADD CONSTRAINT "hotel_amenities_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_amenities" ADD CONSTRAINT "hotel_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_data_requests" ADD CONSTRAINT "master_data_requests_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_variants" ADD CONSTRAINT "room_variants_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_variant_facilities" ADD CONSTRAINT "room_variant_facilities_room_variant_id_fkey" FOREIGN KEY ("room_variant_id") REFERENCES "room_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_variant_facilities" ADD CONSTRAINT "room_variant_facilities_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "room_facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_variant_bed_types" ADD CONSTRAINT "room_variant_bed_types_room_variant_id_fkey" FOREIGN KEY ("room_variant_id") REFERENCES "room_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_variant_bed_types" ADD CONSTRAINT "room_variant_bed_types_bed_type_id_fkey" FOREIGN KEY ("bed_type_id") REFERENCES "bed_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_details" ADD CONSTRAINT "room_details_room_variant_id_fkey" FOREIGN KEY ("room_variant_id") REFERENCES "room_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_images" ADD CONSTRAINT "room_images_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_images" ADD CONSTRAINT "room_images_room_variant_id_fkey" FOREIGN KEY ("room_variant_id") REFERENCES "room_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_images" ADD CONSTRAINT "room_images_room_detail_id_fkey" FOREIGN KEY ("room_detail_id") REFERENCES "room_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_room_variant_id_fkey" FOREIGN KEY ("room_variant_id") REFERENCES "room_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bookings" ADD CONSTRAINT "user_bookings_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bookings" ADD CONSTRAINT "user_bookings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "user_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_room_variant_id_fkey" FOREIGN KEY ("room_variant_id") REFERENCES "room_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_room_detail_id_fkey" FOREIGN KEY ("room_detail_id") REFERENCES "room_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_booking_nightly_rates" ADD CONSTRAINT "room_booking_nightly_rates_room_booking_id_fkey" FOREIGN KEY ("room_booking_id") REFERENCES "room_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_trackers" ADD CONSTRAINT "room_trackers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "user_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_trackers" ADD CONSTRAINT "room_trackers_room_detail_id_fkey" FOREIGN KEY ("room_detail_id") REFERENCES "room_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_owner_details" ADD CONSTRAINT "hotel_owner_details_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_owner_images" ADD CONSTRAINT "hotel_owner_images_hotel_owner_detail_id_fkey" FOREIGN KEY ("hotel_owner_detail_id") REFERENCES "hotel_owner_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_documents" ADD CONSTRAINT "hotel_documents_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "hotel_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "system_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_field_changes" ADD CONSTRAINT "case_field_changes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favourites" ADD CONSTRAINT "user_favourites_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favourites" ADD CONSTRAINT "user_favourites_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
