-- Category: enforce ownerId, scope name uniqueness per shop
ALTER TABLE "Category" ALTER COLUMN "ownerId" SET NOT NULL;
DROP INDEX "Category_name_key";
CREATE UNIQUE INDEX "Category_ownerId_name_key" ON "Category"("ownerId", "name");
ALTER TABLE "Category" ADD CONSTRAINT "Category_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Product: enforce ownerId, scope sku uniqueness per shop
ALTER TABLE "Product" ALTER COLUMN "ownerId" SET NOT NULL;
DROP INDEX "Product_sku_key";
CREATE UNIQUE INDEX "Product_ownerId_sku_key" ON "Product"("ownerId", "sku");
ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sale: enforce ownerId, scope code uniqueness per shop
ALTER TABLE "Sale" ALTER COLUMN "ownerId" SET NOT NULL;
DROP INDEX "Sale_code_key";
CREATE UNIQUE INDEX "Sale_ownerId_code_key" ON "Sale"("ownerId", "code");
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
