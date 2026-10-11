import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from '@react-oauth/google';
import { useEffect, useState } from 'react';
import { Link, redirect, useLoaderData, useNavigate } from 'react-router';
import type { LoaderFunction, MetaFunction } from 'react-router';
import { getCurrentUser } from '~/features/auth/utils/authMode.server';
import { getPublicAuthConfig } from '~/features/auth/config/authEnvironment.server';
import { PasskeyLoginButton } from '~/features/auth/components/PasskeyButtons';
import { setLoggedIn, performSync } from '~/features/sync/syncService';

type LoaderData = ReturnType<typeof getPublicAuthConfig>;

export const meta: MetaFunction = () => {
    return [
        { title: 'ログイン | RakuJot' },
        { name: 'description', content: 'GoogleアカウントまたはパスキーでRakuJotへログインします。' },
    ];
};

export const loader: LoaderFunction = async ({ request }) => {
    const currentUser = await getCurrentUser(request);
    if (currentUser) {
        throw redirect('/app');
    }

    return Response.json(getPublicAuthConfig());
};

export default function LoginRoute() {
    const navigate = useNavigate();
    const { googleClientId, googleAuthAvailable, isDevMode } = useLoaderData() as LoaderData;
    const [mounted, setMounted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    // ログイン成功：匿名データをユーザー DB に移行して同期
    const onLoggedIn = async (userId: string) => {
        await setLoggedIn(userId);
        performSync().catch(console.error);
        navigate('/app');
    };

    const handleGoogleSuccess = async (response: CredentialResponse) => {
        if (!response.credential) {
            setErrorMessage('Google認証トークンを取得できませんでした。');
            return;
        }

        try {
            setIsSubmitting(true);
            setErrorMessage('');

            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ credential: response.credential }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'ログインに失敗しました。');
            }

            await onLoggedIn(data.user.id);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'ログインに失敗しました。');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
            <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12 lg:flex-row lg:items-center lg:gap-16">
                <section className="mb-10 max-w-2xl lg:mb-0">
                    <Link to="/" className="mb-8 inline-flex items-center gap-3 text-sm text-slate-300 transition hover:text-white">
                        <span className="rounded-full border border-white/15 px-3 py-1">RakuJot</span>
                        トップへ戻る
                    </Link>
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                        RakuJot にログイン
                    </h1>
                </section>

                <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
                    {isDevMode ? (
                        <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                            🛠 開発モード（AUTH_MODE=google で切替）
                        </div>
                    ) : !googleAuthAvailable ? (
                        <div className="rounded-2xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm text-rose-100">
                            ⚠ GOOGLE_CLIENT_ID と VITE_GOOGLE_CLIENT_ID が未設定
                        </div>
                    ) : (
                            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                                {mounted ? (
                                    <GoogleOAuthProvider clientId={googleClientId}>
                                        <div className="flex justify-center">
                                            <GoogleLogin
                                                onSuccess={handleGoogleSuccess}
                                                onError={() => setErrorMessage('Google認証の開始に失敗しました。')}
                                                useOneTap={false}
                                                theme="outline"
                                                shape="pill"
                                                size="large"
                                                text="signin_with"
                                            />
                                        </div>
                                    </GoogleOAuthProvider>
                                ) : (
                                    <div className="h-11 animate-pulse rounded-full bg-white/10" />
                                )}
                            </div>
                    )}

                    {/* パスキーログイン */}
                    {!isDevMode && (
                        <div className="mt-4">
                            {googleAuthAvailable && (
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <hr className="flex-1 border-white/10" />
                                    <span>または</span>
                                    <hr className="flex-1 border-white/10" />
                                </div>
                            )}
                            <div className="mt-3 flex justify-center">
                                <PasskeyLoginButton
                                    onSuccess={(user) => onLoggedIn(user.id)}
                                    onError={setErrorMessage}
                                />
                            </div>
                        </div>
                    )}

                    {isSubmitting && <p className="mt-4 text-sm text-slate-300">ログインしています...</p>}
                    {errorMessage && <p className="mt-4 text-sm text-rose-200">{errorMessage}</p>}
                </section>
            </div>
        </div>
    );
}
