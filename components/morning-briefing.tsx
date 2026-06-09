// components/morning-briefing.tsx
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Bell,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";

interface FollowUpItem {
  id: string;
  company: string;
  role_title: string;
  status: string;
  follow_up_at: string;
}

interface StaleItem {
  id: string;
  company: string;
  role_title: string;
  status: string;
  last_activity: string;
}

interface BriefingData {
  funnel: {
    applied: number;
    responded: number;
    interviewing: number;
    offers: number;
    rejected: number;
    responseRate: number;
    total: number;
  };
  upcomingFollowUps: FollowUpItem[];
  overdueFollowUps: FollowUpItem[];
  staleApps: StaleItem[];
  recentActivity: {
    newApplications: number;
  };
}

export function MorningBriefing() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/briefing");
        const json = await res.json();

        if (!res.ok) {
          console.error("[Briefing] API error:", json);
          setError(json.error ?? "Failed to load briefing");
          return;
        }

        // Defensive: ensure all expected fields exist
        const safe: BriefingData = {
          funnel: {
            applied: json.funnel?.applied ?? 0,
            responded: json.funnel?.responded ?? 0,
            interviewing: json.funnel?.interviewing ?? 0,
            offers: json.funnel?.offers ?? 0,
            rejected: json.funnel?.rejected ?? 0,
            responseRate: json.funnel?.responseRate ?? 0,
            total: json.funnel?.total ?? 0,
          },
          upcomingFollowUps: Array.isArray(json.upcomingFollowUps)
            ? json.upcomingFollowUps
            : [],
          overdueFollowUps: Array.isArray(json.overdueFollowUps)
            ? json.overdueFollowUps
            : [],
          staleApps: Array.isArray(json.staleApps) ? json.staleApps : [],
          recentActivity: {
            newApplications:
              json.recentActivity?.newApplications ?? 0,
          },
        };

        setData(safe);
      } catch (err) {
        console.error("[Briefing] Fetch error:", err);
        setError("Failed to load briefing");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border p-4 space-y-3 animate-pulse">
        <div className="h-5 w-40 bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-muted-foreground">
          ⚠️ Briefing unavailable{error ? `: ${error}` : ""}
        </p>
      </div>
    );
  }

  const hasAlerts =
    data.overdueFollowUps.length > 0 ||
    data.upcomingFollowUps.length > 0 ||
    data.staleApps.length > 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Morning Briefing</h2>
        {hasAlerts && (
          <Badge variant="destructive" className="text-[10px]">
            {data.overdueFollowUps.length +
              data.upcomingFollowUps.length +
              data.staleApps.length}{" "}
            action{data.overdueFollowUps.length +
              data.upcomingFollowUps.length +
              data.staleApps.length !== 1
              ? "s"
              : ""}
          </Badge>
        )}
      </div>

      {/* Funnel stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-md bg-muted/50 p-2.5 text-center">
          <p className="text-lg font-semibold">{data.funnel.applied}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Applied
          </p>
        </div>
        <div className="rounded-md bg-muted/50 p-2.5 text-center">
          <p className="text-lg font-semibold">
            {data.funnel.responded}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Responded
          </p>
        </div>
        <div className="rounded-md bg-muted/50 p-2.5 text-center">
          <p className="text-lg font-semibold">
            {data.funnel.interviewing}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Interviewing
          </p>
        </div>
        <div className="rounded-md bg-muted/50 p-2.5 text-center">
          <p className="text-lg font-semibold">
            {data.funnel.responseRate}%
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Response Rate
          </p>
        </div>
      </div>

      {/* Overdue follow-ups */}
      {data.overdueFollowUps.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs font-medium text-red-400">
              Overdue Follow-ups
            </span>
          </div>
          {data.overdueFollowUps.map((item) => (
            <Link
              key={item.id}
              href={`/applications/${item.id}`}
              className="flex items-center justify-between rounded-md border border-red-400/20 bg-red-400/5 p-2 hover:bg-red-400/10 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.role_title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.company}
                </p>
              </div>
              <span className="text-xs text-red-400 shrink-0 ml-2">
                {formatRelativeDate(item.follow_up_at)}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Upcoming follow-ups */}
      {data.upcomingFollowUps.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">
              Due Soon (3 days)
            </span>
          </div>
          {data.upcomingFollowUps.map((item) => (
            <Link
              key={item.id}
              href={`/applications/${item.id}`}
              className="flex items-center justify-between rounded-md border border-amber-400/20 bg-amber-400/5 p-2 hover:bg-amber-400/10 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.role_title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.company}
                </p>
              </div>
              <span className="text-xs text-amber-400 shrink-0 ml-2">
                {formatRelativeDate(item.follow_up_at)}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Stale applications */}
      {data.staleApps.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Stale (7+ days, no activity)
            </span>
          </div>
          {data.staleApps.map((item) => (
            <Link
              key={item.id}
              href={`/applications/${item.id}`}
              className="flex items-center justify-between rounded-md border p-2 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.role_title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.company}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                {item.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* No alerts */}
      {!hasAlerts && (
        <div className="flex items-center gap-2 text-muted-foreground py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <p className="text-sm">All caught up. No urgent actions today.</p>
        </div>
      )}

      {/* Recent activity summary */}
      {data.recentActivity.newApplications > 0 && (
        <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t">
          <TrendingUp className="h-3.5 w-3.5" />
          <p className="text-xs">
            {data.recentActivity.newApplications} new application
            {data.recentActivity.newApplications !== 1 ? "s" : ""} in the
            last 7 days
          </p>
        </div>
      )}
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === -1) return "1d overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `In ${diffDays}d`;
}
