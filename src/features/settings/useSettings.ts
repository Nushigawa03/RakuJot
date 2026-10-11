import { useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, SETTINGS_KEY, isPersistedSettingsKey, type PersistedUserSettings, type Settings } from './settings';

/**
 * 設定はモジュール単位で1つだけ保持する。localStorage を即時に反映し、
 * ログイン済みならサーバー保存分（APIキー以外）で上書きする。
 */
let settings: Settings = DEFAULT_SETTINGS;
let loaded = false;
let loadStarted = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((fn) => fn());

const readLocal = (): Partial<Settings> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeLocal = () => {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
};

const persist = (patch: Partial<PersistedUserSettings>) =>
  fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    .then((r) => { if (!r.ok) throw new Error('Failed to persist settings'); });

const load = async () => {
  if (loadStarted || typeof window === 'undefined') return;
  loadStarted = true;
  const local = readLocal();
  settings = { ...DEFAULT_SETTINGS, ...local };
  emit();
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data: { settings: PersistedUserSettings; hasStoredSettings: boolean } = await res.json();
      settings = { ...settings, ...data.settings };
      writeLocal();
      // 初回はローカルで設定済みの値をサーバーへ引き継ぐ
      if (!data.hasStoredSettings) {
        const patch = Object.fromEntries(
          Object.entries(local).filter(([k, v]) => isPersistedSettingsKey(k as keyof Settings) && typeof v === 'boolean'),
        );
        if (Object.keys(patch).length) await persist(patch);
      }
    }
  } catch (error) {
    console.warn('Failed to load settings from server:', error);
  } finally {
    loaded = true;
    emit();
  }
};

/** React 外（サービス層）から現在の設定を読む */
export const getSettings = (): Settings => {
  void load();
  return settings;
};

export const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
  settings = { ...settings, [key]: value };
  writeLocal();
  emit();
  if (isPersistedSettingsKey(key)) {
    persist({ [key]: value }).catch((error) => console.error('Failed to save settings to server:', error));
  }
};

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  void load();
  return () => listeners.delete(fn);
};

export function useSettings() {
  const current = useSyncExternalStore(subscribe, () => settings, () => DEFAULT_SETTINGS);
  const isLoaded = useSyncExternalStore(subscribe, () => loaded, () => false);
  return { settings: current, updateSetting, isLoaded };
}
