"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

/* ─── Design Tokens ──────────────────────────────────────────────────── */
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

const fontDisplay: React.CSSProperties = { fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 400 };
const tightHeading = (size: number, ls: number): React.CSSProperties => ({
  ...fontDisplay, fontSize: `${size}px`, letterSpacing: `${ls}px`, lineHeight: size >= 48 ? 1.0 : 1.1,
});

/* ─── Scroll Reveal ──────────────────────────────────────────────────── */
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

/* ─── Data ────────────────────────────────────────────────────────────── */
const logos = ["L&T Construction", "Tata Projects", "Adani Group", "Reliance Infra", "Godrej Properties", "DLF Limited"];
const features = [
  { tab: "Intelligence", title: "AI-powered risk analysis", desc: "Every safety report is classified in seconds using Groq LLM. Hazard categories, justifications, and key phrases extracted automatically.", color: t.accentCyan },
  { tab: "SMS Alerts", title: "Instant department alerts", desc: "High-risk reports trigger SMS to category-mapped departments via Textbee. No manual routing needed.", color: t.accentBlue },
  { tab: "Scoring", title: "Heinrich's Law escalation", desc: "Sites scored by industry-standard model. Critical patterns surface before incidents occur.", color: t.accentOrange },
  { tab: "Offline", title: "File reports without internet", desc: "IndexedDB stores reports locally. Auto-syncs when connectivity returns. No report is ever lost.", color: t.accentYellow },
];
const results = [
  { value: "< 2s", label: "Risk classification", bg: "#fff5f5" },
  { value: "24/7", label: "Offline capable", bg: "#f0fdf4" },
  { value: "7", label: "Hazard categories", bg: "#eff6ff" },
  { value: "Auto", label: "SMS routing", bg: "#fff7ed" },
];
const roles = [
  { role: "Safety Officers", desc: "Get real-time risk classification and automated SMS alerts the moment a high-risk report is filed.", highlight: "Reduce response time by 80%" },
  { role: "Site Managers", desc: "Track corrective tasks through a kanban board. Heinrich scoring watches for escalation patterns.", highlight: "Full resolution visibility" },
  { role: "Compliance Teams", desc: "Every hazard category mapped to Indian regulatory standards. Automatic cross-reference on classification.", highlight: "Always audit-ready" },
  { role: "Executive Leadership", desc: "Dashboard with anomaly detection, site scorecards, and trend analysis across all locations.", highlight: "Data-driven safety decisions" },
];

/* ─── Main ────────────────────────────────────────────────────────────── */
export default function LandingClient() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeRole, setActiveRole] = useState(0);

  return (
    <div style={{ background: t.canvas, color: t.ink, minHeight: "100vh" }} className="-mx-4 sm:-mx-8 -mt-6 sm:-mt-8">

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: t.canvas }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill={t.ink}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span style={{ ...fontDisplay, fontWeight: 600, fontSize: 20, letterSpacing: -0.8, color: t.ink }}>SafeSignal</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="hidden md:flex">
            <a href="#features" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none" }}>Product</a>
            <a href="#how-it-works" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none" }}>How it works</a>
            <a href="#roles" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none" }}>Customers</a>
            <a href="#compliance" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none" }}>Compliance</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }} className="hidden md:flex">
            <Link href="/reports" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none", padding: "10px 20px", borderRadius: 22, border: `1px solid ${t.hairline}`, background: t.surfaceWhite }}>Open app</Link>
            <Link href="/reports" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.onDark, textDecoration: "none", padding: "10px 20px", borderRadius: 22, background: t.ink }}>Get a demo</Link>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden" style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }} aria-label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.ink} strokeWidth="2" strokeLinecap="round">
              {mobileMenuOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden" style={{ borderTop: `1px solid ${t.hairline}`, padding: "16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} style={{ ...fontDisplay, fontSize: 15, color: t.ink, textDecoration: "none" }}>Product</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} style={{ ...fontDisplay, fontSize: 15, color: t.ink, textDecoration: "none" }}>How it works</a>
            <Link href="/reports" onClick={() => setMobileMenuOpen(false)} style={{ ...fontDisplay, fontSize: 15, fontWeight: 500, color: t.onDark, textDecoration: "none", padding: "12px 20px", borderRadius: 22, background: t.ink, textAlign: "center", marginTop: 4 }}>Get a demo</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{ background: t.canvas, padding: "40px 32px 0", position: "relative", overflow: "hidden" }}>
        {/* Warm gradient bloom - left side */}
        <div style={{ position: "absolute", top: "0%", left: "-12%", width: 500, height: 600, borderRadius: "50%", background: `radial-gradient(ellipse, ${t.accentOrange}40 0%, ${t.accentPink}25 40%, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "25%", left: "3%", width: 250, height: 300, borderRadius: "50%", background: `radial-gradient(ellipse, ${t.accentYellow}20 0%, transparent 60%)`, filter: "blur(40px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: "6dvh" }}>
            {/* Pill badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 22, border: `1px solid ${t.hairline}`, background: t.surfaceWhite, marginBottom: 28 }}>
              <span style={{ ...fontDisplay, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", background: t.ink, color: t.onDark, padding: "2px 8px", borderRadius: 4 }}>New</span>
              <span style={{ ...fontDisplay, fontSize: 13, color: "#666" }}>Read our safety manifesto</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>

            {/* Headline with italic emphasis */}
            <h1 style={{ ...tightHeading(52, -2.6), maxWidth: 700, marginBottom: 20 }}>
              Step <em style={{ fontStyle: "italic" }}>into</em> the future
              <br />of workplace safety
            </h1>

            <p style={{ ...fontDisplay, fontSize: 18, lineHeight: 1.4, color: "#666", maxWidth: 460, letterSpacing: -0.3, marginBottom: 36 }}>
              Empower your safety teams, catch early warning signs, and prevent serious incidents with an all-in-one AI platform.
            </p>

            {/* Email capture + CTA */}
            <div style={{ display: "flex", gap: 0, maxWidth: 460, width: "100%", marginBottom: 16 }}>
              <input type="email" placeholder="Enter your company email" style={{ ...fontDisplay, fontSize: 15, color: t.ink, flex: 1, padding: "14px 20px", borderRadius: "10px 0 0 10px", border: `1px solid ${t.hairline}`, borderRight: "none", background: t.surfaceWhite, outline: "none" }} />
              <Link href="/reports" style={{ ...fontDisplay, fontSize: 15, fontWeight: 500, color: t.onDark, textDecoration: "none", padding: "14px 28px", borderRadius: "0 10px 10px 0", background: t.ink, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>Get a demo</Link>
            </div>

            {/* Social proof */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
              <div style={{ display: "flex", gap: 1 }}>
                {[1,2,3,4,5].map(i => <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={t.accentOrange}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
              </div>
              <span style={{ ...fontDisplay, fontSize: 12, color: "#999" }}>G Cool Vendor by <strong style={{ color: "#666" }}>Gartner</strong></span>
            </div>
          </div>

          {/* Line art illustration - right side */}
          <div style={{ position: "absolute", right: "3%", top: "8%", pointerEvents: "none" }} className="hidden lg:block">
            <svg width="200" height="220" viewBox="0 0 200 220" fill="none" style={{ opacity: 0.1 }}>
              <path d="M100 20L30 50V110C30 160 60 200 100 210C140 200 170 160 170 110V50L100 20Z" stroke={t.ink} strokeWidth="1.5"/>
              <path d="M70 110L90 130L135 85" stroke={t.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="50" cy="170" r="6" stroke={t.ink} strokeWidth="1"/>
              <circle cx="150" cy="170" r="4" stroke={t.ink} strokeWidth="1"/>
            </svg>
          </div>

          {/* Floating product mockup */}
          <Reveal delay={0.3}>
            <div style={{ maxWidth: 880, margin: "0 auto", borderRadius: "16px 16px 0 0", overflow: "hidden", boxShadow: "0 -8px 50px rgba(17,17,17,0.1), 0 0 0 1px rgba(17,17,17,0.05)", background: t.surfaceWhite, transform: "translateY(30px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderBottom: `1px solid ${t.hairline}`, background: "#fafafa" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
                <span style={{ marginLeft: 8, ...fontDisplay, fontSize: 12, color: "#999" }}>SafeSignal Dashboard</span>
              </div>
              <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[{ label: "High Risk", value: "7", color: t.accentRed, bg: "#fff5f5" }, { label: "Active Tasks", value: "24", color: t.accentOrange, bg: "#fff7ed" }, { label: "Sites", value: "12", color: t.accentBlue, bg: "#eff6ff" }].map(s => (
                  <div key={s.label} style={{ padding: 14, borderRadius: 10, background: s.bg, border: "inset 0 0 0 1px rgba(17,17,17,0.05)" }}>
                    <div style={{ ...fontDisplay, fontSize: 11, color: "#888", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ ...fontDisplay, fontSize: 24, letterSpacing: -1, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "0 20px 20px" }}>
                {[{ risk: "HIGH", site: "Tower Block A", cat: "Fall Hazard", color: t.accentRed, bg: "#fff5f5" }, { risk: "MEDIUM", site: "Warehouse C", cat: "Electrical", color: t.accentOrange, bg: "#fff7ed" }].map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i > 0 ? `1px solid ${t.hairline}` : "none" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, color: r.color, background: r.bg, letterSpacing: 0.5 }}>{r.risk}</span>
                    <span style={{ ...fontDisplay, fontSize: 13, color: "#555" }}>{r.site}</span>
                    <span style={{ ...fontDisplay, fontSize: 12, color: "#999" }}>{r.cat}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Logo Wall ───────────────────────────────────────────── */}
      <section style={{ background: t.canvas, padding: "60px 32px 40px" }}>
        <Reveal>
          <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <p style={{ ...fontDisplay, fontSize: 13, color: "#999", marginBottom: 24 }}>Trusted by industry leaders</p>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 40, flexWrap: "wrap" }}>
              {logos.map(name => (
                <span key={name} style={{ ...fontDisplay, fontSize: 15, fontWeight: 600, color: "#bbb", letterSpacing: -0.3, whiteSpace: "nowrap" }}>{name}</span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Testimonial 1 ──────────────────────────────────────── */}
      <section style={{ background: t.canvas, padding: "20px 32px 60px" }}>
        <Reveal>
          <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", gap: 24, alignItems: "flex-start" }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: t.surfaceWhite, border: `1px solid ${t.hairline}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...fontDisplay, fontSize: 11, fontWeight: 700, color: t.ink, letterSpacing: -0.3 }}>
              L&T
            </div>
            <div>
              <p style={{ ...tightHeading(20, -0.4), marginBottom: 12, lineHeight: 1.4 }}>
                &ldquo;SafeSignal is catching hazards for us 24/7. I wake up to classified risk reports and auto-routed alerts, saving our team hours on manual review every day.&rdquo;
              </p>
              <p style={{ ...fontDisplay, fontSize: 13, color: "#999" }}>Safety Head at L&T Construction</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Dark Product Showcase ───────────────────────────────── */}
      <section id="features" style={{ background: t.surfaceDark, padding: "80px 32px" }}>
        <Reveal>
          <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 22, border: "1px solid rgba(255,255,255,0.1)", marginBottom: 20 }}>
              <span style={{ ...fontDisplay, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, background: t.accentCyan, color: t.ink, padding: "2px 6px", borderRadius: 4 }}>New</span>
              <span style={{ ...fontDisplay, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Discover AI Safety Copilot</span>
            </div>
            <h2 style={{ ...tightHeading(40, -2), color: t.onDark, marginBottom: 12 }}>Meet SafeSignal, the first AI Copilot for safety teams</h2>
            <p style={{ ...fontDisplay, fontSize: 16, color: "rgba(255,255,255,0.5)", maxWidth: 480, margin: "0 auto 32px", letterSpacing: -0.2 }}>
              Classify risks in seconds, alert the right departments, and track every corrective action in one place.
            </p>
            <Link href="/reports" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.ink, textDecoration: "none", padding: "10px 24px", borderRadius: 22, background: t.onDark, display: "inline-block" }}>Explore SafeSignal</Link>
          </div>
        </Reveal>

        {/* Feature tabs */}
        <Reveal delay={0.15}>
          <div style={{ maxWidth: 800, margin: "48px auto 0" }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
              {features.map((f, i) => (
                <button key={f.tab} onClick={() => setActiveFeature(i)} style={{
                  ...fontDisplay, fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 22, border: "none", cursor: "pointer",
                  background: activeFeature === i ? t.onDark : "rgba(255,255,255,0.08)", color: activeFeature === i ? t.ink : "rgba(255,255,255,0.5)",
                }}>{f.tab}</button>
              ))}
            </div>
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 16, padding: 32, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: 28, height: 3, borderRadius: 2, background: features[activeFeature].color, marginBottom: 16 }} />
              <h3 style={{ ...tightHeading(24, -0.5), color: t.onDark, marginBottom: 8 }}>{features[activeFeature].title}</h3>
              <p style={{ ...fontDisplay, fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{features[activeFeature].desc}</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Testimonial 2 + CTA Card ───────────────────────────── */}
      <section style={{ background: t.canvas, padding: "80px 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Reveal>
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 60 }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: t.surfaceWhite, border: `1px solid ${t.hairline}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...fontDisplay, fontSize: 10, fontWeight: 700, color: t.ink }}>
                Tata
              </div>
              <div>
                <p style={{ ...tightHeading(20, -0.4), marginBottom: 12, lineHeight: 1.4 }}>
                  &ldquo;SafeSignal has everything you need for safety management in one place. The AI classification is incredibly accurate.&rdquo;
                </p>
                <p style={{ ...fontDisplay, fontSize: 13, color: "#999" }}>EHS Director at Tata Projects</p>
              </div>
            </div>
          </Reveal>

          {/* CTA card */}
          <Reveal delay={0.1}>
            <div style={{ background: t.surfaceWhite, borderRadius: 16, padding: "48px 40px", boxShadow: "inset 0 0 0 1px rgba(17,17,17,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ ...tightHeading(32, -1.2), marginBottom: 8 }}>Start your safety transformation</h2>
                <p style={{ ...fontDisplay, fontSize: 15, color: "#666" }}>Deploy in under an hour. No hardware needed.</p>
              </div>
              <div style={{ display: "flex", gap: 0, minWidth: 340 }}>
                <input type="email" placeholder="Enter your company email" style={{ ...fontDisplay, fontSize: 14, color: t.ink, flex: 1, padding: "12px 16px", borderRadius: "8px 0 0 8px", border: `1px solid ${t.hairline}`, borderRight: "none", background: t.canvas, outline: "none" }} />
                <Link href="/reports" style={{ ...fontDisplay, fontSize: 14, fontWeight: 500, color: t.onDark, textDecoration: "none", padding: "12px 20px", borderRadius: "0 8px 8px 0", background: t.ink, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>Get a demo</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Roles Section ───────────────────────────────────────── */}
      <section id="roles" style={{ background: t.canvas, padding: "0 32px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ ...tightHeading(40, -2), textAlign: "center", marginBottom: 40 }}>Built for every safety role</h2>
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
            <div style={{ background: t.surfaceWhite, borderRadius: 16, padding: 32, boxShadow: "inset 0 0 0 1px rgba(17,17,17,0.05)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }} className="grid grid-cols-1 md:grid-cols-2">
              <div>
                <h3 style={{ ...tightHeading(24, -0.5), marginBottom: 8 }}>{roles[activeRole].role}</h3>
                <p style={{ ...fontDisplay, fontSize: 15, color: "#666", lineHeight: 1.5, marginBottom: 16 }}>{roles[activeRole].desc}</p>
                <span style={{ ...fontDisplay, fontSize: 13, fontWeight: 500, color: t.accentBlue }}>{roles[activeRole].highlight}</span>
              </div>
              <div style={{ background: t.canvas, borderRadius: 12, padding: 24, minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: t.surfaceWhite, border: `1px solid ${t.hairline}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={t.ink} strokeWidth="1.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Results Grid ────────────────────────────────────────── */}
      <section id="results" style={{ background: t.canvas, padding: "0 32px 80px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Reveal>
            <h2 style={{ ...tightHeading(40, -2), textAlign: "center", marginBottom: 40 }}>Real results from real customers</h2>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }} className="grid grid-cols-2 md:grid-cols-4">
            {results.map((r, i) => (
              <Reveal key={r.label} delay={i * 0.06}>
                <div style={{ padding: 24, borderRadius: 12, background: r.bg, textAlign: "center" }}>
                  <div style={{ ...tightHeading(32, -1.5), color: t.ink, marginBottom: 4 }}>{r.value}</div>
                  <div style={{ ...fontDisplay, fontSize: 12, color: "#666" }}>{r.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance ─────────────────────────────────────────── */}
      <section id="compliance" style={{ background: t.canvas, padding: "0 32px 80px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <Reveal>
            <h2 style={{ ...tightHeading(40, -2), marginBottom: 12 }}>Built for Indian regulatory standards</h2>
            <p style={{ ...fontDisplay, fontSize: 17, color: "#666", maxWidth: 500, margin: "0 auto 40px", letterSpacing: -0.3 }}>Every hazard category mapped to the relevant Indian safety regulation.</p>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 700, margin: "0 auto" }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {[{ reg: "Factories Act, 1948", cat: "Structural" }, { reg: "IS 3786:1992", cat: "Fall Hazard" }, { reg: "Electricity Act, 2003", cat: "Electrical" }, { reg: "MSHCPE Rules, 2008", cat: "Chemical" }, { reg: "CMVR, 1989", cat: "Vehicle" }, { reg: "Petroleum Act, 1934", cat: "Confined Space" }].map((r, i) => (
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

      {/* ── Final CTA (dark) ────────────────────────────────────── */}
      <section style={{ background: t.ink, padding: "80px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 500, height: 250, borderRadius: "50%", background: `radial-gradient(ellipse, ${t.accentCyan}12, ${t.accentBlue}08, transparent 70%)`, filter: "blur(60px)", pointerEvents: "none" }} />
        <Reveal>
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={{ ...tightHeading(44, -2.2), color: t.onDark, marginBottom: 12 }}>Unlock your safety superpowers</h2>
            <p style={{ ...fontDisplay, fontSize: 17, color: "rgba(255,255,255,0.5)", maxWidth: 420, margin: "0 auto 32px", letterSpacing: -0.3 }}>Deploy in under an hour. No hardware. No special training.</p>
            <div style={{ display: "flex", gap: 0, maxWidth: 420, margin: "0 auto 20px" }}>
              <input type="email" placeholder="Enter your company email" style={{ ...fontDisplay, fontSize: 15, color: t.onDark, flex: 1, padding: "14px 20px", borderRadius: "10px 0 0 10px", border: "1px solid rgba(255,255,255,0.15)", borderRight: "none", background: "rgba(255,255,255,0.06)", outline: "none" }} />
              <Link href="/reports" style={{ ...fontDisplay, fontSize: 15, fontWeight: 500, color: t.ink, textDecoration: "none", padding: "14px 28px", borderRadius: "0 10px 10px 0", background: t.onDark, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>Get a demo</Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 1 }}>{[1,2,3,4,5].map(i => <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={t.accentOrange}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}</div>
              <span style={{ ...fontDisplay, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>G Cool Vendor by <strong style={{ color: "rgba(255,255,255,0.6)" }}>Gartner</strong></span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer style={{ background: t.ink, padding: "48px 40px 32px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40 }} className="grid grid-cols-2 md:grid-cols-4">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill={t.onDark}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span style={{ ...fontDisplay, fontWeight: 600, fontSize: 16, color: t.onDark }}>SafeSignal</span>
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
