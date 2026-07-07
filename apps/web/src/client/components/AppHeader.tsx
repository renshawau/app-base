import { Link } from "@tanstack/react-router";
import { Button } from "@cloudflare/kumo";
import { ArrowLeft, Moon, Sun } from "@phosphor-icons/react";
import { useDarkMode } from "../hooks/useDarkMode";

interface AppHeaderProps {
  back?: boolean;
  title: string;
  children?: React.ReactNode;
}

export function AppHeader({ back, title, children }: AppHeaderProps) {
  const { mode, toggle } = useDarkMode();

  return (
    <header className="h-12 border-b border-kumo-line bg-kumo-base flex items-center gap-2 px-4 shrink-0">
      {back && (
        <Link to="/">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
            Templates
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
