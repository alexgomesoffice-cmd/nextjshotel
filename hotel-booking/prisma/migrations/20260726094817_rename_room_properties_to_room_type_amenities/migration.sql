/*
  Warnings:

  - You are about to drop the `room_properties` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `room_properties` DROP FOREIGN KEY `room_properties_amenity_id_fkey`;

-- DropForeignKey
ALTER TABLE `room_properties` DROP FOREIGN KEY `room_properties_room_type_id_fkey`;

-- DropTable
DROP TABLE `room_properties`;

-- CreateTable
CREATE TABLE `room_type_amenities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_type_id` INTEGER NOT NULL,
    `amenity_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_type_amenities_room_type_id_idx`(`room_type_id`),
    UNIQUE INDEX `room_type_amenities_room_type_id_amenity_id_key`(`room_type_id`, `amenity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `room_type_amenities` ADD CONSTRAINT `room_type_amenities_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_type_amenities` ADD CONSTRAINT `room_type_amenities_amenity_id_fkey` FOREIGN KEY (`amenity_id`) REFERENCES `amenities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
