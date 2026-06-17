-- Split external login identities from the local application user.
-- Existing Google identities are copied into Account before User.googleId is removed.

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "picture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Account" (
    "id",
    "userId",
    "provider",
    "providerAccountId",
    "email",
    "emailVerified",
    "name",
    "picture",
    "createdAt",
    "updatedAt"
)
SELECT
    'acct_' || md5("id" || ':' || "googleId"),
    "id",
    'google',
    "googleId",
    "email",
    true,
    "name",
    "picture",
    "createdAt",
    "updatedAt"
FROM "User";

INSERT INTO "Account" (
    "id",
    "userId",
    "provider",
    "providerAccountId",
    "email",
    "emailVerified",
    "name",
    "picture",
    "createdAt",
    "updatedAt"
)
SELECT
    'acct_' || md5("id" || ':dev:' || "googleId"),
    "id",
    'dev',
    "googleId",
    "email",
    true,
    "name",
    "picture",
    "createdAt",
    "updatedAt"
FROM "User"
WHERE "googleId" = 'dev-google-id' OR "email" = 'dev@example.com';

DROP INDEX "User_googleId_key";
DROP INDEX "User_email_key";

ALTER TABLE "User" DROP COLUMN "googleId";
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Account_email_idx" ON "Account"("email");
CREATE INDEX "User_email_idx" ON "User"("email");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
