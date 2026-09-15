import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { users } from '../../db/schema.js';
import {
    getEnv,
    isAdminEmail,
    isAdminUser,
    getTelegramBotUsername,
} from '../../config/env.js';
import { verifyGoogleIdToken } from '../auth/google.service.js';
import { verifyTelegramAuth } from '../auth/telegram.service.js';
import { loginOrRegister, loginOrRegisterGoogle } from '../auth/auth.service.js';
import { authResponseSchema, telegramAuthSchema } from '../auth/auth.schemas.js';
import { requireAdmin } from './admin.guard.js';
import {
    adminConfigResponseSchema,
    adminLoginSchema,
    adminStatsResponseSchema,
    adminUsersQuerySchema,
    adminUsersListResponseSchema,
    adminUserItemSchema,
    adminUserUpdateSchema,
    adminMessageResponseSchema,
} from './admin.schemas.js';
import {
    getAdminStats,
    getAdminUsers,
    getAdminUserById,
    updateAdminUser,
    deleteAdminUser,
} from './admin.service.js';

const userIdParamsSchema = z.object({
    id: z.string().uuid(),
});

export async function adminRoutes(app: FastifyInstance) {
    const typedApp = app.withTypeProvider<ZodTypeProvider>();

    /**
     * GET /admin/config
     * Public config for frontend Google Sign-In and Telegram Widget initialization.
     */
    typedApp.get(
        '/admin/config',
        {
            schema: {
                tags: ['Admin'],
                description: 'Get public configuration for admin frontend (Google Client ID & Telegram Bot Username)',
                response: {
                    200: adminConfigResponseSchema,
                },
            },
        },
        async () => {
            const telegramBotUsername = await getTelegramBotUsername();
            return {
                googleClientId: getEnv().GOOGLE_CLIENT_ID,
                telegramBotUsername,
            };
        },
    );

    /**
     * POST /admin/auth/telegram
     * Login to admin panel using Telegram Widget data, verifying admin authorization.
     */
    typedApp.post(
        '/admin/auth/telegram',
        {
            schema: {
                tags: ['Admin'],
                description: 'Authenticate as administrator via Telegram Login Widget data',
                body: telegramAuthSchema,
                response: {
                    200: authResponseSchema,
                    401: adminMessageResponseSchema,
                    403: adminMessageResponseSchema,
                    500: adminMessageResponseSchema,
                },
            },
        },
        async (request, reply) => {
            // 1. Verify Telegram hash
            const env = getEnv();
            const isValid = verifyTelegramAuth(request.body, env.TELEGRAM_BOT_TOKEN);
            if (!isValid) {
                return reply.status(401).send({
                    message: 'Invalid Telegram authentication data',
                });
            }

            // 2. Unified check for admin privileges (by username or pre-linked email)
            const db = getDb();
            const existingUser = db
                .select()
                .from(users)
                .where(eq(users.telegramId, request.body.id))
                .limit(1)
                .get();

            const isAuthorized = isAdminUser({
                email: existingUser?.email,
                username: request.body.username,
            });

            if (!isAuthorized) {
                return reply.status(403).send({
                    message: 'Access denied. You are not authorized to access the admin panel.',
                });
            }

            // 3. Perform login or registration
            try {
                const authResult = await loginOrRegister(app, request.body);
                return reply.send(authResult);
            } catch (err: unknown) {
                request.log.error(err, 'Unexpected error during Telegram admin authentication');
                return reply.status(500).send({
                    message: 'Internal server error during authentication',
                });
            }
        },
    );

    /**
     * POST /admin/auth/google
     * Login to admin panel using Google ID token, verifying admin authorization.
     */
    typedApp.post(
        '/admin/auth/google',
        {
            schema: {
                tags: ['Admin'],
                description: 'Authenticate as administrator via Google OAuth2 ID token',
                body: adminLoginSchema,
                response: {
                    200: authResponseSchema,
                    401: adminMessageResponseSchema,
                    403: adminMessageResponseSchema,
                    500: adminMessageResponseSchema,
                },
            },
        },
        async (request, reply) => {
            // 1. Verify Google token first
            let googleUser;
            try {
                googleUser = await verifyGoogleIdToken(request.body.idToken);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Invalid Google ID token';
                return reply.status(401).send({ message });
            }

            // 2. Strict email check for admin privileges
            if (!isAdminEmail(googleUser.email)) {
                return reply.status(403).send({
                    message: 'Access denied. You are not authorized to access the admin panel.',
                });
            }

            // 3. Perform login or registration
            try {
                const authResult = await loginOrRegisterGoogle(app, request.body.idToken);
                return reply.send(authResult);
            } catch (err: unknown) {
                request.log.error(err, 'Unexpected error during Google admin authentication');
                return reply.status(500).send({
                    message: 'Internal server error during authentication',
                });
            }
        },
    );

    /**
     * GET /admin/me
     * Verify current admin status and profile.
     */
    typedApp.get(
        '/admin/me',
        {
            schema: {
                tags: ['Admin'],
                description: 'Verify current admin session and info',
                security: [{ bearerAuth: [] }],
                response: {
                    200: adminUserItemSchema,
                    401: adminMessageResponseSchema,
                    403: adminMessageResponseSchema,
                    404: adminMessageResponseSchema,
                },
            },
            preHandler: requireAdmin,
        },
        async (request, reply) => {
            const admin = (request as any).adminUser;
            const fullProfile = await getAdminUserById(admin.id);
            if (!fullProfile) {
                return reply.status(404).send({ message: 'User not found' });
            }
            return reply.send(fullProfile);
        },
    );

    /**
     * GET /admin/stats
     * Dashboard statistics.
     */
    typedApp.get(
        '/admin/stats',
        {
            schema: {
                tags: ['Admin'],
                description: 'Get system dashboard statistics',
                security: [{ bearerAuth: [] }],
                response: {
                    200: adminStatsResponseSchema,
                    401: adminMessageResponseSchema,
                    403: adminMessageResponseSchema,
                },
            },
            preHandler: requireAdmin,
        },
        async () => {
            return await getAdminStats();
        },
    );

    /**
     * GET /admin/users
     * Paginated list of users with search and filtering.
     */
    typedApp.get(
        '/admin/users',
        {
            schema: {
                tags: ['Admin'],
                description: 'List users with pagination, filters and search',
                security: [{ bearerAuth: [] }],
                querystring: adminUsersQuerySchema,
                response: {
                    200: adminUsersListResponseSchema,
                    401: adminMessageResponseSchema,
                    403: adminMessageResponseSchema,
                },
            },
            preHandler: requireAdmin,
        },
        async (request) => {
            return await getAdminUsers(request.query);
        },
    );

    /**
     * GET /admin/users/:id
     * Full user profile by ID.
     */
    typedApp.get(
        '/admin/users/:id',
        {
            schema: {
                tags: ['Admin'],
                description: 'Get detailed user profile by ID',
                security: [{ bearerAuth: [] }],
                params: userIdParamsSchema,
                response: {
                    200: adminUserItemSchema,
                    401: adminMessageResponseSchema,
                    403: adminMessageResponseSchema,
                    404: adminMessageResponseSchema,
                },
            },
            preHandler: requireAdmin,
        },
        async (request, reply) => {
            const user = await getAdminUserById(request.params.id);
            if (!user) {
                return reply.status(404).send({ message: 'User not found' });
            }
            return reply.send(user);
        },
    );

    /**
     * PATCH /admin/users/:id
     * Update user details and additionalFields.
     */
    typedApp.patch(
        '/admin/users/:id',
        {
            schema: {
                tags: ['Admin'],
                description: 'Update user profile and additional fields',
                security: [{ bearerAuth: [] }],
                params: userIdParamsSchema,
                body: adminUserUpdateSchema,
                response: {
                    200: adminUserItemSchema,
                    401: adminMessageResponseSchema,
                    403: adminMessageResponseSchema,
                    404: adminMessageResponseSchema,
                },
            },
            preHandler: requireAdmin,
        },
        async (request, reply) => {
            const updated = await updateAdminUser(request.params.id, request.body);
            if (!updated) {
                return reply.status(404).send({ message: 'User not found' });
            }
            return reply.send(updated);
        },
    );

    /**
     * DELETE /admin/users/:id
     * Delete a user and their tokens.
     */
    typedApp.delete(
        '/admin/users/:id',
        {
            schema: {
                tags: ['Admin'],
                description: 'Delete user and their session tokens',
                security: [{ bearerAuth: [] }],
                params: userIdParamsSchema,
                response: {
                    200: adminMessageResponseSchema,
                    401: adminMessageResponseSchema,
                    403: adminMessageResponseSchema,
                    404: adminMessageResponseSchema,
                },
            },
            preHandler: requireAdmin,
        },
        async (request, reply) => {
            const success = await deleteAdminUser(request.params.id);
            if (!success) {
                return reply.status(404).send({ message: 'User not found or already deleted' });
            }
            return reply.send({ message: 'User deleted successfully' });
        },
    );
}
