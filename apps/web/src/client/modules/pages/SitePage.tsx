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
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

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

function Body({ html, className, style }: { html: string; className?: string; style?: React.CSSProperties }) {
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

// Rotating hero headline (site brief: white text cycling through messages).
// Driven by the hero section's `messages` frontmatter list; a single message
// (or none) renders statically.
function RotatingHeadline({ messages, fallback }: { messages: string[]; fallback: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (messages.length < 2) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 400);
    }, 4500);
    return () => clearInterval(timer);
  }, [messages.length]);

  if (messages.length === 0) return <>{fallback}</>;
  return (
    <span
      className="transition-opacity duration-400"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {messages[index]}
    </span>
  );
}

// Full-bleed rotating hero background (hero frontmatter `background_images`).
// Images crossfade behind the band's content; --site-hero-overlay tints them
// for text legibility (e.g. a translucent brand green).
function RotatingBackground({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), 6000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div aria-hidden className="absolute inset-0">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{ background: "var(--site-hero-overlay, transparent)" }}
      />
    </div>
  );
}

export function SitePage() {
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

  const heroMessages = hero ? ((hero.frontmatter.messages as string[] | undefined) ?? []) : [];
  const heroImage = hero ? str(hero.frontmatter, "image") : "";
  const heroBgImages = hero ? ((hero.frontmatter.background_images as string[] | undefined) ?? []) : [];

  return (
    <div className="min-h-screen bg-kumo-canvas flex flex-col">
      <SiteHeader />

      {hero && (
        // The hero band: full-width, site-themable (--site-hero-*), with an
        // optional right-hand image, rotating headline (site brief item 4),
        // and optional full-bleed rotating background images.
        <section
          className="relative overflow-hidden"
          style={{
            background: "var(--site-hero-bg, transparent)",
            color: "var(--site-hero-fg, inherit)",
          }}
        >
          {heroBgImages.length > 0 && <RotatingBackground images={heroBgImages} />}
          <div
            className={`relative z-10 max-w-5xl mx-auto w-full px-6 pt-16 pb-14 ${
              heroImage
                ? "grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-10 items-center text-left"
                : "text-center"
            }`}
          >
            <div>
              {str(hero.frontmatter, "badge") && (
                <Badge variant="info" className="mb-5 inline-flex">{str(hero.frontmatter, "badge")}</Badge>
              )}
              <h1 className="text-4xl font-semibold tracking-tight mb-3 leading-tight min-h-[2.4em]">
                <RotatingHeadline
                  messages={heroMessages}
                  fallback={
                    <>
                      {hero.title}
                      <br />
                      <span style={{ color: "var(--site-hero-accent, var(--color-kumo-brand))" }}>
                        {str(hero.frontmatter, "accent")}
                      </span>
                    </>
                  }
                />
              </h1>
              <Body
                html={hero.body_html}
                className={`text-sm mb-8 leading-relaxed max-w-md ${heroImage ? "" : "mx-auto"}`}
                style={{ opacity: 0.85 }}
              />
              <div className={`flex items-center gap-2 mb-4 ${heroImage ? "" : "justify-center"}`}>
                <a
                  href={str(hero.frontmatter, "primary_cta_href") || "#"}
                  className="rounded-md px-4 py-2 text-sm font-medium"
                  style={{
                    background: "var(--site-hero-cta-bg, var(--color-kumo-brand))",
                    color: "var(--site-hero-cta-fg, #fff)",
                  }}
                >
                  {str(hero.frontmatter, "primary_cta") || "Get started"}
                </a>
                {str(hero.frontmatter, "secondary_cta") && (
                  <a
                    href={str(hero.frontmatter, "secondary_cta_href") || "#"}
                    className="rounded-md px-4 py-2 text-sm font-medium border border-current"
                  >
                    {str(hero.frontmatter, "secondary_cta")}
                  </a>
                )}
              </div>
              {str(hero.frontmatter, "note") && (
                <p className="text-xs" style={{ opacity: 0.7 }}>{str(hero.frontmatter, "note")}</p>
              )}
            </div>
            {heroImage && (
              <img
                src={heroImage}
                alt=""
                className="w-full max-w-xs mx-auto md:mx-0 md:justify-self-end"
              />
            )}
          </div>
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

      <SiteFooter />
    </div>
  );
}
