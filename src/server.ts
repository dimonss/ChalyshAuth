import 'dotenv/config';
import { loadEnv } from './config/env.js';
import { initDatabase } from './db/connection.js';
import { buildApp } from './app.js';

async function main() {
    // 1. Load and validate environment
    const env = loadEnv();

    // 2. Initialize database
    initDatabase(env.DATABASE_PATH);

    // 3. Build and start the Fastify app
    const app = await buildApp();

    try {
        await app.listen({ port: env.PORT, host: '0.0.0.0' });
        app.log.info(`🚀 ChalyshAuth server running on port ${env.PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

main();
