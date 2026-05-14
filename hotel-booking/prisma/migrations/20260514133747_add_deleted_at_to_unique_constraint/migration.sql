-- DropIndex
DROP INDEX `room_details_room_type_id_room_number_key` ON `room_details`;

-- AddUnique (with deleted_at included)
ALTER TABLE `room_details` ADD UNIQUE KEY `room_details_room_type_id_room_number_deleted_at_key`(`room_type_id`, `room_number`, `deleted_at`);
