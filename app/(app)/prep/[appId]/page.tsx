import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MockChat } from "@/components/mock-chat";

export default async function PrepPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;

  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("company, role_title, jd_text")
    .eq("id", appId)
    .single();

  if (!app) notFound();

  const jdContext = `${app.role_title} at ${app.company}.\n\n${app.jd_text}`;

  return <MockChat jdContext={jdContext} roleTitle={app.role_title} />;
}
