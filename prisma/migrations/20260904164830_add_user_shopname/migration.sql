-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shopName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_shopName_key" ON "User"("shopName");
