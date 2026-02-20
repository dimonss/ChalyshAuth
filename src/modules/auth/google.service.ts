import { getEnv } from '../../config/env.js';

export interface GoogleUserData {
    sub: string;       // Google user ID
    email: string;
    name: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
}

/**
 * Verify a Google ID token using the Google tokeninfo endpoint.
 * Returns user data if the token is valid and was issued for our client.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleUserData> {
    const env = getEnv();

    if (!env.GOOGLE_CLIENT_ID) {
        throw new Error('Google authentication is not configured (GOOGLE_CLIENT_ID is missing)');
    }

    const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );

    if (!response.ok) {
        throw new Error('Invalid Google ID token');
    }

    const data = (await response.json()) as Record<string, string>;

    // Verify that the token was issued for our application
    if (data.aud !== env.GOOGLE_CLIENT_ID) {
        throw new Error('Google ID token was not issued for this application');
    }

    // Verify the token is not expired
    const expiry = parseInt(data.exp, 10);
    if (Number.isNaN(expiry) || expiry < Math.floor(Date.now() / 1000)) {
        throw new Error('Google ID token has expired');
    }

    return {
        sub: data.sub,
        email: data.email,
        name: data.name ?? data.email,
        picture: data.picture,
        given_name: data.given_name,
        family_name: data.family_name,
    };
}
