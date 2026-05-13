import { mysqlTable, primaryKey, int, varchar, datetime, timestamp, decimal, text, json } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const costume = mysqlTable("costume", {
    costume_id: int("costume_id").autoincrement().primaryKey().notNull(),
    cos_user_id: int("cos_user_id").notNull().references(() => user.user_id, { onDelete: "cascade" } ),
    costume_name: varchar("costume_name", { length: 32 }),
    costume_created_at: datetime("costume_created_at", { mode: 'string'}),
    costume_progress: int("costume_progress"),
    costume_description: varchar("costume_description", { length: 32 }),
    measurements_completed: int ("measurements_completed").notNull().default(0), //setup page
    costume_waist_length: int("costume_waist_length"),
    costume_head_circumference: int("costume_head_circumference"),
    costume_hip_length: int("costume_hip_length"),
    costume_shoulder_length: int("costume_shoulder_length"),
    costume_arm_length: int("costume_arm_length"),
    costume_torso_length: int("costume_torso_length"),
    costume_legs_length: int("costume_legs_length"),
    costume_neck_length: int("costume_neck_length"),
    costume_inner_seam_size: int("costume_inner_seam_size"),
    costume_shoe_size: int("costume_shoe_size"),
},
(table) => [
    primaryKey({ columns: [table.costume_id], name: "costume_costume_id"}),
]);

export const inventory = mysqlTable("inventory", {
    inventory_id: int("inventory_id").autoincrement().primaryKey().notNull(),
    inventory_quantity: int("inventory_quantity").notNull(),
    inventory_quantity_item: varchar("inventory_quantity_item", { length: 32 }).notNull(),
    inventory_location: varchar("inventory_location", { length: 100 }),
    inventory_update: timestamp("inventory_update", { mode: 'string' }),
    inventory_total_cost: decimal("inventory_total_cost", { precision: 15, scale: 2 }).notNull(),
    inventory_status: varchar("inventory_status", { length: 32 }).notNull().default("need_to_buy"),
    inv_key: int().notNull().references(() => costume.costume_id, { onDelete: "cascade" }),
    item_key: int().notNull().references(() => item.item_id, { onDelete: "cascade" }),
},
(table) => [
    primaryKey({ columns: [table.inventory_id], name: "inventory_inventory_id"}),
]);

export const item = mysqlTable("item", {
    item_id: int("item_id").autoincrement().primaryKey().notNull(),
    item_name: varchar("item_name", { length: 100 }).notNull(),
    item_size: int("item_size"),
    item_color: varchar("item_color", { length: 32 }),
    item_category: varchar("item_category", { length: 32 }).notNull().default("other"),
    project_key: int("project_key").notNull().references(() => costume.costume_id, { onDelete: "cascade" } ),
},
(table) => [
    primaryKey({ columns: [table.item_id], name: "item_item_id"}),
]);

export const checklist = mysqlTable("checklist", {
    checklist_id: int("checklist_id").autoincrement().primaryKey().notNull(),
    checklist_title: varchar("checklist_title", { length: 200 }).notNull(),
    checklist_notes: varchar("checklist_notes", { length: 1000 }),
    checklist_completed: int("checklist_completed").notNull().default(0),
    checklist_created_at: datetime("checklist_created_at", { mode: 'string' }).notNull(),
    checklist_due_date: datetime("checklist_due_date", { mode: 'string' }),
    checklist_urgency: varchar("checklist_urgency", { length: 16 }).notNull().default("none"),
    checklist_category: varchar("checklist_category", { length: 64 }),
    checklist_flagged: int("checklist_flagged").notNull().default(0),
    checklist_auto_source: varchar("checklist_auto_source", { length: 32 }),
    checklist_source_id: int("checklist_source_id"),
    check_key: int("check_key").notNull().references(() => costume.costume_id, { onDelete: "cascade" }),
    user_id: int("user_id").notNull().references(() => user.user_id, { onDelete: "cascade" }),  //testing purpses
},
(table) => [
    primaryKey({ columns: [table.checklist_id], name: "checklist_checklist_id"}),
]);

export const user = mysqlTable("user", {
    user_id: int("user_id").notNull().autoincrement(),
    user_name: varchar("user_name", { length: 32 }).notNull(),
    user_password: varchar("user_password", { length: 64 }).notNull(),
    user_email: varchar("user_email", { length: 64 }).notNull(),
    bio: varchar("bio", { length: 200 }),
    profile_picture: text("profile_picture"),
},
(table) => [
    primaryKey({ columns: [table.user_id], name: "user_user_id"}),
]);

export const fabricLayouts = mysqlTable("FabricLayouts", {
    layout_id:         int("layout_id").primaryKey().autoincrement(),
    layout_costume_id: int("layout_costume_id").notNull(),
    layout_name:       varchar("layout_name", { length: 64 }).notNull().default("Untitled Layout"),
    fabric_width_cm:   decimal("fabric_width_cm", { precision: 8, scale: 2 }).notNull().default("150.00"),
    fabric_length_cm:  decimal("fabric_length_cm", { precision: 8, scale: 2 }).notNull().default("300.00"),
    fabric_grain:      varchar("fabric_grain", { length: 16 }).notNull().default("grainline"),
    layout_json:       json("layout_json"),
    created_at:        datetime("created_at"),
    updated_at:        datetime("updated_at"),
});

export const patternBlocks = mysqlTable("PatternBlocks", {
    block_id:          int("block_id").primaryKey().autoincrement(),
    block_layout_id:   int("block_layout_id").notNull(),
    block_name:        varchar("block_name", { length: 64 }).notNull(),
    block_vertices:    json("block_vertices").notNull(),
    block_width_cm:    decimal("block_width_cm", { precision: 8, scale: 2 }).notNull(),
    block_height_cm:   decimal("block_height_cm", { precision: 8, scale: 2 }).notNull(),
    pos_x_cm:          decimal("pos_x_cm", { precision: 8, scale: 2 }).notNull().default("0.00"),
    pos_y_cm:          decimal("pos_y_cm", { precision: 8, scale: 2 }).notNull().default("0.00"),
    rotation_deg:      decimal("rotation_deg", { precision: 6, scale: 2 }).notNull().default("0.00"),
    grain_alignment:   varchar("grain_alignment", { length: 16 }).notNull().default("grainline"),
    measurements:      json("measurements"),
    created_at:        datetime("created_at"),
    updated_at:        datetime("updated_at"),
});

// export const checklist = mysqlTable("checklist", {
//     checklist_id: int("checklist_id").autoincrement().primaryKey().notNull(),
//     checklist_title: varchar("checklist_title", { length: 200 }).notNull(),
//     checklist_notes: varchar("checklist_notes", { length: 1000 }),
//     checklist_completed: int("checklist_completed").notNull().default(0),
//     checklist_created_at: datetime("checklist_created_at", { mode: 'string' }).notNull(),
//     checklist_due_date: datetime("checklist_due_date", { mode: 'string' }),
//     checklist_urgency: varchar("checklist_urgency", { length: 16 }).notNull().default("none"),
//     checklist_category: varchar("checklist_category", { length: 64 }),
//     checklist_flagged: int("checklist_flagged").notNull().default(0),
//     checklist_auto_source: varchar("checklist_auto_source", { length: 32 }),
//     checklist_source_id: int("checklist_source_id"),
//     cos_key: int("cos_key").notNull().references(() => costume.costume_id, { onDelete: "cascade" }),
// },
// (table) => [
//     primaryKey({ columns: [table.checklist_id], name: "checklist_checklist_id"}),
// ]);
