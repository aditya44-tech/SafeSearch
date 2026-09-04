import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DEPARTMENTS, deptSlug, deptFromSlug } from "@/lib/helpers";
import DepartmentClient from "./DepartmentClient";

export const dynamic = "force-dynamic";

export default async function DepartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Known departments = canonical list + any name actually used in the tasks table
  // (seed data historically used names like "Environmental Safety", "Site Safety")
  const distinctNames = await prisma.task.findMany({
    distinct: ["assignedTo"],
    select: { assignedTo: true },
  });
  const knownNames = Array.from(
    new Set([...DEPARTMENTS.map((d) => d.name), ...distinctNames.map((t) => t.assignedTo)])
  );
  const deptName = knownNames.find((n) => deptSlug(n) === slug);
  if (!deptName) notFound();

  const canonical = deptFromSlug(slug);
  const icon = canonical?.icon || "📋";
  const categories = canonical?.categories || [];

  const tasks = await prisma.task.findMany({
    where: { assignedTo: deptName },
    include: {
      report: {
        select: {
          id: true, site: true, riskLevel: true, hazardCategory: true,
          reportText: true, status: true, slaDeadline: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const dept = { name: deptName, icon, categories };
  return <DepartmentClient dept={dept} tasks={JSON.parse(JSON.stringify(tasks))} />;
}
