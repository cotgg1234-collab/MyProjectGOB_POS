import { createClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as unknown as { supabase?: ReturnType<typeof createClient> };

export const PRODUCT_IMAGE_BUCKET = "product-images";

export const supabase =
  globalForSupabase.supabase ??
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

if (process.env.NODE_ENV !== "production") globalForSupabase.supabase = supabase;
