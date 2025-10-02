/*
  Warnings:

  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Filter` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Filter";

-- CreateTable
CREATE TABLE "TagExpression" (
    "id" TEXT NOT NULL,
    "orTerms" JSONB NOT NULL,
    "name" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "TagExpression_pkey" PRIMARY KEY ("id")
);
