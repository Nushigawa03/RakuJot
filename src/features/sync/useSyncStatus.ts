/**
 * 同期状態を React コンポーネントに公開するフック
 */

import { useState, useEffect } from 'react';
import { getSyncState, subscribeSyncState, type SyncState } from './syncService';

export const useSyncStatus = () => {
  const [state, setState] = useState<SyncState>(getSyncState);

  useEffect(() => {
    return subscribeSyncState(setState);
  }, []);

  return {
    syncState: state,
    isOnline: state !== 'offline',
    isSyncing: state === 'syncing',
    isError: state === 'error',
    isIdle: state === 'idle',
    isUnauthenticated: state === 'unauthenticated',
  };
};
