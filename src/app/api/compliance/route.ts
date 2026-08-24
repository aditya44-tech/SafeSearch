import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Keyword map: every hazard category and the words that trigger it
const HAZARD_KEYWORDS: Record<string, string[]> = {
  "Fall Hazard": ["fall", "height", "scaffold", "edge", "guardrail", "roof", "ladder", "climbing", "elevated", "platform", "parapet", "balcony"],
  "Electrical": ["electrical", "wire", "circuit", "shock", "electrocution", "live wire", "power line", "switchboard", "wiring", "voltage", "short circuit"],
  "Chemical Exposure": ["chemical", "fume", "spill", "toxic", "ventilation", "gas", "hazardous", "leak", "corrosive", "solvent", "paint", "acid", "vapor", "smell"],
  "Structural": ["structural", "crack", "collapse", "building", "beam", "column", "foundation", "wall", "roof", "ceiling", "concrete", "rebar", "bracing"],
  "Equipment Failure": ["equipment", "machine", "guard", "broken", "damaged", "malfunction", "wear", "tear", "bearing", "hydraulic", "pneumatic", "tool"],
  "Vehicle/Traffic": ["vehicle", "forklift", "crane", "traffic", "truck", "dumper", "loading", "unloading", "collision", "blind spot", "reversing", "pedestrian"],
  "Confined Space": ["confined", "trench", "excavat", "tunnel", "manhole", "tank", "silo", "below ground", "underground", "entrapment", "enclosed space", "enclosed area", "no fresh air", "poor ventilation", "booth"],
  "Procedural Gap": ["procedure", "training", "permit", "signage", "communication", "supervision", "protocol", "compliance", "policy", "documentation", "near miss", "not following"],
};

function detectCategories(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const [category, keywords] of Object.entries(HAZARD_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      matched.push(category);
    }
  }
  return matched;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const reportText = searchParams.get("text");
  const reportId = searchParams.get("reportId");

  // If report text is provided, scan for all applicable hazard categories
  if (reportText) {
    const categories = detectCategories(reportText);
    if (categories.length === 0 && category) {
      // Fallback to the assigned category if no keywords match
      categories.push(category);
    } else if (categories.length === 0 && !category) {
      return NextResponse.json([]);
    }

    const refs = await prisma.complianceReference.findMany({
      where: { hazardCategory: { in: categories } },
    });

    // Tag each ref with whether it was triggered by text scan or assigned category
    const result = refs.map((ref) => ({
      ...ref,
      detectedFrom: categories.includes(ref.hazardCategory) ? "text_scan" : "assigned",
      matchedCategories: categories,
    }));

    return NextResponse.json(result);
  }

  // Fallback: simple lookup by category
  if (category) {
    const refs = await prisma.complianceReference.findMany({
      where: { hazardCategory: category },
    });
    return NextResponse.json(refs);
  }

  return NextResponse.json({ error: "category or text param required" }, { status: 400 });
}
