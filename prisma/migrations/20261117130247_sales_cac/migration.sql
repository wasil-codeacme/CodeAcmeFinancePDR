-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('UPWORK', 'COLD_EMAIL', 'COLD_CALL', 'LINKEDIN', 'OTHER');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "salesChannel" "SalesChannel";

-- AlterTable
ALTER TABLE "RecurringTemplate" ADD COLUMN     "salesChannel" "SalesChannel";

-- CreateTable
CREATE TABLE "SalesActivity" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "channel" "SalesChannel" NOT NULL,
    "interestedResponses" INTEGER NOT NULL DEFAULT 0,
    "leadsClosed" INTEGER NOT NULL DEFAULT 0,
    "callsMade" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesActivity_month_channel_key" ON "SalesActivity"("month", "channel");
