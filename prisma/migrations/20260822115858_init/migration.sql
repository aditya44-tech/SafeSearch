-- CreateTable
CREATE TABLE "SafetyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportText" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "reporterRole" TEXT NOT NULL,
    "reportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "riskLevel" TEXT,
    "hazardCategory" TEXT,
    "justification" TEXT,
    "analyzedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SafetyReport_status_idx" ON "SafetyReport"("status");

-- CreateIndex
CREATE INDEX "SafetyReport_riskLevel_idx" ON "SafetyReport"("riskLevel");

-- CreateIndex
CREATE INDEX "SafetyReport_site_idx" ON "SafetyReport"("site");

-- CreateIndex
CREATE INDEX "SafetyReport_reportedAt_idx" ON "SafetyReport"("reportedAt");
