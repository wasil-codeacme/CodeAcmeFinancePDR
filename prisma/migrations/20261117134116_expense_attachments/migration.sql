-- CreateTable
CREATE TABLE "ExpenseAttachment" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "ExpenseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseAttachment_expenseId_idx" ON "ExpenseAttachment"("expenseId");

-- AddForeignKey
ALTER TABLE "ExpenseAttachment" ADD CONSTRAINT "ExpenseAttachment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
