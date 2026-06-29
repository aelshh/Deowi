import "server-only";

import { createClient } from "@/lib/server";
import { redirect } from "next/navigation";

export async function verifySession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  return { userId: user.id, email: user.email!, user };
}

export async function getUserMedia() {
  const { userId } = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media_posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch media:", error);
    return [];
  }

  return data;
}

export async function getMediaById(mediaId: string) {
  const { userId } = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media_posts")
    .select("*")
    .eq("id", mediaId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getMarketingKit(mediaId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("marketing_kits")
    .select("*")
    .eq("post_id", mediaId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}
