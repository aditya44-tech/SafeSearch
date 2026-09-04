import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateSiteScore, RISK_LEVELS, SIF_LEVELS } from "@/lib/helpers";

async function sendOverrideSms(opts: {
  report: { site: string; hazardCategory: string | null };
  level: string;
  alertType: "risk" | "sif";
  reason: string;
  performedBy: string;
}): Promise<{ smsSent: boolean; smsRecipients: string[]; attempted: boolean; error?: Error }> {
  const textbeeApiKey = process.env.TEXTBEE_API_KEY;
  if (!textbeeApiKey) return { smsSent: false, smsRecipients: [], attempted: false };

  const categoryRecipients = await prisma.smsRecipient.findMany({
    where: {
      isActive: true,
      OR: [
        { hazardCategory: opts.report.hazardCategory || undefined },
        { hazardCategory: "All Categories" },
      ],
    },
  });
  const phoneNumbers = categoryRecipients.map((r) => r.phone);
  let smsRecipients = categoryRecipients.map((r) => r.name || r.hazardCategory);
  if (phoneNumbers.length === 0 && process.env.SAFETY_OFFICER_PHONE) {
    phoneNumbers.push(process.env.SAFETY_OFFICER_PHONE);
    smsRecipients = ["Safety Officer"];
  }
  if (phoneNumbers.length === 0) return { smsSent: false, smsRecipients: [], attempted: false };

  try {
    const { Textbee } = await import("@textbee/sdk");
    const textbee = new Textbee({ apiKey: textbeeApiKey });
    const hazardLabel = opts.report.hazardCategory || "Unknown";
    const by = opts.performedBy || "Unknown";
    const message =
      opts.alertType === "risk"
        ? `🚨 OVERRIDE ALERT: ${opts.report.site} - ${hazardLabel}. Risk overridden to ${opts.level.toUpperCase()} by ${by}. Reason: ${opts.reason}`
        : `🚨 SIF OVERRIDE ALERT: ${opts.report.site} - ${hazardLabel}. SIF potential overridden to ${opts.level} by ${by}. Reason: ${opts.reason}`;
    await textbee.sendSms({ recipients: phoneNumbers, message });
    return { smsSent: true, smsRecipients, attempted: true };
  } catch (e) {
    console.error("Override SMS send failed:", e);
    return { smsSent: false, smsRecipients: [], attempted: true, error: e as Error };
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  const body = await _request.json();
  const { riskLevel, sifPotential, reason, performedBy } = body;

  if (!reason || !reason.trim()) {
    return NextResponse.json({ error: "reason required" }, { status: 400 });
  }
  const riskValid = RISK_LEVELS.includes(riskLevel ?? "");
  const sifValid = SIF_LEVELS.includes(sifPotential ?? "");
  if (!riskValid && !sifValid) {
    return NextResponse.json(
      { error: "riskLevel (high|medium|low) or sifPotential (SIF-Unlikely|SIF-Potential|SIF-High Potential|SIF-Critical / Hi-Po) required" },
      { status: 400 }
    );
  }

  const report = await prisma.safetyReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const actor = performedBy || "Unknown";
  const data: Record<string, unknown> = {};
  let smsSent = false;
  let smsRecipients: string[] = [];

  // ── Incident severity (risk level) override ──
  if (riskValid) {
    data.humanOverrideRiskLevel = riskLevel;
    data.overrideReason = reason;
    data.overriddenBy = actor;

    await prisma.auditLog.create({
      data: {
        reportId: id,
        action: "risk_overridden",
        performedBy: actor,
        details: `Overrode AI assessment from "${report.riskLevel}" to "${riskLevel}". Reason: ${reason}`,
      },
    });

    await recalculateSiteScore(prisma, report.site);

    // Auto-send SMS when overridden to high or medium risk
    if (riskLevel === "high" || riskLevel === "medium") {
      const result = await sendOverrideSms({ report, level: riskLevel, alertType: "risk", reason, performedBy: actor });
      smsSent = smsSent || result.smsSent;
      smsRecipients = smsRecipients.concat(result.smsRecipients);
      if (result.attempted) {
        await prisma.auditLog.create({
          data: {
            reportId: id,
            action: result.smsSent ? "sms_alert_sent" : "sms_alert_failed",
            performedBy: "System",
            details: result.smsSent
              ? `SMS override alert sent to ${result.smsRecipients.join(", ")}`
              : `Override SMS failed: ${result.error?.message ?? "send error"}`,
          },
        });
      }
    }
  }

  // ── SIF potential override ──
  if (sifValid) {
    data.humanOverrideSifPotential = sifPotential;
    data.sifOverrideReason = reason;
    data.sifOverriddenBy = actor;

    await prisma.auditLog.create({
      data: {
        reportId: id,
        action: "sif_overridden",
        performedBy: actor,
        details: `Overrode AI SIF assessment from "${report.sifPotential}" to "${sifPotential}". Reason: ${reason}`,
      },
    });

    // Auto-send SMS when SIF is overridden up to high potential or critical
    if (sifPotential === "SIF-High Potential" || sifPotential === "SIF-Critical / Hi-Po") {
      const result = await sendOverrideSms({ report, level: sifPotential, alertType: "sif", reason, performedBy: actor });
      smsSent = smsSent || result.smsSent;
      smsRecipients = smsRecipients.concat(result.smsRecipients);
      if (result.attempted) {
        await prisma.auditLog.create({
          data: {
            reportId: id,
            action: result.smsSent ? "sms_alert_sent" : "sms_alert_failed",
            performedBy: "System",
            details: result.smsSent
              ? `SMS override alert sent to ${result.smsRecipients.join(", ")}`
              : `Override SMS failed: ${result.error?.message ?? "send error"}`,
          },
        });
      }
    }
  }

  const updated = await prisma.safetyReport.update({
    where: { id },
    data,
  });

  return NextResponse.json({ ...updated, smsSent, smsRecipients });
}
