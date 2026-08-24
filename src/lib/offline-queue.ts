"use client";

import { openDB, DBSchema, IDBPDatabase } from "idb";

interface QueuedReport {
  id?: number;
  reportText: string;
  site: string;
  reporterRole?: string;
  isAnonymous?: boolean;
  createdAt: string;
}

interface OfflineDB extends DBSchema {
  reports: {
    key: number;
    value: QueuedReport;
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>("safesignal-offline", 1, {
      upgrade(db) {
        db.createObjectStore("reports", { keyPath: "id", autoIncrement: true });
      },
    });
  }
  return dbPromise;
}

export async function enqueueReport(data: {
  reportText: string;
  site: string;
  reporterRole?: string;
  isAnonymous?: boolean;
}): Promise<number> {
  const db = await getDB();
  const id = await db.add("reports", {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return id as number;
}

export async function getQueuedReports(): Promise<QueuedReport[]> {
  const db = await getDB();
  return db.getAll("reports");
}

export async function removeQueuedReport(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("reports", id);
}

export async function getQueuedCount(): Promise<number> {
  const db = await getDB();
  return db.count("reports");
}

export async function syncQueuedReports(
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number }> {
  const reports = await getQueuedReports();
  let sent = 0;
  let failed = 0;

  for (const report of reports) {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportText: report.reportText,
          site: report.site,
          reporterRole: report.reporterRole,
          isAnonymous: report.isAnonymous,
        }),
      });
      if (res.ok) {
        await removeQueuedReport(report.id!);
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    onProgress?.(sent + failed, reports.length);
  }

  return { sent, failed };
}
