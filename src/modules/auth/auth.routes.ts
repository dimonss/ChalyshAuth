import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
    telegramAuthSchema,
    refreshTokenSchema,
    authResponseSchema,
    tokenPairResponseSchema,
    messageResponseSchema,
} from './auth.schemas.js';
import { loginOrRegister, refresh, logout } from './auth.service.js';

export async function authRoutes(app: FastifyInstance) {
    const typedApp = app.withTypeProvider<ZodTypeProvider>();

    /**
     * POST /api/auth/telegram
     * Login or register via Telegram Login Widget data.
     */
    typedApp.post(
        '/api/auth/telegram',
        {
            schema: {
                body: telegramAuthSchema,
                response: {
                    200: authResponseSchema,
                    401: messageResponseSchema,
                },
            },
        },
        async (request, reply) => {
            try {
                const result = await loginOrRegister(app, request.body);
                return reply.send(result);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Authentication failed';
                return reply.status(401).send({ message });
            }
        },
    );

    /**
     * POST /api/auth/refresh
     * Refresh the access/refresh token pair.
     */
    typedApp.post(
        '/api/auth/refresh',
        {
            schema: {
                body: refreshTokenSchema,
                response: {
                    200: tokenPairResponseSchema,
                    401: messageResponseSchema,
                },
            },
        },
        async (request, reply) => {
            try {
                const result = await refresh(app, request.body.refreshToken);
                return reply.send(result);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Token refresh failed';
                return reply.status(401).send({ message });
            }
        },
    );

    /**
     * POST /api/auth/logout
     * Revoke a refresh token.
     */
    typedApp.post(
        '/api/auth/logout',
        {
            schema: {
                body: refreshTokenSchema,
                response: { 200: messageResponseSchema },
            },
        },
        async (request, reply) => {
            await logout(request.body.refreshToken);
            return reply.send({ message: 'Logged out successfully' });
        },
    );
}
