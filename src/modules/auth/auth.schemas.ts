import { z } from 'zod';

export const telegramAuthSchema = z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    photo_url: z.string().optional(),
    auth_date: z.number(),
    hash: z.string(),
});

export const googleAuthSchema = z.object({
    idToken: z.string(),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().uuid(),
});

export const authResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    user: z.object({
        id: z.string().uuid(),
        telegramId: z.string().nullable(),
        googleId: z.string().nullable(),
        email: z.string().nullable(),
        firstName: z.string(),
        lastName: z.string().nullable(),
        username: z.string().nullable(),
        photoUrl: z.string().nullable(),
    }),
});

export const tokenPairResponseSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
});

export const messageResponseSchema = z.object({
    message: z.string(),
});
