import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { readFileSync } from "fs";
import { join } from "path";

const adapter = new PrismaLibSql({ url: "file:dev.db" });
const prisma = new PrismaClient({ adapter });

interface SeedReport {
  reportText: string; site: string; reporterRole: string; reportedAt: string;
  status: string; riskLevel: string | null; hazardCategory: string | null;
  justification: string | null; analyzedAt: string | null;
}

async function main() {
  console.log("Seeding database...");
  const data = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "seed-data.json"), "utf-8")
  ) as SeedReport[];
  for (const r of data) {
    await prisma.safetyReport.create({
      data: {
        reportText: r.reportText, site: r.site, reporterRole: r.reporterRole,
        reportedAt: new Date(r.reportedAt), status: r.status as any,
        riskLevel: r.riskLevel as any, hazardCategory: r.hazardCategory,
        justification: r.justification,
        analyzedAt: r.analyzedAt ? new Date(r.analyzedAt) : null,
      },
    });
  }
  const count = await prisma.safetyReport.count();
  console.log("Seeded " + count + " safety reports.");
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); process.exit(1); });
