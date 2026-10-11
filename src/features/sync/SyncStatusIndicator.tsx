import { useSyncExternalStore } from 'react';
import { getSyncState, subscribeSyncState, type SyncState } from './syncService';

const LABELS: Record<SyncState, [icon: string, label: string]> = {
  idle: ['🟢', 'オンライン'],
  syncing: ['🔄', '同期中...'],
  offline: ['🔴', 'オフライン'],
  error: ['⚠️', '同期エラー'],
  unauthenticated: ['👤', 'ローカルモード'],
};

export const SyncStatusIndicator = () => {
  const state = useSyncExternalStore(subscribeSyncState, getSyncState, () => 'idle' as SyncState);
  const [icon, label] = LABELS[state];
  return (
    <div className={`sync-status sync-status--${state}`} title={label} role="status" aria-label={label}>
      <span className="sync-status__icon">{icon}</span>
      <span>{label}</span>
    </div>
  );
};
