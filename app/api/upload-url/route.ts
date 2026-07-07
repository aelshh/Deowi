import { createAdminClient, createClient } from "@/lib/server";
import { NextRequest, NextResponse } from "next/server";

const allowedExtenstions = ["mp3", "mp4", "wav", "mov", "m4a", "ogg", "webm"];
const allowedMimeTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
];
const maxFileSize = 52_428_800;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileName, fileSize, fileType } = await request.json();

  if (!fileName || !fileSize) {
    return NextResponse.json(
      { error: "fileName and fileSize required" },
      { status: 400 },
    );
  }

  if (fileSize > maxFileSize) {
    return NextResponse.json(
      { error: "File exceeds 50MB limit" },
      { status: 413 },
    );
  }

  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext || !allowedExtenstions.includes(ext)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${ext}`,
      },
      {
        status: 400,
      },
    );
  }

  if (fileType && !allowedMimeTypes.includes(fileType)) {
    return NextResponse.json(
      { error: "Unsupported file MIME type" },
      { status: 400 },
    );
  }

  // Rate limiting

  const { count: activeCount } = await supabase
    .from("media_posts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["pending", "generating"]);

  if (activeCount && activeCount > 3) {
    return NextResponse.json(
      {
        error: "You already have 3 jobs, wait for one to finish",
      },
      {
        status: 429,
      },
    );
  }

  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${user.id}/${Date.now()}-${sanitizedName}`;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.storage
    .from("media-uploads")
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    console.error("Signed URl error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate upload URL",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    storagePath: data.path,
  });
}
