import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import "dotenv/config";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const REPORTS = [
  // ── Metro Industrial Park (5 reports) ──
  {
    reportText: "Strong chemical fumes detected in paint booth area. Ventilation system appears to be malfunctioning. Workers complaining of headaches and nausea. Enclosed space with no fresh air intake.",
    site: "Metro Industrial Park",
    reporterRole: "Lab Technician",
    reportedAt: new Date("2026-08-22T09:15:00Z"),
    status: "analyzed" as const,
    riskLevel: "high" as const,
    hazardCategory: "Chemical Exposure",
    justification: "Buildup of toxic fumes in an unventilated enclosed space presents immediate risk of acute poisoning or asphyxiation.",
    analyzedAt: new Date("2026-08-22T09:16:00Z"),
    slaDeadline: new Date("2026-08-23T09:15:00Z"),
    clusterId: "cluster_chemical_1",
  },
  {
    reportText: "Electrical panel in Building C has exposed wiring. Cover plate removed and left on floor. Multiple live conductors visible. No lockout/tagout applied.",
    site: "Metro Industrial Park",
    reporterRole: "Electrician",
    reportedAt: new Date("2026-08-20T14:30:00Z"),
    status: "acknowledged" as const,
    riskLevel: "high" as const,
    hazardCategory: "Electrical",
    justification: "Exposed live electrical conductors present immediate electrocution and arc flash risk to anyone in proximity.",
    analyzedAt: new Date("2026-08-20T14:31:00Z"),
    slaDeadline: new Date("2026-08-21T14:30:00Z"),
    clusterId: "cluster_electrical_1",
  },
  {
    reportText: "Scaffolding on east wing missing guardrails at 25 feet. Two workers observed on platform without fall protection harnesses. Wind conditions gusty.",
    site: "Metro Industrial Park",
    reporterRole: "Site Supervisor",
    reportedAt: new Date("2026-08-18T08:00:00Z"),
    status: "analyzed" as const,
    riskLevel: "high" as const,
    hazardCategory: "Fall Hazard",
    justification: "Unguarded scaffold at height without fall protection presents credible path to fatal fall.",
    analyzedAt: new Date("2026-08-18T08:01:00Z"),
    slaDeadline: new Date("2026-08-19T08:00:00Z"),
    clusterId: "cluster_fall_heights_1",
  },
  {
    reportText: "Paint mixing area requires updated SDS sheets. Current sheets are from 2021 and new chemicals have been introduced. Minor ventilation concern.",
    site: "Metro Industrial Park",
    reporterRole: "Safety Coordinator",
    reportedAt: new Date("2026-08-14T10:00:00Z"),
    status: "analyzed" as const,
    riskLevel: "medium" as const,
    hazardCategory: "Chemical Exposure",
    justification: "Outdated safety data sheets could lead to improper handling of newer chemicals with unknown hazard profiles.",
    analyzedAt: new Date("2026-08-14T10:01:00Z"),
    slaDeadline: new Date("2026-08-17T10:00:00Z"),
    clusterId: "cluster_chemical_1",
  },
  {
    reportText: "Forklift operator nearly struck pedestrian in loading dock. Speed limit signage obscured by stacked pallets. Mirror blind spot identified.",
    site: "Metro Industrial Park",
    reporterRole: "Warehouse Manager",
    reportedAt: new Date("2026-08-10T11:30:00Z"),
    status: "resolved" as const,
    riskLevel: "high" as const,
    hazardCategory: "Vehicle/Traffic",
    justification: "Near-miss vehicle-pedestrian collision in congested area with visibility obstructions presents fatality risk.",
    analyzedAt: new Date("2026-08-10T11:31:00Z"),
    slaDeadline: new Date("2026-08-11T11:30:00Z"),
    clusterId: "cluster_vehicle_1",
  },

  // ── Riverfront Tower (4 reports) ──
  {
    reportText: "Loose guardrail on elevated walkway between floors 3 and 4. Bolt connections appear corroded. Multiple workers use this walkway daily.",
    site: "Riverfront Tower",
    reporterRole: "Maintenance Worker",
    reportedAt: new Date("2026-08-21T07:45:00Z"),
    status: "pending" as const,
    riskLevel: "high" as const,
    hazardCategory: "Structural",
    justification: "Corroded guardrail connections on an active elevated walkway could fail under load, causing a fatal fall.",
    analyzedAt: new Date("2026-08-21T07:46:00Z"),
    slaDeadline: new Date("2026-08-22T07:45:00Z"),
    clusterId: "cluster_structural_1",
  },
  {
    reportText: "Crane operator reported unusual vibration during lift operations. Load was within limits but vibration was noticeable at mid-height.",
    site: "Riverfront Tower",
    reporterRole: "Crane Operator",
    reportedAt: new Date("2026-08-17T13:00:00Z"),
    status: "pending" as const,
    riskLevel: "high" as const,
    hazardCategory: "Equipment Failure",
    justification: "Unexplained vibration in crane operations could indicate structural fatigue or mechanical failure under load.",
    analyzedAt: new Date("2026-08-17T13:01:00Z"),
    slaDeadline: new Date("2026-08-18T13:00:00Z"),
    clusterId: "cluster_equipment_1",
  },
  {
    reportText: "Security gate access log shows unauthorized entry to restricted mechanical room after hours. Lock mechanism appears tampered with.",
    site: "Riverfront Tower",
    reporterRole: "Security Guard",
    reportedAt: new Date("2026-08-13T22:00:00Z"),
    status: "pending" as const,
    riskLevel: "medium" as const,
    hazardCategory: "Procedural Gap",
    justification: "Unauthorized access to mechanical rooms poses risk of tampering with critical safety systems.",
    analyzedAt: new Date("2026-08-13T22:01:00Z"),
    slaDeadline: new Date("2026-08-16T22:00:00Z"),
    clusterId: "cluster_procedural_1",
  },
  {
    reportText: "Temporary lighting in tunnel section B is insufficient. Workers report near-misses due to poor visibility during evening shifts.",
    site: "Riverfront Tower",
    reporterRole: "Tunnel Inspector",
    reportedAt: new Date("2026-08-22T16:30:00Z"),
    status: "analyzed" as const,
    riskLevel: "low" as const,
    hazardCategory: "Procedural Gap",
    justification: "Insufficient lighting is a contributing factor but not an immediate hazard with current traffic controls in place.",
    analyzedAt: new Date("2026-08-22T16:31:00Z"),
    slaDeadline: new Date("2026-08-29T16:30:00Z"),
    clusterId: "cluster_procedural_1",
  },

  // ── Harbor View Medical Center (4 reports) ──
  {
    reportText: "Workers entered underground water storage tank without confined space permit. No gas detection equipment deployed. No standby attendant stationed.",
    site: "Harbor View Medical Center",
    reporterRole: "Safety Coordinator",
    reportedAt: new Date("2026-08-22T11:00:00Z"),
    status: "acknowledged" as const,
    riskLevel: "high" as const,
    hazardCategory: "Confined Space",
    justification: "Unpermitted confined space entry without atmospheric monitoring or rescue standby presents immediate fatality risk from asphyxiation or toxic exposure.",
    analyzedAt: new Date("2026-08-22T11:01:00Z"),
    slaDeadline: new Date("2026-08-23T11:00:00Z"),
    clusterId: "cluster_confined_1",
  },
  {
    reportText: "Chemical storage room showing signs of container leakage. Strong odor detected near solvent shelves. Spill containment trays appear overfilled.",
    site: "Harbor View Medical Center",
    reporterRole: "Lab Technician",
    reportedAt: new Date("2026-08-19T15:30:00Z"),
    status: "acknowledged" as const,
    riskLevel: "high" as const,
    hazardCategory: "Chemical Exposure",
    justification: "Leaking chemical containers in an enclosed storage area create fire, inhalation, and contamination hazards.",
    analyzedAt: new Date("2026-08-19T15:31:00Z"),
    slaDeadline: new Date("2026-08-20T15:30:00Z"),
    clusterId: "cluster_chemical_1",
  },
  {
    reportText: "Ceiling tile in corridor B showing water damage and sagging. Possible leak from upper floor plumbing. Risk of tile collapse onto foot traffic below.",
    site: "Harbor View Medical Center",
    reporterRole: "Field Worker",
    reportedAt: new Date("2026-08-16T09:00:00Z"),
    status: "analyzed" as const,
    riskLevel: "medium" as const,
    hazardCategory: "Structural",
    justification: "Water-damaged ceiling tile could collapse under its own weight, causing injury to people below.",
    analyzedAt: new Date("2026-08-16T09:01:00Z"),
    slaDeadline: new Date("2026-08-19T09:00:00Z"),
    clusterId: "cluster_structural_1",
  },
  {
    reportText: "Emergency exit door in east wing propped open with a fire extinguisher. Fire door closer mechanism broken.",
    site: "Harbor View Medical Center",
    reporterRole: "Site Supervisor",
    reportedAt: new Date("2026-08-11T14:00:00Z"),
    status: "analyzed" as const,
    riskLevel: "low" as const,
    hazardCategory: "Procedural Gap",
    justification: "Propped fire door reduces compartmentalization but is a low-severity procedural issue with existing alternative exits nearby.",
    analyzedAt: new Date("2026-08-11T14:01:00Z"),
    slaDeadline: new Date("2026-08-18T14:00:00Z"),
    clusterId: "cluster_procedural_1",
  },

  // ── Westfield Construction (3 reports) ──
  {
    reportText: "Structural steel beam on south side showing visible deformation under load. Connection plates appear to be shifting. Immediate assessment needed.",
    site: "Westfield Construction",
    reporterRole: "Safety Inspector",
    reportedAt: new Date("2026-08-20T10:00:00Z"),
    status: "acknowledged" as const,
    riskLevel: "high" as const,
    hazardCategory: "Structural",
    justification: "Visible deformation in a load-bearing structural element indicates potential progressive collapse risk.",
    analyzedAt: new Date("2026-08-20T10:01:00Z"),
    slaDeadline: new Date("2026-08-21T10:00:00Z"),
    clusterId: "cluster_structural_1",
  },
  {
    reportText: "Equipment failure on hydraulic lift platform. Platform dropped 6 inches during ascent with two workers on it. Emergency brake engaged.",
    site: "Westfield Construction",
    reporterRole: "Field Worker",
    reportedAt: new Date("2026-08-08T08:30:00Z"),
    status: "pending" as const,
    riskLevel: "medium" as const,
    hazardCategory: "Equipment Failure",
    justification: "Hydraulic lift platform drop under load indicates potential brake or hydraulic system failure requiring inspection.",
    analyzedAt: new Date("2026-08-08T08:31:00Z"),
    slaDeadline: new Date("2026-08-11T08:30:00Z"),
    clusterId: "cluster_equipment_1",
  },
  {
    reportText: "Scaffold platform planks not secured. Two planks shifted when worker stepped on them. No cross-bracing on lower levels.",
    site: "Westfield Construction",
    reporterRole: "Field Worker",
    reportedAt: new Date("2026-08-06T07:15:00Z"),
    status: "resolved" as const,
    riskLevel: "low" as const,
    hazardCategory: "Structural",
    justification: "Unsecured scaffold planks are a hazard but were corrected on-site before any fall occurred.",
    analyzedAt: new Date("2026-08-06T07:16:00Z"),
    slaDeadline: new Date("2026-08-13T07:15:00Z"),
    clusterId: "cluster_fall_heights_1",
  },

  // ── Logistics Hub East (2 reports) ──
  {
    reportText: "Delivery truck backing into loading bay without spotter. Pedestrian walkway crosses reversing path. No warning alarm operational on truck.",
    site: "Logistics Hub East",
    reporterRole: "Warehouse Manager",
    reportedAt: new Date("2026-08-18T10:30:00Z"),
    status: "pending" as const,
    riskLevel: "high" as const,
    hazardCategory: "Vehicle/Traffic",
    justification: "Vehicle reversing without spotter or warning alarm across a pedestrian crossing presents crush fatality risk.",
    analyzedAt: new Date("2026-08-18T10:31:00Z"),
    slaDeadline: new Date("2026-08-19T10:30:00Z"),
    clusterId: "cluster_vehicle_1",
  },
  {
    reportText: "Pallet racking in warehouse aisle 7 showing slight lean. Bottom anchor bolts appear loose. Forklift traffic daily in this aisle.",
    site: "Logistics Hub East",
    reporterRole: "Facilities Manager",
    reportedAt: new Date("2026-08-02T09:00:00Z"),
    status: "resolved" as const,
    riskLevel: "low" as const,
    hazardCategory: "Structural",
    justification: "Leaning pallet rack is a structural concern but anchor bolts were tightened same day and rack was re-leveled.",
    analyzedAt: new Date("2026-08-02T09:01:00Z"),
    slaDeadline: new Date("2026-08-09T09:00:00Z"),
    clusterId: "cluster_structural_1",
  },
];

const ORGANIZATIONS = [
  { name: "Metro Industrial Group" },
  { name: "Harbor Health Systems" },
  { name: "Riverfront Construction Co." },
];

const ORG_MAP: Record<string, number> = {
  "Metro Industrial Park": 1,
  "Logistics Hub East": 1,
  "Riverfront Tower": 3,
  "Harbor View Medical Center": 2,
  "Westfield Construction": 3,
};

const COMPLIANCE_REFS = [
  { hazardCategory: "Fall Hazard", regulationName: "Factories Act 1948", sectionReference: "Section 36", description: "Requires fencing of every dangerous part of machinery and safe means of access to elevated platforms." },
  { hazardCategory: "Fall Hazard", regulationName: "BOCW Act 1996", sectionReference: "Section 41", description: "Mandates safety belts, nets, and guardrails for workers at heights on construction sites." },
  { hazardCategory: "Electrical", regulationName: "Electricity Act 2003", sectionReference: "Section 14", description: "Regulations for safe electrical installations and maintenance to prevent electrocution." },
  { hazardCategory: "Electrical", regulationName: "IS 10101:2021", sectionReference: "Part 1", description: "Indian Standard for safety of electrical equipment — insulation, earthing, and lockout/tagout requirements." },
  { hazardCategory: "Chemical Exposure", regulationName: "Factories Act 1948", sectionReference: "Section 41A-41H", description: "Provisions relating to toxic substances, exposure limits, PPE, and health surveillance." },
  { hazardCategory: "Chemical Exposure", regulationName: "GHS/CMSR Rules 2024", sectionReference: "Schedule 1", description: "Chemical Manufacture, Storage and Import Rules — labeling, SDS, and containment requirements." },
  { hazardCategory: "Structural", regulationName: "Factories Act 1948", sectionReference: "Section 21", description: "Requires every building and structure to be maintained in a state of repair to prevent danger." },
  { hazardCategory: "Structural", regulationName: "IS 4130:2008", sectionReference: "Clause 5", description: "Design and maintenance of structural steel — deformation limits and inspection protocols." },
  { hazardCategory: "Equipment Failure", regulationName: "Factories Act 1948", sectionReference: "Section 22", description: "Fencing of machinery — all dangerous parts must be securely fenced or guarded." },
  { hazardCategory: "Equipment Failure", regulationName: "IS 15489:2004", sectionReference: "Part 2", description: "Safe use of lifting equipment — load testing, inspection, and maintenance schedules." },
  { hazardCategory: "Vehicle/Traffic", regulationName: "Factories Act 1948", sectionReference: "Section 28", description: "Safe means of access and safe passages — traffic management within factory premises." },
  { hazardCategory: "Vehicle/Traffic", regulationName: "DGMS Circular 08/2022", sectionReference: "Para 3", description: "Traffic management and vehicle safety in mining and industrial areas — spotter requirements." },
  { hazardCategory: "Confined Space", regulationName: "Factories Act 1948", sectionReference: "Section 36A-36D", description: "Confined spaces — permit systems, atmospheric testing, rescue standby, and training requirements." },
  { hazardCategory: "Confined Space", regulationName: "DGMS Circular 04/2019", sectionReference: "Para 5", description: "Working in confined spaces — gas detection, ventilation, and emergency rescue protocols." },
  { hazardCategory: "Procedural Gap", regulationName: "Factories Act 1948", sectionReference: "Section 7A", description: "General duty of the occupier to maintain a safe workplace and safe systems of work." },
  { hazardCategory: "Procedural Gap", regulationName: "ISO 45001:2018", sectionReference: "Clause 6.1.2", description: "Hazard identification and risk assessment — systematic approach to identifying procedural gaps." },
];

async function main() {
  console.log("Seeding Neon PostgreSQL...");

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.siteScore.deleteMany();
  await prisma.complianceReference.deleteMany();
  await prisma.safetyReport.deleteMany();
  await prisma.organization.deleteMany();

  // Insert reports
  let count = 0;
  for (const report of REPORTS) {
    await prisma.safetyReport.create({ data: report });
    count++;
    process.stdout.write(`  Created report ${count}/${REPORTS.length}\r`);
  }
  console.log(`\n  ✓ ${count} reports created`);

  // Verify IDs are numeric
  const first = await prisma.safetyReport.findFirst({ orderBy: { id: "asc" } });
  const last = await prisma.safetyReport.findFirst({ orderBy: { id: "desc" } });
  console.log(`  ✓ IDs range: ${first?.id} to ${last?.id}`);

  // Verify sites
  const sites = await prisma.safetyReport.groupBy({ by: ["site"], _count: true });
  console.log(`  ✓ ${sites.length} sites:`);
  sites.forEach((s) => console.log(`    - ${s.site}: ${s._count} reports`));

  // Seed organizations
  for (const org of ORGANIZATIONS) {
    await prisma.organization.create({ data: org });
  }
  console.log(`  ✓ ${ORGANIZATIONS.length} organizations created`);

  // Assign organizations to reports
  const reports = await prisma.safetyReport.findMany();
  for (const r of reports) {
    const orgId = ORG_MAP[r.site] || 1;
    await prisma.safetyReport.update({ where: { id: r.id }, data: { organizationId: orgId } });
  }
  console.log(`  ✓ Assigned organizations to ${reports.length} reports`);

  // Seed compliance references
  for (const ref of COMPLIANCE_REFS) {
    await prisma.complianceReference.create({ data: ref });
  }
  console.log(`  ✓ ${COMPLIANCE_REFS.length} compliance references created`);

  // Seed tasks for high-risk reports
  const highRisk = reports.filter((r) => r.riskLevel === "high");
  const deptMap: Record<string, string> = {
    "Chemical Exposure": "Environmental Safety",
    "Electrical": "Electrical Maintenance",
    "Fall Hazard": "Structural",
    "Structural": "Structural",
    "Equipment Failure": "Equipment",
    "Vehicle/Traffic": "Site Safety",
    "Confined Space": "Environmental Safety",
    "Procedural Gap": "Administration",
  };
  for (const r of highRisk) {
    await prisma.task.create({
      data: {
        reportId: r.id,
        title: `Fix ${r.hazardCategory} at ${r.site}`,
        description: r.justification || "",
        assignedTo: deptMap[r.hazardCategory || ""] || "Administration",
        status: "open",
        priority: r.riskLevel === "high" ? "urgent" : "high",
        dueDate: r.slaDeadline,
      },
    });
  }
  console.log(`  ✓ ${highRisk.length} tasks created for high-risk reports`);

  await (prisma as any).$disconnect();
  console.log("\nDone!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
