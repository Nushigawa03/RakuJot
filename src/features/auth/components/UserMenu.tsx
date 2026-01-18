import React, { useEffect, useState } from 'react';
import './UserMenu.css';

type User = {
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
};

type AuthState = {
    user: User | null;
    isDevMode: boolean;
    loading: boolean;
};

const UserMenu: React.FC = () => {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isDevMode: false,
        loading: true,
    });

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setAuthState({
                    user: data.user,
                    isDevMode: data.isDevMode,
                    loading: false,
                });
            } else {
                setAuthState({ user: null, isDevMode: false, loading: false });
            }
        } catch {
            setAuthState({ user: null, isDevMode: false, loading: false });
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    if (authState.loading) {
        return <div className="user-menu user-menu--loading">読み込み中...</div>;
    }

    if (!authState.user) {
        return null;
    }

    return (
        <div className="user-menu">
            <div className="user-menu__info">
                {authState.user.picture ? (
                    <img
                        src={authState.user.picture}
                        alt={authState.user.name || 'ユーザー'}
                        className="user-menu__avatar"
                    />
                ) : (
                    <div className="user-menu__avatar user-menu__avatar--placeholder">
                        {(authState.user.name || authState.user.email)[0].toUpperCase()}
                    </div>
                )}
                <div className="user-menu__details">
                    <span className="user-menu__name">
                        {authState.user.name || 'ユーザー'}
                    </span>
                    {authState.isDevMode && (
                        <span className="user-menu__badge user-menu__badge--dev">
                            開発モード
                        </span>
                    )}
                </div>
            </div>
            {!authState.isDevMode && (
                <button
                    className="user-menu__logout"
                    onClick={handleLogout}
                    title="ログアウト"
                >
                    ログアウト
                </button>
            )}
        </div>
    );
};

export default UserMenu;
