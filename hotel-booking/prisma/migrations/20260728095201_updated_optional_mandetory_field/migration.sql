/*
  Warnings:

  - Made the column `address` on table `hotel_owner_details` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `hotel_owner_details` MODIFY `dob` DATE NULL,
    MODIFY `nid_no` VARCHAR(50) NULL,
    MODIFY `email` VARCHAR(150) NULL,
    MODIFY `address` TEXT NOT NULL;
