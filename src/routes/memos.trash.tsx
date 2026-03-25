import React from 'react';
import type { LoaderFunction, ClientLoaderFunctionArgs } from 'react-router';
import { requireAuthenticatedPageUserId } from '~/features/auth/utils/authMode.server';
import TrashPage from '~/features/memos/components/TrashPage/TrashPage';

export const loader: LoaderFunction = async ({ request }) => {
    await requireAuthenticatedPageUserId(request);
    return null;
};

export const clientLoader = async ({ serverLoader }: ClientLoaderFunctionArgs) => {
    if (navigator.onLine) {
        try {
            return await serverLoader();
        } catch {
            // サーバー失敗 → オフラインフォールバック
        }
    }
    return null;
};

clientLoader.hydrate = true as const;

export function HydrateFallback() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <p style={{ color: '#888', fontSize: '0.9rem' }}>読み込み中...</p>
        </div>
    );
}

export default function TrashRoute() {
    return <TrashPage />;
}
