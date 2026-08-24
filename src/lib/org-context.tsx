"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Org { id: number; name: string; reportCount: number; }

interface OrgContextType {
  orgs: Org[];
  selectedOrgId: number | null;
  setSelectedOrgId: (id: number | null) => void;
  loading: boolean;
}

const OrgContext = createContext<OrgContextType>({
  orgs: [],
  selectedOrgId: null,
  setSelectedOrgId: () => {},
  loading: true,
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read from URL on mount
    const params = new URLSearchParams(window.location.search);
    const urlOrg = params.get("org");
    if (urlOrg) setSelectedOrgId(parseInt(urlOrg, 10));

    fetch("/api/organizations")
      .then((r) => r.json())
      .then((data) => { setOrgs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSetOrg = (id: number | null) => {
    setSelectedOrgId(id);
    const params = new URLSearchParams(window.location.search);
    if (id) params.set("org", id.toString());
    else params.delete("org");
    const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState({}, "", newUrl);
    // Trigger a refresh by reloading
    window.location.reload();
  };

  return (
    <OrgContext.Provider value={{ orgs, selectedOrgId, setSelectedOrgId: handleSetOrg, loading }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() { return useContext(OrgContext); }
