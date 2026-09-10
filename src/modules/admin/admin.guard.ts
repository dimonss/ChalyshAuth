import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { users } from '../../db/schema.js';
import { isAdminEmail } from '../../config/env.js';

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
    try {
        await request.jwtVerify();
    } catch {
        return reply.status(401).send({ message: 'Unauthorized: Authentication required' });
    }

    const { sub } = request.user as { sub: string };
    if (!sub) {
        return reply.status(401).send({ message: 'Unauthorized: Invalid token payload' });
    }

    const db = getDb();
    const user = db.select().from(users).where(eq(users.id, sub)).limit(1).get();

    if (!user) {
        return reply.status(401).send({ message: 'Unauthorized: User not found' });
    }

    if (!isAdminEmail(user.email)) {
        return reply.status(403).send({
            message: 'Access denied: You are not authorized to access the admin panel',
        });
    }

    // Attach admin info to request
    (request as any).adminUser = user;
}
