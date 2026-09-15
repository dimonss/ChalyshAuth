import { z } from 'zod';

export const adminConfigResponseSchema = z.object({
    googleClientId: z.string(),
    telegramBotUsername: z.string(),
});

export const adminLoginSchema = z.object({
    idToken: z.string().min(1, 'Google ID token is required'),
});

export const adminStatsResponseSchema = z.object({
    totalUsers: z.number(),
    telegramUsers: z.number(),
    googleUsers: z.number(),
    activeRefreshTokens: z.number(),
});

export const adminUsersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    provider: z.enum(['all', 'telegram', 'google']).default('all'),
    sortBy: z.enum(['createdAt', 'updatedAt', 'firstName', 'username', 'email']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const adminUserItemSchema = z.object({
    id: z.string(),
    telegramId: z.string().nullable(),
    googleId: z.string().nullable(),
    email: z.string().nullable(),
    firstName: z.string(),
    lastName: z.string().nullable(),
    username: z.string().nullable(),
    photoUrl: z.string().nullable(),
    additionalFields: z.record(z.string(), z.unknown()),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const adminUsersListResponseSchema = z.object({
    users: z.array(adminUserItemSchema),
    pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
    }),
});

export const adminUserUpdateSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().nullable().optional(),
    username: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    additionalFields: z.record(z.string(), z.unknown()).optional(),
});

export const adminMessageResponseSchema = z.object({
    message: z.string(),
});
