// components/follow-up-queue.tsx
"use client";

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";

interface AppRow {
  id: string;
  company: string;
  role_title: string;
  status: string;
  follow_up_at: string | null;
  next_action_at: string | null;
}

export function FollowUpQueue({ applications }: { applications: AppRow[] }) {
  const now = new Date();
  const terminalStatuses = new Set(["rejected", "offer"]);

  // Categorize all follow-ups
  const overdue: AppRow[] = [];
  const upcoming: AppRow[] = [];
  const future: AppRow[] = [];

  for (const app of applications) {
    if (terminalStatuses.has(app.status)) continue;
    const dateStr = app.follow_up_at ?? app.next_action_at;
    if (!dateStr) continue;

    const date = new Date(dateStr);
    const diffMs = date.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      overdue.push(app);
    } else if (diffDays <= 3) {
      upcoming.push(app);
    } else {
      future.push(app);
    }
  }

  // Sort each category by date
  const sortByDate = (a: AppRow, b: AppRow) => {
    const aDate = new Date(a.follow_up_at ?? a.next_action_at ?? "");
    const bDate = new Date(b.follow_up_at ?? b.next_action_at ?? "");
    return aDate.getTime() - bDate.getTime();
  };
  overdue.sort(sortByDate);
  upcoming.sort(sortByDate);
  future.sort(sortByDate);

  const totalFollowUps = overdue.length + upcoming.length + future.length;

  if (totalFollowUps === 0) return null;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Follow-up Schedule</h2>
        <Badge variant="outline" className="text-[10px]">
          {totalFollowUps}
        </Badge>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-red-400" />
            <span className="text-xs font-medium text-red-400">
              Overdue ({overdue.length})
            </span>
          </div>
          {overdue.map((app) => (
            <FollowUpRow key={app.id} app={app} variant="overdue" />
          ))}
        </div>
      )}

      {/* Due within 3 days */}
      {upcoming.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">
              Due Soon ({upcoming.length})
            </span>
          </div>
          {upcoming.map((app) => (
            <FollowUpRow key={app.id} app={app} variant="upcoming" />
          ))}
        </div>
      )}

      {/* Future */}
      {future.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <CalendarClock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Scheduled ({future.length})
            </span>
          </div>
          {future.map((app) => (
            <FollowUpRow key={app.id} app={app} variant="future" />
          ))}
        </div>
      )}
    </div>
  );
}

function FollowUpRow({
  app,
  variant,
}: {
  app: AppRow;
  variant: "overdue" | "upcoming" | "future";
}) {
  const dateStr = app.follow_up_at ?? app.next_action_at;
  const date = dateStr ? new Date(dateStr) : null;

  const borderClass =
    variant === "overdue"
      ? "border-red-400/20 bg-red-400/5 hover:bg-red-400/10"
      : variant === "upcoming"
      ? "border-amber-400/20 bg-amber-400/5 hover:bg-amber-400/10"
      : "border-border hover:bg-muted/30";

  const dateClass =
    variant === "overdue"
      ? "text-red-400"
      : variant === "upcoming"
      ? "text-amber-400"
      : "text-muted-foreground";

  return (
    <Link
      href={`/applications/${app.id}`}
      className={`flex items-center justify-between rounded-md border p-2 transition-colors ${borderClass}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{app.role_title}</p>
        <p className="text-xs text-muted-foreground">{app.company}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <Badge variant="outline" className="text-[10px]">
          {app.status}
        </Badge>
        {date && (
          <span className={`text-xs ${dateClass}`}>
            {variant === "overdue"
              ? formatDistanceToNow(date, { addSuffix: true })
              : date.toLocaleDateString()}
          </span>
        )}
      </div>
    </Link>
  );
}
