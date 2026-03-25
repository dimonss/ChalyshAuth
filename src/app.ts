import Fastify, { type FastifyError } from 'fastify';
import {
    serializerCompiler,
    validatorCompiler,
} from 'fastify-type-provider-zod';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import jwtPlugin from './plugins/jwt.plugin.js';
import corsPlugin from './plugins/cors.plugin.js';
import swaggerPlugin from './plugins/swagger.plugin.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { getEnv } from './config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
    const app = Fastify({
        ignoreTrailingSlash: true,
        logger: {
            level: 'info',
            transport: {
                target: 'pino-pretty',
                options: { colorize: true },
            },
        },
    });

    // Zod type provider
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // Global error handler
    app.setErrorHandler((error: FastifyError, request, reply) => {
        const statusCode = error.statusCode ?? 500;

        request.log.error(error);

        return reply.status(statusCode).send({
            message: error.message,
            ...(statusCode === 400 && 'validation' in error
                ? { validation: (error as any).validation }
                : {}),
        });
    });

    // Plugins
    await app.register(corsPlugin);
    await app.register(swaggerPlugin);
    await app.register(jwtPlugin);

    // Public pages (outside API prefix)
    const publicDir = join(__dirname, 'public');

    app.get('/privacy-policy', { schema: { hide: true } }, async (_request, reply) => {
        const html = readFileSync(join(publicDir, 'privacy-policy.html'), 'utf-8');
        return reply.type('text/html').send(html);
    });

    // app.get('/terms-of-service', { schema: { hide: true } }, async (_request, reply) => {
    //     const html = readFileSync(join(publicDir, 'terms-of-service.html'), 'utf-8');
    //     return reply.type('text/html').send(html);
    // });

    // Routes — all under configurable BASE_URL prefix (default: /api)
    const baseUrl = getEnv().BASE_URL;

    await app.register(async (prefixed) => {
        await prefixed.register(authRoutes);
        await prefixed.register(userRoutes);

        // Health check
        prefixed.get('/health', {
            schema: { tags: ['Health'] },
        }, async () => {
            return { status: 'ok', timestamp: new Date().toISOString() };
        });
    }, { prefix: baseUrl });

    return app;
}
