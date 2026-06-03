// components/analytics-panel.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, BarChart3 } from "lucide-react";
import { FunnelAnalytics } from "./funnel-analytics";

export function AnalyticsPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Search Analytics</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t">
          <FunnelAnalytics />
        </div>
      )}
    </div>
  );
}
