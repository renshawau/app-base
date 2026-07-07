import { Badge, Button, Surface, Text } from "@cloudflare/kumo";
import {
  ArrowRight,
  ChartLineUp,
  CheckCircle,
  Code,
  Globe,
  Infinity as InfinityIcon,
  Lightning,
  ShieldCheck,
  type Icon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { AppHeader } from "../../components/AppHeader";
import { useTenant } from "../../hooks/useTenant";

type Dto = {
  slug: string;
  title: string;
  frontmatter: Record<string, unknown>;
  body_html: string;
};

// Content references icons by name (frontmatter is data, not code).
const icons: Record<string, Icon> = {
  Lightning,
  ShieldCheck,
  Globe,
  Infinity: InfinityIcon,
  ChartLineUp,
  Code,
};

type FeatureItem = { icon?: string; label: string; description: string };

const str = (fm: Record<string, unknown>, key: string): string =>
  typeof fm[key] === "string" ? (fm[key] as string) : "";

function Body({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function SitePage() {
  const tenant = useTenant();
  const [sections, setSections] = useState<Record<string, Dto> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pages")
      .then((res) => res.json() as Promise<{ sections: Record<string, Dto> }>)
      .then((d) => {
        if (!cancelled) setSections(d.sections);
      })
      .catch(() => {
        if (!cancelled) setSections({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!sections) return null;
  const hero = sections["hero"];
  const features = sections["features"];
  const included = sections["included"];
  const cta = sections["cta"];

  return (
    <div className="min-h-screen bg-kumo-canvas flex flex-col">
      <AppHeader back title={tenant?.branding.name ?? "Site"} />

      {hero && (
        <section className="max-w-4xl mx-auto w-full px-6 pt-16 pb-14 text-center">
          {str(hero.frontmatter, "badge") && (
            <Badge variant="info" className="mb-5 inline-flex">{str(hero.frontmatter, "badge")}</Badge>
          )}
          <h1 className="text-4xl font-semibold tracking-tight text-kumo-strong mb-3 leading-tight">
            {hero.title}
            <br />
            <span className="text-kumo-brand">{str(hero.frontmatter, "accent")}</span>
          </h1>
          <Body
            html={hero.body_html}
            className="text-kumo-subtle text-sm max-w-md mx-auto mb-8 leading-relaxed"
          />
          <div className="flex items-center justify-center gap-2 mb-4">
            <Button variant="primary" size="sm" icon={<ArrowRight size={13} />}>
              {str(hero.frontmatter, "primary_cta") || "Get started"}
            </Button>
            {str(hero.frontmatter, "secondary_cta") && (
              <Button variant="secondary" size="sm">{str(hero.frontmatter, "secondary_cta")}</Button>
            )}
          </div>
          {str(hero.frontmatter, "note") && (
            <Text variant="secondary" size="xs">{str(hero.frontmatter, "note")}</Text>
          )}
        </section>
      )}

      {features && (
        <>
          <div className="border-t border-kumo-line" />
          <section className="max-w-4xl mx-auto w-full px-6 py-10">
            <Text as="h2" variant="heading3" DANGEROUS_className="mb-1">{features.title}</Text>
            <Body html={features.body_html} className="text-kumo-subtle text-sm mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {((features.frontmatter.items as FeatureItem[] | undefined) ?? []).map((item) => {
                const ItemIcon = (item.icon && icons[item.icon]) || Lightning;
                return (
                  <Surface
                    key={item.label}
                    className="rounded-lg border border-kumo-line p-4 hover:border-kumo-brand transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-kumo-recessed flex items-center justify-center mb-3">
                      <ItemIcon size={14} weight="duotone" className="text-kumo-default" />
                    </div>
                    <Text as="h3" variant="body" bold DANGEROUS_className="mb-1">{item.label}</Text>
                    <Text variant="secondary" size="sm" DANGEROUS_className="leading-relaxed">
                      {item.description}
                    </Text>
                  </Surface>
                );
              })}
            </div>
          </section>
        </>
      )}

      {included && (
        <>
          <div className="border-t border-kumo-line" />
          <section className="max-w-4xl mx-auto w-full px-6 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div>
                {str(included.frontmatter, "badge") && (
                  <Badge variant="success" className="mb-3">{str(included.frontmatter, "badge")}</Badge>
                )}
                <Text as="h2" variant="heading3" DANGEROUS_className="mb-2">{included.title}</Text>
                <Body html={included.body_html} className="text-kumo-subtle text-sm mb-5 leading-relaxed" />
                {str(included.frontmatter, "button") && (
                  <Button variant="primary" size="sm">{str(included.frontmatter, "button")}</Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {((included.frontmatter.items as string[] | undefined) ?? []).map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle size={14} weight="fill" className="text-kumo-success shrink-0" />
                    <Text as="span" variant="secondary" size="sm">{item}</Text>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {cta && (
        <>
          <div className="border-t border-kumo-line" />
          <section className="max-w-4xl mx-auto w-full px-6 py-12 text-center">
            <Text as="h2" variant="heading3" DANGEROUS_className="mb-2">{cta.title}</Text>
            <Body html={cta.body_html} className="text-kumo-subtle text-sm mb-6" />
            <div className="flex items-center justify-center gap-2">
              <Button variant="primary" size="sm" icon={<ArrowRight size={13} />}>
                {str(cta.frontmatter, "primary_cta") || "Get started"}
              </Button>
              {str(cta.frontmatter, "secondary_cta") && (
                <Button variant="secondary" size="sm">{str(cta.frontmatter, "secondary_cta")}</Button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
