/**
 * 同期状態インジケーター
 * ヘッダーバーに表示するコンパクトなアイコン
 */

import React from 'react';
import { useSyncStatus } from './useSyncStatus';
import './SyncStatusIndicator.css';

export const SyncStatusIndicator: React.FC = () => {
  const { syncState } = useSyncStatus();

  const config = {
    idle: { icon: '🟢', label: 'オンライン', className: 'sync-idle' },
    syncing: { icon: '🔄', label: '同期中...', className: 'sync-syncing' },
    offline: { icon: '🔴', label: 'オフライン', className: 'sync-offline' },
    error: { icon: '⚠️', label: '同期エラー', className: 'sync-error' },
  }[syncState];

  return (
    <div
      className={`sync-status-indicator ${config.className}`}
      title={config.label}
      role="status"
      aria-label={config.label}
    >
      <span className="sync-status-icon">{config.icon}</span>
      <span className="sync-status-label">{config.label}</span>
    </div>
  );
};
