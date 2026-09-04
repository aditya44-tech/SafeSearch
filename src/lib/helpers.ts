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

export type SifPotentialValue = "SIF-Unlikely" | "SIF-Potential" | "SIF-High Potential" | "SIF-Critical / Hi-Po";

export interface AnalysisResult {
  risk_level: string;
  incident_severity?: string;
  hazard_category: string;
  justification: string;
  key_phrases?: string[];
  sif_potential: SifPotentialValue;
  sif_reasoning: string;
  sif_confidence?: number;
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

// ── Shared Safety Classification Prompt ─────────────────────────────

export const HOT_WORK_CATEGORY = "Hot Work / Uncontrolled Ignition Source near Hydrocarbon Release";

// Ignition-source work (welding/cutting/torches...) and fuel context (tanks/valves/lines...).
// Used internally to keep the hot-work CONTEXT (OISD-STD-227 mapping, justification, SIF)
// while the report's hazard CATEGORY stays a real category like "Fire/Explosion".
const FUEL_CONTEXT_RE = /\b(?:tank|valve|hydrocarbon|fuel|petroleum|crude|gasoline|diesel|kerosene|lpg|pipeline|vessel|drum|storage|refinery|flowline|separator|wellhead|oil)\b/i;
const HOT_WORK_RE = /\b(?:weld|welding|hot work|torch|grinding|grinder|brazing|cutter|cutting|oxy|arc)\b/i;

/** True when the report describes ignition-source work happening near fuel (hot-work context). */
export function hasHotWorkContext(reportText: string): boolean {
  const t = reportText.toLowerCase();
  return HOT_WORK_RE.test(t) && FUEL_CONTEXT_RE.test(t);
}

const RISK_LEVELS = ["high", "medium", "low"];
const SIF_LEVELS = ["SIF-Unlikely", "SIF-Potential", "SIF-High Potential", "SIF-Critical / Hi-Po"];
const CATEGORY_ALIASES: Record<string, string> = {
  "fire/explosion": "Fire/Explosion",
  "fire": "Fire/Explosion",
  "hot work": "Fire/Explosion",
  "hotwork": "Fire/Explosion",
  "hot work / uncontrolled ignition source near hydrocarbon release": "Fire/Explosion",
  "chemical": "Chemical Exposure",
  "fall": "Fall Hazard",
  "fall hazard": "Fall Hazard",
  "vehicle": "Vehicle/Traffic",
  "equipment": "Equipment Failure",
  "confined space": "Confined Space",
  "procedural": "Procedural Gap",
};

/** Split a string into trimmed sentences on [. ! ?] */
function splitSentences(t: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (const ch of t) {
    cur += ch;
    if (/[.!?]/.test(ch)) {
      out.push(cur.trim());
      cur = "";
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Keep prose short so it renders in 2-3 lines (~340 chars / 3 sentences). */
export function condenseProse(
  text: string | null | undefined,
  maxSentences = 3,
  maxChars = 340
): string {
  if (!text) return "";
  let t = text.trim().replace(/\s+/g, " ");
  if (t.length <= maxChars && splitSentences(t).length <= maxSentences) return t;
  const sentences = splitSentences(t);
  const kept: string[] = [];
  let total = 0;
  for (const s of sentences) {
    if (kept.length >= maxSentences) break;
    if (total + s.length > maxChars && kept.length > 0) break;
    kept.push(s);
    total += s.length;
  }
  return kept.join(" ");
}

/**
 * Operational priority used for SLA / task generation / escalation.
 * Risk level (stored severity) is the actual outcome; a low-severity near
 * miss can still be SIF-Critical and must not be left with a 7-day SLA or
 * zero corrective tasks.
 */
export function deriveOpsRisk(analysis: {
  risk_level?: string | null;
  sif_potential?: string | null;
}): "high" | "medium" | "low" {
  const r = analysis.risk_level;
  const s = analysis.sif_potential;
  if (r === "high" || r === "medium") return r;
  if (s === "SIF-Critical / Hi-Po") return "high";
  if (s === "SIF-High Potential") return "medium";
  return "low";
}

/**
 * Make an AI (Groq) analysis result safe to persist:
 * - risk_level is derived from incident_severity (the AI schema emits severity, the app stores it as risk)
 * - short plain justification / SIF reasoning (2-3 lines)
 * - hazard category mapped to a known category
 */
export function normalizeAnalysis(
  raw: Partial<AnalysisResult> | null | undefined,
  reportText: string
): AnalysisResult {
  const base = classifyReport(reportText);

  const severity = RISK_LEVELS.includes(raw?.risk_level ?? "")
    ? raw!.risk_level!
    : RISK_LEVELS.includes(raw?.incident_severity ?? "")
      ? raw!.incident_severity!
      : base.risk_level;

  const rawCategory = (raw?.hazard_category || "").trim();
  const category = HAZARD_CATEGORIES.includes(rawCategory) || rawCategory === "Fire/Explosion"
    ? rawCategory
    : CATEGORY_ALIASES[rawCategory.toLowerCase()] || base.hazard_category;

  const sif = SIF_LEVELS.includes(raw?.sif_potential ?? "")
    ? (raw!.sif_potential as SifPotentialValue)
    : base.sif_potential;

  const justification = condenseProse(raw?.justification, 3) || base.justification;
  const sifReasoning = condenseProse(raw?.sif_reasoning, 2, 300) || base.sif_reasoning;

  return {
    risk_level: severity,
    incident_severity: severity,
    hazard_category: category,
    justification,
    key_phrases:
      Array.isArray(raw?.key_phrases) && raw!.key_phrases!.length > 0
        ? raw!.key_phrases!.slice(0, 5)
        : undefined,
    sif_potential: sif,
    sif_reasoning: sifReasoning,
    sif_confidence:
      typeof raw?.sif_confidence === "number" && raw!.sif_confidence! >= 0 && raw!.sif_confidence! <= 1
        ? raw!.sif_confidence
        : base.sif_confidence,
  };
}

// ── Smart Fallback Classifier (when AI unavailable) ──────────────────
// Negation-aware risk classification that mirrors the AI prompt:
//   risk (incident severity) = how serious the ACTUAL outcome was
//   SIF potential          = what COULD have happened
// Justification & SIF reasoning are short (2-3 lines), plain language.

export function classifyReport(reportText: string): AnalysisResult {
  const text = reportText.toLowerCase();
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const NEGATION_RE = /\b(?:no|not|never|nothing|nobody|no one|without|none|didn'?t|did not|hasn'?t|hadn'?t|wasn'?t|weren'?t)\b/;
  const EVENT_WORD_RE = /\b(?:leak(?:s|ing|ed)?|fire|explosion|spill(?:s|ing|ed)?|smoke|injuri(?:es|ed|y)|damage|accident|incident|hazard)\b/;
  const SAFETY_ITEM_RE = /\b(?:extinguisher|detector|alarm|hydrant|guard|rail|barrier|harness|ppe|label|permit|tagout|lockout|sign|cover|cap|helmet|gloves?|glasses|net|boots|suit|watch|escape|exit|assembly)\b/;

  // Realized-event verbs: the fire/leak/collapse actually happened ("fire broke out",
  // "valve leaked") - nearby "no injuries" must NOT turn this into a non-event.
  const REALIZED_VERB_RE =
    /\b(?:caught fire|broke out|burst into flames|was on fire|leaked|leaking|spilled|spill was|burst|ruptured|snapped|collapsed|blew up|explosion occurred|fell|slipped|tripped)\b/;

  // Actual-outcome markers (declared here so the no-event check below can use them)
  const SERIOUS_RE =
    /\b(?:death|died|fatalit|unconscious|hospitali[sz]|amputat|fractur|broken bone|severe bleeding|electrocuted|explosion occurred|blew up|run over|crushed|entangled|struck by|hit by|taken to hospital)\b/;
  const DAMAGE_OR_MINOR_RE =
    /\b(?:caught fire|was on fire|broke out|burst into flames|fell|falling|leaking|leaked|spilled|spill was|burst|ruptured|snapped|broke|collapsed|damaged|bent|dented|tripped|slipped|pinched|bumped|caught in|hurt|cut|bruised|scraped|sprained|first aid|dizzy|nausea|headache)\b/;

  // Sentence explicitly says the event did NOT happen (near miss), e.g. "no leak or fire occurred".
  // A sentence that still reports real effects (dizzy, headache, cut, damaged...) is NOT a non-event.
  const isNoEventSentence = (t: string) =>
    NEGATION_RE.test(t) &&
    EVENT_WORD_RE.test(t) &&
    !SAFETY_ITEM_RE.test(t) &&
    !REALIZED_VERB_RE.test(t) &&
    !DAMAGE_OR_MINOR_RE.test(t);

  // Sentences describing events that were avoided (almost / near-miss / prevented)
  const AVOID_RE = /\b(?:almost|nearly|close call|near[- ]?miss|prevented|avoided|averted|didn'?t|did not|never)\b/;
  const eventSentence = (t: string) =>
    !!t && !isNoEventSentence(t) && !AVOID_RE.test(t);

  const anySentence = (re: RegExp, filter?: (t: string) => boolean) =>
    sentences.some((s) => (filter ? filter(s) : true) && re.test(s));

  const hasNoEvent = sentences.some(isNoEventSentence);
  const isNearMiss =
    /\b(?:near[- ]?miss|close call|almost|nearly)\b/.test(text) || hasNoEvent;

  // ── Actual outcome (severity) ──
  const PROCEDURAL_RE =
    /\b(?:housekeeping|documentation|paperwork|suggestion|training|signage|label|expired|administrative|procedure)\b/;
  // Administrative-only report (template/checklist/paperwork change) with no real hazard content.
  const pureProcedural =
    /\b(?:suggest|paperwork|documentation|checklist|template|administrative|housekeeping|revise|policy|update the)\b/.test(text) &&
    !/\b(?:leak|spill|fume|toxic|fire|flame|explosion|fall|fell|electrical|wire|voltage|machinery|guard|injur|damage|hazard|welding|confined)\b/.test(text);
  const HIGH_ENERGY_CONDITION_RE =
    /\b(?:live wire|exposed (?:wire|wiring|cable|conductor)|unguarded|working at height|open edge|no guardrail|hot work|welding|weld|confined space|gas leak|toxic|flammable|high voltage)\b/;

  let risk: "high" | "medium" | "low";
  const seriousHappened = anySentence(SERIOUS_RE, eventSentence);
  const damageHappened = anySentence(DAMAGE_OR_MINOR_RE, eventSentence);

  if (seriousHappened) {
    risk = "high";
  } else if (damageHappened) {
    risk = "medium";
  } else if (isNearMiss) {
    risk = "low";
  } else if (pureProcedural || (!anySentence(HIGH_ENERGY_CONDITION_RE) && anySentence(PROCEDURAL_RE))) {
    risk = "low";
  } else {
    // Unsafe condition found during inspection, no actual event reported
    risk = "medium";
  }

  // ── Hazard category ──
  const FIRE_WORDS_RE = /\b(?:fire|flame|explosion|explosive|combustible|flammable|blowout|burning|smoke)\b/;

  const fuelContext = FUEL_CONTEXT_RE.test(text);
  const hotWork = HOT_WORK_RE.test(text);
  const fireContext = anySentence(FIRE_WORDS_RE, (s) => !isNoEventSentence(s));

  let category: string;
  if (pureProcedural) {
    category = "Procedural Gap";
  } else if (hotWork && fuelContext) {
    // Hot work near fuel is a Fire/Explosion hazard - the hot-work CONTEXT is kept
    // separately (see hasHotWorkContext) for standards mapping / justification.
    category = "Fire/Explosion";
  } else if (fireContext) {
    category = "Fire/Explosion";
  } else if (/\b(?:fall|fell|scaffold|trench|height|roof|excavat|ladder|guardrail|open edge|platform)\b/.test(text)) {
    category = "Structural";
  } else if (/\b(?:electrical|wiring|wire|circuit|shock|electrocution|power line|voltage|panel|switchboard|short circuit)\b/.test(text)) {
    category = "Electrical";
  } else if (/\b(?:chemical|fume|toxic|gas|asbestos|hazardous|corrosive|solvent|acid|vapou?r|poison|smell|ventilation|dust)\b/.test(text)) {
    category = "Chemical Exposure";
  } else if (/\b(?:forklift|vehicle|truck|traffic|dumper|collision|pedestrian|reversing|run over)\b/.test(text)) {
    category = "Vehicle/Traffic";
  } else if (/\b(?:confined|trench|manhole|silo|underground|entrapment|poor ventilation|no fresh air)\b/.test(text)) {
    category = "Confined Space";
  } else if (/\b(?:equipment|machine|machinery|malfunction|guard|hydraulic|bearing|crane|hoist|tool|broken|damaged|wear)\b/.test(text)) {
    category = "Equipment Failure";
  } else {
    category = "Procedural Gap";
  }

  // ── SIF potential (what COULD have happened) ──
  const fuelObject = /\btank\b/.test(text) ? "a fuel tank" :
    /\b(?:valve|pipeline|flowline|line)\b/.test(text) ? "a fuel line" :
    "fuel or hydrocarbons";
  const hasOpenUnlabeled =
    /\b(?:open|unlabeled|not labeled|unlocked|left open|found open)\b/.test(text) &&
    FUEL_CONTEXT_RE.test(text);
  const missingSafeguard =
    hasOpenUnlabeled || /\b(?:lockout|isolation|no permit|permit.*(?:not|missing)|no isolation)\b/.test(text);

  let sifPotential: SifPotentialValue;
  let sifReasoning: string;
  let sifConfidence: number;

  const isHotWorkFire =
    category === HOT_WORK_CATEGORY || (hotWork && fuelContext);

  if (risk === "high" || seriousHappened) {
    sifPotential = "SIF-Critical / Hi-Po";
    sifConfidence = 0.9;
    sifReasoning =
      "This could have caused (or has caused) a serious injury or death. The conditions for a worst-case outcome were present and should be treated as critical.";
  } else if (isHotWorkFire) {
    // Ignition source + potential fuel release + failed controls = multiple SIF precursors
    sifPotential = "SIF-Critical / Hi-Po";
    sifConfidence = 0.92;
    sifReasoning =
      `Even though nothing serious happened this time, this could easily have killed or seriously injured someone. A welding spark next to ${fuelObject} can ignite and cause a major fire or explosion.`;
  } else if (isNearMiss && anySentence(HIGH_ENERGY_CONDITION_RE)) {
    sifPotential = "SIF-High Potential";
    sifConfidence = 0.85;
    sifReasoning =
      "No one was hurt, but this near miss could easily have become a serious injury or death. The right conditions for a worst-case event were present.";
  } else if (category === "Electrical" && /\b(?:live|exposed|voltage|shock|electrocution)\b/.test(text)) {
    sifPotential = "SIF-High Potential";
    sifConfidence = 0.85;
    sifReasoning = "Contact with live electrical energy can kill instantly. Anyone touching that wire or panel could have been electrocuted.";
  } else if ((category === "Structural" || category === "Fall Hazard") && /\b(?:height|scaffold|roof|guardrail|fall|fell|trench|excavat)\b/.test(text)) {
    sifPotential = "SIF-High Potential";
    sifConfidence = 0.85;
    sifReasoning = "A fall from that height onto the ground below can easily be fatal or cause permanent injury.";
  } else if (category === "Confined Space") {
    sifPotential = "SIF-High Potential";
    sifConfidence = 0.85;
    sifReasoning = "Confined spaces can quickly turn fatal through gas, lack of oxygen or entrapment.";
  } else if (category === "Chemical Exposure" && /\b(?:leak|fumes?|toxic|gas)\b/.test(text)) {
    sifPotential = "SIF-High Potential";
    sifConfidence = 0.8;
    sifReasoning = "Breathing or touching this substance could cause serious poisoning, burns or asphyxiation.";
  } else if (damageHappened && !isNearMiss) {
    sifPotential = "SIF-Potential";
    sifConfidence = 0.65;
    sifReasoning = "Some risk of serious injury exists, but safeguards or lower energy made a serious outcome less likely this time.";
  } else {
    sifPotential = "SIF-Unlikely";
    sifConfidence = 0.45;
    sifReasoning = "No realistic path to serious injury or fatality was found - this is a minor or procedural matter.";
  }

  // ── Plain 2-3 line justification ──
  let outcomeLine: string;
  if (risk === "high") {
    outcomeLine = "A serious event actually happened - someone was hurt or a major fire, leak or collapse occurred - and this needs immediate attention.";
  } else if (risk === "medium") {
    outcomeLine = "A real hazard was found, and while nobody was seriously hurt this time, it needs fixing before it turns into something worse.";
  } else if (hasNoEvent || /\b(?:near[- ]?miss|close call|almost|nearly)\b/.test(text)) {
    outcomeLine = "No one was hurt and nothing actually happened, but this was a close call that was caught in time.";
  } else {
    outcomeLine = "A minor or paperwork-level issue was reported with no immediate danger to anyone.";
  }

  let dangerLine = "";
  let safeguardLine = "";
  if (sifPotential !== "SIF-Unlikely") {
    if (isHotWorkFire) {
      dangerLine = `Welding or sparks were right next to ${fuelObject}, and one spark could have caused a major fire or explosion.`;
    } else if (category === "Structural" || category === "Fall Hazard") {
      dangerLine = "Someone at that height could have fallen and been seriously injured or killed.";
    } else if (category === "Electrical") {
      dangerLine = "Anyone touching that live electrical energy could have been electrocuted.";
    } else if (category === "Chemical Exposure") {
      dangerLine = "Someone could have breathed in or touched the substance and been seriously poisoned or burned.";
    } else if (category === "Confined Space") {
      dangerLine = "Anyone entering could have been trapped, suffocated or overcome by gas.";
    } else if (category === "Vehicle/Traffic") {
      dangerLine = "Someone could have been run over or crushed by the moving vehicle or equipment.";
    } else if (category === "Equipment Failure") {
      dangerLine = "A hand or body could have been caught in the machinery or struck by failing equipment.";
    } else if (category === "Fire/Explosion") {
      dangerLine = "This could easily have turned into a serious fire or explosion.";
    }
    if (hasOpenUnlabeled && isHotWorkFire) {
      safeguardLine = "The safeguard was missing - the fuel line stayed open and unlabeled instead of closed, locked and labeled.";
    } else if (missingSafeguard && isHotWorkFire) {
      safeguardLine = "The hot-work checks (gas-free test and isolation) should have been done before welding started.";
    } else if (/\b(?:no guard|guard removed|unguarded|missing guard)\b/.test(text)) {
      safeguardLine = "The machine guard that should have protected people was not in place.";
    } else if (/\b(?:not wearing|no harness|no ppe|without harness|without ppe)\b/.test(text)) {
      safeguardLine = "The required fall protection or PPE was not being used.";
    }
  }

  const justification = condenseProse(
    [outcomeLine, dangerLine, safeguardLine].filter(Boolean).join(" "),
    3,
    340
  );

  return {
    risk_level: risk,
    incident_severity: risk,
    hazard_category: category,
    justification,
    sif_potential: sifPotential,
    sif_reasoning: condenseProse(sifReasoning, 2, 300),
    sif_confidence: sifConfidence,
  };
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

    // Determine SIF potential independently from severity
    let sifPotential: SifPotentialValue = "SIF-High Potential";
    let sifReasoning = "Report describes conditions with a credible path to serious injury or death.";
    // Near-misses with no actual injury = high SIF potential but not necessarily high severity
    if (text.includes("near miss") || text.includes("near-miss") || text.includes("almost") || text.includes("close call")) {
      sifPotential = "SIF-High Potential";
      sifReasoning = "Near-miss event with credible pathway to serious injury or fatality, despite no reported injury.";
    }
    // If there IS an actual serious injury
    if (text.includes("hospitalized") || text.includes("unconscious") || text.includes("amputation") || text.includes("fatality") || text.includes("death") || text.includes("fracture") || text.includes("broken bone") || text.includes("bleeding")) {
      sifPotential = "SIF-Critical / Hi-Po";
      sifReasoning = "Report indicates actual serious injury occurred — high SIF realization potential.";
    }

    return {
      risk_level: "high",
      hazard_category: category,
      justification: "Report describes conditions with a credible path to serious injury or death if left unaddressed.",
      sif_potential: sifPotential,
      sif_reasoning: sifReasoning,
      sif_confidence: 0.75,
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

    // Medium severity = lower SIF unless near-miss
    let sifPotential: SifPotentialValue = "SIF-Potential";
    let sifReasoning = "Hazard present but partially mitigated or lower in severity. Some SIF pathway possible.";
    if (text.includes("near miss") || text.includes("near-miss") || text.includes("almost") || text.includes("close call")) {
      sifPotential = "SIF-High Potential";
      sifReasoning = "Near-miss with credible SIF pathway, though current outcome was minor.";
    }
    return {
      risk_level: "medium",
      hazard_category: category,
      justification: "Real hazard exists but is either partially mitigated or lower in severity.",
      sif_potential: sifPotential,
      sif_reasoning: sifReasoning,
      sif_confidence: 0.6,
    };
  }

  // --- LOW RISK: minor/procedural issue ---
  return {
    risk_level: "low",
    hazard_category: "Procedural Gap",
    justification: "Minor or procedural issue unlikely to cause serious physical harm.",
    sif_potential: "SIF-Unlikely",
    sif_reasoning: "Minor or procedural issue with no credible pathway to serious injury or fatality.",
    sif_confidence: 0.5,
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
  "Fire/Explosion",
];

// â”€â”€ Departments (shared across admin + detail pages) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const DEPARTMENTS: { name: string; icon: string; categories: string[] }[] = [
  { name: "Electrical", icon: "⚡", categories: ["Electrical"] },
  { name: "Structural", icon: "🏗️", categories: ["Structural", "Fall Hazard"] },
  { name: "Chemical Safety", icon: "☣️", categories: ["Chemical Exposure"] },
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

/** URL-safe slug for a department name, e.g. "Traffic & Vehicles" -> "traffic-vehicles" */
export function deptSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Resolve a department slug back to the canonical department info, if known. */
export function deptFromSlug(slug: string): { name: string; icon: string; categories: string[] } | undefined {
  return DEPARTMENTS.find((d) => deptSlug(d.name) === slug);
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
    if (hazardCategory === HOT_WORK_CATEGORY || (text.includes("weld") && /tank|valve|fuel|pipeline|hydrocarbon/.test(text))) {
      tasks.push({ title: "Verify isolation and hot work permit before welding resumes", description: "Keep welding stopped near the tank/line until the valve is closed, locked and labeled, the area is gas-free, and a valid hot work permit is issued.", priority: "urgent" });
    } else if (text.includes("electrical") || text.includes("wiring") || text.includes("circuit")) {
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
