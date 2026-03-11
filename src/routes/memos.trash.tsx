import React from 'react';
import type { LoaderFunction } from 'react-router';
import { requireAuthenticatedPageUserId } from '~/features/auth/utils/authMode.server';
import TrashPage from '~/features/memos/components/TrashPage/TrashPage';

export const loader: LoaderFunction = async ({ request }) => {
    await requireAuthenticatedPageUserId(request);
    return null;
};

export default function TrashRoute() {
    return <TrashPage />;
}
