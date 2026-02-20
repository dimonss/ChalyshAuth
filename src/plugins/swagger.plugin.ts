import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import type { FastifyInstance } from 'fastify';

export default fp(async function swaggerPlugin(app: FastifyInstance) {
    await app.register(fastifySwagger, {
        openapi: {
            openapi: '3.1.0',
            info: {
                title: 'ChalyshAuth API',
                description: 'Authentication service — Telegram & Google OAuth',
                version: '1.0.0',
            },
            tags: [
                { name: 'Auth', description: 'Authentication endpoints' },
                { name: 'User', description: 'User profile & additional fields' },
                { name: 'Health', description: 'Health check' },
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
            },
        },
        transform: jsonSchemaTransform,
    });

    await app.register(fastifySwaggerUi, {
        routePrefix: '/docs',
    });
});
