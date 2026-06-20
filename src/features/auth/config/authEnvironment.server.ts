export type AuthMode = 'dev' | 'google';

export type DevUserProfile = {
    email: string;
    name: string;
    accountId: string;
    picture: string | null;
};

export type PublicAuthConfig = {
    authMode: AuthMode;
    isDevMode: boolean;
    googleClientId: string;
    googleAuthAvailable: boolean;
};

const DEFAULT_DEV_USER_PROFILE: DevUserProfile = {
    email: 'dev@example.com',
    name: 'Dev User',
    accountId: 'dev-google-id',
    picture: null,
};

const getEnv = (key: string): string => {
    return process.env[key]?.trim() ?? '';
};

const getRequiredEnv = (key: string): string => {
    const value = getEnv(key);
    if (!value) {
        throw new Error(`${key} is not configured`);
    }
    return value;
};

export const getAuthMode = (): AuthMode => {
    const mode = getEnv('AUTH_MODE').toLowerCase();
    return mode === 'dev' ? 'dev' : 'google';
};

export const isGoogleAuthAvailable = (): boolean => {
    return Boolean(getEnv('GOOGLE_CLIENT_ID') || getEnv('VITE_GOOGLE_CLIENT_ID'));
};

export const getDevUserProfile = (): DevUserProfile => {
    return {
        email: getEnv('AUTH_DEV_USER_EMAIL') || DEFAULT_DEV_USER_PROFILE.email,
        name: getEnv('AUTH_DEV_USER_NAME') || DEFAULT_DEV_USER_PROFILE.name,
        accountId:
            getEnv('AUTH_DEV_USER_ACCOUNT_ID') ||
            getEnv('AUTH_DEV_USER_GOOGLE_ID') ||
            DEFAULT_DEV_USER_PROFILE.accountId,
        picture: getEnv('AUTH_DEV_USER_PICTURE') || null,
    };
};

export const getGoogleClientId = (): string => {
    return getEnv('GOOGLE_CLIENT_ID') || getEnv('VITE_GOOGLE_CLIENT_ID');
};

export const getSessionSecret = (): string => {
    return getRequiredEnv('SESSION_SECRET');
};

export const getPublicAuthConfig = (): PublicAuthConfig => {
    const authMode = getAuthMode();
    const googleClientId = getGoogleClientId();

    return {
        authMode,
        isDevMode: authMode === 'dev',
        googleClientId,
        googleAuthAvailable: Boolean(googleClientId),
    };
};
