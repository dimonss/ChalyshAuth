import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getEnv, isAdminEmail } from '../../config/env.js';
import { verifyGoogleIdToken } from '../auth/google.service.js';
import { loginOrRegisterGoogle } from '../auth/auth.service.js';
import { authResponseSchema } from '../auth/auth.schemas.js';
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
     * Public config for frontend Google Sign-In initialization.
     */
    typedApp.get(
        '/admin/config',
        {
            schema: {
                tags: ['Admin'],
                description: 'Get public configuration for admin frontend (Google Client ID)',
                response: {
                    200: adminConfigResponseSchema,
                },
            },
        },
        async () => {
            return {
                googleClientId: getEnv().GOOGLE_CLIENT_ID,
            };
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
                },
            },
        },
        async (request, reply) => {
            try {
                // 1. Verify Google token first
                const googleUser = await verifyGoogleIdToken(request.body.idToken);

                // 2. Strict email check for admin privileges
                if (!isAdminEmail(googleUser.email)) {
                    return reply.status(403).send({
                        message: 'Access denied. You are not authorized to access the admin panel.',
                    });
                }

                // 3. Perform login or registration
                const authResult = await loginOrRegisterGoogle(app, request.body.idToken);
                return reply.send(authResult);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Google authentication failed';
                return reply.status(401).send({ message });
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
