/*
  Warnings:

  - You are about to drop the column `discounted_price` on the `pricing_rules` table. All the data in the column will be lost.
  - Added the required column `discount_type` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount_value` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `pricing_rules` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `pricing_rules` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `pricing_rules` DROP COLUMN `discounted_price`,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `discount_type` ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL,
    ADD COLUMN `discount_value` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `priority` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `status` ENUM('ACTIVE', 'PAUSED') NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL,
    MODIFY `name` VARCHAR(150) NOT NULL;

-- CreateTable
CREATE TABLE `room_booking_nightly_rates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_booking_id` INTEGER NOT NULL,
    `stay_date` DATE NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `pricing_rule_id` INTEGER NULL,
    `pricing_rule_name` VARCHAR(150) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_booking_nightly_rates_room_booking_id_idx`(`room_booking_id`),
    UNIQUE INDEX `room_booking_nightly_rates_room_booking_id_stay_date_key`(`room_booking_id`, `stay_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `pricing_rules_status_idx` ON `pricing_rules`(`status`);

-- AddForeignKey
ALTER TABLE `room_booking_nightly_rates` ADD CONSTRAINT `room_booking_nightly_rates_room_booking_id_fkey` FOREIGN KEY (`room_booking_id`) REFERENCES `room_bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
