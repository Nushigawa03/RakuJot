import { findUserByEmail, createUser } from "~/features/auth/models/user.server";

/**
 * Development utility to get or create a default user.
 * This allows the app to function locally without full OAuth flow implementation yet.
 */
export const getDevUserId = async (): Promise<string> => {
    const devEmail = "dev@example.com";

    // Try to find existing dev user (via Models layer)
    const user = await findUserByEmail(devEmail);

    if (user) {
        return user.id;
    }

    // Create dev user if not exists (via Models layer)
    const newUser = await createUser({
        email: devEmail,
        name: "Dev User",
        googleId: "dev-google-id", // Dummy ID
    });

    return newUser.id;
};
