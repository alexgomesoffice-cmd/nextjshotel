-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_name` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `roles_role_name_key`(`role_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_admins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_blocked` BOOLEAN NOT NULL DEFAULT false,
    `created_by` INTEGER NULL,
    `last_login_at` DATETIME(3) NULL,
    `login_attempts` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `password_reset_token` VARCHAR(255) NULL,
    `password_reset_expires` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `system_admins_email_key`(`email`),
    INDEX `system_admins_email_idx`(`email`),
    INDEX `system_admins_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_admin_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `system_admin_id` INTEGER NOT NULL,
    `dob` DATE NULL,
    `gender` VARCHAR(20) NULL,
    `address` TEXT NULL,
    `nid_no` VARCHAR(50) NULL,
    `passport` VARCHAR(50) NULL,
    `phone` VARCHAR(32) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_admin_details_system_admin_id_key`(`system_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_admin_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `system_admin_id` INTEGER NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `system_admin_images_system_admin_id_idx`(`system_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `end_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NULL,
    `name` VARCHAR(150) NOT NULL,
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `email_verified_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_blocked` BOOLEAN NOT NULL DEFAULT false,
    `last_login_at` DATETIME(3) NULL,
    `login_attempts` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `password_reset_token` VARCHAR(255) NULL,
    `password_reset_expires` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `end_users_email_key`(`email`),
    INDEX `end_users_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `end_user_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `end_user_id` INTEGER NOT NULL,
    `dob` DATE NULL,
    `gender` VARCHAR(20) NULL,
    `address` TEXT NULL,
    `country` VARCHAR(100) NULL DEFAULT 'Bangladesh',
    `nid_no` VARCHAR(50) NULL,
    `passport` VARCHAR(50) NULL,
    `phone` VARCHAR(32) NULL,
    `emergency_contact` VARCHAR(100) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `end_user_details_end_user_id_key`(`end_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `end_user_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `end_user_id` INTEGER NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `end_user_images_end_user_id_idx`(`end_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `image_url` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cities_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotel_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `hotel_types_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `email` VARCHAR(150) NULL,
    `address` TEXT NULL,
    `city_id` INTEGER NULL,
    `hotel_type_id` INTEGER NULL,
    `emergency_contact1` VARCHAR(100) NULL,
    `emergency_contact2` VARCHAR(100) NULL,
    `owner_name` VARCHAR(150) NULL,
    `zip_code` VARCHAR(20) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `created_by` INTEGER NOT NULL,
    `approval_status` ENUM('DRAFT', 'PUBLISHED', 'SUSPENDED') NOT NULL DEFAULT 'DRAFT',
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `hotels_slug_key`(`slug`),
    INDEX `hotels_approval_status_idx`(`approval_status`),
    INDEX `hotels_city_id_idx`(`city_id`),
    INDEX `hotels_hotel_type_id_idx`(`hotel_type_id`),
    INDEX `hotels_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotel_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotel_id` INTEGER NOT NULL,
    `description` TEXT NULL,
    `short_description` VARCHAR(500) NULL,
    `reception_no1` VARCHAR(32) NULL,
    `reception_no2` VARCHAR(32) NULL,
    `star_rating` DECIMAL(2, 1) NULL,
    `guest_rating` DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    `website` VARCHAR(255) NULL,
    `check_in_time` VARCHAR(5) NOT NULL DEFAULT '14:00',
    `check_out_time` VARCHAR(5) NOT NULL DEFAULT '12:00',
    `advance_deposit_percent` INTEGER NOT NULL DEFAULT 0,
    `cancellation_policy` ENUM('FLEXIBLE', 'MODERATE', 'STRICT', 'CUSTOM') NOT NULL DEFAULT 'FLEXIBLE',
    `cancellation_hours` INTEGER NULL,
    `refund_percent` INTEGER NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hotel_details_hotel_id_key`(`hotel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotel_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotel_id` INTEGER NOT NULL,
    `image_url` MEDIUMTEXT NOT NULL,
    `is_cover` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hotel_images_hotel_id_idx`(`hotel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotel_admins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL DEFAULT 1,
    `hotel_id` INTEGER NOT NULL,
    `created_by` INTEGER NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_blocked` BOOLEAN NOT NULL DEFAULT false,
    `last_login_at` DATETIME(3) NULL,
    `login_attempts` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `password_reset_token` VARCHAR(255) NULL,
    `password_reset_expires` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `hotel_admins_hotel_id_key`(`hotel_id`),
    UNIQUE INDEX `hotel_admins_email_key`(`email`),
    INDEX `hotel_admins_email_idx`(`email`),
    INDEX `hotel_admins_created_by_idx`(`created_by`),
    INDEX `hotel_admins_role_id_idx`(`role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotel_admin_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotel_admin_id` INTEGER NOT NULL,
    `dob` DATE NULL,
    `phone` VARCHAR(32) NULL,
    `nid_no` VARCHAR(50) NULL,
    `passport` VARCHAR(50) NULL,
    `address` TEXT NULL,
    `manager_name` VARCHAR(150) NULL,
    `manager_phone` VARCHAR(32) NULL,
    `emergency_contact1` VARCHAR(100) NULL,
    `emergency_contact2` VARCHAR(100) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hotel_admin_details_hotel_admin_id_key`(`hotel_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotel_admin_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotel_admin_id` INTEGER NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hotel_admin_images_hotel_admin_id_idx`(`hotel_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotel_sub_admins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL DEFAULT 2,
    `hotel_id` INTEGER NOT NULL,
    `created_by` INTEGER NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_blocked` BOOLEAN NOT NULL DEFAULT false,
    `last_login_at` DATETIME(3) NULL,
    `login_attempts` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `password_reset_token` VARCHAR(255) NULL,
    `password_reset_expires` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `hotel_sub_admins_email_key`(`email`),
    INDEX `hotel_sub_admins_email_idx`(`email`),
    INDEX `hotel_sub_admins_hotel_id_idx`(`hotel_id`),
    INDEX `hotel_sub_admins_created_by_idx`(`created_by`),
    INDEX `hotel_sub_admins_role_id_idx`(`role_id`),
    INDEX `hotel_sub_admins_is_blocked_idx`(`is_blocked`),
    INDEX `hotel_sub_admins_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotel_sub_admin_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotel_sub_admin_id` INTEGER NOT NULL,
    `phone` VARCHAR(32) NULL,
    `nid_no` VARCHAR(50) NULL,
    `passport` VARCHAR(50) NULL,
    `address` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hotel_sub_admin_details_hotel_sub_admin_id_key`(`hotel_sub_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotel_sub_admin_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotel_sub_admin_id` INTEGER NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hotel_sub_admin_images_hotel_sub_admin_id_idx`(`hotel_sub_admin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `amenities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `icon` VARCHAR(100) NULL,
    `context` ENUM('HOTEL', 'ROOM') NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `hotel_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `amenities_hotel_id_idx`(`hotel_id`),
    INDEX `amenities_is_default_idx`(`is_default`),
    INDEX `amenities_context_idx`(`context`),
    UNIQUE INDEX `amenities_name_hotel_id_key`(`name`, `hotel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotel_amenities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotel_id` INTEGER NOT NULL,
    `amenity_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hotel_amenities_hotel_id_idx`(`hotel_id`),
    INDEX `hotel_amenities_amenity_id_idx`(`amenity_id`),
    UNIQUE INDEX `hotel_amenities_hotel_id_amenity_id_key`(`hotel_id`, `amenity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bed_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `hotel_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bed_types_hotel_id_idx`(`hotel_id`),
    UNIQUE INDEX `bed_types_name_hotel_id_key`(`name`, `hotel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotel_id` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `base_price` DECIMAL(12, 2) NOT NULL,
    `room_size` VARCHAR(50) NULL,
    `max_occupancy` INTEGER NOT NULL DEFAULT 2,
    `cancellation_policy` ENUM('FLEXIBLE', 'MODERATE', 'STRICT', 'CUSTOM') NOT NULL DEFAULT 'FLEXIBLE',
    `cancellation_hours` INTEGER NULL,
    `refund_percent` INTEGER NULL,
    `check_in_time` VARCHAR(5) NULL,
    `check_out_time` VARCHAR(5) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `room_types_hotel_id_idx`(`hotel_id`),
    INDEX `room_types_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_bed_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_type_id` INTEGER NOT NULL,
    `bed_type_id` INTEGER NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,

    INDEX `room_bed_types_room_type_id_idx`(`room_type_id`),
    UNIQUE INDEX `room_bed_types_room_type_id_bed_type_id_key`(`room_type_id`, `bed_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_properties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_type_id` INTEGER NOT NULL,
    `amenity_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_properties_room_type_id_idx`(`room_type_id`),
    UNIQUE INDEX `room_properties_room_type_id_amenity_id_key`(`room_type_id`, `amenity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_type_id` INTEGER NOT NULL,
    `room_number` VARCHAR(50) NOT NULL,
    `floor` INTEGER NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `room_size` VARCHAR(50) NULL,
    `ac` BOOLEAN NOT NULL DEFAULT false,
    `smoking_allowed` BOOLEAN NOT NULL DEFAULT false,
    `pet_allowed` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `room_details_room_type_id_idx`(`room_type_id`),
    INDEX `room_details_status_idx`(`status`),
    INDEX `room_details_ac_idx`(`ac`),
    INDEX `room_details_smoking_allowed_idx`(`smoking_allowed`),
    INDEX `room_details_pet_allowed_idx`(`pet_allowed`),
    UNIQUE INDEX `room_details_room_type_id_room_number_key`(`room_type_id`, `room_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `image_url` LONGTEXT NOT NULL,
    `is_cover` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `room_type_id` INTEGER NULL,
    `room_detail_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_images_room_type_id_idx`(`room_type_id`),
    INDEX `room_images_room_detail_id_idx`(`room_detail_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pricing_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_type_id` INTEGER NOT NULL,
    `name` VARCHAR(150) NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pricing_rules_room_type_id_idx`(`room_type_id`),
    INDEX `pricing_rules_start_date_end_date_idx`(`start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_reference` VARCHAR(64) NOT NULL,
    `end_user_id` INTEGER NOT NULL,
    `hotel_id` INTEGER NOT NULL,
    `check_in` DATE NOT NULL,
    `check_out` DATE NOT NULL,
    `guests` INTEGER NOT NULL DEFAULT 1,
    `rooms_count` INTEGER NOT NULL DEFAULT 1,
    `special_request` TEXT NULL,
    `status` ENUM('RESERVED', 'BOOKED', 'EXPIRED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW') NOT NULL DEFAULT 'RESERVED',
    `reserved_until` DATETIME(3) NULL,
    `total_price` DECIMAL(12, 2) NOT NULL,
    `advance_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `payment_method` VARCHAR(50) NULL,
    `transaction_id` VARCHAR(191) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_bookings_booking_reference_key`(`booking_reference`),
    INDEX `user_bookings_booking_reference_idx`(`booking_reference`),
    INDEX `user_bookings_end_user_id_status_idx`(`end_user_id`, `status`),
    INDEX `user_bookings_hotel_id_check_in_check_out_idx`(`hotel_id`, `check_in`, `check_out`),
    INDEX `user_bookings_reserved_until_idx`(`reserved_until`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `room_type_id` INTEGER NOT NULL,
    `room_detail_id` INTEGER NOT NULL,
    `price_per_night` DECIMAL(12, 2) NOT NULL,
    `nights` INTEGER NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_bookings_booking_id_idx`(`booking_id`),
    INDEX `room_bookings_room_type_id_idx`(`room_type_id`),
    INDEX `room_bookings_room_detail_id_idx`(`room_detail_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_trackers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `room_detail_id` INTEGER NOT NULL,
    `check_in` DATE NOT NULL,
    `check_out` DATE NOT NULL,
    `status` ENUM('RESERVED', 'BOOKED', 'EXPIRED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT') NOT NULL DEFAULT 'RESERVED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `room_trackers_room_detail_id_check_in_check_out_idx`(`room_detail_id`, `check_in`, `check_out`),
    INDEX `room_trackers_booking_id_idx`(`booking_id`),
    INDEX `room_trackers_status_idx`(`status`),
    INDEX `room_trackers_check_in_idx`(`check_in`),
    UNIQUE INDEX `room_trackers_room_detail_id_check_in_check_out_key`(`room_detail_id`, `check_in`, `check_out`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blacklisted_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token_hash` VARCHAR(500) NOT NULL,
    `actor_id` INTEGER NOT NULL,
    `actor_type` ENUM('SYSTEM_ADMIN', 'HOTEL_ADMIN', 'HOTEL_SUB_ADMIN', 'END_USER') NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `blacklisted_tokens_token_hash_key`(`token_hash`),
    INDEX `blacklisted_tokens_token_hash_idx`(`token_hash`),
    INDEX `blacklisted_tokens_expires_at_idx`(`expires_at`),
    INDEX `blacklisted_tokens_actor_id_actor_type_idx`(`actor_id`, `actor_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `system_admins` ADD CONSTRAINT `system_admins_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `system_admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_admin_details` ADD CONSTRAINT `system_admin_details_system_admin_id_fkey` FOREIGN KEY (`system_admin_id`) REFERENCES `system_admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_admin_images` ADD CONSTRAINT `system_admin_images_system_admin_id_fkey` FOREIGN KEY (`system_admin_id`) REFERENCES `system_admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `end_user_details` ADD CONSTRAINT `end_user_details_end_user_id_fkey` FOREIGN KEY (`end_user_id`) REFERENCES `end_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `end_user_images` ADD CONSTRAINT `end_user_images_end_user_id_fkey` FOREIGN KEY (`end_user_id`) REFERENCES `end_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotels` ADD CONSTRAINT `hotels_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotels` ADD CONSTRAINT `hotels_hotel_type_id_fkey` FOREIGN KEY (`hotel_type_id`) REFERENCES `hotel_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotels` ADD CONSTRAINT `hotels_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `system_admins`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_details` ADD CONSTRAINT `hotel_details_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_images` ADD CONSTRAINT `hotel_images_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_admins` ADD CONSTRAINT `hotel_admins_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_admins` ADD CONSTRAINT `hotel_admins_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_admins` ADD CONSTRAINT `hotel_admins_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `system_admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_admin_details` ADD CONSTRAINT `hotel_admin_details_hotel_admin_id_fkey` FOREIGN KEY (`hotel_admin_id`) REFERENCES `hotel_admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_admin_images` ADD CONSTRAINT `hotel_admin_images_hotel_admin_id_fkey` FOREIGN KEY (`hotel_admin_id`) REFERENCES `hotel_admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_sub_admins` ADD CONSTRAINT `hotel_sub_admins_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_sub_admins` ADD CONSTRAINT `hotel_sub_admins_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_sub_admins` ADD CONSTRAINT `hotel_sub_admins_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `hotel_admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_sub_admin_details` ADD CONSTRAINT `hotel_sub_admin_details_hotel_sub_admin_id_fkey` FOREIGN KEY (`hotel_sub_admin_id`) REFERENCES `hotel_sub_admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_sub_admin_images` ADD CONSTRAINT `hotel_sub_admin_images_hotel_sub_admin_id_fkey` FOREIGN KEY (`hotel_sub_admin_id`) REFERENCES `hotel_sub_admins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `amenities` ADD CONSTRAINT `amenities_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_amenities` ADD CONSTRAINT `hotel_amenities_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_amenities` ADD CONSTRAINT `hotel_amenities_amenity_id_fkey` FOREIGN KEY (`amenity_id`) REFERENCES `amenities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bed_types` ADD CONSTRAINT `bed_types_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_types` ADD CONSTRAINT `room_types_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_bed_types` ADD CONSTRAINT `room_bed_types_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_bed_types` ADD CONSTRAINT `room_bed_types_bed_type_id_fkey` FOREIGN KEY (`bed_type_id`) REFERENCES `bed_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_properties` ADD CONSTRAINT `room_properties_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_properties` ADD CONSTRAINT `room_properties_amenity_id_fkey` FOREIGN KEY (`amenity_id`) REFERENCES `amenities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_details` ADD CONSTRAINT `room_details_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_images` ADD CONSTRAINT `room_images_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_images` ADD CONSTRAINT `room_images_room_detail_id_fkey` FOREIGN KEY (`room_detail_id`) REFERENCES `room_details`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pricing_rules` ADD CONSTRAINT `pricing_rules_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_bookings` ADD CONSTRAINT `user_bookings_end_user_id_fkey` FOREIGN KEY (`end_user_id`) REFERENCES `end_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_bookings` ADD CONSTRAINT `user_bookings_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_bookings` ADD CONSTRAINT `room_bookings_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `user_bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_bookings` ADD CONSTRAINT `room_bookings_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_bookings` ADD CONSTRAINT `room_bookings_room_detail_id_fkey` FOREIGN KEY (`room_detail_id`) REFERENCES `room_details`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_trackers` ADD CONSTRAINT `room_trackers_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `user_bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_trackers` ADD CONSTRAINT `room_trackers_room_detail_id_fkey` FOREIGN KEY (`room_detail_id`) REFERENCES `room_details`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
