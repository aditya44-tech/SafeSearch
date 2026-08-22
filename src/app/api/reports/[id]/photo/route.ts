import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGemini } from "@/lib/helpers";

const PHOTO_PROMPT = `You are reviewing a workplace safety report and its attached photo. The report text describes: "{{reportText}}". Based on the image, does the visual evidence support this description? Respond with ONLY valid JSON:

{
  "consistent": true | false,
  "note": "<one sentence on what the image shows relative to the description>"
}`;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = await prisma.safetyReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await _request.formData();
  const photo = formData.get("photo") as File | null;
  if (!photo) return NextResponse.json({ error: "No photo uploaded" }, { status: 400 });

  const bytes = await photo.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = photo.type || "image/jpeg";

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    const prompt = PHOTO_PROMPT.replace("{{reportText}}", report.reportText);
    try {
      const model = "gemini-3.6-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: base64 } },
            ],
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
        }),
      });

      const data = await response.json();
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text.trim();
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          const analysis = JSON.parse(text.slice(firstBrace, lastBrace + 1));

          await prisma.safetyReport.update({
            where: { id },
            data: { photoUrl: `data:${mimeType};base64,${base64.slice(0, 50)}...` },
          });

          await prisma.auditLog.create({
            data: {
              reportId: id,
              action: "photo_crosschecked",
              performedBy: "AI Vision",
              details: `Photo ${analysis.consistent ? "consistent" : "inconsistent"} with report: ${analysis.note}`,
            },
          });

          return NextResponse.json({ analysis });
        }
      }
    } catch {
      // Fall through
    }
  }

  return NextResponse.json({
    analysis: {
      consistent: null,
      note: "Photo cross-check requires a Gemini API key with vision support. The photo has been uploaded but not analyzed.",
    },
  });
}
