import { Text } from "@cloudflare/kumo";
import { useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

type Dto = {
  slug: string;
  title: string;
  frontmatter: Record<string, unknown>;
  body_html: string;
};

// A standalone content-backed page (pages module, "pages" collection),
// rendered at <mount>/<slug>. Layout stays minimal: title + prose body.
export function StaticPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const [page, setPage] = useState<Dto | null | "missing">(null);

  useEffect(() => {
    let cancelled = false;
    setPage(null);
    fetch(`/api/pages/page/${slug}`)
      .then((res) => (res.ok ? (res.json() as Promise<Dto>) : Promise.reject(res.status)))
      .then((d) => {
        if (!cancelled) setPage(d);
      })
      .catch(() => {
        if (!cancelled) setPage("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-kumo-canvas flex flex-col">
      <SiteHeader />

      <main className="max-w-2xl mx-auto w-full px-6 py-10 flex-1">
        {page === "missing" && <Text variant="secondary">Page not found.</Text>}
        {page && page !== "missing" && (
          <article>
            <Text as="h1" variant="heading2" DANGEROUS_className="mb-6">{page.title}</Text>
            {/* body_html is rendered worker-side from repo markdown; authors are trusted committers */}
            <div
              className="prose-content text-kumo-default leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: page.body_html }}
            />
          </article>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
