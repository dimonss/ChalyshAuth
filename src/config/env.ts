import { z } from 'zod';

export const envSchema = z.object({
    DATABASE_PATH: z.string().default('./data/chalysh_auth.db'),
    TELEGRAM_BOT_TOKEN: z.string().default(''),
    GOOGLE_CLIENT_ID: z.string().default(''),
    JWT_SECRET: z.string().min(16),
    ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
    PORT: z.coerce.number().default(3000),
});

export type Env = z.infer<typeof envSchema>;

let envConfig: Env;

export function loadEnv(): Env {
    envConfig = envSchema.parse(process.env);
    return envConfig;
}

export function getEnv(): Env {
    if (!envConfig) {
        throw new Error('Environment not loaded. Call loadEnv() first.');
    }
    return envConfig;
}
