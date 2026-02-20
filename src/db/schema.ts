import {
    sqliteTable,
    text,
    integer,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    telegramId: integer('telegram_id', { mode: 'number' }).unique(),
    googleId: text('google_id').unique(),
    email: text('email'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name'),
    username: text('username'),
    photoUrl: text('photo_url'),
    additionalFields: text('additional_fields', { mode: 'json' }).default('{}').$type<Record<string, unknown>>(),
    createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
        .references(() => users.id, { onDelete: 'cascade' })
        .notNull(),
    token: text('token').unique().notNull(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
