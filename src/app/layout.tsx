import type { Metadata } from "next";
import "./globals.css";
import OfflineBanner from "@/components/OfflineBanner";
import { OrgProvider } from "@/lib/org-context";
import AppLayoutWrapper from "@/components/AppLayoutWrapper";

export const metadata: Metadata = {
  title: "SafeSignal — Workplace Safety Early Warning System",
  description: "Detect precursors of serious injury and fatality incidents through AI-powered safety report analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ overflowX: "hidden" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Caveat:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f6f5f3" />
      </head>
      <body className="noise-overlay" style={{ background: "#f6f5f3", overflowX: "hidden" }}>
        <OrgProvider>
          <a href="#main-content" className="skip-link">Skip to content</a>
          <AppLayoutWrapper>
            {children}
          </AppLayoutWrapper>
          <OfflineBanner />
        </OrgProvider>
      </body>
    </html>
  );
}

