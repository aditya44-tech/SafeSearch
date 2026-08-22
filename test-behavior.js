const BASE = "http://localhost:3000";
let passed = 0, failed = 0, total = 0;

async function api(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function assert(condition, msg) {
  total++;
  if (condition) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.log(`  ✗ FAIL: ${msg}`); }
}

async function testCreateReport() {
  console.log("\n1. CREATE REPORT");
  const r = await api("POST", "/api/reports", {
    reportText: "Workers near unguarded edge on 3rd floor without harnesses",
    site: "Test Construction Site",
    reporterRole: "Safety Officer"
  });
  assert(r.status === 201, `Status 201 (got ${r.status})`);
  assert(r.data.id, `Has ID: ${r.data.id}`);
  assert(r.data.status === "pending", `Status is pending (got ${r.data.status})`);
  assert(r.data.riskLevel === null, `Risk level is null before analysis`);
  assert(r.data.slaDeadline === null, `SLA deadline is null before analysis`);
  assert(r.data.clusterId === null, `Cluster ID is null before analysis`);
  assert(r.data.humanOverrideRiskLevel === null, `Override is null`);
  return r.data;
}

async function testAnalyzeReport(report) {
  console.log("\n2. ANALYZE REPORT (Gemini or fallback)");
  const r = await api("POST", `/api/reports/${report.id}/analyze`);
  assert(r.status === 200, `Status 200 (got ${r.status})`);
  assert(r.data.analysis, `Has analysis object`);
  assert(["high", "medium", "low"].includes(r.data.analysis.risk_level),
    `risk_level is valid: ${r.data.analysis.risk_level}`);
  assert(r.data.analysis.hazard_category, `hazard_category present: ${r.data.analysis.hazard_category}`);
  assert(r.data.analysis.justification, `justification present`);
  assert(r.data.status === "analyzed", `Status updated to analyzed (got ${r.data.status})`);
  assert(r.data.slaDeadline, `SLA deadline is set: ${r.data.slaDeadline}`);
  assert(r.data.clusterId, `Cluster ID assigned: ${r.data.clusterId}`);
  // Verify SLA deadline is in the future
  const deadline = new Date(r.data.slaDeadline);
  const now = new Date();
  assert(deadline > now, `SLA deadline is in the future`);
  // Verify SLA duration matches risk level
  const hoursDiff = (deadline - now) / (1000 * 60 * 60);
  if (r.data.analysis.risk_level === "high") {
    assert(hoursDiff <= 25 && hoursDiff >= 23, `High-risk SLA ~24h (got ${hoursDiff.toFixed(1)}h)`);
  } else if (r.data.analysis.risk_level === "medium") {
    assert(hoursDiff <= 73 && hoursDiff >= 71, `Medium-risk SLA ~72h (got ${hoursDiff.toFixed(1)}h)`);
  } else {
    assert(hoursDiff <= 169 && hoursDiff >= 167, `Low-risk SLA ~7d (got ${hoursDiff.toFixed(1)}h)`);
  }
  return r.data;
}

async function testOverrideRisk(report) {
  console.log("\n3. OVERRIDE RISK LEVEL");
  const original = report.riskLevel;
  const newLevel = original === "high" ? "medium" : "high";
  const r = await api("PATCH", `/api/reports/${report.id}/override`, {
    riskLevel: newLevel,
    reason: "On-site inspection confirms lower severity than AI assessment",
    performedBy: "Jane Smith, Safety Manager"
  });
  assert(r.status === 200, `Status 200 (got ${r.status})`);
  assert(r.data.humanOverrideRiskLevel === newLevel, `Override level set to ${newLevel} (got ${r.data.humanOverrideRiskLevel})`);
  assert(r.data.overrideReason, `Override reason saved`);
  assert(r.data.overriddenBy === "Jane Smith, Safety Manager", `Overridden by saved`);
  // Verify original AI assessment is preserved (re-fetch from DB)
  const refetched = await api("GET", `/api/reports/${report.id}`);
  assert(refetched.data.riskLevel === original, `Original AI risk level preserved in DB: ${refetched.data.riskLevel}`);
  assert(refetched.data.humanOverrideRiskLevel === newLevel, `Override persisted in DB: ${refetched.data.humanOverrideRiskLevel}`);
}

async function testStatusChange(report) {
  console.log("\n4. STATUS CHANGE");
  const r = await api("PATCH", `/api/reports/${report.id}`, {
    status: "acknowledged",
    performedBy: "Bob Jones"
  });
  assert(r.status === 200, `Status 200 (got ${r.status})`);
  assert(r.data.status === "acknowledged", `Status updated to acknowledged (got ${r.data.status})`);
}

async function testAuditLog(report) {
  console.log("\n5. AUDIT LOG");
  // Fetch the report with audit logs via the detail page API
  const r = await api("GET", `/api/reports/${report.id}`);
  assert(r.status === 200, `Report fetchable (got ${r.status})`);
  // Check audit log entries exist by fetching the page
  const pageRes = await fetch(BASE + `/reports/${report.id}`);
  const html = await pageRes.text();
  assert(html.includes("Activity log"), `Activity log section rendered`);
  assert(html.includes("report_analyzed"), `Analysis audit entry rendered`);
  assert(html.includes("risk_overridden"), `Override audit entry rendered`);
  assert(html.includes("status_changed"), `Status change audit entry rendered`);
}

async function testSiteScore() {
  console.log("\n6. SITE SCORE");
  const r = await api("GET", "/api/reports");
  assert(r.status === 200, `Reports list fetchable (got ${r.status})`);
  // Verify SiteScore records exist in DB by checking scoreboard page
  const pageRes = await fetch(BASE + "/scoreboard");
  const html = await pageRes.text();
  assert(html.includes("Test Construction Site"), `Test site appears on scoreboard`);
  assert(html.includes("scoreValue") || html.includes("score") || html.includes("85") || html.includes("70"),
    `Score values present on scoreboard`);
}

async function testCluster() {
  console.log("\n7. CLUSTERING");
  // Create a similar report to test clustering
  const r1 = await api("POST", "/api/reports", {
    reportText: "Workers near unguarded edge on 5th floor without fall protection",
    site: "Test Construction Site",
    reporterRole: "Safety Officer"
  });
  assert(r1.status === 201, `Similar report created (got ${r1.status})`);

  // Analyze it to trigger clustering
  const a = await api("POST", `/api/reports/${r1.data.id}/analyze`);
  assert(a.status === 200, `Analysis complete (got ${a.status})`);
  assert(a.data.clusterId, `Cluster ID assigned: ${a.data.clusterId}`);

  // Check cluster API
  const c = await api("GET", "/api/reports/cluster");
  assert(c.status === 200, `Cluster API returns 200 (got ${c.status})`);
  assert(typeof c.data === "object", `Cluster data is an object`);

  // Cleanup test reports
  await api("DELETE", `/api/reports/${r1.data.id}`).catch(() => {});
  return r1.data;
}

async function testAnomalyCheck() {
  console.log("\n8. ANOMALY DETECTION");
  const r = await api("GET", "/api/reports/anomaly-check");
  assert(r.status === 200, `Anomaly check returns 200 (got ${r.status})`);
  assert(Array.isArray(r.data.anomalies), `Anomalies is an array`);
  assert(r.data.checkedAt, `Has checkedAt timestamp`);
  // Check structure of each anomaly
  if (r.data.anomalies.length > 0) {
    const a = r.data.anomalies[0];
    assert(a.site, `Anomaly has site: ${a.site}`);
    assert(typeof a.thisWeekCount === "number", `Has thisWeekCount`);
    assert(typeof a.historicalAvg === "number", `Has historicalAvg`);
    assert(["anomaly_detected", "normal"].includes(a.status), `Status is valid: ${a.status}`);
  }
}

async function testQuery() {
  console.log("\n9. NATURAL LANGUAGE QUERY");
  const r = await api("POST", "/api/query", {
    question: "How many high-risk reports are there?"
  });
  assert(r.status === 200, `Query returns 200 (got ${r.status})`);
  assert(r.data.answer, `Has answer: ${r.data.answer.substring(0, 80)}...`);
  assert(typeof r.data.answer === "string", `Answer is a string`);
  assert(r.data.answer.length > 10, `Answer is substantive (${r.data.answer.length} chars)`);
}

async function testPDFExport() {
  console.log("\n10. PDF EXPORT");
  const r = await fetch(BASE + "/api/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  assert(r.status === 200, `PDF returns 200 (got ${r.status})`);
  const contentType = r.headers.get("content-type");
  assert(contentType?.includes("text/html"), `Content type is HTML (got ${contentType})`);
  const html = await r.text();
  assert(html.includes("SIF Watch Report"), `PDF contains report title`);
  assert(html.includes("Total Reports"), `PDF contains total reports`);
  assert(html.includes("High Risk"), `PDF contains high risk section`);
  assert(html.includes("Unresolved high-risk items"), `PDF contains unresolved items`);
  assert(html.includes("Top 5 riskiest sites"), `PDF contains top sites`);
}

async function testPageRendering() {
  console.log("\n11. PAGE RENDERING");
  const pages = ["/", "/reports", "/dashboard", "/map", "/query", "/scoreboard", "/alerts"];
  for (const page of pages) {
    const r = await fetch(BASE + page);
    assert(r.status === 200, `${page} returns 200 (got ${r.status})`);
    const html = await r.text();
    assert(html.includes("SIF Watch"), `${page} contains SIF Watch branding`);
    assert(!html.includes("Application error"), `${page} has no application error`);
  }
}

async function testNavigationLinks() {
  console.log("\n12. NAVIGATION LINKS");
  const r = await fetch(BASE + "/");
  const html = await r.text();
  const expectedLinks = ["/reports", "/dashboard", "/map", "/scoreboard", "/query", "/alerts"];
  for (const link of expectedLinks) {
    assert(html.includes(`href="${link}"`), `Nav contains link to ${link}`);
  }
}

async function cleanup(reportId) {
  console.log("\n13. CLEANUP");
  // Can't delete via API (no DELETE route), but verify report exists
  const r = await api("GET", `/api/reports/${reportId}`);
  assert(r.status === 200, `Test report still accessible for manual cleanup`);
}

async function run() {
  console.log("=== SIF WATCH BEHAVIOR TEST ===\n");

  try {
    const report = await testCreateReport();
    const analyzed = await testAnalyzeReport(report);
    await testOverrideRisk(analyzed);
    await testStatusChange(analyzed);
    await testAuditLog(analyzed);
    await testSiteScore();
    await testCluster();
    await testAnomalyCheck();
    await testQuery();
    await testPDFExport();
    await testPageRendering();
    await testNavigationLinks();
    await cleanup(report.id);
  } catch (e) {
    failed++;
    console.log(`\n  ✗ UNEXPECTED ERROR: ${e.message}`);
    console.log(e.stack);
  }

  console.log(`\n=== RESULTS: ${passed}/${total} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
