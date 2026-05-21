/*
  Warnings:

  - A unique constraint covering the columns `[room_detail_id,check_in,check_out,status]` on the table `room_trackers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `room_trackers` DROP FOREIGN KEY `room_trackers_room_detail_id_fkey`;

-- DropIndex
DROP INDEX `room_trackers_room_detail_id_check_in_check_out_key` ON `room_trackers`;

-- CreateIndex
CREATE UNIQUE INDEX `room_trackers_room_detail_id_check_in_check_out_status_key` ON `room_trackers`(`room_detail_id`, `check_in`, `check_out`, `status`);
