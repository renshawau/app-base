import { useEffect, useState } from "react";

type TenantInfo = {
  name: string;
  branding: {
    name: string;
    nav: { label: string; href: string; children?: { label: string; href: string }[] }[];
    logo?: string;
    footer?: { links: { label: string; href: string }[]; text?: string; logo?: string; logoSide?: "left" | "right" };
  };
  modules: Record<string, { enabled: boolean }>;
  maintenance: { enabled: boolean; message?: string; logo?: string; link?: { label: string; href: string } };
};

// Fetches the client-safe tenant subset exposed at /api/tenant (see
// apps/web/src/worker/app.ts). Returns null until it resolves — components
// should render a sensible fallback in the meantime.
export function useTenant() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tenant")
      .then((res) => res.json() as Promise<TenantInfo>)
      .then((data) => {
        if (!cancelled) setTenant(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return tenant;
}
