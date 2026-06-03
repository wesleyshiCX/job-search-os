// app/api/briefing/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: applications } = await supabase
    .from("applications")
    .select("id, company, title, status, updated_at, follow_up_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const apps = applications || [];

  const terminalStatuses = ["rejected", "offer", "withdrawn", "accepted"];
  const now = new Date();

  const staleApplications = apps.filter((a) => {
    if (terminalStatuses.includes(a.status)) return false;
    const days = Math.floor(
      (now.getTime() - new Date(a.updated_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return days >= 7;
  });

  const threeDaysOut = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000
  );
  const upcomingFollowUps = apps.filter((a) => {
    if (!a.follow_up_at) return false;
    const fuDate = new Date(a.follow_up_at);
    return fuDate >= now && fuDate <= threeDaysOut;
  });

  const applied = apps.filter((a) => a.status === "applied").length;
  const responded = apps.filter(
    (a) =>
      a.status === "phone_screen" ||
      a.status === "screening" ||
      a.status === "responded"
  ).length;
  const interviewing = apps.filter(
    (a) =>
      a.status === "interviewing" ||
      a.status === "onsite" ||
      a.status === "final_round"
  ).length;
  const rejected = apps.filter((a) => a.status === "rejected").length;
  const totalActive = apps.filter(
    (a) => !terminalStatuses.includes(a.status)
  ).length;
  const responseRate =
    totalActive > 0
      ? Math.round(((responded + interviewing) / apps.length) * 100)
      : 0;

  return NextResponse.json({
    staleApplications: staleApplications.slice(0, 5),
    upcomingFollowUps: upcomingFollowUps.slice(0, 5),
    stats: { applied, responded, interviewing, rejected, responseRate },
    greeting: getGreeting(),
  });
}
