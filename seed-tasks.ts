import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import "dotenv/config";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.task.deleteMany();

  const tasks = [
    { reportId: 1, title: "Shut down paint booth ventilation system for repair", description: "Ventilation fan motor burned out. Temporary fans deployed but insufficient for enclosed space.", assignedTo: "General Maintenance", priority: "urgent" as const },
    { reportId: 1, title: "Deploy portable air quality monitors", description: "Place continuous CO and VOC monitors at paint booth entry points until ventilation is restored.", assignedTo: "Environmental Safety", priority: "high" as const },
    { reportId: 2, title: "Lockout/tagout exposed electrical panel", description: "De-energize Building C panel, install temporary covers, post warning signs. Restricted access until permanent repair.", assignedTo: "Electrical", priority: "urgent" as const },
    { reportId: 2, title: "Schedule licensed electrician for permanent repair", description: "Replace damaged conductors, install new cover plate, update panel documentation.", assignedTo: "Electrical", priority: "high" as const },
    { reportId: 3, title: "Install guardrails on east wing scaffolding", description: "Missing guardrails at 25ft level. Install full perimeter guardrail system before any work resumes.", assignedTo: "Structural", priority: "urgent" as const },
    { reportId: 3, title: "Issue stop-work order for east wing", description: "All workers removed from scaffold until guardrails and harness anchor points confirmed by inspector.", assignedTo: "Site Safety", priority: "urgent" as const },
    { reportId: 6, title: "Replace corroded guardrail bolts on elevated walkway", description: "Bolt connections between floors 3-4 showing corrosion. Order stainless steel replacements.", assignedTo: "Structural", priority: "urgent" as const },
    { reportId: 6, title: "Close elevated walkway until repair complete", description: "Route foot traffic through alternate corridor. Post signage at both entry points.", assignedTo: "Site Safety", priority: "high" as const },
    { reportId: 7, title: "Schedule crane inspection by certified examiner", description: "Unusual vibration during lifts. Schedule emergency off-cycle inspection per OSHA requirements.", assignedTo: "Equipment", priority: "urgent" as const },
    { reportId: 9, title: "Repair security gate lock mechanism", description: "Tampered lock on restricted mechanical room. Replace with electronic access control.", assignedTo: "Security", priority: "high" as const },
    { reportId: 10, title: "Install gas detection for confined space entry", description: "Deploy 4-gas monitor, assign standby attendant, establish rescue plan before any re-entry.", assignedTo: "Confined Space Rescue", priority: "urgent" as const },
    { reportId: 10, title: "Conduct confined space safety training", description: "Workers entered without permit. Schedule mandatory refresher training within 48 hours.", assignedTo: "Training", priority: "high" as const },
    { reportId: 11, title: "Evacuate chemical storage room and ventilate", description: "Leaking containers detected. Move personnel out, deploy hazmat ventilation, isolate leaks.", assignedTo: "Environmental Safety", priority: "urgent" as const },
    { reportId: 11, title: "Replace damaged chemical containers", description: "Transfer contents to new containers. Update SDS inventory and spill containment trays.", assignedTo: "Environmental Safety", priority: "high" as const },
    { reportId: 14, title: "Emergency structural assessment of steel beam", description: "Visible deformation under load. Engage structural engineer for immediate assessment.", assignedTo: "Structural", priority: "urgent" as const },
    { reportId: 14, title: "Install temporary shoring under deformed beam", description: "Install temporary support posts to prevent further movement until assessment complete.", assignedTo: "Structural", priority: "urgent" as const },
    { reportId: 16, title: "Inspect hydraulic lift platform brake system", description: "Platform dropped 6 inches during ascent. Full hydraulic and brake system inspection required.", assignedTo: "Equipment", priority: "high" as const },
    { reportId: 17, title: "Install spotter protocol and warning alarms", description: "Assign dedicated spotters, repair truck warning alarm, install convex mirrors at loading bays.", assignedTo: "Warehouse Operations", priority: "urgent" as const },
  ];

  const now = new Date();
  const due = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  for (const t of tasks) {
    await prisma.task.create({
      data: {
        reportId: t.reportId,
        title: t.title,
        description: t.description,
        assignedTo: t.assignedTo,
        priority: t.priority,
        dueDate: due,
      },
    });
  }

  const count = await prisma.task.count();
  console.log(`Tasks created: ${count}`);

  const byDept = await prisma.task.groupBy({ by: ["assignedTo"], _count: true, orderBy: { _count: { assignedTo: "desc" } } });
  for (const r of byDept) console.log(`  ${r.assignedTo}: ${r._count.assignedTo}`);

  // Mark some as in_progress and done for variety
  const all = await prisma.task.findMany({ orderBy: { id: "asc" } });
  const inProgressIds = [all[1]?.id, all[4]?.id, all[7]?.id, all[11]?.id].filter(Boolean) as number[];
  const doneIds = [all[3]?.id, all[9]?.id, all[15]?.id].filter(Boolean) as number[];

  for (const id of inProgressIds) {
    await prisma.task.update({ where: { id }, data: { status: "in_progress" } });
  }
  for (const id of doneIds) {
    await prisma.task.update({ where: { id }, data: { status: "done" } });
  }

  const statusCounts = await prisma.task.groupBy({ by: ["status"], _count: true });
  console.log("\nBy status:");
  for (const r of statusCounts) console.log(`  ${r.status}: ${r._count.status}`);

  await (prisma as any)["$disconnect"]();
  console.log("\nDone!");
}

main().catch((e) => { console.error(e); process.exit(1); });
