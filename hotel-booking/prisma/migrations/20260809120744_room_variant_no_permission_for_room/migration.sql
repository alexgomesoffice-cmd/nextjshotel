/*
  Warnings:

  - You are about to drop the column `room_detail_id` on the `pricing_rules` table. All the data in the column will be lost.
  - You are about to drop the column `max_occupancy` on the `room_details` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `room_details` table. All the data in the column will be lost.
  - You are about to drop the column `room_size` on the `room_details` table. All the data in the column will be lost.
  - You are about to drop the column `room_type_id` on the `room_details` table. All the data in the column will be lost.
  - You are about to drop the `room_detail_bed_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_detail_facilities` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[room_variant_id,room_number,deleted_at]` on the table `room_details` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `room_variant_id` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `room_variant_id` to the `room_bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `room_variant_id` to the `room_details` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `pricing_rules` DROP FOREIGN KEY `pricing_rules_room_detail_id_fkey`;

-- DropForeignKey
ALTER TABLE `room_detail_bed_types` DROP FOREIGN KEY `room_detail_bed_types_bed_type_id_fkey`;

-- DropForeignKey
ALTER TABLE `room_detail_bed_types` DROP FOREIGN KEY `room_detail_bed_types_room_detail_id_fkey`;

-- DropForeignKey
ALTER TABLE `room_detail_facilities` DROP FOREIGN KEY `room_detail_facilities_facility_id_fkey`;

-- DropForeignKey
ALTER TABLE `room_detail_facilities` DROP FOREIGN KEY `room_detail_facilities_room_detail_id_fkey`;

-- DropForeignKey
ALTER TABLE `room_details` DROP FOREIGN KEY `room_details_room_type_id_fkey`;

-- DropIndex
DROP INDEX `pricing_rules_room_detail_id_idx` ON `pricing_rules`;

-- DropIndex
DROP INDEX `room_details_room_type_id_idx` ON `room_details`;

-- DropIndex
DROP INDEX `room_details_room_type_id_room_number_deleted_at_key` ON `room_details`;

-- AlterTable
ALTER TABLE `pricing_rules` DROP COLUMN `room_detail_id`,
    ADD COLUMN `room_variant_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `room_bookings` ADD COLUMN `room_variant_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `room_details` DROP COLUMN `max_occupancy`,
    DROP COLUMN `price`,
    DROP COLUMN `room_size`,
    DROP COLUMN `room_type_id`,
    ADD COLUMN `room_variant_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `room_images` ADD COLUMN `room_variant_id` INTEGER NULL;

-- DropTable
DROP TABLE `room_detail_bed_types`;

-- DropTable
DROP TABLE `room_detail_facilities`;

-- CreateTable
CREATE TABLE `room_variants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_type_id` INTEGER NOT NULL,
    `signature_hash` VARCHAR(64) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `room_size` VARCHAR(50) NULL,
    `max_occupancy` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `room_variants_room_type_id_idx`(`room_type_id`),
    UNIQUE INDEX `room_variants_room_type_id_signature_hash_key`(`room_type_id`, `signature_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_variant_facilities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_variant_id` INTEGER NOT NULL,
    `facility_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_variant_facilities_room_variant_id_idx`(`room_variant_id`),
    UNIQUE INDEX `room_variant_facilities_room_variant_id_facility_id_key`(`room_variant_id`, `facility_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_variant_bed_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_variant_id` INTEGER NOT NULL,
    `bed_type_id` INTEGER NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_variant_bed_types_room_variant_id_idx`(`room_variant_id`),
    UNIQUE INDEX `room_variant_bed_types_room_variant_id_bed_type_id_key`(`room_variant_id`, `bed_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `pricing_rules_room_variant_id_idx` ON `pricing_rules`(`room_variant_id`);

-- CreateIndex
CREATE INDEX `room_bookings_room_variant_id_idx` ON `room_bookings`(`room_variant_id`);

-- CreateIndex
CREATE INDEX `room_details_room_variant_id_idx` ON `room_details`(`room_variant_id`);

-- CreateIndex
CREATE UNIQUE INDEX `room_details_room_variant_id_room_number_deleted_at_key` ON `room_details`(`room_variant_id`, `room_number`, `deleted_at`);

-- CreateIndex
CREATE INDEX `room_images_room_variant_id_idx` ON `room_images`(`room_variant_id`);

-- AddForeignKey
ALTER TABLE `room_variants` ADD CONSTRAINT `room_variants_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_variant_facilities` ADD CONSTRAINT `room_variant_facilities_room_variant_id_fkey` FOREIGN KEY (`room_variant_id`) REFERENCES `room_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_variant_facilities` ADD CONSTRAINT `room_variant_facilities_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `room_facilities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_variant_bed_types` ADD CONSTRAINT `room_variant_bed_types_room_variant_id_fkey` FOREIGN KEY (`room_variant_id`) REFERENCES `room_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_variant_bed_types` ADD CONSTRAINT `room_variant_bed_types_bed_type_id_fkey` FOREIGN KEY (`bed_type_id`) REFERENCES `bed_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_details` ADD CONSTRAINT `room_details_room_variant_id_fkey` FOREIGN KEY (`room_variant_id`) REFERENCES `room_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_images` ADD CONSTRAINT `room_images_room_variant_id_fkey` FOREIGN KEY (`room_variant_id`) REFERENCES `room_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pricing_rules` ADD CONSTRAINT `pricing_rules_room_variant_id_fkey` FOREIGN KEY (`room_variant_id`) REFERENCES `room_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_bookings` ADD CONSTRAINT `room_bookings_room_variant_id_fkey` FOREIGN KEY (`room_variant_id`) REFERENCES `room_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
