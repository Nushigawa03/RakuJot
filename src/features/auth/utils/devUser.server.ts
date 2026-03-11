import { findUserByEmail, createUser } from "~/features/auth/models/user.server";
import { getDevUserProfile } from "~/features/auth/config/authEnvironment.server";

/**
 * Development utility to get or create a default user.
 * This allows the app to function locally without full OAuth flow implementation yet.
 */
export const getDevUserId = async (): Promise<string> => {
    const devUser = getDevUserProfile();

    // Try to find existing dev user (via Models layer)
    const user = await findUserByEmail(devUser.email);

    if (user) {
        return user.id;
    }

    // Create dev user if not exists (via Models layer)
    const newUser = await createUser({
        email: devUser.email,
        name: devUser.name,
        googleId: devUser.googleId,
        picture: devUser.picture ?? undefined,
    });

    return newUser.id;
};
