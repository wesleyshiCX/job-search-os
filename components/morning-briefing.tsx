"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Sun,
} from "lucide-react";
import Link from "next/link";

type Application = {
  id: string;
  company: string;
  title: string;
  status: string;
  updated_at: string;
  follow_up_at: string | null;
};

type Contact = {
  id: string;
  name: string;
  company: string | null;
  warmth: string;
};

type BriefingData = {
  staleApplications: Application[];
  upcomingFollowUps: Application[];
  stats: {
    applied: number;
    responded: number;
    interviewing: number;
    rejected: number;
    responseRate: number;
  };
  greeting: string;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function daysSince(dateStr: string): number {
  const now = new Date();
  const then = new Date(dateStr);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export function MorningBriefing({ contacts }: { contacts: Contact[] }) {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/briefing");
        if (!res.ok) throw new Error("Failed");
        const briefing: BriefingData = await res.json();
        setData(briefing);
      } catch {
        // Graceful degradation — just don't show briefing
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6">
          <Sun className="h-5 w-5 animate-pulse text-yellow-500" />
          <p className="text-sm text-muted-foreground">
            Loading your briefing...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasAlerts =
    data.staleApplications.length > 0 ||
    data.upcomingFollowUps.length > 0;

  return (
    <Card className={hasAlerts ? "border-primary/30" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sun className="h-5 w-5 text-yellow-500" />
          {data.greeting}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stale applications — no response in 7+ days */}
        {data.staleApplications.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              Needs attention
            </p>
            {data.staleApplications.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-md border p-2.5"
              >
                <div>
                  <p className="text-sm font-medium">
                    {app.company} — {app.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No response in {daysSince(app.updated_at)} days
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/prep/${app.id}`}>Prep</Link>
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Scheduled follow-ups */}
        {data.upcomingFollowUps.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-blue-600">
              <Clock className="h-4 w-4" />
              Follow-up reminders
            </p>
            {data.upcomingFollowUps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-md border p-2.5"
              >
                <div>
                  <p className="text-sm font-medium">
                    {app.company} — {app.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Follow up by{" "}
                    {new Date(app.follow_up_at!).toLocaleDateString()}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/prep/${app.id}`}>Review</Link>
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-5 gap-3 rounded-lg bg-muted/50 p-3">
          <Stat label="Applied" value={data.stats.applied} />
          <Stat label="Responded" value={data.stats.responded} />
          <Stat label="Interviewing" value={data.stats.interviewing} />
          <Stat label="Rejected" value={data.stats.rejected} />
          <Stat
            label="Response Rate"
            value={`${data.stats.responseRate}%`}
            icon={
              data.stats.responseRate >= 40 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : null
            }
          />
        </div>

        {/* No alerts state */}
        {!hasAlerts && (
          <p className="text-sm text-muted-foreground">
            Nothing needs your attention right now. Keep applying! 🚀
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold">
        {value}
        {icon}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
