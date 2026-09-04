-- AlterTable: User gains shop-join fields (nullable for now; owners get a code, staff get an ownerId)
ALTER TABLE "User" ADD COLUMN     "shopCode" TEXT;
ALTER TABLE "User" ADD COLUMN     "ownerId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_shopCode_key" ON "User"("shopCode");

-- CreateIndex
CREATE INDEX "User_ownerId_idx" ON "User"("ownerId");

-- AddForeignKey (self-relation: staff -> owning user)
ALTER TABLE "User" ADD CONSTRAINT "User_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: add nullable ownerId columns ahead of backfill + NOT NULL pass
ALTER TABLE "Category" ADD COLUMN     "ownerId" INTEGER;
ALTER TABLE "Product" ADD COLUMN     "ownerId" INTEGER;
ALTER TABLE "Sale" ADD COLUMN     "ownerId" INTEGER;
