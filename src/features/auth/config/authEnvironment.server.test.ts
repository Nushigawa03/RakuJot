import { afterEach, describe, expect, it } from 'vitest';
import { getDevUserProfile } from './authEnvironment.server';

const envKeys = [
    'AUTH_DEV_USER_EMAIL',
    'AUTH_DEV_USER_NAME',
    'AUTH_DEV_USER_ACCOUNT_ID',
    'AUTH_DEV_USER_GOOGLE_ID',
    'AUTH_DEV_USER_PICTURE',
] as const;

const originalEnv = Object.fromEntries(
    envKeys.map((key) => [key, process.env[key]])
);

afterEach(() => {
    for (const key of envKeys) {
        const value = originalEnv[key];
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
});

describe('getDevUserProfile', () => {
    it('uses a built-in dummy user when dev user env vars are omitted', () => {
        for (const key of envKeys) {
            delete process.env[key];
        }

        expect(getDevUserProfile()).toEqual({
            email: 'dev@example.com',
            name: 'Dev User',
            accountId: 'dev-google-id',
            picture: null,
        });
    });

    it('allows env vars to override the built-in dummy user', () => {
        process.env.AUTH_DEV_USER_EMAIL = 'preview@example.com';
        process.env.AUTH_DEV_USER_NAME = 'Preview User';
        process.env.AUTH_DEV_USER_ACCOUNT_ID = 'preview-dev-id';
        process.env.AUTH_DEV_USER_PICTURE = 'https://example.com/avatar.png';

        expect(getDevUserProfile()).toEqual({
            email: 'preview@example.com',
            name: 'Preview User',
            accountId: 'preview-dev-id',
            picture: 'https://example.com/avatar.png',
        });
    });

    it('supports the old dev google id env var as a compatibility fallback', () => {
        delete process.env.AUTH_DEV_USER_ACCOUNT_ID;
        process.env.AUTH_DEV_USER_GOOGLE_ID = 'legacy-dev-id';

        expect(getDevUserProfile().accountId).toBe('legacy-dev-id');
    });
});
