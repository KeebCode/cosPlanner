import { mysqlTable, mysqlSchema, AnyMySqlColumn, foreignKey, primaryKey, int, varchar, datetime, timestamp, decimal } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const costume = mysqlTable("costume", {
	costumeId: int("costume_id").notNull(),
	cosUserId: int("cos_user_id").notNull().references(() => user.userId, { onDelete: "cascade" } ),
	costumeName: varchar("costume_name", { length: 32 }),
	costumeCreatedAt: datetime("costume_created_at", { mode: 'string'}),
	costumeProgress: int("costume_progress"),
	costumeDescription: varchar("costume_description", { length: 32 }),
	costumeWaistLength: int("costume_waist_length"),
	costumeHeadCircumference: int("costume_head_circumference"),
	costumeHipLength: int("costume_hip_length"),
	costumeShoulderLength: int("costume_shoulder_length"),
	costumeArmLength: int("costume_arm_length"),
	costumeTorsoLength: int("costume_torso_length"),
	costumeLegsLength: int("costume_legs_length"),
	costumeNeckLength: int("costume_neck_length"),
	costumeInnerSeamSize: int("costume_inner_seam_size"),
	costumeShoeSize: int("costume_shoe_size"),
},
(table) => [
	primaryKey({ columns: [table.costumeId], name: "costume_costume_id"}),
]);

export const inventory = mysqlTable("inventory", {
	inventoryId: int("inventory_id").notNull(),
	inventoryQuantity: int("inventory_quantity"),
	inventoryLocation: varchar("inventory_location", { length: 100 }),
	inventoryUpdate: timestamp("inventory_update", { mode: 'string' }),
},
(table) => [
	primaryKey({ columns: [table.inventoryId], name: "inventory_inventory_id"}),
]);

export const item = mysqlTable("item", {
	itemId: int("item_id").notNull(),
	itemName: varchar("item_name", { length: 32 }),
	itemTotalCost: decimal("item_total_cost", { precision: 15, scale: 2 }),
	itemStatus: varchar("item_status", { length: 32 }),
	itemFasteners: varchar("item_fasteners", { length: 32 }),
	itemTrims: varchar("item_trims", { length: 32 }),
	itemTools: varchar("item_tools", { length: 32 }),
	itemFoam: varchar("item_foam", { length: 32 }),
	itemFilament: varchar("item_filament", { length: 32 }),
	itemCloths: varchar("item_cloths", { length: 32 }),
	projectKey: int("project_key"),
},
(table) => [
	primaryKey({ columns: [table.itemId], name: "item_item_id"}),
]);

export const material = mysqlTable("material", {
	materialId: int("material_id").notNull(),
	materialName: varchar("material_name", { length: 32 }),
	materialType: varchar("material_type", { length: 32 }),
	materialSize: int("material_size"),
	materialColor: varchar("material_color", { length: 32 }),
	materialPrice: decimal("material_price", { precision: 15, scale: 2 }),
	materialKey: int("material_key"),
},
(table) => [
	primaryKey({ columns: [table.materialId], name: "material_material_id"}),
]);

export const user = mysqlTable("user", {
	userId: int("user_id").notNull(),
	userName: varchar("user_name", { length: 32 }).notNull(),
	userPassword: varchar("user_password", { length: 64 }).notNull(),
	userEmail: varchar("user_email", { length: 64 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.userId], name: "user_user_id"}),
]);
