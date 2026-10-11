/** サーバーにも保存する設定 */
export interface PersistedUserSettings {
  aiUsageEnabled: boolean;
  detailSearchAlwaysVisible: boolean;
}

/** 端末内（localStorage）だけに保存する設定 */
export interface Settings extends PersistedUserSettings {
  googleApiKey: string;
}

export const DEFAULT_PERSISTED_USER_SETTINGS: PersistedUserSettings = {
  aiUsageEnabled: true,
  detailSearchAlwaysVisible: false,
};

export const DEFAULT_SETTINGS: Settings = { ...DEFAULT_PERSISTED_USER_SETTINGS, googleApiKey: '' };

export const SETTINGS_KEY = 'rakujot_user_settings';

const PERSISTED_KEYS = Object.keys(DEFAULT_PERSISTED_USER_SETTINGS) as (keyof PersistedUserSettings)[];

export const isPersistedSettingsKey = (key: keyof Settings): key is keyof PersistedUserSettings =>
  (PERSISTED_KEYS as string[]).includes(key);

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const sanitizePersistedUserSettings = (value: unknown): PersistedUserSettings => {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(
    PERSISTED_KEYS.map((k) => [k, typeof source[k] === 'boolean' ? source[k] : DEFAULT_PERSISTED_USER_SETTINGS[k]]),
  ) as unknown as PersistedUserSettings;
};

/** 既知のキーだけを受け付け、型が違えば null */
export const sanitizePersistedUserSettingsPatch = (value: unknown): Partial<PersistedUserSettings> | null => {
  if (!isRecord(value)) return null;
  const patch: Partial<PersistedUserSettings> = {};
  for (const k of PERSISTED_KEYS) {
    if (!(k in value)) continue;
    if (typeof value[k] !== 'boolean') return null;
    patch[k] = value[k] as boolean;
  }
  return patch;
};
