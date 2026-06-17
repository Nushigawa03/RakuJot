import { syncDevUser } from "~/features/auth/models/user.server";
import { getDevUserProfile } from "~/features/auth/config/authEnvironment.server";

/**
 * Development utility to get or create a default user.
 * This allows the app to function locally without full OAuth flow implementation yet.
 */
export const getDevUserId = async (): Promise<string> => {
    const devUser = getDevUserProfile();

    const user = await syncDevUser({
        email: devUser.email,
        name: devUser.name,
        accountId: devUser.accountId,
        picture: devUser.picture ?? undefined,
    });

    return user.id;
};
