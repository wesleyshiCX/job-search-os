import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
 const supabase = await createClient();   // ✅ await it

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
     <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
  <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
    <Link href="/dashboard" className="font-bold tracking-tight text-lg">
      Job Search OS
    </Link>
    <div className="flex items-center gap-1">
      {[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/analyze", label: "Analyze" },
        { href: "/usage", label: "Usage" },
      ].map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {l.label}
        </Link>
      ))}
    </div>
  </nav>
</header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}
