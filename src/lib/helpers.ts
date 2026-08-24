import { PrismaClient } from "@/generated/prisma/client";

// â”€â”€ IST Date Formatting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const IST_OPTIONS_DATE: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Kolkata",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
};

const IST_OPTIONS_DATETIME: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Kolkata",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

/** Format ISO string or Date as DD/MM/YY in IST */
export function formatDateIST(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-IN", IST_OPTIONS_DATE).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

/** Format ISO string or Date as DD/MM/YY HH:MM in IST */
export function formatDateTimeIST(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-IN", IST_OPTIONS_DATETIME).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

/** Format a Date as DD/MM/YY in IST (for server-side date bucketing) */
export function dateToISTString(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-IN", IST_OPTIONS_DATE).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

/** Get current IST time as a Date object */
export function nowIST(): Date {
  const istStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istStr);
}

// â”€â”€ Groq Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-20b",
];

// No vision model available on Groq - photo cross-check will use text-only fallback

export interface AnalysisResult {
  risk_level: string;
  hazard_category: string;
  justification: string;
  key_phrases?: string[];
}

export interface ExtractedTask {
  title: string;
  description: string;
  priority: "urgent" | "high" | "normal" | "low";
}

export const TASK_EXTRACTION_PROMPT = `You are a workplace safety operations manager. Given a safety report and its risk classification, extract specific corrective actions that should be taken.

Respond with ONLY valid JSON - an array of 1-3 tasks:
[
  {
    "title": "<short action verb phrase, max 80 chars>",
    "description": "<1-2 sentence explanation of what needs to be done>",
    "priority": "urgent" | "high" | "normal" | "low"
  }
]

Rules:
- Each task must be a concrete, actionable step (not vague like "investigate" or "look into")
- Use action verbs: Install, Repair, Replace, Remove, Inspect, Test, Post, Train, etc.
- Priority should match the report's risk level: high-risk â†’ urgent/high tasks, medium â†’ high/normal, low â†’ normal/low
- For high-risk reports, include an immediate safety action AND a root-cause fix
- Keep titles under 80 characters
- Descriptions should be 1-2 sentences, specific to this report

Report:
Site: {{site}}
Risk level: {{riskLevel}}
Hazard category: {{hazardCategory}}
Report text: "{{reportText}}"`;

// â”€â”€ Groq API Call (OpenAI-compatible) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function callGroq(
  prompt: string,
  apiKey: string,
  opts?: { temperature?: number; maxOutputTokens?: number; responseFormat?: { type: string } }
): Promise<string> {
  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: opts?.temperature ?? 0.1,
          max_tokens: opts?.maxOutputTokens ?? 500,
          response_format: opts?.responseFormat,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.warn(`Groq ${model} failed:`, data.error?.message);
        continue;
      }
      const text = data.choices?.[0]?.message?.content;
      if (!text) continue;
      return text;
    } catch {
      // try next model
    }
  }
  throw new Error("All Groq models failed");
}



// â”€â”€ JSON Extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Fallback Analysis (when AI unavailable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function fallbackAnalysis(reportText: string): AnalysisResult {
  const text = reportText.toLowerCase();

  // --- HIGH RISK: credible path to serious injury or death ---
  const highRiskKeywords = [
    // Fall / height hazards
    "fall", "falling", "fell", "unguarded", "edge", "trench", "scaffold",
    "scaffolding", "harness", "guardrail", "heights", "roof", "elevated",
    "working at height", "ladder", "platform", "excavation", "pit",
    // Electrical hazards
    "live electrical", "exposed wiring", "electrical shock", "electrocution",
    "short circuit", "electric arc", "burn", "electrical", "wiring",
    "power line", "high voltage", "panel", "overloaded",
    // Structural / collapse
    "collapse", "crumbling", "unstable", "struct", "damaged struct",
    "cave-in", "demolition", "underpinning",
    // Chemical / gas / fire
    "chemical spill", "gas leak", "toxic", "fume", "hazardous material",
    "flammable", "fire", "explosion", "smoke", "gas detection",
    "asbestos", "radiation", "confined space", "oxygen deficiency",
    // Vehicle / traffic
    "forklift", "vehicle", "struck by", "crush", "run over", "truck",
    "heavy machinery", "moving equipment", "traffic",
    // Equipment / machinery
    "unguarded machinery", "moving parts", "pinch point", "entanglement",
    "crane", "hoist", "load", "equipment failure", "malfunction",
    "no guard", "guard removed", "removed guard", "bypassed safety",
    // Near-miss / incident indicators
    "almost hit", "almost fell", "near miss", "near-miss", "close call",
    "dropped", "snapped", "broke", "burst", "ruptured",
    // General severity indicators
    "serious", "injury", "hospitalized", "unconscious", "bleeding",
    "fracture", "broken bone", "amputation", "fatality", "death",
    "entrapment", "drowning", "struck", "hit by",
    // Missing safety measures
    "no ppe", "without protection", "no safety", "missing safety",
    "failed safety", "safety bypass",
  ];

  const isHighRisk = highRiskKeywords.some((kw) => text.includes(kw)) ||
    // Compound conditions
    (text.includes("removed") && text.includes("guard")) ||
    (text.includes("no") && text.includes("guard")) ||
    (text.includes("not") && text.includes("wearing") && (text.includes("harness") || text.includes("ppe") || text.includes("hard hat"))) ||
    (text.includes("loose") && (text.includes("bolt") || text.includes("nut") || text.includes("connection") || text.includes("scaffold"))) ||
    (text.includes("wobbly") && (text.includes("scaffold") || text.includes("ladder") || text.includes("platform"))) ||
    (text.includes("near") && text.includes("miss")) ||
    (text.includes("almost") && (text.includes("hit") || text.includes("fell") || text.includes("dropped") || text.includes("struck"))) ||
    (text.includes("no") && (text.includes("harness") || text.includes("guardrail") || text.includes("barrier"))) ||
    (text.includes("exposed") && (text.includes("wire") || text.includes("cable") || text.includes("conductor"))) ||
    (text.includes("blocked") && (text.includes("exit") || text.includes("egress") || text.includes("fire"))) ||
    (text.includes("leak") && (text.includes("gas") || text.includes("chemical") || text.includes("pipe"))) ||
    (text.includes("spill") && (text.includes("chemical") || text.includes("oil") || text.includes("fuel"))) ||
    (text.includes("overloaded") && (text.includes("circuit") || text.includes("wire") || text.includes("crane"))) ||
    (text.includes("hot") && (text.includes("work") || text.includes("surface"))) ||
    (text.includes("underground") && (text.includes("cable") || text.includes("pipe") || text.includes("wire"))) ||
    (text.includes("collapse") || text.includes("cave in") || text.includes("cave-in")) ||
    (text.includes("fire") || text.includes("smoke") || text.includes("burn")) ||
    (text.includes("gas") && (text.includes("leak") || text.includes("detection") || text.includes("hazard"))) ||
    (text.includes("confined") && text.includes("space"));

  if (isHighRisk) {
    const category =
      text.includes("fall") || text.includes("scaffold") || text.includes("trench") || text.includes("guardrail") || text.includes("harness") || text.includes("height") || text.includes("roof") || text.includes("excavation") ? "Structural" :
      text.includes("electrical") || text.includes("wiring") || text.includes("short circuit") || text.includes("power line") || text.includes("shock") || text.includes("voltage") || text.includes("panel") ? "Electrical" :
      text.includes("forklift") || text.includes("vehicle") || text.includes("truck") || text.includes("traffic") || text.includes("struck by") ? "Vehicle/Traffic" :
      text.includes("confined") || text.includes("chemical") || text.includes("toxic") || text.includes("gas") || text.includes("asbestos") || text.includes("fume") ? "Chemical Exposure" :
      text.includes("fire") || text.includes("smoke") || text.includes("burn") || text.includes("flammable") || text.includes("explosion") ? "Fire/Explosion" :
      text.includes("crane") || text.includes("equipment") || text.includes("machinery") || text.includes("hoist") || text.includes("malfunction") ? "Equipment Failure" :
      "Structural";
    return {
      risk_level: "high",
      hazard_category: category,
      justification: "Report describes conditions with a credible path to serious injury or death if left unaddressed.",
    };
  }

  // --- MEDIUM RISK: real hazard but lower severity or partially mitigated ---
  const mediumRiskKeywords = [
    "not wearing", "missing ppe", "damaged", "wear and tear",
    "spill kit", "ventilation", "blocked", "obstruction",
    "minor injury", "first aid", "bruise", "cut", "scrape",
    "cracked", "bent", "worn", "degraded", "deteriorated",
    "slippery", "wet floor", "uneven", "debris", "clutter",
    "noise", "dust", "poor lighting", "inadequate",
    "missing label", "unlabeled", "expired",
    "training", "procedure not followed", "shortcut",
  ];

  const isMediumRisk = mediumRiskKeywords.some((kw) => text.includes(kw)) ||
    (text.includes("exit") && text.includes("block")) ||
    (text.includes("not") && text.includes("wearing")) ||
    (text.includes("missing") && (text.includes("guard") || text.includes("cap") || text.includes("cover") || text.includes("light"))) ||
    (text.includes("damaged") && (text.includes("equipment") || text.includes("tool") || text.includes("scaffold") || text.includes("harness"))) ||
    (text.includes("no") && (text.includes("lighting") || text.includes("ventilation") || text.includes("sign"))) ||
    (text.includes("slip") || text.includes("trip") || text.includes("slippery")) ||
    (text.includes("unstable") && !text.includes("collapse")) ||
    (text.includes("cracked") || text.includes("broken") || text.includes("bent"));

  if (isMediumRisk) {
    const category =
      text.includes("hard hat") || text.includes("ppe") || text.includes("wearing") || text.includes("safety glasses") || text.includes("gloves") ? "Procedural Gap" :
      text.includes("spill") || text.includes("chemical") || text.includes("ventilation") || text.includes("dust") || text.includes("fume") ? "Chemical Exposure" :
      text.includes("exit") || text.includes("blocked") || text.includes("fire") ? "Procedural Gap" :
      text.includes("electrical") || text.includes("wire") ? "Electrical" :
      text.includes("equipment") || text.includes("tool") || text.includes("machinery") ? "Equipment Failure" :
      text.includes("noise") || text.includes("lighting") ? "Procedural Gap" :
      text.includes("slip") || text.includes("trip") || text.includes("floor") ? "Structural" :
      "Procedural Gap";
    return {
      risk_level: "medium",
      hazard_category: category,
      justification: "Real hazard exists but is either partially mitigated or lower in severity.",
    };
  }

  // --- LOW RISK: minor/procedural issue ---
  return {
    risk_level: "low",
    hazard_category: "Procedural Gap",
    justification: "Minor or procedural issue unlikely to cause serious physical harm.",
  };
}

// â”€â”€ SLA Calculation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function getSLADeadline(riskLevel: string): Date {
  const now = new Date();
  if (riskLevel === "high") return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (riskLevel === "medium") return new Date(now.getTime() + 72 * 60 * 60 * 1000);
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
}

// â”€â”€ Site Score Calculation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Key Phrase Extraction (fallback when Gemini unavailable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const KEY_PHRASE_PATTERNS: Record<string, RegExp[]> = {
  high: [
    /(?:unguarded|exposed|live)\s+(?:wire|electrical|edge|height|crane)/gi,
    /(?:no\s+(?:guard|rail|barrier|harness|protection))/gi,
    /(?:confined\s+space)/gi,
    /(?:collapse|collapsed|collapsing)/gi,
    /(?:near[- ]?miss|almost\s+(?:hit|fell|dropped))/gi,
    /(?:leaking|spill(?:ing)?|toxic|poison)/gi,
    /(?:serious\s+(?:injury|risk|danger|hazard))/gi,
    /(?:death|fatal|fatality)/gi,
  ],
  medium: [
    /(?:not\s+wearing|missing\s+(?:helmet|hardhat|safety))/gi,
    /(?:damaged|broken|malfunction)/gi,
    /(?:headache|nausea|dizziness)/gi,
    /(?:blocked\s+(?:exit|aisle|fire))/gi,
    /(?:worn[- ]?(?:out|damaged))/gi,
  ],
  low: [
    /(?:minor|small|slight)/gi,
    /(?:procedure|policy|documentation)/gi,
    /(?:signage|labeling|housekeeping)/gi,
  ],
};

export function extractKeyPhrases(reportText: string): string[] {
  const phrases: string[] = [];
  const seen = new Set<string>();

  // Try high-risk patterns first (they indicate the most important signals)
  for (const [level, patterns] of Object.entries(KEY_PHRASE_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = reportText.match(pattern);
      if (matches) {
        for (const match of matches) {
          const trimmed = match.trim();
          const key = trimmed.toLowerCase();
          if (!seen.has(key) && trimmed.length > 3) {
            seen.add(key);
            phrases.push(trimmed);
          }
        }
      }
    }
    // Stop at 5 phrases
    if (phrases.length >= 5) break;
  }

  // If no patterns matched, extract the longest sentences as fallback
  if (phrases.length === 0) {
    const sentences = reportText.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    for (const s of sentences.slice(0, 3)) {
      phrases.push(s.trim());
    }
  }

  return phrases.slice(0, 5);
}

// â”€â”€ Heinrich's Law Escalation Score â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface EscalationScore {
  site: string;
  score: number;
  classification: "Critical" | "Elevated" | "Normal";
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalReports: number;
  explanation: string;
}

export function calculateEscalationScores(
  reports: { site: string; riskLevel: string | null; reportedAt: Date }[]
): EscalationScore[] {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = reports.filter((r) => r.reportedAt >= thirtyDaysAgo);

  const siteMap: Record<string, { high: number; medium: number; low: number }> = {};
  for (const r of recent) {
    if (!r.riskLevel) continue;
    if (!siteMap[r.site]) siteMap[r.site] = { high: 0, medium: 0, low: 0 };
    if (r.riskLevel === "high") siteMap[r.site].high++;
    else if (r.riskLevel === "medium") siteMap[r.site].medium++;
    else siteMap[r.site].low++;
  }

  return Object.entries(siteMap)
    .map(([site, counts]) => {
      const score = counts.high * 10 + counts.medium * 3 + counts.low * 1;
      const total = counts.high + counts.medium + counts.low;
      let classification: "Critical" | "Elevated" | "Normal";
      if (score > 40) classification = "Critical";
      else if (score >= 20) classification = "Elevated";
      else classification = "Normal";

      const parts: string[] = [];
      if (counts.high) parts.push(`${counts.high} high-risk`);
      if (counts.medium) parts.push(`${counts.medium} medium-risk`);
      if (counts.low) parts.push(`${counts.low} low-risk`);
      const explanation = `${parts.join(" and ")} report${total !== 1 ? "s" : ""} in the last 30 days`;

      return { site, score, classification, highRiskCount: counts.high, mediumRiskCount: counts.medium, lowRiskCount: counts.low, totalReports: total, explanation };
    })
    .sort((a, b) => b.score - a.score);
}

// â”€â”€ Text Similarity & Clustering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Hazard Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const HAZARD_CATEGORIES = [
  "All Categories",
  "Structural",
  "Fall Hazard",
  "Electrical",
  "Chemical Exposure",
  "Equipment Failure",
  "Vehicle/Traffic",
  "Procedural Gap",
  "Confined Space",
];

// â”€â”€ Departments (shared across admin + detail pages) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const DEPARTMENTS: { name: string; icon: string; categories: string[] }[] = [
  { name: "Electrical", icon: "âš¡", categories: ["Electrical"] },
  { name: "Structural", icon: "ðŸ-ï¸", categories: ["Structural", "Fall Hazard"] },
  { name: "Chemical Safety", icon: "â˜¢ï¸", categories: ["Chemical Exposure"] },
  { name: "Mechanical", icon: "âš™ï¸", categories: ["Equipment Failure"] },
  { name: "Traffic & Vehicles", icon: "ðŸš-", categories: ["Vehicle/Traffic"] },
  { name: "General Maintenance", icon: "ðŸ”§", categories: ["Procedural Gap", "Confined Space"] },
  { name: "Safety Compliance", icon: "ðŸ›¡ï¸", categories: [] },
];

export function autoAssignDept(category: string | null): string {
  if (!category) return "Safety Compliance";
  const match = DEPARTMENTS.find((d) => d.categories.includes(category));
  return match ? match.name : "Safety Compliance";
}

export function getDeptIcon(dept: string): string {
  return DEPARTMENTS.find((d) => d.name === dept)?.icon || "ðŸ“‹";
}

// â”€â”€ Fallback Task Extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function fallbackTaskExtraction(
  reportText: string,
  riskLevel: string,
  hazardCategory: string
): ExtractedTask[] {
  const text = reportText.toLowerCase();
  const tasks: ExtractedTask[] = [];

  // Immediate safety action for high/medium risk
  if (riskLevel === "high" || riskLevel === "medium") {
    if (text.includes("electrical") || text.includes("wiring") || text.includes("circuit")) {
      tasks.push({ title: "De-energize and lockout affected electrical system", description: "Immediately isolate the hazardous electrical area and apply lockout/tagout procedures until repairs are complete.", priority: "urgent" });
    } else if (text.includes("fall") || text.includes("height") || text.includes("scaffold") || text.includes("guardrail")) {
      tasks.push({ title: "Install temporary fall protection barriers", description: "Erect guardrails, safety nets, or personal fall arrest systems at the identified height hazard before any work resumes.", priority: "urgent" });
    } else if (text.includes("chemical") || text.includes("fume") || text.includes("spill") || text.includes("toxic")) {
      tasks.push({ title: "Evacuate area and deploy ventilation", description: "Clear the affected area, set up emergency ventilation, and post hazard signage until air quality tests confirm safe levels.", priority: "urgent" });
    } else if (text.includes("vehicle") || text.includes("forklift") || text.includes("crane")) {
      tasks.push({ title: "Restrict vehicle access to hazard zone", description: "Establish physical barriers and signage to prevent unauthorized vehicle entry near the reported hazard.", priority: "high" });
    } else if (text.includes("confined") || text.includes("trench")) {
      tasks.push({ title: "Post confined space signage and deploy gas monitor", description: "Lock out the confined space entry point and set up continuous atmospheric monitoring before any re-entry.", priority: "urgent" });
    } else {
      tasks.push({ title: "Secure the hazard area and post warning signs", description: "Cordon off the affected area and post appropriate warning signage to prevent worker exposure.", priority: riskLevel === "high" ? "urgent" : "high" });
    }
  }

  // Root-cause fix task
  if (text.includes("guard") || text.includes("missing") || text.includes("broken") || text.includes("damaged")) {
    tasks.push({ title: "Repair or replace damaged safety equipment", description: "Inspect all related safety equipment in the area and replace any damaged or missing components.", priority: riskLevel === "high" ? "high" : "normal" });
  } else if (text.includes("training") || text.includes("not wearing") || text.includes("procedure")) {
    tasks.push({ title: "Conduct safety refresher training for affected crew", description: "Schedule and deliver targeted safety training addressing the specific hazard identified in this report.", priority: "normal" });
  } else {
    tasks.push({ title: "Inspect and remediate root cause", description: "Conduct a thorough inspection of the reported hazard area and implement permanent corrective measures.", priority: riskLevel === "high" ? "high" : "normal" });
  }

  // Follow-up task for high risk
  if (riskLevel === "high") {
    tasks.push({ title: "Schedule follow-up inspection within 24 hours", description: "Verify corrective actions are in place and effective. Document findings and update report status.", priority: "normal" });
  }

  return tasks;
}
