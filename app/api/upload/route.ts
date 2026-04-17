import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/verify";
import { supabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const uploadSchema = z.object({
  bucket: z.enum(["profile_photos", "signal_media", "chat_media"]),
  filename: z.string().min(1).max(200),
  content_type: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
  ]),
  file_size: z.number().int().max(50 * 1024 * 1024), // 50MB max
});

// POST /api/upload — returns a signed upload URL
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json();
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { bucket, filename, content_type } = parsed.data;
  const ext = filename.split(".").pop() ?? "bin";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const publicUrl = supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  return NextResponse.json({
    signed_url: data.signedUrl,
    token: data.token,
    path,
    public_url: publicUrl,
    bucket,
  });
});
