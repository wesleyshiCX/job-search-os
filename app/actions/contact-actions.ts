"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── CRUD ──────────────────────────────────────

export async function createContact(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: user.id,
      name: formData.get("name") as string,
      title: (formData.get("title") as string) || null,
      company: (formData.get("company") as string) || null,
      email: (formData.get("email") as string) || null,
      linkedin_url: (formData.get("linkedin_url") as string) || null,
      phone: (formData.get("phone") as string) || null,
      notes: (formData.get("notes") as string) || null,
      warmth: (formData.get("warmth") as string) || "cold",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Optionally link to an application right away
  const appId = formData.get("application_id") as string | null;
  const role = formData.get("role") as string | null;
  if (appId && data) {
    await supabase.from("application_contacts").insert({
      application_id: appId,
      contact_id: data.id,
      role: role || "recruiter",
    });
  }

  revalidatePath("/dashboard");
  return { data };
}

export async function updateContact(
  contactId: string,
  updates: Record<string, string>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("contacts")
    .update(updates)
    .eq("id", contactId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteContact(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase.from("contacts").delete().eq("id", contactId).eq("user_id", user.id);

  revalidatePath("/dashboard");
  return { success: true };
}

// ── APPLICATION LINKING ──────────────────────

export async function linkContactToApplication(
  applicationId: string,
  contactId: string,
  role: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("application_contacts")
    .insert({ application_id: applicationId, contact_id: contactId, role });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function unlinkContactFromApplication(
  applicationId: string,
  contactId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("application_contacts")
    .delete()
    .eq("application_id", applicationId)
    .eq("contact_id", contactId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

// ── INTERACTIONS ─────────────────────────────

export async function logInteraction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const contactId = formData.get("contact_id") as string;

  // Verify ownership
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .single();

  if (!contact) return { error: "Contact not found" };

  const { error } = await supabase
    .from("contact_interactions")
    .insert({
      contact_id: contactId,
      interaction_type: formData.get("interaction_type") as string,
      notes: (formData.get("notes") as string) || null,
      occurred_at: formData.get("occurred_at")
        ? new Date(formData.get("occurred_at") as string).toISOString()
        : new Date().toISOString(),
    });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getContactInteractions(contactId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("contact_interactions")
    .select("*")
    .eq("contact_id", contactId)
    .order("occurred_at", { ascending: false });

  return data || [];
}

// ── GETTERS ──────────────────────────────────

export async function getContacts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getApplicationContacts(applicationId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("application_contacts")
    .select("role, contacts(*)")
    .eq("application_id", applicationId);

  return data || [];
}
