"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare } from "lucide-react";
import { logInteraction, getContactInteractions } from "@/app/actions/contact-actions";
import { toast } from "sonner";

const interactionTypes = [
  { value: "email_sent", label: "📧 Email Sent" },
  { value: "email_received", label: "📩 Email Received" },
  { value: "call", label: "📞 Phone Call" },
  { value: "interview", label: "🎯 Interview" },
  { value: "linkedin_connect", label: "🔗 LinkedIn Connect" },
  { value: "coffee_chat", label: "☕ Coffee Chat" },
  { value: "follow_up", label: "🔄 Follow-Up" },
  { value: "other", label: "📝 Other" },
];

type Interaction = {
  id: string;
  interaction_type: string;
  notes: string | null;
  occurred_at: string;
};

export function InteractionLog({
  contactId,
  contactName,
}: {
  contactId: string;
  contactName: string;
}) {
  const [open, setOpen] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadInteractions() {
    const data = await getContactInteractions(contactId);
    setInteractions(data as Interaction[]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) loadInteractions();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <MessageSquare className="mr-1 h-3 w-3" />
          Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interaction Log — {contactName}</DialogTitle>
        </DialogHeader>

        {/* Past interactions */}
        {interactions.length > 0 && (
          <div className="space-y-2 mb-4">
            {interactions.map((i) => (
              <div key={i.id} className="rounded-lg border p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {i.interaction_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(i.occurred_at).toLocaleDateString()}
                  </span>
                </div>
                {i.notes && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {i.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new interaction */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const fd = new FormData(e.currentTarget);
            fd.set("contact_id", contactId);
            const result = await logInteraction(fd);
            if (result.success) {
              toast.success("Interaction logged!");
              loadInteractions();
              (e.target as HTMLFormElement).reset();
            } else {
              toast.error(result.error || "Failed to log");
            }
            setLoading(false);
          }}
          className="space-y-3 border-t pt-4"
        >
          <p className="text-sm font-medium">Log new interaction</p>

          <div>
            <Label>Type</Label>
            <Select name="interaction_type" defaultValue="email_sent">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {interactionTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="date"
              name="occurred_at"
              defaultValue={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              name="notes"
              placeholder="What was discussed? Any action items?"
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading} size="sm">
            {loading ? "Saving..." : "Log Interaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
