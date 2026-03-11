-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `costume` (
	`costume_id` int NOT NULL,
	`cos_user_id` int NOT NULL,
	`costume_name` varchar(32),
	`costume_created_at` datetime,
	`costume_progress` int,
	`costume_description` varchar(32),
	`costume_waist_length` int,
	`costume_head_circumference` int,
	`costume_hip_length` int,
	`costume_shoulder_length` int,
	`costume_arm_length` int,
	`costume_torso_length` int,
	`costume_legs_length` int,
	`costume_neck_length` int,
	`costume_inner_seam_size` int,
	`costume_shoe_size` int,
	CONSTRAINT `costume_costume_id` PRIMARY KEY(`costume_id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`inventory_id` int NOT NULL,
	`inventory_quantity` int,
	`inventory_location` varchar(100),
	`inventory_update` timestamp,
	CONSTRAINT `inventory_inventory_id` PRIMARY KEY(`inventory_id`)
);
--> statement-breakpoint
CREATE TABLE `item` (
	`item_id` int NOT NULL,
	`item_name` varchar(32),
	`item_total_cost` decimal(15,2),
	`item_status` varchar(32),
	`item_fasteners` varchar(32),
	`item_trims` varchar(32),
	`item_tools` varchar(32),
	`item_foam` varchar(32),
	`item_filament` varchar(32),
	`item_cloths` varchar(32),
	`project_key` int,
	CONSTRAINT `item_item_id` PRIMARY KEY(`item_id`)
);
--> statement-breakpoint
CREATE TABLE `material` (
	`material_id` int NOT NULL,
	`material_name` varchar(32),
	`material_type` varchar(32),
	`material_size` int,
	`material_color` varchar(32),
	`material_price` decimal(15,2),
	`material_key` int,
	CONSTRAINT `material_material_id` PRIMARY KEY(`material_id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`user_id` int NOT NULL,
	`user_name` varchar(32) NOT NULL,
	`user_password` varchar(64) NOT NULL,
	`user_email` varchar(64) NOT NULL,
	CONSTRAINT `user_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `costume` ADD CONSTRAINT `fk_costume_user` FOREIGN KEY (`cos_user_id`) REFERENCES `user`(`user_id`) ON DELETE cascade ON UPDATE no action;
*/