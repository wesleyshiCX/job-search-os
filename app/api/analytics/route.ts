// app/api/analytics/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const FUNNEL_ORDER = [
  "wishlist",
  "applied",
  "screening",
  "interviewing",
  "offer",
  "rejected",
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // --- Funnel counts ---
  const { data: apps } = await supabase
    .from("applications")
    .select("status, created_at")
    .eq("user_id", user.id);

  const funnelCounts: Record<string, number> = {};
  for (const stage of FUNNEL_ORDER) {
    funnelCounts[stage] = 0;
  }
  let totalApps = 0;
  let rejectedCount = 0;

  for (const app of apps ?? []) {
    totalApps++;
    if (app.status === "rejected") {
      rejectedCount++;
    } else {
      const key = FUNNEL_ORDER.includes(app.status) ? app.status : "wishlist";
      funnelCounts[key] = (funnelCounts[key] || 0) + 1;
    }
  }
  funnelCounts.rejected = rejectedCount;

  // Conversion rates between active stages (excluding rejected)
  const activeStages = FUNNEL_ORDER.filter((s) => s !== "rejected");
  const conversionRates: Record<string, number> = {};
  for (let i = 1; i < activeStages.length; i++) {
    const prev = funnelCounts[activeStages[i - 1]];
    const curr = funnelCounts[activeStages[i]];
    conversionRates[`${activeStages[i - 1]}→${activeStages[i]}`] =
      prev > 0 ? Math.round((curr / prev) * 100) : 0;
  }

  // Overall response rate (anything past applied / total)
  const responded =
    (funnelCounts.screening ?? 0) +
    (funnelCounts.interviewing ?? 0) +
    (funnelCounts.offer ?? 0);
  const responseRate = totalApps > 0 ? Math.round((responded / totalApps) * 100) : 0;

  // --- Resume performance ---
  const { data: resumeApps } = await supabase
    .from("applications")
    .select("id, status, resume_id, resumes(id, label)")
    .eq("user_id", user.id);

  const resumePerformance: Record<
    string,
    { label: string; total: number; outcomes: Record<string, number> }
  > = {};

  for (const app of resumeApps ?? []) {
    const key = app.resume_id ?? "unlinked";
    const label = (app.resumes as any)?.label ?? "No resume linked";

    if (!resumePerformance[key]) {
      resumePerformance[key] = { label, total: 0, outcomes: {} };
    }
    resumePerformance[key].total++;
    resumePerformance[key].outcomes[app.status] =
      (resumePerformance[key].outcomes[app.status] || 0) + 1;
  }

  // --- Weekly activity ---
  const { data: weeklyData } = await supabase
    .from("applications")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const weeklyBuckets: Record<string, number> = {};
  for (const app of weeklyData ?? []) {
    const week = new Date(app.created_at);
    // ISO week label
    const label = `${week.getFullYear()}-W${String(
      Math.ceil(((week.getTime() - new Date(week.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(week.getFullYear(), 0, 1).getDay() + 1) / 7)
    ).padStart(2, "0")}`;
    weeklyBuckets[label] = (weeklyBuckets[label] || 0) + 1;
  }

  const weeklyActivity = Object.entries(weeklyBuckets)
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // --- Time-in-stage averages ---
  const { data: statusLogs } = await supabase
    .from("application_status_log")
    .select("application_id, from_status, to_status, changed_at")
    .in(
      "application_id",
      (apps ?? []).map((a) => a.id)
    )
    .order("changed_at", { ascending: true });

  // Pair consecutive logs per application to compute dwell time
  const stageDwell: Record<string, number[]> = {};
  const appLogs: Record<string, any[]> = {};
  for (const log of statusLogs ?? []) {
    if (!appLogs[log.application_id]) appLogs[log.application_id] = [];
    appLogs[log.application_id].push(log);
  }

  for (const logs of Object.values(appLogs)) {
    for (let i = 1; i < logs.length; i++) {
      const stage = logs[i - 1].to_status;
      const dwellMs =
        new Date(logs[i].changed_at).getTime() -
        new Date(logs[i - 1].changed_at).getTime();
      const dwellDays = dwellMs / (1000 * 60 * 60 * 24);
      if (!stageDwell[stage]) stageDwell[stage] = [];
      stageDwell[stage].push(dwellDays);
    }
  }

  const avgTimeInStage: Record<string, number> = {};
  for (const [stage, times] of Object.entries(stageDwell)) {
    avgTimeInStage[stage] =
      times.length > 0
        ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10
        : 0;
  }

  return NextResponse.json({
    funnel: {
      stages: FUNNEL_ORDER.map((stage) => ({
        name: stage,
        count: funnelCounts[stage] ?? 0,
      })),
      conversionRates,
      responseRate,
      total: totalApps,
    },
    resumePerformance: Object.values(resumePerformance),
    weeklyActivity,
    avgTimeInStage,
  });
}
