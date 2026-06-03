// components/funnel-analytics.tsx
"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const STAGE_COLORS: Record<string, string> = {
  wishlist: "#6a8c9c",
  applied: "#b37a4c",
  screening: "#264653",
  interviewing: "#d4a017",
  offer: "#06c3a1",
  rejected: "#bc6a4c",
};

interface FunnelData {
  funnel: {
    stages: { name: string; count: number }[];
    conversionRates: Record<string, number>;
    responseRate: number;
    total: number;
  };
  resumePerformance: {
    label: string;
    total: number;
    outcomes: Record<string, number>;
  }[];
  weeklyActivity: { week: string; count: number }[];
  avgTimeInStage: Record<string, number>;
}

export function FunnelAnalytics() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  if (!data) return null;

  const activeStages = data.funnel.stages.filter(
    (s) => s.name !== "rejected"
  );
  const rejectedStage = data.funnel.stages.find(
    (s) => s.name === "rejected"
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Applications"
          value={data.funnel.total}
        />
        <StatCard
          label="Response Rate"
          value={`${data.funnel.responseRate}%`}
        />
        <StatCard
          label="In Pipeline"
          value={activeStages.reduce((sum, s) => sum + s.count, 0)}
        />
        <StatCard
          label="Rejected"
          value={rejectedStage?.count ?? 0}
          variant="muted"
        />
      </div>

      {/* Funnel bar chart */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Pipeline Funnel
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeStages}
              layout="vertical"
              margin={{ left: 80, right: 20, top: 5, bottom: 5 }}
            >
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={70}
                tick={{ textTransform: "capitalize" }}
              />
              <Tooltip
                formatter={(value: number) => [value, "Applications"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {activeStages.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STAGE_COLORS[entry.name] ?? "#6a8c9c"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion rate pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(data.funnel.conversionRates).map(([key, rate]) => {
            const [from, to] = key.split("→");
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full"
              >
                <span className="capitalize">{from}</span>
                <span className="text-muted-foreground">→</span>
                <span className="capitalize">{to}</span>
                <span className="font-medium ml-1">{rate}%</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Avg time in stage */}
      {Object.keys(data.avgTimeInStage).length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Avg. Days in Stage
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.avgTimeInStage).map(([stage, days]) => (
              <span
                key={stage}
                className="text-xs bg-muted px-2 py-1 rounded-full capitalize"
              >
                {stage}:{" "}
                <span className="font-medium">{days}d</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resume performance */}
      {data.resumePerformance.length > 0 && (
        <ResumePerformanceTable data={data.resumePerformance} />
      )}

      {/* Weekly activity */}
      {data.weeklyActivity.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Weekly Application Volume
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyActivity}>
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={40}
                />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [value, "Apps"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#b37a4c"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string | number;
  variant?: "default" | "muted";
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        variant === "muted"
          ? "border-muted bg-muted/30"
          : "border-border bg-card"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function ResumePerformanceTable({
  data,
}: {
  data: { label: string; total: number; outcomes: Record<string, number> }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Resume Performance
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2 font-medium">Resume</th>
              <th className="text-center py-2 font-medium">Total</th>
              <th className="text-center py-2 font-medium">Offers</th>
              <th className="text-center py-2 font-medium">Interviewing</th>
              <th className="text-center py-2 font-medium">Rejected</th>
              <th className="text-center py-2 font-medium">Conv. Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const offers = row.outcomes.offer ?? 0;
              const rejected = row.outcomes.rejected ?? 0;
              const interviewing = row.outcomes.interviewing ?? 0;
              const responded = offers + interviewing + (row.outcomes.screening ?? 0);
              const convRate =
                row.total > 0
                  ? Math.round(
                      ((offers + interviewing) / row.total) * 100
                    )
                  : 0;

              return (
                <tr key={row.label} className="border-b border-muted">
                  <td className="py-2 font-medium max-w-[200px] truncate">
                    {row.label}
                  </td>
                  <td className="text-center py-2">{row.total}</td>
                  <td className="text-center py-2 text-emerald-400">
                    {offers}
                  </td>
                  <td className="text-center py-2 text-yellow-500">
                    {interviewing}
                  </td>
                  <td className="text-center py-2 text-red-400">
                    {rejected}
                  </td>
                  <td className="text-center py-2 font-medium">{convRate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
