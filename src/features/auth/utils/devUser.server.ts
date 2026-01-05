import { prisma } from "~/db.server";

/**
 * Development utility to get or create a default user.
 * This allows the app to function locally without full OAuth flow implementation yet.
 */
export const getDevUserId = async (): Promise<string> => {
    const devEmail = "dev@example.com";

    // Try to find existing dev user
    const user = await prisma.user.findUnique({
        where: { email: devEmail },
    });

    if (user) {
        return user.id;
    }

    // Create dev user if not exists
    const newUser = await prisma.user.create({
        data: {
            email: devEmail,
            name: "Dev User",
            googleId: "dev-google-id", // Dummy ID
        },
    });

    return newUser.id;
};
