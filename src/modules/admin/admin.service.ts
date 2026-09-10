import { eq, and, or, like, sql, desc, asc, isNotNull, count } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { users, refreshTokens, type User } from '../../db/schema.js';

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

export async function getAdminStats() {
    const db = getDb();

    const [totalUsersRes] = db.select({ count: count() }).from(users).all();
    const [telegramUsersRes] = db
        .select({ count: count() })
        .from(users)
        .where(isNotNull(users.telegramId))
        .all();
    const [googleUsersRes] = db
        .select({ count: count() })
        .from(users)
        .where(isNotNull(users.googleId))
        .all();

    const nowIso = new Date().toISOString();
    const [activeTokensRes] = db
        .select({ count: count() })
        .from(refreshTokens)
        .where(sql`${refreshTokens.expiresAt} > ${nowIso}`)
        .all();

    return {
        totalUsers: totalUsersRes?.count ?? 0,
        telegramUsers: telegramUsersRes?.count ?? 0,
        googleUsers: googleUsersRes?.count ?? 0,
        activeRefreshTokens: activeTokensRes?.count ?? 0,
    };
}

export interface GetUsersParams {
    page?: number;
    limit?: number;
    search?: string;
    provider?: 'all' | 'telegram' | 'google';
    sortBy?: 'createdAt' | 'updatedAt' | 'firstName' | 'username' | 'email';
    sortOrder?: 'asc' | 'desc';
}

export async function getAdminUsers(params: GetUsersParams = {}) {
    const db = getDb();

    const page = Math.max(1, params.page ?? 1);
    const limit = Math.max(1, Math.min(100, params.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    // Filter by provider
    if (params.provider === 'telegram') {
        conditions.push(isNotNull(users.telegramId));
    } else if (params.provider === 'google') {
        conditions.push(isNotNull(users.googleId));
    }

    // Search query
    if (params.search && params.search.trim()) {
        const query = `%${params.search.trim()}%`;
        conditions.push(
            or(
                like(users.id, query),
                like(users.email, query),
                like(users.username, query),
                like(users.firstName, query),
                like(users.lastName, query),
                sql`CAST(${users.telegramId} AS TEXT) LIKE ${query}`,
                like(users.googleId, query),
            ),
        );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total matches
    const countQuery = db
        .select({ count: count() })
        .from(users);
    const [totalRes] = whereClause ? countQuery.where(whereClause).all() : countQuery.all();
    const total = totalRes?.count ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Sorting
    const sortFieldMap = {
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        firstName: users.firstName,
        username: users.username,
        email: users.email,
    };

    const sortColumn = sortFieldMap[params.sortBy ?? 'createdAt'] ?? users.createdAt;
    const orderFn = params.sortOrder === 'asc' ? asc : desc;

    // Data query
    const dataQuery = db
        .select()
        .from(users);

    const rows = (whereClause ? dataQuery.where(whereClause) : dataQuery)
        .orderBy(orderFn(sortColumn))
        .limit(limit)
        .offset(offset)
        .all();

    const formattedUsers = rows.map((u) => ({
        id: u.id,
        telegramId: u.telegramId ? String(u.telegramId) : null,
        googleId: u.googleId ?? null,
        email: u.email ?? null,
        firstName: u.firstName,
        lastName: u.lastName ?? null,
        username: u.username ?? null,
        photoUrl: u.photoUrl ?? null,
        additionalFields: parseAdditionalFields(u.additionalFields),
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
    }));

    return {
        users: formattedUsers,
        pagination: {
            page,
            limit,
            total,
            totalPages,
        },
    };
}

export async function getAdminUserById(id: string) {
    const db = getDb();
    const user = db.select().from(users).where(eq(users.id, id)).limit(1).get();
    if (!user) return null;

    return {
        id: user.id,
        telegramId: user.telegramId ? String(user.telegramId) : null,
        googleId: user.googleId ?? null,
        email: user.email ?? null,
        firstName: user.firstName,
        lastName: user.lastName ?? null,
        username: user.username ?? null,
        photoUrl: user.photoUrl ?? null,
        additionalFields: parseAdditionalFields(user.additionalFields),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

export interface UpdateAdminUserData {
    firstName?: string;
    lastName?: string | null;
    username?: string | null;
    email?: string | null;
    additionalFields?: Record<string, unknown>;
}

export async function updateAdminUser(id: string, data: UpdateAdminUserData) {
    const db = getDb();

    const existing = db.select().from(users).where(eq(users.id, id)).limit(1).get();
    if (!existing) return null;

    const updateValues: Record<string, any> = {
        updatedAt: new Date().toISOString(),
    };

    if (data.firstName !== undefined) updateValues.firstName = data.firstName;
    if (data.lastName !== undefined) updateValues.lastName = data.lastName;
    if (data.username !== undefined) updateValues.username = data.username;
    if (data.email !== undefined) updateValues.email = data.email;
    if (data.additionalFields !== undefined) updateValues.additionalFields = data.additionalFields;

    const updated = db
        .update(users)
        .set(updateValues)
        .where(eq(users.id, id))
        .returning()
        .get();

    if (!updated) return null;

    return {
        id: updated.id,
        telegramId: updated.telegramId ? String(updated.telegramId) : null,
        googleId: updated.googleId ?? null,
        email: updated.email ?? null,
        firstName: updated.firstName,
        lastName: updated.lastName ?? null,
        username: updated.username ?? null,
        photoUrl: updated.photoUrl ?? null,
        additionalFields: parseAdditionalFields(updated.additionalFields),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
    };
}

export async function deleteAdminUser(id: string): Promise<boolean> {
    const db = getDb();

    // Explicitly delete associated refresh tokens first
    db.delete(refreshTokens).where(eq(refreshTokens.userId, id)).run();

    const result = db.delete(users).where(eq(users.id, id)).run();
    return result.changes > 0;
}
