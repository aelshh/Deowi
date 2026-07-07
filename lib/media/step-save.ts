import { createAdminClient } from "../server";

export type SaveResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

export async function stepSave(
  mediaId: string,
  data: {
    blogPost: string;
    newsletter: string;
    xHooks: string[];
    linkedinHooks: string[];
    chapters: { timestamp: string; title: string }[];
  },
): Promise<SaveResult> {
  console.log(`Step:save, saving marketing kit for media: ${mediaId}`);

  const supabaseAdmin = createAdminClient();

  const { error: insertKitError } = await supabaseAdmin
    .from("marketing_kits")
    .insert({
      post_id: mediaId,
      blog_post: data.blogPost,
      newsletter: data.newsletter,
      social_hooks: {
        x_hooks: data.xHooks,
        linkedin_hooks: data.linkedinHooks,
      },
      chapters: data.chapters,
    });

  if (insertKitError) {
    return { success: false, error: insertKitError.message };
  }

  const { error: updateError } = await supabaseAdmin
    .from("media_posts")
    .update({
      status: "completed",
    })
    .eq("id", mediaId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  console.log(`step:save, marketing kit saved for ${mediaId}`);
  return { success: true };
}
