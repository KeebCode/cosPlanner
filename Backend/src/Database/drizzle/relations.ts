import { relations } from "drizzle-orm/relations";
import { user, costume } from "./schema";

export const costumeRelations = relations(costume, ({one}) => ({
	user: one(user, {
		fields: [costume.cosUserId],
		references: [user.userId]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	costumes: many(costume),
}));