import fp from 'fastify-plugin';
import cron from 'node-cron';
import type { FastifyInstance } from 'fastify';
import { cleanupExpiredTokens } from '../modules/auth/token.service.js';
import { getEnv } from '../config/env.js';

export default fp(async function cronPlugin(app: FastifyInstance) {
    const timezone = getEnv().CRON_TIMEZONE;

    // Run daily at 04:00 AM (0 4 * * *)
    const task = cron.schedule(
        '0 4 * * *',
        () => {
            try {
                const deleted = cleanupExpiredTokens();
                app.log.info({ deleted }, '[Cron] Expired refresh tokens cleaned up');
            } catch (err) {
                app.log.error(err, '[Cron] Failed to cleanup expired tokens');
            }
        },
        {
            timezone,
        },
    );

    // Gracefully stop the cron task when the Fastify app closes
    app.addHook('onClose', (_instance, done) => {
        task.stop();
        done();
    });
});
