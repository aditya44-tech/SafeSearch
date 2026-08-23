import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — list all SMS recipients
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("org") ? parseInt(searchParams.get("org")!, 10) : undefined;

  const recipients = await prisma.smsRecipient.findMany({
    where: orgId ? { organizationId: orgId } : undefined,
    orderBy: [{ hazardCategory: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(recipients);
}

// POST — create SMS recipient
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { hazardCategory, phone, name, organizationId } = body;

  if (!hazardCategory || !phone) {
    return NextResponse.json({ error: "hazardCategory and phone are required" }, { status: 400 });
  }

  // Validate E.164 phone format (+<country code><number>, 7-15 digits)
  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    return NextResponse.json({ error: "Phone must be in E.164 format, e.g. +919876543210" }, { status: 400 });
  }

  const recipient = await prisma.smsRecipient.create({
    data: {
      hazardCategory,
      phone,
      name: name || null,
      organizationId: organizationId || null,
    },
  });
  return NextResponse.json(recipient, { status: 201 });
}

// DELETE — remove SMS recipient
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.smsRecipient.delete({ where: { id: parseInt(id, 10) } });
  return NextResponse.json({ ok: true });
}
