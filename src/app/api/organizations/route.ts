import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { reports: true } } },
  });
  return NextResponse.json(
    orgs.map((o) => ({ id: o.id, name: o.name, reportCount: o._count.reports }))
  );
}
