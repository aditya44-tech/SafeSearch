"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useOrg } from "@/lib/org-context";

const links = [
  { href: "/reports", label: "Reports" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/map", label: "Map" },
  { href: "/scoreboard", label: "Scoreboard" },
  { href: "/impact", label: "Impact" },
  { href: "/query", label: "Query" },
  { href: "/admin", label: "Admin" },
  { href: "/alerts", label: "Alerts" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { orgs, selectedOrgId, setSelectedOrgId, loading } = useOrg();

  // Hide navbar on landing page (has its own)
  if (pathname === "/") return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--color-border)]" style={{ background: "#f6f5f3" }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group no-underline">
            <div className="w-8 h-8 rounded-lg bg-[#111111] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <span className="font-semibold text-[16px] tracking-tight" style={{ color: "#111111", fontFamily: "'Inter', sans-serif" }}>SafeSignal</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200"
                  style={{
                    color: active ? "#111111" : "#666666",
                    background: active ? "rgba(17,17,17,0.06)" : "transparent",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Org selector - desktop */}
          {!loading && orgs.length > 0 && (
            <div className="hidden md:flex items-center ml-3">
              <select
                value={selectedOrgId ?? ""}
                onChange={(e) => setSelectedOrgId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                style={{
                  border: "1px solid #dddddd",
                  background: "#ffffff",
                  color: "#111111",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <option value="">All Organizations</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>{org.name} ({org.reportCount})</option>
                ))}
              </select>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ background: "transparent" }}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t" style={{ borderColor: "#dddddd", background: "#f6f5f3" }}>
          <div className="px-4 py-2 space-y-0.5">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    color: active ? "#111111" : "#666666",
                    background: active ? "rgba(17,17,17,0.06)" : "transparent",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
            {/* Mobile org selector */}
            {!loading && orgs.length > 0 && (
              <div className="pt-2 mt-2 border-t" style={{ borderColor: "#dddddd" }}>
                <select
                  value={selectedOrgId ?? ""}
                  onChange={(e) => setSelectedOrgId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-lg cursor-pointer"
                  style={{
                    border: "1px solid #dddddd",
                    background: "#ffffff",
                    color: "#111111",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <option value="">All Organizations</option>
                  {orgs.map((org) => (
                    <option key={org.id} value={org.id}>{org.name} ({org.reportCount})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
