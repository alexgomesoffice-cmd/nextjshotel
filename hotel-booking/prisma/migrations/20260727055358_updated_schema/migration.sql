/*
  Warnings:

  - You are about to drop the column `hotel_id` on the `amenities` table. All the data in the column will be lost.
  - You are about to drop the column `is_default` on the `amenities` table. All the data in the column will be lost.
  - The values [ROOM_TYPE] on the enum `master_data_requests_category` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `hotel_id` on the `room_facilities` table. All the data in the column will be lost.
  - You are about to drop the column `is_default` on the `room_facilities` table. All the data in the column will be lost.
  - You are about to drop the column `is_default` on the `room_types` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,context]` on the table `amenities` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `room_facilities` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hotel_id,name]` on the table `room_types` will be added. If there are existing duplicate values, this will fail.
  - Made the column `hotel_id` on table `room_types` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `amenities` DROP FOREIGN KEY `amenities_hotel_id_fkey`;

-- DropForeignKey
ALTER TABLE `room_facilities` DROP FOREIGN KEY `room_facilities_hotel_id_fkey`;

-- DropForeignKey
ALTER TABLE `room_types` DROP FOREIGN KEY `room_types_hotel_id_fkey`;

-- DropIndex
DROP INDEX `amenities_hotel_id_idx` ON `amenities`;

-- DropIndex
DROP INDEX `amenities_is_default_idx` ON `amenities`;

-- DropIndex
DROP INDEX `amenities_name_hotel_id_key` ON `amenities`;

-- DropIndex
DROP INDEX `room_facilities_hotel_id_idx` ON `room_facilities`;

-- DropIndex
DROP INDEX `room_facilities_name_hotel_id_key` ON `room_facilities`;

-- DropIndex
DROP INDEX `room_types_is_default_idx` ON `room_types`;

-- AlterTable
ALTER TABLE `amenities` DROP COLUMN `hotel_id`,
    DROP COLUMN `is_default`;

-- AlterTable
ALTER TABLE `master_data_requests` MODIFY `category` ENUM('AMENITY', 'BED_TYPE', 'ROOM_FACILITY') NOT NULL;

-- AlterTable
ALTER TABLE `room_facilities` DROP COLUMN `hotel_id`,
    DROP COLUMN `is_default`;

-- AlterTable
ALTER TABLE `room_types` DROP COLUMN `is_default`,
    MODIFY `hotel_id` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `amenities_name_context_key` ON `amenities`(`name`, `context`);

-- CreateIndex
CREATE UNIQUE INDEX `room_facilities_name_key` ON `room_facilities`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `room_types_hotel_id_name_key` ON `room_types`(`hotel_id`, `name`);

-- AddForeignKey
ALTER TABLE `room_types` ADD CONSTRAINT `room_types_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
