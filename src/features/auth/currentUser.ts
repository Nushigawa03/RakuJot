import { useEffect, useState } from 'react';

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
};

type AuthState = { user: CurrentUser | null; isDevMode: boolean };

let cached: Promise<AuthState> | null = null;

/** /api/auth/me の結果をページ内で1回だけ取得して共有する */
const fetchCurrentUser = (): Promise<AuthState> =>
  (cached ??= fetch('/api/auth/me')
    .then((res) => (res.ok ? res.json() : { user: null, isDevMode: false }))
    .catch(() => ({ user: null, isDevMode: false })));

export function useCurrentUser() {
  const [state, setState] = useState<AuthState & { loading: boolean }>({ user: null, isDevMode: false, loading: true });
  useEffect(() => {
    let alive = true;
    fetchCurrentUser().then((s) => alive && setState({ ...s, loading: false }));
    return () => { alive = false; };
  }, []);
  return state;
}

export const displayName = (user: CurrentUser) => user.name || user.email || 'ユーザー';
