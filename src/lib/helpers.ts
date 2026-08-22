import { PrismaClient } from "@/generated/prisma/client";

// ── Gemini Config ──────────────────────────────────────────────────────────

export const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
];

export interface AnalysisResult {
  risk_level: string;
  hazard_category: string;
  justification: string;
}

// ── Gemini API Call ────────────────────────────────────────────────────────

export async function callGemini(
  prompt: string,
  apiKey: string,
  opts?: { temperature?: number; maxOutputTokens?: number; responseMimeType?: string }
): Promise<string> {
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: opts?.temperature ?? 0.1,
            maxOutputTokens: opts?.maxOutputTokens ?? 500,
            responseMimeType: opts?.responseMimeType,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) continue;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      return text;
    } catch {
      // try next model
    }
  }
  throw new Error("All Gemini models failed");
}

// ── JSON Extraction ────────────────────────────────────────────────────────

export function extractJson<T = unknown>(text: string): T {
  let cleaned = text.trim();
  // Strip markdown code fences
  const fence = String.fromCharCode(96, 96, 96);
  if (cleaned.startsWith(fence)) {
    const firstNewline = cleaned.indexOf(String.fromCharCode(10));
    cleaned = cleaned.slice(firstNewline + 1);
    const lastFence = cleaned.lastIndexOf(fence);
    if (lastFence > -1) cleaned = cleaned.slice(0, lastFence);
    cleaned = cleaned.trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned) as T;
}

// ── SLA Calculation ────────────────────────────────────────────────────────

export function getSLADeadline(riskLevel: string): Date {
  const now = new Date();
  if (riskLevel === "high") return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (riskLevel === "medium") return new Date(now.getTime() + 72 * 60 * 60 * 1000);
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
}

// ── Site Score Calculation ─────────────────────────────────────────────────

export async function recalculateSiteScore(prisma: PrismaClient, site: string) {
  const reports = await prisma.safetyReport.findMany({
    where: { site },
    select: { riskLevel: true, status: true, reportedAt: true, updatedAt: true },
  });

  const total = reports.length;
  const high = reports.filter((r) => r.riskLevel === "high").length;
  const resolved = reports.filter((r) => r.status === "resolved");
  const resolutionTimes = resolved.map(
    (r) => (new Date(r.updatedAt).getTime() - new Date(r.reportedAt).getTime()) / (1000 * 60 * 60)
  );
  const avgResolution =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

  const highPenalty = high * 15;
  const speedBonus = avgResolution > 0 ? Math.max(0, 30 - avgResolution / 2) : 0;
  const score = Math.max(0, Math.min(100, 100 - highPenalty + speedBonus));

  await prisma.siteScore.upsert({
    where: { site },
    update: {
      totalReports: total,
      highRiskCount: high,
      avgResolutionHours: Math.round(avgResolution * 10) / 10,
      scoreValue: Math.round(score),
    },
    create: {
      site,
      totalReports: total,
      highRiskCount: high,
      avgResolutionHours: Math.round(avgResolution * 10) / 10,
      scoreValue: Math.round(score),
    },
  });
}

// ── Text Similarity & Clustering ───────────────────────────────────────────

export function semanticHash(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("fall") || t.includes("height") || t.includes("scaffold") || t.includes("edge") || t.includes("guardrail"))
    return "fall_heights";
  if (t.includes("electrical") || t.includes("wire") || t.includes("circuit") || t.includes("shock"))
    return "electrical";
  if (t.includes("chemical") || t.includes("fume") || t.includes("spill") || t.includes("ventilation") || t.includes("toxic"))
    return "chemical";
  if (t.includes("vehicle") || t.includes("forklift") || t.includes("crane") || t.includes("traffic") || t.includes("truck"))
    return "vehicle";
  if (t.includes("equipment") || t.includes("machine") || t.includes("guard") || t.includes("broken") || t.includes("damaged"))
    return "equipment";
  if (t.includes("confined") || t.includes("trench") || t.includes("excavat"))
    return "confined_space";
  return "general";
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

export function textSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  return intersection / Math.max(tokensA.size, tokensB.size);
}

// ── Departments (shared across admin + detail pages) ───────────────────────

export const DEPARTMENTS: { name: string; icon: string; categories: string[] }[] = [
  { name: "Electrical", icon: "⚡", categories: ["Electrical"] },
  { name: "Structural", icon: "🏗️", categories: ["Structural", "Fall Hazard"] },
  { name: "Chemical Safety", icon: "☢️", categories: ["Chemical Exposure"] },
  { name: "Mechanical", icon: "⚙️", categories: ["Equipment Failure"] },
  { name: "Traffic & Vehicles", icon: "🚗", categories: ["Vehicle/Traffic"] },
  { name: "General Maintenance", icon: "🔧", categories: ["Procedural Gap", "Confined Space"] },
  { name: "Safety Compliance", icon: "🛡️", categories: [] },
];

export function autoAssignDept(category: string | null): string {
  if (!category) return "Safety Compliance";
  const match = DEPARTMENTS.find((d) => d.categories.includes(category));
  return match ? match.name : "Safety Compliance";
}

export function getDeptIcon(dept: string): string {
  return DEPARTMENTS.find((d) => d.name === dept)?.icon || "📋";
}
