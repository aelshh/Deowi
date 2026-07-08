import { enqueueJob } from "@/lib/queue/enqueue";
import { createClient } from "@/lib/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const { storagePath }: { storagePath: string } = await request.json();

  if (!storagePath) {
    return NextResponse.json(
      { error: "Storage path is requred" },
      { status: 400 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("media-uploads").getPublicUrl(storagePath);

  const response = await fetch(publicUrl, { method: "HEAD" });
  if (!response.ok) throw new Error("File not found in storage");

  const fileName =
    storagePath.split("/").pop()?.replace(/^\d+-/, "") || "Untitled";

  const { data: dbData, error: dbError } = await supabase
    .from("media_posts")
    .insert({
      user_id: user.id,
      title: fileName,
      source_type: "upload",
      file_url: publicUrl,
      storage_path: storagePath,
      status: "pending",
    })
    .select()
    .single();

  if (dbError) {
    console.error("DB insert error: ", dbError);
    return NextResponse.json(
      {
        error: "Failed to save media record",
      },
      { status: 500 },
    );
  }

  const result = await enqueueJob({ postId: dbData.id, fileUrl: publicUrl });

  if (!result.success) {
    console.error("Enquue failed: ", result.error);
  }

  return NextResponse.json({ success: true, mediaId: dbData.id });
}
