"use server";

import { processMedia } from "@/lib/media/process-media";
import { createClient } from "@/lib/server";
import { revalidatePath } from "next/cache";

export async function uploadMediaAction(formData: FormData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("You must be loggedin to upload files.");
    }

    const file = formData.get("mediaFile") as File;

    if (!file) {
      throw new Error("No file was uploaded.");
    }

    const fileExtention = file.name.split(".").pop();
    const uniqueFileName = `${user.id}-${Date.now()}.${fileExtention}`;

    const { error: uploadError } = await supabase.storage
      .from("media-uploads")
      .upload(uniqueFileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.log("Storage Error: ", uploadError);
      throw new Error("Failed to upload file to the storage");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("media-uploads").getPublicUrl(uniqueFileName);

    const { data: dbData, error: dbError } = await supabase
      .from("media_posts")
      .insert({
        user_id: user.id,
        title: file.name,
        source_type: "upload",
        file_url: publicUrl,
        status: "pending",
      })
      .select()
      .single();
    if (dbError) {
      console.log("Database Error: ", dbError);
      throw new Error("Failed to save project details to the database.");
    }

    processMedia(dbData.id, publicUrl).catch((err) => {
      console.error("Failed to trigger media processing", err);
    });

    revalidatePath("/dashboard");

    return { success: true, project: dbData };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unknown error occurred";
    return { success: false, error: message };
  }
}
