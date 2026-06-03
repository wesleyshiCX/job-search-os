// components/kanban-board.tsx
"use client";
import { useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateStatus } from "@/app/actions/applications";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, FileText } from "lucide-react";

type App = {
  id: string;
  company: string;
  role_title: string;
  status: string;
  match_score: number | null;
  next_action_at: string | null;
};

const COLUMNS = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
];

function scoreColor(score: number | null) {
  if (score == null) return "secondary";
  if (score >= 75) return "default";
  if (score >= 50) return "outline";
  return "destructive";
}

function AppCard({ app }: { app: App }) {
  return (
    <Link href={`/applications/${app.id}`}>
      <Card className="p-3.5 space-y-2 bg-card border-border/60 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate">{app.role_title}</p>
            <p className="text-xs text-muted-foreground truncate">{app.company}</p>
          </div>
          {app.match_score != null && (
            <Badge variant={scoreColor(app.match_score) as any}>
              {app.match_score}%
            </Badge>
          )}
        </div>
        {app.next_action_at && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Follow up {formatDistanceToNow(new Date(app.next_action_at), { addSuffix: true })}
          </p>
        )}
        {/* Feature hints */}
        <div className="flex items-center gap-3 pt-0.5 text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-[10px]">
            <MessageSquare className="h-3 w-3" />
            Debrief
          </span>
          <span className="inline-flex items-center gap-1 text-[10px]">
            <FileText className="h-3 w-3" />
            Outreach
          </span>
        </div>
      </Card>
    </Link>
  );
}

function Column({ id, label, apps }: { id: string; label: string; apps: App[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm font-medium">{label}</h3>
        <span className="text-xs text-muted-foreground">{apps.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 rounded-xl p-3 min-h-[120px] border transition-colors ${
          isOver
            ? "bg-primary/10 border-primary/40"
            : "bg-muted/30 border-border/60"
        }`}
      >
        {apps.map((app) => (
          <DraggableCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}

import { useDraggable } from "@dnd-kit/core";
function DraggableCard({ app }: { app: App }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <AppCard app={app} />
    </div>
  );
}

export function KanbanBoard({ initialApps }: { initialApps: App[] }) {
  const [apps, setApps] = useState(initialApps);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id as string;
    const app = apps.find((a) => a.id === active.id);
    if (!app || app.status === newStatus) return;

    // optimistic update
    setApps((prev) =>
      prev.map((a) => (a.id === active.id ? { ...a, status: newStatus } : a))
    );
    try {
      await updateStatus(app.id, newStatus);
      toast.success(`Moved to ${newStatus}`);
    } catch {
      setApps((prev) =>
        prev.map((a) => (a.id === active.id ? { ...a, status: app.status } : a))
      );
      toast.error("Failed to move — reverted");
    }
  }

  const activeApp = apps.find((a) => a.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            apps={apps.filter((a) => a.status === col.id)}
          />
        ))}
      </div>
      <DragOverlay>{activeApp ? <AppCard app={activeApp} /> : null}</DragOverlay>
    </DndContext>
  );
}
