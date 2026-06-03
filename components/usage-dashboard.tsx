"use client";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const chartConfig = {
  cost: { label: "Cost (USD)", color: "var(--chart-1)" },
};

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tracking-tight mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
}

export function UsageDashboard({
  totalCost,
  totalTokens,
  byEndpoint,
  byDay,
}: {
  totalCost: number;
  totalTokens: number;
  byEndpoint: { endpoint: string; cost: number; calls: number }[];
  byDay: { day: string; cost: number }[];
}) {
  const totalCalls = byEndpoint.reduce((s, e) => s + e.calls, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Usage &amp; Cost</h1>
        <p className="text-base text-muted-foreground mt-1.5">
          Every LLM call is instrumented — tokens, cost, and endpoint.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat
          label="Total spend"
          value={`$${totalCost.toFixed(4)}`}
          sub={`${totalCalls} calls`}
        />
        <Stat label="Total tokens" value={totalTokens.toLocaleString()} />
        <Stat
          label="Avg cost / call"
          value={`$${totalCalls ? (totalCost / totalCalls).toFixed(5) : "0"}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-medium mb-4">Cost by feature</h3>
          {byEndpoint.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              No usage yet. Run an analysis or mock interview.
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={byEndpoint}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="endpoint" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `$${Number(v).toFixed(3)}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="cost" fill="var(--color-cost)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-medium mb-4">Daily spend trend</h3>
          {byDay.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              No usage yet.
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <LineChart data={byDay}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `$${Number(v).toFixed(3)}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="cost"
                  stroke="var(--color-cost)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
