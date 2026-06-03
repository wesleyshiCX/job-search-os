"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Check your email for the magic link.");
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-sm p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Job Search OS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your workspace.
          </p>
        </div>
        {sent ? (
          <p className="text-sm">📬 Magic link sent to <b>{email}</b>.</p>
        ) : (
          <>
            <Input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button className="w-full" onClick={signIn} disabled={loading || !email}>
              {loading ? "Sending…" : "Send magic link"}
            </Button>
          </>
        )}
      </Card>
    </main>
  );
}
