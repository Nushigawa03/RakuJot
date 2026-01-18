/*
  Warnings:

  - A unique constraint covering the columns `[name,userId]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[originalId,userId]` on the table `TrashedMemo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Memo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Tag` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `TagExpression` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `TrashedMemo` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Tag_name_key";

-- DropIndex
DROP INDEX "TrashedMemo_originalId_key";

-- AlterTable
ALTER TABLE "Memo" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TagExpression" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TrashedMemo" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "picture" TEXT,
    "googleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "Memo_userId_idx" ON "Memo"("userId");

-- CreateIndex
CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_userId_key" ON "Tag"("name", "userId");

-- CreateIndex
CREATE INDEX "TagExpression_userId_idx" ON "TagExpression"("userId");

-- CreateIndex
CREATE INDEX "TrashedMemo_userId_idx" ON "TrashedMemo"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrashedMemo_originalId_userId_key" ON "TrashedMemo"("originalId", "userId");

-- AddForeignKey
ALTER TABLE "Memo" ADD CONSTRAINT "Memo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagExpression" ADD CONSTRAINT "TagExpression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrashedMemo" ADD CONSTRAINT "TrashedMemo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
