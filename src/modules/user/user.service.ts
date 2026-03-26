import { eq, sql, desc, isNotNull } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { users, type User } from '../../db/schema.js';

/**
 * Helper to safely parse and heal additionalFields
 */
function parseAdditionalFields(fields: unknown): Record<string, unknown> {
    let parsed: any = fields;
    if (typeof fields === 'string') {
        try {
            parsed = JSON.parse(fields);
        } catch {
            return {};
        }
    }
    
    if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, unknown>;
    }
    
    return {};
}

/**
 * Get user profile by ID.
 */
export async function getProfile(userId: string): Promise<User | null> {
    const db = getDb();
    const user = db.select().from(users).where(eq(users.id, userId)).limit(1).get();
    if (user) {
        user.additionalFields = parseAdditionalFields(user.additionalFields);
    }
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
    return parseAdditionalFields(user.additionalFields);
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

    const existing = parseAdditionalFields(current.additionalFields);
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
    return parseAdditionalFields(updated.additionalFields);
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

    const existing = parseAdditionalFields(current.additionalFields);
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
    return parseAdditionalFields(updated.additionalFields);
}

/**
 * Get top users by spaceShooterGame.bestScore
 */
export async function getLeaderboard(limit = 10) {
    const db = getDb();

    // SQLite json_extract returns text or null. We cast to integer for proper sorting.
    const scoreSql = sql<number>`CAST(json_extract(${users.additionalFields}, '$.spaceShooterGame.bestScore') AS INTEGER)`;

    const leaderboard = db
        .select({
            username: users.username,
            firstName: users.firstName,
            bestScore: scoreSql,
        })
        .from(users)
        .where(isNotNull(scoreSql))
        .orderBy(desc(scoreSql))
        .limit(limit)
        .all();

    return leaderboard;
}
