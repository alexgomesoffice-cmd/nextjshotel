-- AddForeignKey
ALTER TABLE `room_trackers` ADD CONSTRAINT `room_trackers_room_detail_id_fkey` FOREIGN KEY (`room_detail_id`) REFERENCES `room_details`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
