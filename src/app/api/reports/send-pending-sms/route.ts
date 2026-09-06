import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SIF_ESCALATION_LEVELS = ["SIF-High Potential", "SIF-Critical / Hi-Po"];

/**
 * GET /api/reports/send-pending-sms
 * Returns how many escalation-eligible reports (high risk OR SIF-High/Critical)
 * have never had an SMS sent (smsSentAt is null) and are not resolved.
 */
export async function GET() {
  const pending = await prisma.safetyReport.findMany({
    where: {
      smsSentAt: null,
      status: { not: "resolved" },
      OR: [{ riskLevel: "high" }, { sifPotential: { in: SIF_ESCALATION_LEVELS } }],
    },
    orderBy: { reportedAt: "desc" },
    select: {
      id: true,
      site: true,
      riskLevel: true,
      hazardCategory: true,
      sifPotential: true,
    },
  });
  return NextResponse.json({ pending: pending.length, reports: pending });
}

/**
 * POST /api/reports/send-pending-sms
 * Backfills SMS alerts for every escalation-eligible report that has no
 * smsSentAt stamp — same trigger rule as the live routes:
 *   riskLevel === "high" OR SIF-High Potential OR SIF-Critical / Hi-Po.
 * Body: { dryRun?: boolean } — dryRun lists what would be sent without sending.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;

  const apiKey: string | undefined = process.env.TEXTBEE_API_KEY;
  if (!apiKey && !dryRun) {
    return NextResponse.json(
      { error: "TEXTBEE_API_KEY not configured — SMS cannot be sent" },
      { status: 400 }
    );
  }

  const reports = await prisma.safetyReport.findMany({
    where: {
      smsSentAt: null,
      status: { not: "resolved" },
      OR: [{ riskLevel: "high" }, { sifPotential: { in: SIF_ESCALATION_LEVELS } }],
    },
    orderBy: { reportedAt: "desc" },
    select: {
      id: true,
      site: true,
      reportText: true,
      riskLevel: true,
      hazardCategory: true,
      sifPotential: true,
      justification: true,
    },
  });

  if (reports.length === 0) {
    return NextResponse.json({
      message: "No pending alerts — everything already notified",
      sent: 0,
      failed: 0,
      total: 0,
    });
  }

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldSend: reports.length,
      reports: reports.map((r) => ({
        id: r.id,
        site: r.site,
        riskLevel: r.riskLevel,
        sifPotential: r.sifPotential,
        hazardCategory: r.hazardCategory,
      })),
    });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "TEXTBEE_API_KEY not configured" }, { status: 400 });
  }

  const { Textbee } = await import("@textbee/sdk");
  const textbee = new Textbee({ apiKey });

  let sent = 0;
  let failed = 0;
  const results: { id: number; ok: boolean; recipients?: string[]; error?: string }[] = [];

  for (const r of reports) {
    // Recipients: category-mapped + "All Categories", fallback to SAFETY_OFFICER_PHONE
    const categoryRecipients = await prisma.smsRecipient.findMany({
      where: {
        isActive: true,
        OR: [
          { hazardCategory: r.hazardCategory ?? undefined },
          { hazardCategory: "All Categories" },
        ],
      },
    });
    let phoneNumbers = categoryRecipients.map((x) => x.phone);
    let recipientLabels = categoryRecipients.map((x) => x.name || x.hazardCategory);
    if (phoneNumbers.length === 0 && process.env.SAFETY_OFFICER_PHONE) {
      phoneNumbers = [process.env.SAFETY_OFFICER_PHONE];
      recipientLabels = ["Safety Officer"];
    }
    if (phoneNumbers.length === 0) {
      failed++;
      results.push({ id: r.id, ok: false, error: "no active recipients configured" });
      await prisma.auditLog.create({
        data: {
          reportId: r.id,
          action: "sms_alert_failed",
          performedBy: "System",
          details: "Backfill SMS skipped: no active recipients configured",
        },
      });
      continue;
    }

    const sifPart =
      r.sifPotential && r.sifPotential !== "SIF-Unlikely"
        ? ` [SIF: ${r.sifPotential}]`
        : "";
    const message = `🚨 HIGH RISK ALERT: ${r.site} - ${r.hazardCategory ?? "Uncategorized"}. ${r.justification ?? r.reportText.slice(0, 80)}${sifPart}`;

    try {
      await textbee.sendSms({ recipients: phoneNumbers, message });
      await prisma.safetyReport.update({
        where: { id: r.id },
        data: { smsSentAt: new Date() },
      });
      await prisma.auditLog.create({
        data: {
          reportId: r.id,
          action: "sms_alert_sent",
          performedBy: "System",
          details: `Backfill SMS alert sent to ${recipientLabels.join(", ")}`,
        },
      });
      sent++;
      results.push({ id: r.id, ok: true, recipients: recipientLabels });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "unknown error";
      await prisma.auditLog.create({
        data: {
          reportId: r.id,
          action: "sms_alert_failed",
          performedBy: "System",
          details: `Backfill SMS failed: ${errMsg}`,
        },
      });
      failed++;
      results.push({ id: r.id, ok: false, error: errMsg });
    }
  }

  return NextResponse.json({
    message: `Sent ${sent} SMS alert(s), ${failed} failed`,
    sent,
    failed,
    total: reports.length,
    results,
  });
}
