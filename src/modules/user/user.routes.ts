import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
    additionalFieldsUpdateSchema,
    additionalFieldsResponseSchema,
    userProfileResponseSchema,
    deleteFieldParamsSchema,
} from './user.schemas.js';
import {
    getProfile,
    getAdditionalFields,
    updateAdditionalFields,
    deleteAdditionalFieldKey,
} from './user.service.js';

const errorResponseSchema = z.object({ message: z.string() });

export async function userRoutes(app: FastifyInstance) {
    const typedApp = app.withTypeProvider<ZodTypeProvider>();

    // All user routes require authentication
    typedApp.addHook('onRequest', async (request, reply) => {
        try {
            await request.jwtVerify();
        } catch {
            return reply.status(401).send({ message: 'Unauthorized' });
        }
    });

    /**
     * GET /api/user/me
     * Get current user profile.
     */
    typedApp.get(
        '/api/user/me',
        {
            schema: {
                response: {
                    200: userProfileResponseSchema,
                    404: errorResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const { sub } = request.user as { sub: string };
            const user = await getProfile(sub);

            if (!user) {
                return reply.status(404).send({ message: 'User not found' });
            }

            return reply.send({
                id: user.id,
                telegramId: user.telegramId?.toString() ?? null,
                googleId: user.googleId ?? null,
                email: user.email ?? null,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                photoUrl: user.photoUrl,
                additionalFields: (user.additionalFields as Record<string, unknown>) ?? {},
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            });
        },
    );

    /**
     * GET /api/user/me/fields
     * Get additionalFields only.
     */
    typedApp.get(
        '/api/user/me/fields',
        {
            schema: {
                response: {
                    200: additionalFieldsResponseSchema,
                    404: errorResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const { sub } = request.user as { sub: string };
            const fields = await getAdditionalFields(sub);

            if (fields === null) {
                return reply.status(404).send({ message: 'User not found' });
            }

            return reply.send({ additionalFields: fields });
        },
    );

    /**
     * PATCH /api/user/me/fields
     * Merge data into additionalFields.
     * Body: { "shootingStarsGame": { "score": 200, "level": 5 } }
     */
    typedApp.patch(
        '/api/user/me/fields',
        {
            schema: {
                body: additionalFieldsUpdateSchema,
                response: { 200: additionalFieldsResponseSchema },
            },
        },
        async (request, reply) => {
            const { sub } = request.user as { sub: string };
            const updated = await updateAdditionalFields(sub, request.body);
            return reply.send({ additionalFields: updated });
        },
    );

    /**
     * DELETE /api/user/me/fields/:key
     * Remove a top-level key from additionalFields.
     */
    typedApp.delete(
        '/api/user/me/fields/:key',
        {
            schema: {
                params: deleteFieldParamsSchema,
                response: { 200: additionalFieldsResponseSchema },
            },
        },
        async (request, reply) => {
            const { sub } = request.user as { sub: string };
            const { key } = request.params;
            const updated = await deleteAdditionalFieldKey(sub, key);
            return reply.send({ additionalFields: updated });
        },
    );
}
