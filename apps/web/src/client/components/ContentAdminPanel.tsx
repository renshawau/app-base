import { Badge, Surface, Table, Text } from "@cloudflare/kumo";
import { useEffect, useState } from "react";

type Entry = {
  slug: string;
  title: string;
  path: string;
  state: "draft" | "scheduled" | "live";
  publish_at: string | null;
  order: number | null;
  tenant: string | null;
  body_html: string;
};

const stateBadge = { live: "success", scheduled: "info", draft: "neutral" } as const;

/**
 * Read-only admin view of one content collection (ADR 008) — the admin
 * represents content, it never owns it. Editing an entry means editing its
 * file (the Source column says where it lives) and committing.
 *   <ContentAdminPanel title="Blog" apiPath="/api/admin/blog/posts" />
 */
export function ContentAdminPanel({ title, apiPath }: { title: string; apiPath: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiPath)
      .then((res) => (res.ok ? (res.json() as Promise<{ entries: Entry[] }>) : Promise.reject(res.status)))
      .then((data) => setEntries(data.entries))
      .catch(() => setEntries([]));
  }, [apiPath]);

  const preview = entries?.find((e) => e.slug === previewSlug) ?? null;

  return (
    <div>
      <div className="mb-5">
        <Text as="h1" variant="heading2">{title}</Text>
        <Text variant="secondary" size="xs">
          All entries — drafts, scheduled, and live. Content is edited in the repo, not here.
        </Text>
      </div>

      <Surface className="rounded-lg border border-kumo-line overflow-hidden">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Title</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Publish date</Table.Head>
              <Table.Head>Source</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(entries ?? []).map((e) => (
              <Table.Row key={e.slug}>
                <Table.Cell>
                  <button
                    type="button"
                    className="text-left cursor-pointer"
                    onClick={() => setPreviewSlug(previewSlug === e.slug ? null : e.slug)}
                  >
                    <Text as="span" variant="body" bold>{e.title}</Text>
                    <Text as="span" variant="secondary" size="xs" DANGEROUS_className="block">{e.slug}</Text>
                  </button>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex gap-1">
                    <Badge variant={stateBadge[e.state]} appearance="dot">{e.state}</Badge>
                    {e.tenant && <Badge variant="neutral">{e.tenant}</Badge>}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Text as="span" variant="secondary" size="sm">
                    {e.publish_at ? new Date(e.publish_at).toLocaleDateString() : "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text as="span" variant="secondary" size="xs" DANGEROUS_className="font-mono">{e.path}</Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        {entries !== null && entries.length === 0 && (
          <div className="p-4">
            <Text variant="secondary" size="sm">No entries.</Text>
          </div>
        )}
      </Surface>

      {preview && (
        <Surface className="rounded-lg border border-kumo-line mt-4 p-5">
          <div className="mb-3">
            <Text as="h2" variant="heading3">{preview.title}</Text>
            <Text variant="secondary" size="xs">Preview — rendered from {preview.path}</Text>
          </div>
          {/* body_html is rendered worker-side from repo markdown; authors are trusted committers */}
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: preview.body_html }} />
        </Surface>
      )}
    </div>
  );
}
