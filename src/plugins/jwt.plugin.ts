import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';

export default fp(async function jwtPlugin(app: FastifyInstance) {
    await app.register(fastifyJwt, {
        secret: process.env.JWT_SECRET!,
    });
});
