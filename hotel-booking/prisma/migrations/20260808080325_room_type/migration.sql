/*
  Warnings:

  - Added the required column `name` to the `master_data_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `master_data_requests` ADD COLUMN `context` ENUM('HOTEL', 'ROOM') NULL,
    ADD COLUMN `name` VARCHAR(150) NOT NULL;
