// app/api/briefing/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // All applications for this user
  const { data: apps, error: appsError } = await supabase
    .from("applications")
    .select("id, status, follow_up_at, next_action_at, created_at, company, role_title")
    .eq("user_id", user.id);

  if (appsError) {
    console.error("[briefing] Apps query error:", appsError);
    return NextResponse.json({ error: appsError.message }, { status: 500 });
  }

  const allApps = apps ?? [];

  // ── Funnel counts ──
  const statusCounts: Record<string, number> = {};
  for (const app of allApps) {
    const s = app.status ?? "saved";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const applied = (statusCounts.applied ?? 0) + (statusCounts.saved ?? 0);
  const responded =
    (statusCounts.screening ?? 0) + (statusCounts.interviewing ?? 0);
  const interviewing = statusCounts.interviewing ?? 0;
  const offers = statusCounts.offer ?? 0;
  const rejected = statusCounts.rejected ?? 0;
  const responseRate =
    applied > 0 ? Math.round((responded / applied) * 100) : 0;

  // ── Upcoming follow-ups (next 3 days) ──
  const now = new Date();
  const threeDaysOut = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const upcomingFollowUps = allApps
    .filter((app) => {
      const dateStr = app.follow_up_at ?? app.next_action_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= now && d <= threeDaysOut;
    })
    .map((app) => ({
      id: app.id,
      company: app.company,
      role_title: app.role_title,
      status: app.status,
      follow_up_at: app.follow_up_at ?? app.next_action_at,
    }))
    .sort(
      (a, b) =>
        new Date(a.follow_up_at).getTime() -
        new Date(b.follow_up_at).getTime()
    );

  // ── Overdue follow-ups (past due) ──
  const overdueFollowUps = allApps
    .filter((app) => {
      const dateStr = app.follow_up_at ?? app.next_action_at;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d < now && app.status !== "rejected" && app.status !== "offer";
    })
    .map((app) => ({
      id: app.id,
      company: app.company,
      role_title: app.role_title,
      status: app.status,
      follow_up_at: app.follow_up_at ?? app.next_action_at,
    }))
    .sort(
      (a, b) =>
        new Date(a.follow_up_at).getTime() -
        new Date(b.follow_up_at).getTime()
    );

  // ── Stale applications ──
  // Use the status log if available, otherwise fall back to created_at
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const terminalStatuses = ["rejected", "offer"];

  // Try to get last status change time from the log
  let lastActivityMap: Record<string, string> = {};
  const { data: statusLogs } = await supabase
    .from("application_status_log")
    .select("application_id, changed_at")
    .eq("user_id", user.id)
    .order("changed_at", { ascending: false });

  if (statusLogs && statusLogs.length > 0) {
    for (const log of statusLogs) {
      if (!lastActivityMap[log.application_id]) {
        lastActivityMap[log.application_id] = log.changed_at;
      }
    }
  }

  const staleApps = allApps
    .filter((app) => {
      if (terminalStatuses.includes(app.status)) return false;
      // Use status log if available, otherwise created_at
      const lastActivity =
        lastActivityMap[app.id] ?? app.created_at;
      return new Date(lastActivity) < sevenDaysAgo;
    })
    .map((app) => ({
      id: app.id,
      company: app.company,
      role_title: app.role_title,
      status: app.status,
      last_activity: lastActivityMap[app.id] ?? app.created_at,
    }));

  // ── Recent activity (last 7 days) ──
  const recentApps = allApps.filter((app) => {
    return new Date(app.created_at) >= sevenDaysAgo;
  });

  return NextResponse.json({
    funnel: {
      applied,
      responded,
      interviewing,
      offers,
      rejected,
      responseRate,
      total: allApps.length,
    },
    upcomingFollowUps,
    overdueFollowUps,
    staleApps,
    recentActivity: {
      newApplications: recentApps.length,
    },
  });
}
