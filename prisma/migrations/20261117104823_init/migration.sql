-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FOUNDER', 'FINANCE_MANAGER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('BANK', 'PLATFORM', 'WALLET', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "PnlLine" AS ENUM ('OPERATIONS_OVERHEAD', 'OPERATIONS_SALARIES', 'MANAGEMENT', 'SALES_SALARIES', 'SALES_OVERHEAD');

-- CreateEnum
CREATE TYPE "TeamMemberType" AS ENUM ('PARTNER', 'EMPLOYEE', 'CONTRACTOR', 'BD');

-- CreateEnum
CREATE TYPE "CommissionBase" AS ENUM ('NET_REVENUE', 'GROSS_REVENUE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('INITIATED', 'PROCESSED', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "RevenueKind" AS ENUM ('BOOKED', 'STANDALONE');

-- CreateEnum
CREATE TYPE "AdjustmentKind" AS ENUM ('REDUCTION', 'WRITE_OFF');

-- CreateEnum
CREATE TYPE "FundingSource" AS ENUM ('COMPANY', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'CLOSE', 'REOPEN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "invitedById" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "singleton" VARCHAR(16) NOT NULL DEFAULT 'COMPANY',
    "name" VARCHAR(255) NOT NULL,
    "reportingCurrency" VARCHAR(3) NOT NULL,
    "displayCurrency" VARCHAR(3) NOT NULL,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitSplitVersion" (
    "id" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfitSplitVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfitSplitShare" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "splitPercent" DECIMAL(7,4) NOT NULL,

    CONSTRAINT "ProfitSplitShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReserveRuleVersion" (
    "id" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "reservePercent" DECIMAL(7,4) NOT NULL,
    "appliesInLossMonth" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReserveRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRuleVersion" (
    "id" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "ratePercent" DECIMAL(7,4) NOT NULL,
    "base" "CommissionBase" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "AccountType" NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "ownerLabel" VARCHAR(255),
    "openingBalance" DECIMAL(14,2) NOT NULL,
    "openingBalanceMonth" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFeeVersion" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "feePercent" DECIMAL(7,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFeeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "pnlLine" "PnlLine" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "TeamMemberType" NOT NULL,
    "defaultCategoryId" TEXT,
    "earnsCommission" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "rate" DECIMAL(14,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "defaultPlatformId" TEXT,
    "defaultFeePercent" DECIMAL(7,4),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "platformId" TEXT,
    "feePercentOverride" DECIMAL(7,4),
    "status" "ProjectStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueEntry" (
    "id" TEXT NOT NULL,
    "kind" "RevenueKind" NOT NULL DEFAULT 'BOOKED',
    "status" "EntryStatus" NOT NULL DEFAULT 'CONFIRMED',
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "platformId" TEXT,
    "bookingMonth" DATE NOT NULL,
    "description" VARCHAR(255),
    "gross" DECIMAL(14,2),
    "feePercent" DECIMAL(7,4) NOT NULL,
    "projectStatus" "ProjectStatus" NOT NULL,
    "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'INITIATED',
    "referredBy" VARCHAR(255),
    "closedByTeamMemberId" TEXT,
    "expectedDate" DATE,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "revenueEntryId" TEXT NOT NULL,
    "receivedOn" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "accountId" TEXT,
    "isEscrow" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivableAdjustment" (
    "id" TEXT NOT NULL,
    "revenueEntryId" TEXT NOT NULL,
    "adjustedOn" DATE NOT NULL,
    "postingMonth" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "kind" "AdjustmentKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivableAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'CONFIRMED',
    "expenseDate" DATE NOT NULL,
    "month" DATE NOT NULL,
    "categoryId" TEXT NOT NULL,
    "item" VARCHAR(255) NOT NULL,
    "payeeTeamMemberId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "fundingSource" "FundingSource" NOT NULL DEFAULT 'COMPANY',
    "fundingPartnerId" TEXT,
    "paidFromAccountId" TEXT,
    "recurringTemplateId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTemplate" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "item" VARCHAR(255) NOT NULL,
    "payeeTeamMemberId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "fundingSource" "FundingSource" NOT NULL DEFAULT 'COMPANY',
    "fundingPartnerId" TEXT,
    "paidFromAccountId" TEXT,
    "notes" TEXT,
    "frequency" "Frequency" NOT NULL DEFAULT 'MONTHLY',
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "startMonth" DATE NOT NULL,
    "endMonth" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" VARCHAR(64) NOT NULL,
    "entityId" VARCHAR(64) NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "LoginCode_userId_createdAt_idx" ON "LoginCode"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_singleton_key" ON "CompanySettings"("singleton");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_name_key" ON "Partner"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProfitSplitVersion_effectiveFrom_key" ON "ProfitSplitVersion"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ProfitSplitShare_versionId_partnerId_key" ON "ProfitSplitShare"("versionId", "partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReserveRuleVersion_effectiveFrom_key" ON "ReserveRuleVersion"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionRuleVersion_effectiveFrom_key" ON "CommissionRuleVersion"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Account_name_key" ON "Account"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_name_key" ON "Platform"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformFeeVersion_platformId_effectiveFrom_key" ON "PlatformFeeVersion"("platformId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_name_key" ON "TeamMember"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_month_key" ON "ExchangeRate"("month");

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_clientId_name_key" ON "Project"("clientId", "name");

-- CreateIndex
CREATE INDEX "RevenueEntry_bookingMonth_idx" ON "RevenueEntry"("bookingMonth");

-- CreateIndex
CREATE INDEX "RevenueEntry_clientId_idx" ON "RevenueEntry"("clientId");

-- CreateIndex
CREATE INDEX "Receipt_revenueEntryId_idx" ON "Receipt"("revenueEntryId");

-- CreateIndex
CREATE INDEX "ReceivableAdjustment_revenueEntryId_idx" ON "ReceivableAdjustment"("revenueEntryId");

-- CreateIndex
CREATE INDEX "ReceivableAdjustment_postingMonth_idx" ON "ReceivableAdjustment"("postingMonth");

-- CreateIndex
CREATE INDEX "Expense_month_idx" ON "Expense"("month");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_recurringTemplateId_month_key" ON "Expense"("recurringTemplateId", "month");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "LoginCode" ADD CONSTRAINT "LoginCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitSplitShare" ADD CONSTRAINT "ProfitSplitShare_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ProfitSplitVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitSplitShare" ADD CONSTRAINT "ProfitSplitShare_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformFeeVersion" ADD CONSTRAINT "PlatformFeeVersion_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_defaultCategoryId_fkey" FOREIGN KEY ("defaultCategoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_defaultPlatformId_fkey" FOREIGN KEY ("defaultPlatformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_closedByTeamMemberId_fkey" FOREIGN KEY ("closedByTeamMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_revenueEntryId_fkey" FOREIGN KEY ("revenueEntryId") REFERENCES "RevenueEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableAdjustment" ADD CONSTRAINT "ReceivableAdjustment_revenueEntryId_fkey" FOREIGN KEY ("revenueEntryId") REFERENCES "RevenueEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_payeeTeamMemberId_fkey" FOREIGN KEY ("payeeTeamMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_fundingPartnerId_fkey" FOREIGN KEY ("fundingPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidFromAccountId_fkey" FOREIGN KEY ("paidFromAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTemplate" ADD CONSTRAINT "RecurringTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTemplate" ADD CONSTRAINT "RecurringTemplate_payeeTeamMemberId_fkey" FOREIGN KEY ("payeeTeamMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTemplate" ADD CONSTRAINT "RecurringTemplate_fundingPartnerId_fkey" FOREIGN KEY ("fundingPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTemplate" ADD CONSTRAINT "RecurringTemplate_paidFromAccountId_fkey" FOREIGN KEY ("paidFromAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
