import { Loading } from "~/components";
import Page from "~/features/memos/components/Page";
import { requirePageUser } from "~/features/auth/routeAuth.server";
import { offlineClientLoader } from "~/features/auth/offlineClientLoader";

export const loader = requirePageUser;
export const clientLoader = offlineClientLoader;
export const HydrateFallback = () => <Loading />;
export default Page;
