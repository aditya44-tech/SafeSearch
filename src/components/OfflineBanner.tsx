"use client";

import { useState, useEffect, useCallback } from "react";
import { getQueuedCount, syncQueuedReports } from "@/lib/offline-queue";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const checkQueue = useCallback(async () => {
    try {
      const count = await getQueuedCount();
      setQueuedCount(count);
    } catch {}
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    checkQueue();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Check queue periodically
    const interval = setInterval(checkQueue, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [checkQueue]);

  const handleSync = async () => {
    if (syncing || queuedCount === 0) return;
    setSyncing(true);
    setSyncMessage("Syncing...");
    try {
      const result = await syncQueuedReports((sent, total) => {
        setSyncMessage(`Syncing ${sent}/${total}...`);
      });
      await checkQueue();
      if (result.failed > 0) {
        setSyncMessage(`${result.sent} sent, ${result.failed} failed`);
      } else {
        setSyncMessage(`${result.sent} report${result.sent !== 1 ? "s" : ""} synced`);
      }
      setTimeout(() => setSyncMessage(""), 3000);
    } catch {
      setSyncMessage("Sync failed - will retry");
      setTimeout(() => setSyncMessage(""), 3000);
    } finally {
      setSyncing(false);
    }
  };

  // No banner to show
  if (isOnline && queuedCount === 0 && !syncMessage) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg flex items-center gap-3 transition-all duration-300"
      style={{
        background: isOnline ? "var(--color-surface-raised)" : "var(--color-danger-light)",
        border: `1px solid ${isOnline ? "var(--color-border)" : "rgba(220,38,38,0.15)"}`,
        color: isOnline ? "var(--color-ink)" : "var(--color-danger)",
      }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: isOnline ? "var(--color-safe)" : "var(--color-danger)" }}
      />
      {!isOnline && (
        <span>You&apos;re offline - reports will be queued</span>
      )}
      {isOnline && queuedCount > 0 && (
        <>
          <span>{queuedCount} report{queuedCount !== 1 ? "s" : ""} pending sync</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1 rounded-lg text-xs font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--color-accent)" }}
          >
            {syncing ? "Syncing..." : "Sync now"}
          </button>
        </>
      )}
      {syncMessage && (
        <span>{syncMessage}</span>
      )}
    </div>
  );
}
