export interface PersistedUserSettings {
    aiUsageEnabled: boolean;
}

export interface LocalOnlySettings {
    googleApiKey: string;
}

export interface Settings extends PersistedUserSettings, LocalOnlySettings {}

export const DEFAULT_PERSISTED_USER_SETTINGS: PersistedUserSettings = {
    aiUsageEnabled: true,
};

export const DEFAULT_LOCAL_ONLY_SETTINGS: LocalOnlySettings = {
    googleApiKey: '',
};

export const DEFAULT_SETTINGS: Settings = {
    ...DEFAULT_PERSISTED_USER_SETTINGS,
    ...DEFAULT_LOCAL_ONLY_SETTINGS,
};

export const SETTINGS_KEY = 'rakujot_user_settings';

export const PERSISTED_SETTINGS_KEYS = ['aiUsageEnabled'] as const;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const isPersistedSettingsKey = (
    key: keyof Settings
): key is (typeof PERSISTED_SETTINGS_KEYS)[number] => {
    return (PERSISTED_SETTINGS_KEYS as readonly string[]).includes(key);
};

export const sanitizePersistedUserSettings = (
    value: unknown
): PersistedUserSettings => {
    if (!isRecord(value)) {
        return { ...DEFAULT_PERSISTED_USER_SETTINGS };
    }

    return {
        aiUsageEnabled:
            typeof value.aiUsageEnabled === 'boolean'
                ? value.aiUsageEnabled
                : DEFAULT_PERSISTED_USER_SETTINGS.aiUsageEnabled,
    };
};

export const sanitizePersistedUserSettingsPatch = (
    value: unknown
): Partial<PersistedUserSettings> | null => {
    if (!isRecord(value)) {
        return null;
    }

    const patch: Partial<PersistedUserSettings> = {};

    if ('aiUsageEnabled' in value) {
        if (typeof value.aiUsageEnabled !== 'boolean') {
            return null;
        }
        patch.aiUsageEnabled = value.aiUsageEnabled;
    }

    return patch;
};