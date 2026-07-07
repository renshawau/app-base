import { Badge, Button, Surface, Text } from "@cloudflare/kumo";
import { ArrowRight, RssSimple } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { AppHeader } from "../../components/AppHeader";
import { useTenant } from "../../hooks/useTenant";
import { moduleMeta } from "../../../modules";

const base = moduleMeta.blog.mount.path;

type PostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  tag: string | null;
  published_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function BlogPage() {
  const tenant = useTenant();
  const [posts, setPosts] = useState<PostSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/blog")
      .then((res) => res.json() as Promise<{ posts: PostSummary[] }>)
      .then((data) => {
        if (!cancelled) setPosts(data.posts);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [featured, ...rest] = posts ?? [];

  return (
    <div className="min-h-screen bg-kumo-canvas flex flex-col">
      <AppHeader back title={tenant ? `${tenant.branding.name} Blog` : "Blog"}>
        <Button variant="ghost" size="sm" shape="square" icon={<RssSimple size={14} />} title="RSS" aria-label="RSS" />
      </AppHeader>

      <main className="max-w-3xl mx-auto w-full px-6 py-8 flex flex-col gap-6">
        {featured && (
          <a href={`${base}/${featured.slug}`} className="block group">
            <Surface className="rounded-lg border border-kumo-line overflow-hidden hover:border-kumo-brand transition-colors">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  {featured.tag && <Badge variant="info">{featured.tag}</Badge>}
                  <Text variant="secondary" size="xs">{formatDate(featured.published_at)}</Text>
                </div>
                <Text
                  as="h2"
                  variant="heading3"
                  DANGEROUS_className="mb-2 group-hover:text-kumo-brand transition-colors"
                >
                  {featured.title}
                </Text>
                <Text variant="secondary" size="sm" DANGEROUS_className="mb-4 leading-relaxed">
                  {featured.excerpt}
                </Text>
                <Button variant="primary" size="sm" icon={<ArrowRight size={13} />}>
                  Read article
                </Button>
              </div>
            </Surface>
          </a>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {rest.map((p) => (
            <a key={p.slug} href={`${base}/${p.slug}`} className="block group">
              <Surface className="h-full rounded-lg border border-kumo-line p-4 hover:border-kumo-brand transition-colors flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  {p.tag && <Badge variant="info" className="text-xs">{p.tag}</Badge>}
                </div>
                <Text
                  as="h3"
                  variant="body"
                  bold
                  DANGEROUS_className="mb-2 leading-snug group-hover:text-kumo-brand transition-colors"
                >
                  {p.title}
                </Text>
                <Text variant="secondary" size="sm" DANGEROUS_className="mb-3 leading-relaxed line-clamp-3 flex-1">
                  {p.excerpt}
                </Text>
                <div className="pt-3 border-t border-kumo-hairline">
                  <Text variant="secondary" size="xs">{formatDate(p.published_at)}</Text>
                </div>
              </Surface>
            </a>
          ))}
        </div>

        {posts !== null && posts.length === 0 && (
          <Text variant="secondary" size="sm">No posts published yet.</Text>
        )}
      </main>
    </div>
  );
}
