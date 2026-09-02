import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { supabase, PRODUCT_IMAGE_BUCKET } from "@/lib/supabase";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function POST(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });

  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 413 });

  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(filename, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      cacheControl: "31536000",
    });
  if (error) return NextResponse.json({ error: "upload_failed" }, { status: 502 });

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(filename);

  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
