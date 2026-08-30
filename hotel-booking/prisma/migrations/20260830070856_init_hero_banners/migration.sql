-- CreateTable
CREATE TABLE `hero_banners` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slot` INTEGER NOT NULL,
    `image_url` VARCHAR(500) NULL,
    `eyebrow` VARCHAR(100) NULL,
    `title` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hero_banners_slot_key`(`slot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
