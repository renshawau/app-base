import { Link } from "@tanstack/react-router";
import { Button, Badge, Surface, Text } from "@cloudflare/kumo";
import {
  User,
  BookOpen,
  ChartBar,
  Globe,
  ArrowRight,
  CloudLightning,
} from "@phosphor-icons/react";
import { AppHeader } from "../components/AppHeader";

const templates = [
  {
    icon: User,
    label: "Portfolio",
    badge: "orange" as const,
    description: "Showcase your work, skills, and story. Built for developers, designers, and creatives.",
    path: "/portfolio",
  },
  {
    icon: BookOpen,
    label: "Blog",
    badge: "blue" as const,
    description: "A clean writing platform with featured posts, tags, and reading time. MDX-ready.",
    path: "/blog",
  },
  {
    icon: ChartBar,
    label: "Dashboard",
    badge: "purple" as const,
    description: "CRM and analytics views with sidebar navigation, metrics, and data tables.",
    path: "/dashboard",
  },
  {
    icon: Globe,
    label: "Public Site",
    badge: "teal" as const,
    description: "Marketing and product sites with hero, features grid, and conversion-ready CTAs.",
    path: "/site",
  },
] as const;

const stack = [
  "Cloudflare Workers",
  "Hono",
  "React 19",
  "TanStack Router",
  "@cloudflare/kumo",
  "Tailwind CSS 4",
  "TypeScript",
  "pnpm workspaces",
];

export function ShowcasePage() {
  return (
    <div className="min-h-screen bg-kumo-canvas flex flex-col">
      <AppHeader title="app-base">
        <Badge variant="beta">v0.1</Badge>
      </AppHeader>

      {/* Hero */}
      <section className="max-w-4xl mx-auto w-full px-6 pt-16 pb-12">
        <div className="flex items-center gap-2 mb-6">
          <CloudLightning weight="fill" className="text-kumo-brand" size={20} />
          <Text as="span" variant="body" bold>
            app-base
          </Text>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-kumo-strong mb-3 leading-tight">
          Build modern web experiences
          <br />
          <span className="text-kumo-brand">on Cloudflare Workers</span>
        </h1>
        <p className="text-base text-kumo-subtle max-w-xl mb-8 leading-relaxed">
          A reusable, modular platform for portfolios, blogs, dashboards, and
          marketing sites. Deploy once — serve every tenant at the edge.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" icon={<ArrowRight size={13} />}>
            Browse templates
          </Button>
          <Button variant="secondary" size="sm">
            View on GitHub
          </Button>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-kumo-line" />

      {/* Templates grid */}
      <section className="max-w-4xl mx-auto w-full px-6 py-10">
        <Text as="h2" variant="heading3" DANGEROUS_className="mb-1">
          Templates
        </Text>
        <Text variant="secondary" size="sm" DANGEROUS_className="mb-6">
          Each template is production-ready, fully typed, and wired into the same Worker.
        </Text>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Plain anchors: module mount paths are site config (ADR 007), so
              they aren't statically known to the typed router. */}
          {templates.map(({ icon: Icon, label, badge, description, path }) => (
            <a key={path} href={path} className="block group">
              <Surface className="h-full p-4 rounded-lg border border-kumo-line hover:border-kumo-brand transition-colors">
                <div className="w-8 h-8 rounded-md bg-kumo-recessed flex items-center justify-center mb-3">
                  <Icon size={16} weight="duotone" className="text-kumo-default" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Text as="h3" variant="body" bold>
                    {label}
                  </Text>
                  <Badge variant={badge} className="text-xs">
                    template
                  </Badge>
                </div>
                <Text variant="secondary" size="sm" DANGEROUS_className="mb-3 leading-relaxed">
                  {description}
                </Text>
                <div className="flex items-center gap-1 text-kumo-brand text-xs font-medium">
                  View template
                  <ArrowRight size={12} />
                </div>
              </Surface>
            </a>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <div className="border-t border-kumo-line mt-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Text variant="secondary" size="xs" DANGEROUS_className="mb-3 uppercase tracking-widest font-medium">
            Built with
          </Text>
          <div className="flex flex-wrap gap-1.5">
            {stack.map((tech) => (
              <Badge key={tech} variant="outline">
                {tech}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
