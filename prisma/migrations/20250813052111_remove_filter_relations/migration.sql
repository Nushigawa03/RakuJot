/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Filter` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Filter` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Filter` table. All the data in the column will be lost.
  - You are about to drop the `_CategoryTags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_FilterTags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CategoryTags" DROP CONSTRAINT "_CategoryTags_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryTags" DROP CONSTRAINT "_CategoryTags_B_fkey";

-- DropForeignKey
ALTER TABLE "_FilterTags" DROP CONSTRAINT "_FilterTags_A_fkey";

-- DropForeignKey
ALTER TABLE "_FilterTags" DROP CONSTRAINT "_FilterTags_B_fkey";

-- AlterTable
ALTER TABLE "Filter" DROP COLUMN "createdAt",
DROP COLUMN "name",
DROP COLUMN "updatedAt";

-- DropTable
DROP TABLE "_CategoryTags";

-- DropTable
DROP TABLE "_FilterTags";
