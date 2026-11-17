-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('PROFIT_SHARE', 'RESERVE', 'WITHDRAWAL', 'FUNDING_IN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ExpenseKind" AS ENUM ('MANUAL', 'BD_COMMISSION', 'TRANSFER_FEE');

-- AlterTable
ALTER TABLE "CommissionRuleVersion" ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "kind" "ExpenseKind" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "paidOn" DATE,
ADD COLUMN     "transferId" TEXT;

-- CreateTable
CREATE TABLE "AccountBalance" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "closingBalance" DECIMAL(14,2) NOT NULL,
    "enteredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "transferredOn" DATE NOT NULL,
    "month" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "receivedAmount" DECIMAL(14,2) NOT NULL,
    "fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerLedgerEntry" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "occurredOn" DATE NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "accountId" TEXT,
    "note" TEXT,
    "periodId" TEXT,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NextMonthReserve" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "targetMonth" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NextMonthReserve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'OPEN',
    "snapshot" JSONB,
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "reopenedById" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountBalance_accountId_month_key" ON "AccountBalance"("accountId", "month");

-- CreateIndex
CREATE INDEX "Transfer_month_idx" ON "Transfer"("month");

-- CreateIndex
CREATE INDEX "PartnerLedgerEntry_partnerId_month_idx" ON "PartnerLedgerEntry"("partnerId", "month");

-- CreateIndex
CREATE INDEX "PartnerLedgerEntry_month_idx" ON "PartnerLedgerEntry"("month");

-- CreateIndex
CREATE INDEX "NextMonthReserve_month_idx" ON "NextMonthReserve"("month");

-- CreateIndex
CREATE UNIQUE INDEX "Period_month_key" ON "Period"("month");

-- CreateIndex
CREATE INDEX "Expense_paidOn_idx" ON "Expense"("paidOn");

-- AddForeignKey
ALTER TABLE "CommissionRuleVersion" ADD CONSTRAINT "CommissionRuleVersion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountBalance" ADD CONSTRAINT "AccountBalance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerLedgerEntry" ADD CONSTRAINT "PartnerLedgerEntry_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerLedgerEntry" ADD CONSTRAINT "PartnerLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerLedgerEntry" ADD CONSTRAINT "PartnerLedgerEntry_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE SET NULL ON UPDATE CASCADE;
