"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Mail,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createContact, deleteContact } from "@/app/actions/contact-actions";
import { InteractionLog } from "@/components/interaction-log";
import { toast } from "sonner";

type Contact = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  linkedin_url: string | null;
  phone: string | null;
  notes: string | null;
  warmth: string;
  created_at: string;
};

const warmthColors: Record<string, string> = {
  cold: "bg-blue-100 text-blue-700",
  warm: "bg-yellow-100 text-yellow-700",
  hot: "bg-orange-100 text-orange-700",
  advocate: "bg-green-100 text-green-700",
};

export function ContactList({
  contacts,
  applicationId,
}: {
  contacts: Contact[];
  applicationId?: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Contacts</CardTitle>
            <CardDescription>
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <AddContactDialog
              applicationId={applicationId}
              onClose={() => setShowAdd(false)}
            />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No contacts yet. Add a recruiter or hiring manager.
          </p>
        ) : (
          <div className="space-y-2">
            {contacts.map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <div
                  className="flex cursor-pointer items-center justify-between"
                  onClick={() =>
                    setExpanded(expanded === c.id ? null : c.id)
                  }
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.name}</span>
                    <Badge
                      variant="secondary"
                      className={warmthColors[c.warmth]}
                    >
                      {c.warmth}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.email && <Mail className="h-3.5 w-3.5 text-muted-foreground" />}
                    {c.phone && <Phone className="h-3.5 w-3.5 text-muted-foreground" />}
                    {c.linkedin_url && (
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {expanded === c.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {expanded === c.id && (
                  <div className="mt-3 space-y-1.5 border-t pt-3">
                    {c.title && (
                      <p className="text-xs text-muted-foreground">
                        {c.title}
                        {c.company ? ` at ${c.company}` : ""}
                      </p>
                    )}
                    {c.email && (
                      <p className="text-xs">
                        <a
                          href={`mailto:${c.email}`}
                          className="text-primary hover:underline"
                        >
                          {c.email}
                        </a>
                      </p>
                    )}
                    {c.phone && <p className="text-xs">{c.phone}</p>}
                    {c.linkedin_url && (
                      <a
                        href={c.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="mr-1 inline h-3 w-3" />
                        LinkedIn profile
                      </a>
                    )}
                    {c.notes && (
                      <p className="mt-1 rounded bg-muted/50 p-2 text-xs">
                        {c.notes}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <InteractionLog
                        contactId={c.id}
                        contactName={c.name}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive"
                        onClick={async () => {
                          await deleteContact(c.id);
                          toast.success(`Removed ${c.name}`);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddContactDialog({
  applicationId,
  onClose,
}: {
  applicationId?: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Contact</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const fd = new FormData(e.currentTarget);
          if (applicationId) {
            fd.set("application_id", applicationId);
          }
          const result = await createContact(fd);
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success("Contact added!");
            onClose();
          }
          setLoading(false);
        }}
        className="space-y-3"
      >
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="Sr. Recruiter" />
          </div>
          <div>
            <Label htmlFor="company">Company</Label>
            <Input id="company" name="company" />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" />
          </div>
          <div>
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              name="linkedin_url"
              placeholder="https://linkedin.com/in/..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="warmth">Warmth</Label>
            <Select name="warmth" defaultValue="cold">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cold">❄️ Cold</SelectItem>
                <SelectItem value="warm">🌤️ Warm</SelectItem>
                <SelectItem value="hot">🔥 Hot</SelectItem>
                <SelectItem value="advocate">⭐ Advocate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {applicationId && (
            <div>
              <Label htmlFor="role">Role on this app</Label>
              <Select name="role" defaultValue="recruiter">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="hiring_manager">
                    Hiring Manager
                  </SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="interviewer">Interviewer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Met at meetup, referred by Jane, etc."
            rows={2}
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Contact"}
        </Button>
      </form>
    </DialogContent>
  );
}
