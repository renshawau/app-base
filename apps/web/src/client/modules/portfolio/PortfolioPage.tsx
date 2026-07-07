import { Badge, Button, Surface, Text } from "@cloudflare/kumo";
import { ArrowUpRight, EnvelopeSimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { AppHeader } from "../../components/AppHeader";

type Dto = {
  slug: string;
  title: string;
  frontmatter: Record<string, unknown>;
  body_html: string;
};

type PortfolioData = { profile: Dto | null; projects: Dto[] };

const str = (fm: Record<string, unknown>, key: string): string =>
  typeof fm[key] === "string" ? (fm[key] as string) : "";
const strs = (fm: Record<string, unknown>, key: string): string[] =>
  Array.isArray(fm[key]) ? (fm[key] as string[]).filter((v) => typeof v === "string") : [];

export function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portfolio")
      .then((res) => res.json() as Promise<PortfolioData>)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ profile: null, projects: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;
  const fm = data.profile?.frontmatter ?? {};
  const skills = strs(fm, "skills");

  return (
    <div className="min-h-screen bg-kumo-canvas flex flex-col">
      <AppHeader back title={data.profile?.title ?? "Portfolio"} />

      {data.profile && (
        <section className="max-w-3xl mx-auto w-full px-6 pt-14 pb-12">
          {str(fm, "availability") && (
            <Badge variant="success" appearance="dot" className="mb-5">
              {str(fm, "availability")}
            </Badge>
          )}
          <h1 className="text-4xl font-semibold tracking-tight text-kumo-strong mb-3 leading-tight">
            {str(fm, "headline")}
            <br />
            <span className="text-kumo-brand">{str(fm, "accent")}</span>
            {str(fm, "suffix")}
          </h1>
          <div
            className="text-kumo-subtle max-w-lg mb-7 leading-relaxed text-sm [&_p]:mb-3"
            dangerouslySetInnerHTML={{ __html: data.profile.body_html }}
          />
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm">View my work</Button>
            <Button variant="secondary" size="sm" icon={<EnvelopeSimple size={14} />}>
              Get in touch
            </Button>
          </div>
        </section>
      )}

      <div className="border-t border-kumo-line" />

      <section className="max-w-3xl mx-auto w-full px-6 py-10">
        <Text as="h2" variant="heading3" DANGEROUS_className="mb-1">Selected work</Text>
        <Text variant="secondary" size="sm" DANGEROUS_className="mb-6">A few recent projects.</Text>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.projects.map((p) => (
            <Surface
              key={p.slug}
              className="rounded-lg border border-kumo-line hover:border-kumo-brand transition-colors group cursor-pointer overflow-hidden"
            >
              <div className="h-28 bg-kumo-recessed border-b border-kumo-line flex items-center justify-center">
                <Text variant="secondary" size="sm">{p.title}</Text>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <Text as="span" variant="body" bold>{p.title}</Text>
                  <ArrowUpRight size={14} className="text-kumo-subtle group-hover:text-kumo-brand transition-colors" />
                </div>
                <Text variant="secondary" size="sm" DANGEROUS_className="mb-3 leading-relaxed">
                  {str(p.frontmatter, "description")}
                </Text>
                <div className="flex flex-wrap gap-1">
                  {strs(p.frontmatter, "tags").map((t) => (
                    <Badge key={t} variant="info" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            </Surface>
          ))}
        </div>
      </section>

      {skills.length > 0 && (
        <>
          <div className="border-t border-kumo-line" />
          <section className="max-w-3xl mx-auto w-full px-6 py-8">
            <Text as="h2" variant="heading3" DANGEROUS_className="mb-4">Technologies</Text>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <Badge key={s} variant="outline">{s}</Badge>
              ))}
            </div>
          </section>
        </>
      )}

      {str(fm, "cta_title") && (
        <>
          <div className="border-t border-kumo-line" />
          <section className="max-w-3xl mx-auto w-full px-6 py-10">
            <Text as="h2" variant="heading3" DANGEROUS_className="mb-1">{str(fm, "cta_title")}</Text>
            <Text variant="secondary" size="sm" DANGEROUS_className="mb-4">{str(fm, "cta_text")}</Text>
            <Button variant="primary" size="sm" icon={<EnvelopeSimple size={14} />}>Say hello</Button>
          </section>
        </>
      )}
    </div>
  );
}
