import { Link } from "@tanstack/react-router";
import { Button } from "@cloudflare/kumo";
import { ArrowLeft, Moon, Sun } from "@phosphor-icons/react";
import { useDarkMode } from "../hooks/useDarkMode";
import { useTenant } from "../hooks/useTenant";

interface AppHeaderProps {
  back?: boolean;
  title: string;
  children?: React.ReactNode;
}

export function AppHeader({ back, title, children }: AppHeaderProps) {
  const { mode, toggle } = useDarkMode();
  const tenant = useTenant();

  return (
    <header className="h-12 border-b border-kumo-line bg-kumo-base flex items-center gap-2 px-4 shrink-0">
      {back && (
        // Goes to the site root, so the label names the destination
        // (the site, from branding) rather than a generic "Back".
        <Link to="/">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
            {tenant?.branding.name ?? "Home"}
          </Button>
        </Link>
      )}
      <span className="text-sm font-semibold text-kumo-strong">{title}</span>
      {children && <div className="flex items-center gap-1">{children}</div>}
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          shape="square"
          icon={mode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggle}
        />
      </div>
    </header>
  );
}
