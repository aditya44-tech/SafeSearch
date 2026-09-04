import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  detectActivityContext,
  getApplicableRegulations,
  getBestMatchingRegulation,
} from "@/lib/regulatory-kb";

export const dynamic = "force-dynamic";

/**
 * GET /api/compliance?text=...&category=...&reportId=...
 *
 * Returns regulatory references from the curated knowledge base.
 * The system:
 *   1. Detects activity/facility context from report text
 *   2. Detects hazard categories from report text
 *   3. Retrieves matching regulations from the knowledge base
 *   4. AI may explain relevance but does NOT fabricate regulation numbers
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const reportText = searchParams.get("text");
  const reportId = searchParams.get("reportId");

  // Detect activity context from report text
  const activities = reportText ? detectActivityContext(reportText) : [];

  // Detect hazard categories from report text
  const HAZARD_KEYWORDS: Record<string, string[]> = {
    "Fall Hazard": ["fall", "height", "scaffold", "edge", "guardrail", "roof", "ladder", "climbing", "elevated", "platform", "parapet", "balcony"],
    "Electrical": ["electrical", "wire", "circuit", "shock", "electrocution", "live wire", "power line", "switchboard", "wiring", "voltage", "short circuit"],
    "Chemical Exposure": ["chemical", "fume", "spill", "toxic", "ventilation", "gas", "hazardous", "leak", "corrosive", "solvent", "paint", "acid", "vapor", "smell"],
    "Structural": ["structural", "crack", "collapse", "building", "beam", "column", "foundation", "wall", "roof", "ceiling", "concrete", "rebar", "bracing"],
    "Equipment Failure": ["equipment", "machine", "guard", "broken", "damaged", "malfunction", "wear", "tear", "bearing", "hydraulic", "pneumatic", "tool"],
    "Vehicle/Traffic": ["vehicle", "forklift", "crane", "traffic", "truck", "dumper", "loading", "unloading", "collision", "blind spot", "reversing", "pedestrian"],
    "Confined Space": ["confined", "trench", "excavat", "tunnel", "manhole", "tank", "silo", "below ground", "underground", "entrapment", "enclosed space", "enclosed area", "no fresh air", "poor ventilation", "booth"],
    "Procedural Gap": ["procedure", "training", "permit", "signage", "communication", "supervision", "protocol", "compliance", "policy", "documentation", "near miss", "not following"],
    "Fire/Explosion": ["fire", "explosion", "flame", "ignition", "combustible", "flammable", "smoke", "burn", "blowout"],
    "Hot Work / Uncontrolled Ignition Source near Hydrocarbon Release": ["welding", "weld", "hot work", "torch", "grinding", "spark", "arc", "cutting", "open flame", "ignition source"],
  };

  let detectedCategories: string[] = [];

  // The report's stored hazard category is authoritative: only show standards
  // related to it, rather than everything matching loose text keywords.
  if (category) {
    detectedCategories.push(category);
  } else if (reportText) {
    const lower = reportText.toLowerCase();
    for (const [cat, keywords] of Object.entries(HAZARD_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        detectedCategories.push(cat);
      }
    }
  }

  if (detectedCategories.length === 0) {
    return NextResponse.json([]);
  }

  // Get regulations from the curated knowledge base
  const kbMatches = getApplicableRegulations(detectedCategories, activities);

  // Also get any verified DB references for these categories
  const dbRefs = await prisma.complianceReference.findMany({
    where: { hazardCategory: { in: detectedCategories } },
  });

  // Merge knowledge base entries with DB entries (DB takes precedence if verified)
  const result = [
    ...kbMatches.map((entry) => ({
      id: null,
      framework: entry.framework,
      standardCode: entry.standardCode,
      title: entry.title,
      hazardCategory: entry.hazardCategories[0],
      sectionReference: entry.standardCode,
      description: entry.requirements.join(". "),
      applicableActivity: entry.applicableActivity.join(", "),
      source: entry.source,
      isVerified: true,
      verifiedBy: "Knowledge Base",
      verifiedAt: null,
      requirements: entry.requirements,
      source_type: "knowledge_base" as const,
      detectedActivities: activities,
      detectedCategories,
    })),
    ...dbRefs.map((ref) => ({
      ...ref,
      framework: ref.framework || ref.regulationName,
      standardCode: ref.standardCode || ref.sectionReference,
      title: ref.title || ref.description || null,
      requirements: ref.requirements ? JSON.parse(ref.requirements) : [],
      source_type: "database" as const,
      detectedActivities: activities,
      detectedCategories,
    })),
  ];

  return NextResponse.json(result);
}

/**
 * POST /api/compliance
 * Create or update a compliance reference (for admin knowledge base management)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (body.action === "verify") {
    // Verify a reference
    const updated = await prisma.complianceReference.update({
      where: { id: body.id },
      data: {
        isVerified: true,
        verifiedBy: body.verifiedBy || "Admin",
        verifiedAt: new Date(),
        lastVerified: new Date(),
      },
    });

    // Audit log
    if (body.reportId) {
      await prisma.auditLog.create({
        data: {
          reportId: body.reportId,
          action: "compliance_verified",
          performedBy: body.verifiedBy || "Admin",
          details: `Verified regulation: ${updated.framework} - ${updated.standardCode}`,
        },
      });
    }

    return NextResponse.json(updated);
  }

  if (body.action === "create") {
    // Create a new reference
    const created = await prisma.complianceReference.create({
      data: {
        framework: body.framework,
        standardCode: body.standardCode,
        title: body.title,
        hazardCategory: body.hazardCategory,
        regulationName: body.framework || body.regulationName || "Manual Entry",
        sectionReference: body.standardCode || body.sectionReference || "",
        description: body.description || "",
        applicableActivity: body.applicableActivity,
        requirements: body.requirements ? JSON.stringify(body.requirements) : null,
        source: body.source || "Manual Entry",
        notes: body.notes,
      },
    });

    return NextResponse.json(created, { status: 201 });
  }

  if (body.action === "update") {
    // Update a reference
    const updated = await prisma.complianceReference.update({
      where: { id: body.id },
      data: {
        framework: body.framework,
        standardCode: body.standardCode,
        title: body.title,
        hazardCategory: body.hazardCategory,
        regulationName: body.framework || body.regulationName,
        sectionReference: body.standardCode || body.sectionReference,
        applicableActivity: body.applicableActivity,
        description: body.description,
        source: body.source,
        notes: body.notes,
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
