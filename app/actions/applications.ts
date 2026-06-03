"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createApplication(input: {
  company: string;
  roleTitle: string;
  jdText: string;
  analysis: any;
  matchScore?: number;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  // P2: capture which resume was active at time of save
  const { data: activeResume } = await supabase
    .from("resumes")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      company: input.company,
      role_title: input.roleTitle,
      jd_text: input.jdText,
      analysis: input.analysis,
      match_score: input.matchScore ?? null,
      status: "saved",
      resume_id: activeResume?.id ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  // P2: log initial status
  await supabase.from("application_status_log").insert({
    application_id: data.id,
    from_status: null,
    to_status: "saved",
  });

  revalidatePath("/dashboard");
  return data;
}

export async function updateStatus(id: string, status: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  // P2: get current status before updating
  const { data: current } = await supabase
    .from("applications")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!current) throw new Error("application not found");

  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;

  // P2: log the transition
  if (current.status !== status) {
    await supabase.from("application_status_log").insert({
      application_id: id,
      from_status: current.status,
      to_status: status,
    });
  }

  revalidatePath("/dashboard");
}

export async function setNextAction(id: string, when: string | null) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { error } = await supabase
    .from("applications")
    .update({ next_action_at: when })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/dashboard");
}
