import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const reports = await prisma.safetyReport.findMany({
    orderBy: { reportedAt: "desc" },
  });
  return NextResponse.json(reports);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const report = await prisma.safetyReport.create({
    data: {
      reportText: body.reportText,
      site: body.site,
      reporterRole: body.isAnonymous ? null : (body.reporterRole || "Field Worker"),
      isAnonymous: body.isAnonymous || false,
    },
  });
  return NextResponse.json(report, { status: 201 });
}
