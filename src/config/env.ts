import { z } from 'zod';

export const envSchema = z.object({
    DATABASE_PATH: z.string().default('./data/chalysh_auth.db'),
    TELEGRAM_BOT_TOKEN: z.string().default(''),
    TELEGRAM_BOT_USERNAME: z.string().default(''),
    GOOGLE_CLIENT_ID: z.string().default(''),
    JWT_SECRET: z.string().min(16),
    ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
    PORT: z.coerce.number().default(3000),
    BASE_URL: z.string().default('/api'),
    ADMIN_EMAILS: z.string().default('null@gmail.com'),
    ADMIN_TELEGRAM_USERNAMES: z.string().default(''),
    CRON_TIMEZONE: z.string().default('Asia/Bishkek'),
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

let cachedBotUsername: string | null = null;

export async function getTelegramBotUsername(): Promise<string> {
    const env = getEnv();
    if (env.TELEGRAM_BOT_USERNAME) {
        return env.TELEGRAM_BOT_USERNAME;
    }
    if (cachedBotUsername !== null) {
        return cachedBotUsername;
    }
    if (!env.TELEGRAM_BOT_TOKEN) {
        return '';
    }
    try {
        const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`, {
            signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
            const data = (await res.json()) as { ok: boolean; result?: { username?: string } };
            if (data.ok && data.result?.username) {
                cachedBotUsername = data.result.username;
                return cachedBotUsername;
            }
        }
    } catch {
        // Fallback gracefully on network error or invalid token
    }
    return '';
}

function getEnvString(key: keyof Env, defaultValue: string = ''): string {
    try {
        return (getEnv()[key] as string) || defaultValue;
    } catch {
        return (process.env[key] as string) || defaultValue;
    }
}

export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    const allowed = getEnvString('ADMIN_EMAILS', 'null@gmail.com')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
    return allowed.includes(email.trim().toLowerCase());
}

export function isAdminTelegramUsername(username: string | null | undefined): boolean {
    if (!username) return false;
    const cleanUser = username.trim().toLowerCase().replace(/^@/, '');
    const allowed = getEnvString('ADMIN_TELEGRAM_USERNAMES')
        .split(',')
        .map((u) => u.trim().toLowerCase().replace(/^@/, ''))
        .filter(Boolean);
    return allowed.includes(cleanUser);
}

export function isAdminUser(user: { email?: string | null; username?: string | null } | null | undefined): boolean {
    if (!user) return false;
    if (isAdminEmail(user.email)) return true;
    if (isAdminTelegramUsername(user.username)) return true;
    return false;
}
