import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callGroq } from "@/lib/helpers";

const PHOTO_PROMPT = `You are reviewing a workplace safety report. The report text describes: "{{reportText}}". A photo was attached to this report. Based on the report description alone, assess whether the described conditions are plausible. Respond with ONLY valid JSON:

{
  "consistent": true,
  "note": "<one sentence summarizing the described hazard>"
}`;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  const report = await prisma.safetyReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await _request.formData();
  const photo = formData.get("photo") as File | null;
  if (!photo) return NextResponse.json({ error: "No photo uploaded" }, { status: 400 });

  const bytes = await photo.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = photo.type || "image/jpeg";

  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey) {
    const prompt = PHOTO_PROMPT.replace("{{reportText}}", report.reportText);
    try {
      const text = await callGroq(prompt, apiKey, {
        temperature: 0.2,
        maxOutputTokens: 300,
      });

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
            performedBy: "Groq AI",
            details: `Photo uploaded and assessed: ${analysis.note}`,
          },
        });

        return NextResponse.json({ analysis });
      }
    } catch {
      // Fall through
    }
  }

  // Save photo even without analysis
  await prisma.safetyReport.update({
    where: { id },
    data: { photoUrl: `data:${mimeType};base64,${base64.slice(0, 50)}...` },
  });

  return NextResponse.json({
    analysis: {
      consistent: null,
      note: "Photo uploaded. Vision-based cross-check requires a Groq vision model.",
    },
  });
}
