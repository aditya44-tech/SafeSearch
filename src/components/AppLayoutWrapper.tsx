"use client";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Suspense } from "react";

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <main id="main-content" className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 sm:py-8" style={{ fontFamily: "'Inter', sans-serif" }}>
        {children}
      </main>
    </>
  );
}
