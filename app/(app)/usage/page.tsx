import { createClient } from "@/lib/supabase/server";
import { UsageDashboard } from "@/components/usage-dashboard";

export default async function UsagePage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("telemetry")
    .select("endpoint, prompt_tokens, completion_tokens, est_cost_usd, created_at")
    .order("created_at", { ascending: true });

  const events = rows ?? [];

  // Aggregate
  const totalCost = events.reduce((s, r) => s + Number(r.est_cost_usd), 0);
  const totalTokens = events.reduce(
    (s, r) => s + r.prompt_tokens + r.completion_tokens, 0
  );

  const byEndpoint = Object.values(
    events.reduce((acc: Record<string, any>, r) => {
      acc[r.endpoint] ??= { endpoint: r.endpoint, cost: 0, calls: 0 };
      acc[r.endpoint].cost += Number(r.est_cost_usd);
      acc[r.endpoint].calls += 1;
      return acc;
    }, {})
  );

  // Daily cost trend
  const byDay = Object.values(
    events.reduce((acc: Record<string, any>, r) => {
      const day = r.created_at.slice(0, 10);
      acc[day] ??= { day, cost: 0 };
      acc[day].cost += Number(r.est_cost_usd);
      return acc;
    }, {})
  );

  return (
    <UsageDashboard
      totalCost={totalCost}
      totalTokens={totalTokens}
      byEndpoint={byEndpoint}
      byDay={byDay}
    />
  );
}
