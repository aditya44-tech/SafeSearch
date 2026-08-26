"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

/* â”€â”€â”€ Design Tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const t = {
  canvas: "#f6f5f3",
  ink: "#111111",
  surfaceDark: "#272625",
  onDark: "#ffffff",
  surfaceWhite: "#ffffff",
  hairline: "#dddddd",
  accentCyan: "#00bbff",
  accentBlue: "#328efa",
  accentOrange: "#e16540",
  accentYellow: "#fbc768",
  accentRed: "#af051e",
  accentPink: "#ffd7f0",
};
const fontDisplay: React.CSSProperties = { fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 500 };

const tightHeading = (size: number, ls: number): React.CSSProperties => {
  let responsiveFontSize: string | number = `${size}px`;
  if (size === 64) responsiveFontSize = "clamp(36px, 8vw, 64px)";
  else if (size === 56) responsiveFontSize = "clamp(32px, 7vw, 56px)";
  else if (size === 48) responsiveFontSize = "clamp(30px, 6.5vw, 48px)";
  else if (size === 44) responsiveFontSize = "clamp(28px, 6vw, 44px)";
  else if (size === 40) responsiveFontSize = "clamp(26px, 5.5vw, 40px)";
  else if (size === 32) responsiveFontSize = "clamp(22px, 4vw, 32px)";
  else if (size === 24) responsiveFontSize = "clamp(18px, 3.5vw, 24px)";
  else if (size === 18) responsiveFontSize = "clamp(15px, 2.5vw, 18px)";

  return {
    ...fontDisplay,
    fontSize: responsiveFontSize,
    letterSpacing: `${ls}px`,
    lineHeight: size >= 48 ? 1.0 : 1.1,
  };
};

/* â”€â”€â”€ Scroll Reveal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function useReveal(threshold = 0.01) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) { setVisible(true); return; }
    const timer = setTimeout(() => setVisible(true), 1200);
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); clearTimeout(timer); obs.disconnect(); } }, { threshold, rootMargin: "50px" });
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(timer); };
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
    }}>{children}</div>
  );
}

/* â”€â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const features = [
  { tab: "Intelligence", title: "AI-powered risk analysis", desc: "Every safety report is classified in seconds using Groq LLM. Hazard categories, justifications, and key phrases extracted automatically.", color: t.accentCyan },
  { tab: "SMS Alerts", title: "Instant department alerts", desc: "High-risk reports trigger SMS to category-mapped departments via Textbee. No manual routing needed.", color: t.accentBlue },
  { tab: "Scoring", title: "Heinrich's Law escalation", desc: "Sites scored by industry-standard model. Critical patterns surface before incidents occur.", color: t.accentOrange },
  { tab: "Offline", title: "File reports without internet", desc: "IndexedDB stores reports locally. Auto-syncs when connectivity returns. No report is ever lost.", color: t.accentYellow },
];
const results = [
  { value: "< 2s", label: "Risk classification", bg: t.surfaceWhite },
  { value: "24/7", label: "Offline capable", bg: t.surfaceWhite },
  { value: "7", label: "Hazard categories", bg: t.surfaceWhite },
  { value: "Auto", label: "SMS routing", bg: t.surfaceWhite },
];
const roles = [
  { role: "Safety Officers", desc: "Get real-time risk classification and automated SMS alerts the moment a high-risk report is filed.", highlight: "Reduce response time by 80%" },
  { role: "Site Managers", desc: "Track corrective tasks through a kanban board. Heinrich scoring watches for escalation patterns.", highlight: "Full resolution visibility" },
  { role: "Compliance Teams", desc: "Curated regulatory knowledge base for upstream oil & gas. Activity-aware mapping to applicable standards and regulations.", highlight: "Always audit-ready" },
  { role: "Executive Leadership", desc: "Dashboard with anomaly detection, site scorecards, and trend analysis across all locations.", highlight: "Data-driven safety decisions" },
];

/* â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function LandingClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeRole, setActiveRole] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div style={{ background: t.canvas, color: t.ink, minHeight: "100vh", zoom: 1.1 }}>

      {/* â”€â”€ Navbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: t.canvas }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, padding: "0 20px" }} className="sm:px-10">
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: t.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.onDark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            </div>
            <span style={{ ...fontDisplay, fontWeight: 700, fontSize: 20, letterSpacing: -0.8, color: t.ink }}>SafeSignal</span>
          </Link>
          {!isMobile && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                <a href="#features" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none" }}>Product</a>
                <a href="#roles" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none" }}>Customers</a>
                <a href="#compliance" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none" }}>Compliance</a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Link href="/reports" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none", padding: "10px 20px", borderRadius: 22, border: `1px solid ${t.hairline}`, background: t.surfaceWhite }}>Open app</Link>
                <Link href="/reports" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.onDark, textDecoration: "none", padding: "10px 20px", borderRadius: 22, background: t.ink }}>Get started</Link>
              </div>
            </>
          )}
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }} aria-label="Menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={t.ink} strokeWidth="2" strokeLinecap="round">
                {mobileMenuOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
              </svg>
            </button>
          )}
        </div>
        {isMobile && mobileMenuOpen && (
          <div style={{ borderTop: `1px solid ${t.hairline}`, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} style={{ ...fontDisplay, fontSize: 15, color: t.ink, textDecoration: "none" }}>Product</a>
            <a href="#roles" onClick={() => setMobileMenuOpen(false)} style={{ ...fontDisplay, fontSize: 15, color: t.ink, textDecoration: "none" }}>Customers</a>
            <a href="#compliance" onClick={() => setMobileMenuOpen(false)} style={{ ...fontDisplay, fontSize: 15, color: t.ink, textDecoration: "none" }}>Compliance</a>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Link href="/reports" onClick={() => setMobileMenuOpen(false)} style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none", padding: "12px 20px", borderRadius: 22, border: `1px solid ${t.hairline}`, background: t.surfaceWhite, textAlign: "center", flex: 1 }}>Open app</Link>
              <Link href="/reports" onClick={() => setMobileMenuOpen(false)} style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.onDark, textDecoration: "none", padding: "12px 20px", borderRadius: 22, background: t.ink, textAlign: "center", flex: 1 }}>Get started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section style={{ background: t.canvas, padding: "32px 20px 48px", position: "relative", overflow: "hidden" }} className="sm:px-8 sm:pt-10 sm:pb-16">
        {/* Warm gradient bloom - left side */}
        <div style={{ position: "absolute", top: "0%", left: "-12%", width: 500, height: 600, borderRadius: "50%", background: `radial-gradient(ellipse, ${t.accentOrange}40 0%, ${t.accentPink}25 40%, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "25%", left: "3%", width: 250, height: 300, borderRadius: "50%", background: `radial-gradient(ellipse, ${t.accentYellow}20 0%, transparent 60%)`, filter: "blur(40px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: "6dvh" }}>
            {/* Pill badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 22, border: `1px solid ${t.hairline}`, background: t.surfaceWhite, marginBottom: 24 }}>
              <span style={{ ...fontDisplay, fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", background: t.ink, color: t.onDark, padding: "2px 6px", borderRadius: 4 }}>New</span>
              <span style={{ ...fontDisplay, fontSize: 12, color: "#666" }}>Read our safety manifesto</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>

            {/* Headline */}
            <h1 style={{ ...tightHeading(64, -3.2), maxWidth: 700, marginBottom: 20, fontWeight: 500 }} className="text-[38px] sm:text-[64px]">
              Prevent incidents{' '}
              <em style={{ fontStyle: "italic", fontFamily: "'Newsreader', Georgia, serif", fontWeight: 400, fontSize: '0.95em' }}>before they happen.</em>
            </h1>

            <p style={{ ...fontDisplay, fontSize: 14, lineHeight: 1.5, color: "#888", maxWidth: 420, letterSpacing: -0.2, marginBottom: 28 }} className="text-[13px] sm:text-[14px] px-2">
              Real-time AI analysis of every safety report. Automatic alerts to the right teams. Full resolution tracking.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 w-full sm:w-auto" style={{ marginBottom: 32 }}>
              <Link href="/reports" className="text-center" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.onDark, textDecoration: "none", padding: "12px 24px", borderRadius: 22, background: t.ink, display: "block" }}>Get started</Link>
              <a href="#features" className="text-center" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none", padding: "12px 24px", borderRadius: 22, border: `1px solid ${t.hairline}`, background: t.surfaceWhite, display: "block" }}>Explore features</a>
            </div>

            {/* Social proof */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
              <div style={{ display: "flex", gap: 1 }}>
                {[1,2,3,4,5].map(i => <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={t.accentOrange}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
              </div>
              <span style={{ ...fontDisplay, fontSize: 11, color: "#999" }}>Trusted by <strong style={{ color: "#666" }}>modern safety teams</strong></span>
            </div>
          </div>

          {/* Line art illustration - right side */}
          <div style={{ position: "absolute", right: "3%", top: "8%", pointerEvents: "none" }} className="hidden xl:block">
            <svg width="200" height="220" viewBox="0 0 200 220" fill="none" style={{ opacity: 0.1 }}>
              <path d="M100 20L30 50V110C30 160 60 200 100 210C140 200 170 160 170 110V50L100 20Z" stroke={t.ink} strokeWidth="1.5"/>
              <path d="M70 110L90 130L135 85" stroke={t.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="50" cy="170" r="6" stroke={t.ink} strokeWidth="1"/>
              <circle cx="150" cy="170" r="4" stroke={t.ink} strokeWidth="1"/>
            </svg>
          </div>

          {/* Floating product mockup */}
          <Reveal delay={0.3}>
            <div style={{ maxWidth: 900, margin: "0 auto", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.08), 0 0 0 1px rgba(17,17,17,0.06)", background: t.surfaceWhite }}>
              {/* Chrome bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 18px", borderBottom: `1px solid ${t.hairline}`, background: "#fafaf9" }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
                <span style={{ marginLeft: 10, ...fontDisplay, fontSize: 14, color: "#888", fontWeight: 500, letterSpacing: -0.2 }}>SafeSignal Dashboard</span>
              </div>
              {/* Dashboard content */}
              <div style={{ padding: 14 }} className="sm:p-6">
                {/* Top stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }} className="sm:gap-3 sm:mb-5">
                  {[{ label: "High Risk", value: "7", color: t.accentRed, bg: "#fff5f5" }, { label: "Active Tasks", value: "24", color: t.accentOrange, bg: "#fff7ed" }, { label: "Sites", value: "12", color: t.accentBlue, bg: "#eff6ff" }].map(s => (
                    <div key={s.label} style={{ padding: 12, borderRadius: 10, background: s.bg }} className="sm:p-4">
                      <div style={{ ...fontDisplay, fontSize: 11, color: "#888", marginBottom: 4, fontWeight: 400 }} className="sm:text-xs">{s.label}</div>
                      <div style={{ ...fontDisplay, fontSize: 24, letterSpacing: -1, color: s.color, fontWeight: 600 }} className="sm:text-3xl">{s.value}</div>
                    </div>
                  ))}
                </div>
                {/* Table rows */}
                <div style={{ borderRadius: 10, border: `1px solid ${t.hairline}`, overflow: "hidden" }}>
                  {[{ risk: "HIGH", site: "Tower Block A", cat: "Fall Hazard", color: t.accentRed, bg: "#fff5f5" }, { risk: "MEDIUM", site: "Warehouse C", cat: "Electrical", color: t.accentOrange, bg: "#fff7ed" }, { risk: "LOW", site: "Office Block", cat: "Procedural", color: "rgb(22,163,74)", bg: "#f0fdf4" }].map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: i > 0 ? `1px solid ${t.hairline}` : "none" }} className="sm:gap-4 sm:px-4 sm:py-3">
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, color: r.color, background: r.bg, letterSpacing: 0.5, minWidth: 48, textAlign: "center" }}>{r.risk}</span>
                      <span style={{ ...fontDisplay, fontSize: 13, color: "#444", fontWeight: 400, flex: 1 }}>{r.site}</span>
                      <span style={{ ...fontDisplay, fontSize: 12, color: "#aaa", fontWeight: 400 }} className="hidden sm:block">{r.cat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      {/* â”€â”€ Dark Product Showcase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="features" style={{ background: "#000000", padding: "48px 20px" }} className="sm:px-8 sm:py-20">
        <Reveal>
          <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 22, border: "1px solid rgba(255,255,255,0.1)", marginBottom: 20 }}>
              <span style={{ ...fontDisplay, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, background: t.accentCyan, color: t.ink, padding: "2px 6px", borderRadius: 4 }}>New</span>
              <span style={{ ...fontDisplay, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Discover AI Safety Copilot</span>
            </div>
            <h2 style={{ ...tightHeading(48, -2.4), color: t.onDark, marginBottom: 12, fontWeight: 500 }} className="text-[30px] sm:text-[48px]">
              Meet{' '}
              <span style={{ fontStyle: "italic", fontFamily: "'Newsreader', Georgia, serif", fontWeight: 400, fontSize: '1.05em' }}>SafeSignal</span>{', the first AI Copilot'}
              <br />
              {'for '}
              <span style={{ fontStyle: "italic", fontFamily: "'Newsreader', Georgia, serif", fontWeight: 400, fontSize: '1.05em' }}>safety teams</span>
            </h2>
            <p style={{ ...fontDisplay, fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 480, margin: "0 auto 28px", letterSpacing: -0.2 }} className="sm:text-base">
              Classify risks in seconds, alert the right departments, and track every corrective action in one place.
            </p>
            <Link href="/reports" style={{ ...fontDisplay, fontSize: 13, fontWeight: 500, color: t.ink, textDecoration: "none", padding: "9px 20px", borderRadius: 22, background: t.onDark, display: "inline-block" }} className="sm:text-sm sm:px-6 sm:py-2.5">Explore SafeSignal</Link>
          </div>
        </Reveal>

        {/* Feature tabs */}
        <Reveal delay={0.15}>
          <div style={{ maxWidth: 800, margin: "48px auto 0" }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
              {features.map((f, i) => (
                <button key={f.tab} onClick={() => setActiveFeature(i)} style={{
                  ...fontDisplay, fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: 22, border: "none", cursor: "pointer",
                  background: activeFeature === i ? t.onDark : "rgba(255,255,255,0.08)", color: activeFeature === i ? t.ink : "rgba(255,255,255,0.5)",
                }}>{f.tab}</button>
              ))}
            </div>
            <div className="p-5 sm:p-8" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
              <div style={{ width: 28, height: 3, borderRadius: 2, background: features[activeFeature].color, marginBottom: 16 }} />
              <h3 style={{ ...tightHeading(24, -0.5), color: t.onDark, marginBottom: 8 }}>{features[activeFeature].title}</h3>
              <p style={{ ...fontDisplay, fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{features[activeFeature].desc}</p>
            </div>
          </div>
        </Reveal>
      </section>


      <section id="roles" style={{ background: t.canvas, padding: "64px 20px 48px" }} className="sm:px-8 sm:py-20">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ ...tightHeading(40, -2), textAlign: "center", marginBottom: 32 }} className="text-[28px] sm:text-[40px] sm:mb-10">Built for every safety role</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
              {roles.map((r, i) => (
                <button key={r.role} onClick={() => setActiveRole(i)} style={{
                  ...fontDisplay, fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 22, border: `1px solid ${activeRole === i ? t.ink : t.hairline}`, cursor: "pointer",
                  background: activeRole === i ? t.ink : t.surfaceWhite, color: activeRole === i ? t.onDark : t.ink,
                }}>{r.role}</button>
              ))}
            </div>
            <div className="p-6 sm:p-10 text-center" style={{ background: t.surfaceWhite, borderRadius: 16, boxShadow: "inset 0 0 0 1px rgba(17,17,17,0.05)", maxWidth: 600, margin: "0 auto" }}>
              <h3 style={{ ...tightHeading(24, -0.5), marginBottom: 12 }}>{roles[activeRole].role}</h3>
              <p style={{ ...fontDisplay, fontSize: 15, color: "#666", lineHeight: 1.6, marginBottom: 20 }}>{roles[activeRole].desc}</p>
              <div style={{ display: "inline-block", ...fontDisplay, fontSize: 13, fontWeight: 600, color: t.ink, padding: "8px 18px", background: t.canvas, borderRadius: 20, border: `1px solid ${t.hairline}` }}>
                {roles[activeRole].highlight}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* â”€â”€ Results Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="results" style={{ background: t.canvas, padding: "0 20px 48px" }} className="sm:px-8 sm:py-20">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ ...tightHeading(40, -2), textAlign: "center", marginBottom: 32 }} className="text-[28px] sm:text-[40px] sm:mb-10">Real results from real customers</h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12 }}>
            {results.map((r, i) => (
              <Reveal key={r.label} delay={i * 0.06}>
                <div style={{ padding: 24, borderRadius: 12, background: r.bg, textAlign: "center", boxShadow: "inset 0 0 0 1px rgba(17,17,17,0.06)" }}>
                  <div style={{ ...tightHeading(32, -1.5), color: t.ink, marginBottom: 4 }}>{r.value}</div>
                  <div style={{ ...fontDisplay, fontSize: 12, color: "#666" }}>{r.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Compliance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section id="compliance" style={{ background: t.canvas, padding: "0 20px 48px" }} className="sm:px-8 sm:py-20">
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <h2 style={{ ...tightHeading(40, -2), marginBottom: 12 }} className="text-[28px] sm:text-[40px]">Regulatory & Safety Standards Mapping</h2>
            <p style={{ ...fontDisplay, fontSize: 16, color: "#666", maxWidth: 500, margin: "0 auto 32px", letterSpacing: -0.3 }} className="sm:text-lg sm:mb-10">Curated knowledge base for upstream oil & gas. Activity-aware mapping to applicable standards.</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3" style={{ gap: 12, maxWidth: 700, margin: "0 auto" }}>
            {[{ reg: "Oil Mines Regulations, 2017", cat: "Drilling/Production" }, { reg: "OISD-116", cat: "Storage/Fire Safety" }, { reg: "OISD-GN-26", cat: "Drilling Operations" }, { reg: "Mines Act, 1952", cat: "Worker Safety" }, { reg: "OISD-STD-182", cat: "Confined Space" }, { reg: "Factories Act, 1948", cat: "Factory/Refinery" }].map((r, i) => (
              <Reveal key={r.reg} delay={i * 0.05}>
                <div style={{ padding: 16, borderRadius: 12, background: t.surfaceWhite, boxShadow: "inset 0 0 0 1px rgba(17,17,17,0.05)", textAlign: "left" }}>
                  <div style={{ ...fontDisplay, fontSize: 13, fontWeight: 500, color: t.ink, marginBottom: 6 }}>{r.reg}</div>
                  <span style={{ ...fontDisplay, fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#f0f4f8", color: "#555" }}>{r.cat}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Final CTA (dark) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section style={{ background: t.ink, padding: "48px 20px", textAlign: "center", position: "relative", overflow: "hidden" }} className="sm:px-8 sm:py-20">
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 500, height: 250, borderRadius: "50%", background: `radial-gradient(ellipse, ${t.accentCyan}12, ${t.accentBlue}08, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none" }} />
        <Reveal>
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={{ ...tightHeading(44, -2.2), color: t.onDark, marginBottom: 12 }} className="text-[28px] sm:text-[44px]">Unlock your safety superpowers</h2>
            <p style={{ ...fontDisplay, fontSize: 15, color: "rgba(255,255,255,0.5)", maxWidth: 420, margin: "0 auto 28px", letterSpacing: -0.3 }} className="text-[13px] sm:text-[15px]">Deploy in under an hour. No hardware. No special training.</p>
            <Link href="/reports" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none", padding: "12px 24px", borderRadius: 22, background: t.onDark, display: "inline-block", marginBottom: 20 }} className="sm:text-[15px] sm:px-7 sm:py-3.5">Get started</Link>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <div style={{ display: "flex", gap: 1 }}>{[1,2,3,4,5].map(i => <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={t.accentOrange}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}</div>
              <span style={{ ...fontDisplay, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Trusted by <strong style={{ color: "rgba(255,255,255,0.6)" }}>modern safety teams</strong></span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <footer style={{ background: t.ink, padding: "32px 20px 24px", borderTop: "1px solid rgba(255,255,255,0.08)" }} className="sm:px-10 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10" style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: t.onDark, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              </div>
              <span style={{ ...fontDisplay, fontWeight: 700, fontSize: 16, color: t.onDark }}>SafeSignal</span>
            </div>
            <p style={{ ...fontDisplay, fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>AI-powered workplace safety early warning system.</p>
          </div>
          {[
            { title: "Product", links: ["AI Risk Analysis", "SMS Alerts", "Scoring", "Offline Reporting"] },
            { title: "Resources", links: ["Dashboard", "Reports", "Map", "Scoreboard"] },
            { title: "Company", links: ["About", "Compliance", "Contact", "Careers"] },
          ].map(col => (
            <div key={col.title}>
              <h4 style={{ ...fontDisplay, fontSize: 13, fontWeight: 600, color: t.onDark, marginBottom: 16 }}>{col.title}</h4>
              {col.links.map(link => (
                <a key={link} href="#" style={{ ...fontDisplay, fontSize: 13, color: "rgba(255,255,255,0.4)", textDecoration: "none", display: "block", marginBottom: 8 }}>{link}</a>
              ))}
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1200, margin: "32px auto 0", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <span style={{ ...fontDisplay, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>SafeSignal - Workplace Safety Early Warning System</span>
          <div style={{ display: "flex", gap: 20 }}>
            {["Reports", "Dashboard", "Map", "Scoreboard"].map(link => (
              <Link key={link} href={`/${link.toLowerCase()}`} style={{ ...fontDisplay, fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>{link}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
