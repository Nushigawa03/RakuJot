import { useState, useEffect } from 'react';

// Defines the shape of our settings
export interface Settings {
    aiUsageEnabled: boolean;
    googleApiKey: string;
    // We can add more settings here in the future
}

// Default settings if none exist in localStorage
const DEFAULT_SETTINGS: Settings = {
    aiUsageEnabled: true,
    googleApiKey: '',
};

const SETTINGS_KEY = 'rakujot_user_settings';

export function useSettings() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load settings from localStorage on initial render
    useEffect(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
            }
        } catch (error) {
            console.error('Failed to load settings from localStorage:', error);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Function to update a specific setting
    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings((prev) => {
            const newSettings = { ...prev, [key]: value };
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
            } catch (error) {
                console.error('Failed to save settings to localStorage:', error);
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
