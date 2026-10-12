import { useSyncExternalStore } from 'react';
import { Icon, type IconName } from '~/components';
import { getSyncState, subscribeSyncState, type SyncState } from './syncService';

const LABELS: Record<SyncState, [icon: IconName, label: string]> = {
  idle: ['cloud', 'オンライン'],
  syncing: ['refresh', '同期中...'],
  offline: ['cloud-off', 'オフライン'],
  error: ['alert', '同期エラー'],
  unauthenticated: ['user', 'ローカルモード'],
};

export const SyncStatusIndicator = () => {
  const state = useSyncExternalStore(subscribeSyncState, getSyncState, () => 'idle' as SyncState);
  const [icon, label] = LABELS[state];
  return (
    <div className={`sync-status sync-status--${state}`} title={label} role="status" aria-label={label}>
      <Icon name={icon} className="sync-status__icon" />
      <span>{label}</span>
    </div>
  );
};
