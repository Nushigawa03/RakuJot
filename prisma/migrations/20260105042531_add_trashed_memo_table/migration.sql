-- CreateTable
CREATE TABLE "TrashedMemo" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT,
    "tagNames" TEXT[],
    "body" TEXT,
    "embedding" JSONB,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrashedMemo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrashedMemo_originalId_key" ON "TrashedMemo"("originalId");

-- CreateIndex
CREATE INDEX "TrashedMemo_deletedAt_idx" ON "TrashedMemo"("deletedAt");
