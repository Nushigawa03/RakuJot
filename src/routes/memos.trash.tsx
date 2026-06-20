import React from 'react';
import TrashPage from '~/features/memos/components/TrashPage/TrashPage';

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
