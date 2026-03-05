import {mysqlTable, int, varchar, datetime, text, date, decimal} from 'drizzle-orm/mysql-core';

export const users = mysqlTable('Users', {
    user_id: int().primaryKey().autoincrement(),
    user_name: varchar({length: 32}).notNull(),
    user_password: varchar({length: 64}).notNull(),
    user_email: varchar({length: 64}).notNull(),
});

export const costumes = mysqlTable('Costumes', {
    costume_id: int().primaryKey().autoincrement(),
    cos_user_id: int().notNull(),
    costume_name: varchar({length: 32}).notNull(),
    costume_created_at: datetime().default(new Date()),
    costume_progress: int().default(0),
    costume_description: varchar({length: 32}), //256 maybe?
    costume_waist_length: int(),
    costume_head_circumference: int(),
    costume_hip_length: int(),
    costume_shoulder_length: int(),
    costume_arm_length: int(),
    costume_torso_length: int(),
    costume_legs_length: int(),
    costume_neck_length: int(),
    costume_inner_seam_size: int(),
    costume_shoe_size: int(),
});

export const items = mysqlTable