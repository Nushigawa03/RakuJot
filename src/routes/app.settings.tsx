import type { LoaderFunction } from "react-router";
import { requireAuthenticatedPageUserId } from "~/features/auth/utils/authMode.server";
import SettingsPage from "~/features/settings/components/SettingsPage";

export const loader: LoaderFunction = async ({ request }) => {
    await requireAuthenticatedPageUserId(request);
    return null;
};

export default function SettingsRoute() {
    return <SettingsPage />;
}
