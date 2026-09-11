import fp from 'fastify-plugin';
import cron from 'node-cron';
import type { FastifyInstance } from 'fastify';
import { cleanupExpiredTokens } from '../modules/auth/token.service.js';

export default fp(async function cronPlugin(app: FastifyInstance) {
    // Run daily at 04:00 AM (0 4 * * *) Bishkek time (Asia/Bishkek)
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
            timezone: 'Asia/Bishkek',
        },
    );

    // Gracefully stop the cron task when the Fastify app closes
    app.addHook('onClose', (_instance, done) => {
        task.stop();
        done();
    });
});
