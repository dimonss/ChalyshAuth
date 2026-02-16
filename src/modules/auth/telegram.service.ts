import crypto from 'node:crypto';

export interface TelegramAuthData {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

/**
 * Verify Telegram Login Widget data authenticity.
 *
 * Algorithm (from https://core.telegram.org/widgets/login#checking-authorization):
 * 1. Create data-check-string: sort all fields (except hash) alphabetically,
 *    join as "key=value" with newlines.
 * 2. Secret key = SHA256(bot_token).
 * 3. Compare HMAC-SHA256(data-check-string, secret_key) with the provided hash.
 * 4. Check auth_date is not too old (default: 1 day).
 */
export function verifyTelegramAuth(
    data: TelegramAuthData,
    botToken: string,
    maxAgeSeconds: number = 86400,
): boolean {
    const { hash, ...rest } = data;

    // 1. Build data-check-string
    const dataCheckString = Object.keys(rest)
        .sort()
        .map((key) => `${key}=${rest[key as keyof typeof rest]}`)
        .filter((line) => !line.endsWith('=undefined'))
        .join('\n');

    // 2. Secret key = SHA256(bot_token)
    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    // 3. HMAC-SHA256
    const hmac = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

    // 4. Compare hashes
    if (hmac !== hash) {
        return false;
    }

    // 5. Check auth_date freshness
    const now = Math.floor(Date.now() / 1000);
    if (now - data.auth_date > maxAgeSeconds) {
        return false;
    }

    return true;
}
