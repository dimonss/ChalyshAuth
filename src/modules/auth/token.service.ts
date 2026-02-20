import crypto from 'node:crypto';
import { eq, and, gt } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { refreshTokens } from '../../db/schema.js';
import { getEnv } from '../../config/env.js';
import type { FastifyInstance } from 'fastify';

/**
 * Parse duration strings like "15m", "7d", "1h" into milliseconds.
 */
function parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid duration format: ${duration}`);

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
}

export interface AccessTokenPayload {
    sub: string; // user id
    telegramId?: string;
    googleId?: string;
}

/**
 * Generate a signed JWT access token.
 */
export function generateAccessToken(
    app: FastifyInstance,
    payload: AccessTokenPayload,
): string {
    const env = getEnv();
    return app.jwt.sign(payload, { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN });
}

/**
 * Generate a random refresh token and store it in the database.
 */
export function generateRefreshToken(userId: string): string {
    const db = getDb();
    const env = getEnv();
    const token = crypto.randomUUID();

    const expiresAt = new Date(Date.now() + parseDuration(env.REFRESH_TOKEN_EXPIRES_IN));

    db.insert(refreshTokens).values({
        userId,
        token,
        expiresAt: expiresAt.toISOString(),
    }).run();

    return token;
}

/**
 * Verify that a refresh token exists and is not expired.
 * Returns the userId if valid.
 */
export function verifyRefreshToken(
    token: string,
): { userId: string } | null {
    const db = getDb();

    const found = db
        .select()
        .from(refreshTokens)
        .where(
            and(
                eq(refreshTokens.token, token),
                gt(refreshTokens.expiresAt, new Date().toISOString()),
            ),
        )
        .limit(1)
        .get();

    if (!found) return null;

    return { userId: found.userId };
}

/**
 * Delete a refresh token from the database (logout / rotation).
 */
export function revokeRefreshToken(token: string): void {
    const db = getDb();
    db.delete(refreshTokens).where(eq(refreshTokens.token, token)).run();
}

/**
 * Revoke all refresh tokens for a given user.
 */
export function revokeAllUserTokens(userId: string): void {
    const db = getDb();
    db.delete(refreshTokens).where(eq(refreshTokens.userId, userId)).run();
}
