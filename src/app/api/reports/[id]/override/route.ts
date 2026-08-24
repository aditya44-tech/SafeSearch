import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateSiteScore } from "@/lib/helpers";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseInt(rawId, 10);
  const body = await _request.json();
  const { riskLevel, reason, performedBy } = body;

  if (!riskLevel || !reason) {
    return NextResponse.json({ error: "riskLevel and reason required" }, { status: 400 });
  }

  const report = await prisma.safetyReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.safetyReport.update({
    where: { id },
    data: {
      humanOverrideRiskLevel: riskLevel,
      overrideReason: reason,
      overriddenBy: performedBy || "Unknown",
    },
  });

  await prisma.auditLog.create({
    data: {
      reportId: id,
      action: "risk_overridden",
      performedBy: performedBy || "Unknown",
      details: `Overrode AI assessment from "${report.riskLevel}" to "${riskLevel}". Reason: ${reason}`,
    },
  });

  await recalculateSiteScore(prisma, report.site);

  // Auto-send SMS when overridden to high or medium risk
  let smsSent = false;
  let smsRecipients: string[] = [];
  if (riskLevel === "high" || riskLevel === "medium") {
    const textbeeApiKey = process.env.TEXTBEE_API_KEY;
    if (textbeeApiKey) {
      const categoryRecipients = await prisma.smsRecipient.findMany({
        where: {
          isActive: true,
          OR: [
            { hazardCategory: report.hazardCategory || undefined },
            { hazardCategory: "All Categories" },
          ],
        },
      });
      const phoneNumbers = categoryRecipients.map((r) => r.phone);
      smsRecipients = categoryRecipients.map((r) => r.name || r.hazardCategory);
      if (phoneNumbers.length === 0 && process.env.SAFETY_OFFICER_PHONE) {
        phoneNumbers.push(process.env.SAFETY_OFFICER_PHONE);
        smsRecipients = ["Safety Officer"];
      }
      if (phoneNumbers.length > 0) {
        try {
          const { Textbee } = await import("@textbee/sdk");
          const textbee = new Textbee({ apiKey: textbeeApiKey });
          const hazardLabel = report.hazardCategory || "Unknown";
          const riskEmoji = riskLevel === "high" ? "🚨" : "⚠️";
          const smsMessage = `${riskEmoji} OVERRIDE ALERT: ${report.site} - ${hazardLabel}. Risk overridden to ${riskLevel.toUpperCase()} by ${performedBy || "Unknown"}. Reason: ${reason}`;
          await textbee.sendSms({
            recipients: phoneNumbers,
            message: smsMessage,
          });
          smsSent = true;
          await prisma.auditLog.create({
            data: {
              reportId: id,
              action: "sms_alert_sent",
              performedBy: "System",
              details: `SMS override alert sent to ${smsRecipients.join(", ")}`,
            },
          });
        } catch (e) {
          console.error("Override SMS send failed:", e);
          await prisma.auditLog.create({
            data: {
              reportId: id,
              action: "sms_alert_failed",
              performedBy: "System",
              details: `Override SMS failed: ${e instanceof Error ? e.message : "unknown error"}`,
            },
          });
        }
      }
    }
  }

  return NextResponse.json({ ...updated, smsSent, smsRecipients });
}
