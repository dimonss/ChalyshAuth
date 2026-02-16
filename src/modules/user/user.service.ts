import { eq } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { users, type User } from '../../db/schema.js';

/**
 * Get user profile by ID.
 */
export async function getProfile(userId: string): Promise<User | null> {
    const db = getDb();
    const user = db.select().from(users).where(eq(users.id, userId)).limit(1).get();
    return user ?? null;
}

/**
 * Get only the additionalFields for a user.
 */
export async function getAdditionalFields(
    userId: string,
): Promise<Record<string, unknown> | null> {
    const db = getDb();
    const user = db
        .select({ additionalFields: users.additionalFields })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .get();

    if (!user) return null;
    return (user.additionalFields as Record<string, unknown>) ?? {};
}

/**
 * Merge new fields into existing additionalFields.
 * Since SQLite stores JSON as text, we read → merge in JS → write back.
 */
export async function updateAdditionalFields(
    userId: string,
    fields: Record<string, unknown>,
): Promise<Record<string, unknown>> {
    const db = getDb();

    // 1. Read current fields
    const current = db
        .select({ additionalFields: users.additionalFields })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .get();

    if (!current) throw new Error('User not found');

    const existing = (current.additionalFields as Record<string, unknown>) ?? {};
    const merged = { ...existing, ...fields };

    // 2. Write merged result
    const updated = db
        .update(users)
        .set({
            additionalFields: merged,
            updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, userId))
        .returning({ additionalFields: users.additionalFields })
        .get();

    if (!updated) throw new Error('User not found');
    return (updated.additionalFields as Record<string, unknown>) ?? {};
}

/**
 * Delete a specific top-level key from additionalFields.
 */
export async function deleteAdditionalFieldKey(
    userId: string,
    key: string,
): Promise<Record<string, unknown>> {
    const db = getDb();

    // 1. Read current fields
    const current = db
        .select({ additionalFields: users.additionalFields })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .get();

    if (!current) throw new Error('User not found');

    const existing = (current.additionalFields as Record<string, unknown>) ?? {};
    const { [key]: _, ...rest } = existing;

    // 2. Write without the deleted key
    const updated = db
        .update(users)
        .set({
            additionalFields: rest,
            updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, userId))
        .returning({ additionalFields: users.additionalFields })
        .get();

    if (!updated) throw new Error('User not found');
    return (updated.additionalFields as Record<string, unknown>) ?? {};
}
