import { eq } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { users } from '../../db/schema.js';
import {
    verifyTelegramAuth,
    type TelegramAuthData,
} from './telegram.service.js';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    revokeRefreshToken,
    type AccessTokenPayload,
} from './token.service.js';
import { getEnv } from '../../config/env.js';
import type { FastifyInstance } from 'fastify';

export interface AuthResult {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        telegramId: string;
        firstName: string;
        lastName: string | null;
        username: string | null;
        photoUrl: string | null;
    };
}

/**
 * Verify Telegram auth data → upsert user → generate token pair.
 */
export async function loginOrRegister(
    app: FastifyInstance,
    data: TelegramAuthData,
): Promise<AuthResult> {
    const env = getEnv();

    // 1. Verify Telegram hash
    const isValid = verifyTelegramAuth(data, env.TELEGRAM_BOT_TOKEN);
    if (!isValid) {
        throw new Error('Invalid Telegram authentication data');
    }

    const db = getDb();

    // 2. Upsert user
    const telegramId = data.id;

    const existingUser = db
        .select()
        .from(users)
        .where(eq(users.telegramId, telegramId))
        .limit(1)
        .get();

    let user;

    if (existingUser) {
        // Update profile data from Telegram
        user = db
            .update(users)
            .set({
                firstName: data.first_name,
                lastName: data.last_name ?? null,
                username: data.username ?? null,
                photoUrl: data.photo_url ?? null,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(users.id, existingUser.id))
            .returning()
            .get();
    } else {
        // Create new user
        user = db
            .insert(users)
            .values({
                telegramId,
                firstName: data.first_name,
                lastName: data.last_name ?? null,
                username: data.username ?? null,
                photoUrl: data.photo_url ?? null,
            })
            .returning()
            .get();
    }

    // 3. Generate tokens
    const payload: AccessTokenPayload = {
        sub: user.id,
        telegramId: user.telegramId.toString(),
    };

    const accessToken = generateAccessToken(app, payload);
    const refreshToken = generateRefreshToken(user.id);

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            telegramId: user.telegramId.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            photoUrl: user.photoUrl,
        },
    };
}

/**
 * Refresh token pair: verify old refresh → generate new pair → revoke old.
 */
export async function refresh(
    app: FastifyInstance,
    oldRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
    // 1. Verify the old refresh token
    const result = verifyRefreshToken(oldRefreshToken);
    if (!result) {
        throw new Error('Invalid or expired refresh token');
    }

    const db = getDb();

    // 2. Get the user
    const user = db
        .select()
        .from(users)
        .where(eq(users.id, result.userId))
        .limit(1)
        .get();

    if (!user) {
        throw new Error('User not found');
    }

    // 3. Revoke old refresh token (rotation)
    revokeRefreshToken(oldRefreshToken);

    // 4. Generate new pair
    const payload: AccessTokenPayload = {
        sub: user.id,
        telegramId: user.telegramId.toString(),
    };

    const accessToken = generateAccessToken(app, payload);
    const refreshToken = generateRefreshToken(user.id);

    return { accessToken, refreshToken };
}

/**
 * Logout: revoke the given refresh token.
 */
export async function logout(refreshToken: string): Promise<void> {
    revokeRefreshToken(refreshToken);
}
