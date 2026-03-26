import { useState, useEffect } from 'react';
import {
    DEFAULT_SETTINGS,
    SETTINGS_KEY,
    isPersistedSettingsKey,
    type Settings,
} from '../settings';

type SettingsApiResponse = {
    settings: Pick<Settings, 'aiUsageEnabled' | 'detailSearchAlwaysVisible'>;
    hasStoredSettings: boolean;
};

const loadLocalSettings = (): Partial<Settings> => {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (!stored) {
            return {};
        }

        const parsed = JSON.parse(stored);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }

        return parsed as Partial<Settings>;
    } catch (error) {
        console.error('Failed to load settings from localStorage:', error);
        return {};
    }
};

const saveLocalSettings = (settings: Settings) => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Failed to save settings to localStorage:', error);
    }
};

const persistServerSettings = async (settings: Partial<Pick<Settings, 'aiUsageEnabled' | 'detailSearchAlwaysVisible'>>) => {
    const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
    });

    if (!response.ok) {
        throw new Error('Failed to persist settings');
    }
};

export function useSettings() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const localSettings = loadLocalSettings();
        const mergedLocalSettings = { ...DEFAULT_SETTINGS, ...localSettings };

        setSettings(mergedLocalSettings);

        const loadSettings = async () => {
            try {
                const response = await fetch('/api/settings');

                if (!response.ok) {
                    throw new Error('Failed to load server settings');
                }

                const data = (await response.json()) as SettingsApiResponse;

                const mergedSettings: Settings = {
                    ...DEFAULT_SETTINGS,
                    ...data.settings,
                    googleApiKey: mergedLocalSettings.googleApiKey,
                };

                setSettings(mergedSettings);
                saveLocalSettings(mergedSettings);

                if (!data.hasStoredSettings) {
                    const initialPatch: Partial<Pick<Settings, 'aiUsageEnabled' | 'detailSearchAlwaysVisible'>> = {};

                    if (typeof localSettings.aiUsageEnabled === 'boolean') {
                        initialPatch.aiUsageEnabled = localSettings.aiUsageEnabled;
                    }

                    if (typeof localSettings.detailSearchAlwaysVisible === 'boolean') {
                        initialPatch.detailSearchAlwaysVisible = localSettings.detailSearchAlwaysVisible;
                    }

                    if (Object.keys(initialPatch).length > 0) {
                        await persistServerSettings(initialPatch);
                    }
                }
            } catch (error) {
                console.error('Failed to load settings from server:', error);
                setSettings(mergedLocalSettings);
            } finally {
                setIsLoaded(true);
            }
        };

        void loadSettings();
    }, []);

    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings((prev): Settings => {
            const newSettings = { ...prev, [key]: value };

            saveLocalSettings(newSettings);

            if (isPersistedSettingsKey(key)) {
                void persistServerSettings({ [key]: value }).catch((error) => {
                    console.error('Failed to save settings to server:', error);
                });
            }

            return newSettings;
        });
    };

    return {
        settings,
        updateSetting,
        isLoaded,
    };
}
