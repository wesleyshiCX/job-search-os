import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Search OS",
  description:
    "AI-powered job search workspace — tailored resume bullets, gap analysis, STAR stories, mock interviews, and application tracking. Free to run.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="text-[15px] leading-relaxed antialiased min-h-screen app-glow">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
