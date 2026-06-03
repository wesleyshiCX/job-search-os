"use server";

import { createClient } from "@/lib/supabase/server";
import { parseResumeFromBuffer } from "@/lib/ai/parse-resume";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

export async function uploadResume(
  formData: FormData
): Promise<{ success: boolean; error?: string; resumeId?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  const label = (formData.get("label") as string) || "Default";
  const setActive = formData.get("setActive") === "true";

  if (!file) return { success: false, error: "No file provided" };

  // Validate file type
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Only PDF, DOCX, and TXT files allowed" };
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "File must be under 5MB" };
  }

  // Read file into buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Parse text
  let parsed: { text: string };
  try {
    parsed = await parseResumeFromBuffer(buffer, file.type);
  } catch (err) {
    console.error("Resume parse error:", err);
    return { success: false, error: "Could not parse this file. Try a different format." };
  }

  if (!parsed.text.trim()) {
    return { success: false, error: "No text could be extracted from this file." };
  }

  // Upload to storage
  const ext = file.name.split(".").pop() || "pdf";
  const storagePath = `${user.id}/${uuidv4()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return { success: false, error: "Failed to store file." };
  }

  // Determine file_type label
  const fileType = ext === "docx" ? "docx" : ext === "txt" ? "txt" : "pdf";

  // Insert resume record
  const { data: resume, error: insertError } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      label,
      file_path: storagePath,
      file_type: fileType,
      raw_text: parsed.text.trim(),
      is_active: setActive,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Resume insert error:", insertError);
    return { success: false, error: "Failed to save resume." };
  }

  // Generate embedding via the edge function
  try {
    const embeddingResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embed`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: parsed.text.trim().slice(0, 2000) }),
      }
    );

    if (embeddingResponse.ok) {
      const { embedding } = await embeddingResponse.json();
      if (embedding) {
        await supabase
          .from("resumes")
          .update({ embedding })
          .eq("id", resume.id);
      }
    }
  } catch (err) {
    // Non-fatal — resume is saved, embedding can be regenerated
    console.error("Embedding generation failed:", err);
  }

  // If setActive, use the DB function to ensure only one active
  if (setActive) {
    await supabase.rpc("set_active_resume", {
      p_resume_id: resume.id,
      p_user_id: user.id,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/analyze");
  return { success: true, resumeId: resume.id };
}

export async function getResumes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("resumes")
    .select("id, label, file_type, is_active, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getActiveResume() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("resumes")
    .select("id, label, raw_text, embedding, file_type")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return data;
}

export async function setActiveResume(resumeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  await supabase.rpc("set_active_resume", {
    p_resume_id: resumeId,
    p_user_id: user.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/analyze");
  return { success: true };
}

export async function deleteResume(resumeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get file path for storage deletion
  const { data: resume } = await supabase
    .from("resumes")
    .select("file_path")
    .eq("id", resumeId)
    .eq("user_id", user.id)
    .single();

  if (!resume) return { success: false, error: "Resume not found" };

  // Delete from storage
  await supabase.storage.from("resumes").remove([resume.file_path]);

  // Delete record (cascades embedding)
  await supabase.from("resumes").delete().eq("id", resumeId);

  revalidatePath("/dashboard");
  revalidatePath("/analyze");
  return { success: true };
}
