import { z } from 'zod';

export const additionalFieldsUpdateSchema = z.record(z.string(), z.unknown());

export const additionalFieldsResponseSchema = z.object({
    additionalFields: z.record(z.string(), z.unknown()),
});

export const userProfileResponseSchema = z.object({
    id: z.string().uuid(),
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

export const deleteFieldParamsSchema = z.object({
    key: z.string().min(1),
});
