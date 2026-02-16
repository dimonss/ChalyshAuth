import Fastify, { type FastifyError } from 'fastify';
import {
    serializerCompiler,
    validatorCompiler,
} from 'fastify-type-provider-zod';
import jwtPlugin from './plugins/jwt.plugin.js';
import corsPlugin from './plugins/cors.plugin.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/user/user.routes.js';

export async function buildApp() {
    const app = Fastify({
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
    await app.register(jwtPlugin);

    // Routes
    await app.register(authRoutes);
    await app.register(userRoutes);

    // Health check
    app.get('/api/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    return app;
}
