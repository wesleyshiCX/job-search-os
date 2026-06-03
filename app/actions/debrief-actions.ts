"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getDebriefs(applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { data, error } = await supabase
    .from("debriefs")
    .select("*")
    .eq("application_id", applicationId)
    .eq("user_id", user.id)
    .order("interview_date", { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteDebrief(debriefId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { error } = await supabase
    .from("debriefs")
    .delete()
    .eq("id", debriefId)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/dashboard");
}
