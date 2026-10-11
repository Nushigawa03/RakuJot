import { Link } from 'react-router';
import { setLoggedOut } from '~/features/sync/syncService';
import { displayName, useCurrentUser, type CurrentUser } from '../currentUser';

const Avatar = ({ user }: { user: CurrentUser }) =>
  user.picture
    ? <img src={user.picture} alt={displayName(user)} className="avatar" />
    : <span className="avatar avatar--placeholder">{displayName(user)[0].toUpperCase()}</span>;

const logout = async () => {
  try {
    await setLoggedOut(); // ユーザー DB を削除して匿名 DB に切替
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_API_CACHE' });
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

/** PC サイドバー下部: ユーザー情報（クリックで設定）とログアウト */
const UserMenu = () => {
  const { user, isDevMode, loading } = useCurrentUser();
  if (loading) return <div className="user-menu muted">読み込み中...</div>;
  if (!user) {
    return <div className="user-menu"><Link className="btn btn--primary btn--sm" to="/login">ログイン</Link></div>;
  }
  return (
    <div className="user-menu">
      <Link className="user-menu__info" to="/app/settings" title="設定を開く">
        <Avatar user={user} />
        <span className="user-menu__name">
          {displayName(user)}
          {isDevMode && <span className="badge">開発モード</span>}
        </span>
      </Link>
      {!isDevMode && <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>ログアウト</button>}
    </div>
  );
};

export default UserMenu;

/** スマホのナビバー右端: ログイン済みなら設定へ、未ログインならログインへ */
export const UserAvatarButton = () => {
  const { user } = useCurrentUser();
  return (
    <Link className="icon-btn" to={user ? '/app/settings' : '/login'} title={user ? displayName(user) : 'ログイン'} aria-label={user ? 'ユーザー設定' : 'ログイン'}>
      {user ? <Avatar user={user} /> : '👤'}
    </Link>
  );
};
