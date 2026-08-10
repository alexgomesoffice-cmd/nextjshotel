/*
  Warnings:

  - The values [ROOM_TYPE,ROOM_TYPE_IMAGE,ROOM_FACILITY,ROOM_DETAIL] on the enum `case_field_changes_entity_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `case_field_changes` MODIFY `entity_type` ENUM('HOTEL', 'HOTEL_OWNER', 'HOTEL_ADMIN', 'HOTEL_IMAGE', 'HOTEL_DOCUMENT', 'AMENITY', 'POLICY') NOT NULL;
