export type Category = { id: number; name: string; nameEn: string | null; _count?: { products: number } };

export type Product = {
  id: number;
  sku: string;
  name: string;
  nameEn: string | null;
  price: number;
  cost: number;
  stock: number;
  lowStock: number;
  imageUrl: string | null;
  active: boolean;
  categoryId: number | null;
  category?: Category | null;
};

export type SaleItem = {
  id: number;
  productId: number | null;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type Sale = {
  id: number;
  code: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  total: number;
  received: number;
  change: number;
  payMethod: string;
  items: SaleItem[];
  user: { displayName: string } | null;
};
