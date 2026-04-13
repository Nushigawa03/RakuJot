import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse } from '@react-oauth/google';
import { useEffect, useState } from 'react';
import { Link, redirect, useLoaderData, useNavigate } from 'react-router';
import type { LoaderFunction, MetaFunction } from 'react-router';
import { getCurrentUser } from '~/features/auth/utils/authMode.server';
import { getPublicAuthConfig } from '~/features/auth/config/authEnvironment.server';
import { BiometricLoginButton } from '~/features/auth/components/BiometricAuthButton';
import { setLoggedIn, performSync } from '~/features/sync/syncService';

type LoaderData = ReturnType<typeof getPublicAuthConfig>;

export const meta: MetaFunction = () => {
    return [
        { title: 'ログイン | RakuJot' },
        { name: 'description', content: 'Googleアカウントで安全にRakuJotへログインします。' },
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

            // ログイン成功：匿名データをユーザーDBに移行して同期
            if (data.user?.id) {
                await setLoggedIn(data.user.id);
                performSync().catch(console.error);
            }

            navigate('/app');
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
                        Googleアカウントで安全にログイン
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-slate-300">
                        RakuJot は ID とパスワードを独自に保持しません。Google 認証だけを使い、ログイン後は署名付きセッションでアクセスを保護します。
                    </p>
                    <ul className="mt-8 space-y-4 text-sm text-slate-300">
                        <li>• パスワード入力フォームなし</li>
                        <li>• Google ID トークンをサーバー側で検証</li>
                        <li>• セッション Cookie は署名付き</li>
                    </ul>
                </section>

                <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
                    <div className="mb-6">
                        <p className="text-sm uppercase tracking-[0.3em] text-indigo-200">Sign in</p>
                        <h2 className="mt-2 text-2xl font-semibold">RakuJot に入る</h2>
                    </div>

                    {isDevMode ? (
                        <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                            現在は開発モードです。.env.local の `AUTH_MODE` を `google` にすると Google ログイン画面を確認できます。
                        </div>
                    ) : !googleAuthAvailable ? (
                        <div className="rounded-2xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm text-rose-100">
                            Google ログインを表示するには [.env.local](.env.local) の `GOOGLE_CLIENT_ID` と `VITE_GOOGLE_CLIENT_ID` を設定してください。
                        </div>
                    ) : (
                        <>
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

                            <p className="mt-4 text-xs text-slate-400">
                                Google 側の同意が完了すると、そのまま RakuJot に戻ります。
                            </p>
                        </>
                    )}

                    {/* 生体認証ログイン */}
                    {!isDevMode && googleAuthAvailable && (
                        <div className="mt-4">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <hr className="flex-1 border-white/10" />
                                <span>または</span>
                                <hr className="flex-1 border-white/10" />
                            </div>
                            <div className="mt-3 flex justify-center">
                            <BiometricLoginButton
                                    onSuccess={async (user?: any) => {
                                        // 生体認証ログイン成功：匿名データを移行して同期
                                        if (user?.id) {
                                            await setLoggedIn(user.id);
                                            performSync().catch(console.error);
                                        }
                                        navigate('/app');
                                    }}
                                    onError={(error) => setErrorMessage(error)}
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