import { Button, Sidebar, Text } from "@cloudflare/kumo";
import { Bell, Gear, House, MagnifyingGlass, UserCircle } from "@phosphor-icons/react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "../../components/AppHeader";
import { adminPanels } from "../../admin-panels";
import { moduleMeta } from "../../../modules";

// Site-configurable mount point (ADR 007) — "/", "/dash", or host-pinned.
const base = moduleMeta.dashboard.mount.path;

type Me = { user: { email: string; roles: string[] } };

// The backoffice shell (ADR 007): hosts this module's own pages plus every
// registered module admin panel. The /api/admin/me check here only gates
// the UI — the worker middleware is the authoritative check per request.
export function DashboardShell() {
  const [me, setMe] = useState<Me | "loading" | "unauthorized">("loading");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me")
      .then((res) => (res.ok ? (res.json() as Promise<Me>) : Promise.reject(res.status)))
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe("unauthorized");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (me === "loading") return null;

  if (me === "unauthorized") {
    return (
      <div className="min-h-screen bg-kumo-canvas flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <Text as="h1" variant="heading3" DANGEROUS_className="mb-2">Sign-in required</Text>
          <Text variant="secondary" size="sm">
            The dashboard requires an authenticated admin. In production this
            request must arrive through Cloudflare Access with an admin role.
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-kumo-canvas overflow-hidden">
      <AppHeader back title="Dashboard">
        <Button variant="ghost" size="sm" shape="square" icon={<MagnifyingGlass size={14} />} title="Search" aria-label="Search" />
        <Button variant="ghost" size="sm" shape="square" icon={<Bell size={14} />} title="Notifications" aria-label="Notifications" />
        <Button variant="ghost" size="sm" icon={<UserCircle size={16} />}>{me.user.email}</Button>
      </AppHeader>

      <div className="flex flex-1 min-h-0 w-full">
        <Sidebar.Provider defaultOpen contained collapsible="icon" className="flex flex-1 min-h-0 w-full">
          <Sidebar className="border-r border-kumo-line bg-kumo-base h-full">
            <Sidebar.Content>
              <Sidebar.Group>
                <Sidebar.GroupLabel>Dashboard</Sidebar.GroupLabel>
                <Sidebar.Menu>
                  <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                      active={pathname === base}
                      tooltip="Overview"
                      icon={<House size={15} />}
                      onClick={() => navigate({ to: base })}
                    >
                      Overview
                    </Sidebar.MenuButton>
                  </Sidebar.MenuItem>
                </Sidebar.Menu>
              </Sidebar.Group>

              {adminPanels.length > 0 && (
                <Sidebar.Group>
                  <Sidebar.GroupLabel>Site content</Sidebar.GroupLabel>
                  <Sidebar.Menu>
                    {adminPanels.map((p) => {
                      const to = `${base === "/" ? "" : base}/${p.path}`;
                      return (
                        <Sidebar.MenuItem key={p.module}>
                          <Sidebar.MenuButton
                            active={pathname.startsWith(to)}
                            tooltip={p.label}
                            icon={<Gear size={15} />}
                            onClick={() => navigate({ to })}
                          >
                            {p.label}
                          </Sidebar.MenuButton>
                        </Sidebar.MenuItem>
                      );
                    })}
                  </Sidebar.Menu>
                </Sidebar.Group>
              )}
            </Sidebar.Content>
          </Sidebar>

          <main className="flex-1 min-w-0 overflow-auto p-5 bg-kumo-canvas">
            <Outlet />
          </main>
        </Sidebar.Provider>
      </div>
    </div>
  );
}
