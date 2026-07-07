import { Badge, Text } from "@cloudflare/kumo";
import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { AppHeader } from "../../components/AppHeader";
import { useTenant } from "../../hooks/useTenant";

type Post = {
  slug: string;
  title: string;
  tag: string | null;
  published_at: string;
  body_html: string;
};

export function BlogPostPage() {
  const tenant = useTenant();
  const { slug } = useParams({ strict: false }) as { slug: string };
  const [post, setPost] = useState<Post | null | "missing">(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/blog/${slug}`)
      .then((res) => (res.ok ? (res.json() as Promise<Post>) : Promise.reject(res.status)))
      .then((data) => {
        if (!cancelled) setPost(data);
      })
      .catch(() => {
        if (!cancelled) setPost("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-kumo-canvas flex flex-col">
      <AppHeader back title={tenant ? `${tenant.branding.name} Blog` : "Blog"} />

      <main className="max-w-2xl mx-auto w-full px-6 py-10">
        {post === "missing" && <Text variant="secondary">Post not found.</Text>}
        {post && post !== "missing" && (
          <article>
            <div className="flex items-center gap-3 mb-3">
              {post.tag && <Badge variant="info">{post.tag}</Badge>}
              <Text variant="secondary" size="xs">
                {new Date(post.published_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </div>
            <Text as="h1" variant="heading2" DANGEROUS_className="mb-6">{post.title}</Text>
            {/* body_html is rendered server-side from markdown authored by
                trusted parties (repo committers / role-gated admins). */}
            <div
              className="prose-content text-kumo-default leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:mb-4 [&_pre]:bg-kumo-recessed [&_pre]:border [&_pre]:border-kumo-line [&_pre]:rounded-md [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:text-sm [&_code]:text-sm"
              dangerouslySetInnerHTML={{ __html: post.body_html }}
            />
          </article>
        )}
      </main>
    </div>
  );
}
