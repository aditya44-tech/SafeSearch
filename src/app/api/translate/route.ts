import { NextRequest, NextResponse } from "next/server";
import { callGroq, extractJson } from "@/lib/helpers";

export const dynamic = "force-dynamic";

const TRANSLATE_PROMPT = `You are a translation service for workplace safety reports in India. Field workers report hazards in English, Hindi, Marathi, Hinglish (Hindi written in the Latin/Roman alphabet), or any mix of these.

Translate the report into clear, simple ENGLISH. Keep every factual detail: what happened, where (tank/valve/equipment numbers), and what action was taken. Do NOT add or remove safety facts. Keep numbers, codes and equipment names verbatim.

Respond with ONLY valid JSON in this exact format, no extra text:
{
  "detectedLanguage": "english" | "hindi" | "marathi" | "mixed",
  "translatedText": "<full report in English>",
  "isEnglish": true | false
}

Rules:
- isEnglish = true ONLY when the whole text is already plain English with no meaningful non-English content.
- If any meaningful Hindi/Marathi/Hinglish content is present, isEnglish = false and translatedText must be the complete faithful English translation.
- Hinglish example: "welding ke time paas mein valve open tha" -> "A valve near the welding work was open."
- Use plain words a safety supervisor can understand. Preserve urgency words like "leak", "fire", "injury" exactly.`;

const DEVANAGARI_RE = /[\u0900-\u097F]/;

export interface TranslateResponse {
  needsTranslation: boolean;
  detectedLanguage: string;
  translatedText: string | null;
  isEnglish: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const sourceLang = typeof body?.sourceLang === "string" ? body.sourceLang : "en";

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey) {
    try {
      const raw = await callGroq(
        TRANSLATE_PROMPT + `\n\nReport text:\n"""${text.slice(0, 4000)}"""`,
        apiKey,
        // Generous token budget: long Devanagari reports need room for both the
        // (low-effort) reasoning phase and the full English translation.
        { temperature: 0.1, maxOutputTokens: 4000, responseFormat: { type: "json_object" }, reasoningEffort: "low" }
      );
      const parsed = extractJson<{ detectedLanguage?: string; translatedText?: string; isEnglish?: boolean }>(raw);
      const detected = ["english", "hindi", "marathi", "mixed"].includes(parsed.detectedLanguage || "")
        ? parsed.detectedLanguage!
        : DEVANAGARI_RE.test(text)
          ? "hindi-or-marathi"
          : "mixed";
      const isEnglish = parsed.isEnglish === true || detected === "english";
      const translated = parsed.translatedText?.trim();

      const result: TranslateResponse = {
        needsTranslation: !isEnglish,
        detectedLanguage: detected,
        translatedText: isEnglish ? text : translated && translated.length > 0 ? translated : null,
        isEnglish,
      };
      if (!isEnglish && !translated) {
        result.error = "Could not translate the report text. Please check the text and try again, or submit it as-is.";
      }
      return NextResponse.json(result);
    } catch (e) {
      console.error("Translation failed:", e);
      // Fall through to script-based fallback
    }
  }

  // Fallback: no AI available. Detect Devanagari script; can only flag, not translate.
  const hasDevanagari = DEVANAGARI_RE.test(text);
  if (hasDevanagari) {
    return NextResponse.json({
      needsTranslation: true,
      detectedLanguage: "hindi-or-marathi",
      translatedText: null,
      isEnglish: false,
      error: "Translation service is currently unavailable. Please submit the report in English or try again later.",
    } satisfies TranslateResponse);
  }
  return NextResponse.json({
    needsTranslation: false,
    detectedLanguage: "english",
    translatedText: text,
    isEnglish: true,
  } satisfies TranslateResponse);
}
