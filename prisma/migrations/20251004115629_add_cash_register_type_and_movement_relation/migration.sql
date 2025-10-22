-- CreateEnum
CREATE TYPE "public"."CashRegisterType" AS ENUM ('SALES', 'EXPENSE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."CashMovementType" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "public"."CashMovementType" ADD VALUE 'TRANSFER_OUT';

-- DropForeignKey
ALTER TABLE "public"."CashMovement" DROP CONSTRAINT "CashMovement_sessionId_fkey";

-- AlterTable
ALTER TABLE "public"."CashMovement" ADD COLUMN     "cashRegisterId" TEXT,
ALTER COLUMN "sessionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."CashRegister" ADD COLUMN     "type" "public"."CashRegisterType" NOT NULL DEFAULT 'SALES';

-- AddForeignKey
ALTER TABLE "public"."CashMovement" ADD CONSTRAINT "CashMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."CashRegisterSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CashMovement" ADD CONSTRAINT "CashMovement_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "public"."CashRegister"("id") ON DELETE SET NULL ON UPDATE CASCADE;
