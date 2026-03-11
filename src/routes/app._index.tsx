import type { LoaderFunction } from "react-router";
import { requireAuthenticatedPageUserId } from "~/features/auth/utils/authMode.server";
import Page from "~/features/memos/components/Page";

export const loader: LoaderFunction = async ({ request }) => {
	await requireAuthenticatedPageUserId(request);
	return null;
};

export default Page;