import { Badge, Button, Meter, Surface, Table, Text } from "@cloudflare/kumo";
import { ArrowUpRight, TrendDown, TrendUp } from "@phosphor-icons/react";

// Demo application data (ADR 006 taxonomy) — replaced when a real CRM/analytics
// module lands. Kept so the dashboard has a landing page meanwhile.
const metrics = [
  { label: "Total Users", value: "2,847", delta: "+12%", up: true, sub: "vs last month", meter: 71 },
  { label: "Conversion",  value: "4.2%",  delta: "+0.8%", up: true, sub: "vs last month", meter: 42 },
  { label: "Revenue",     value: "$18,490", delta: "+23%", up: true, sub: "vs last month", meter: 62 },
  { label: "Churn Rate",  value: "1.4%",  delta: "-0.3%", up: false, sub: "vs last month", meter: 14 },
];

const leads = [
  { name: "Alice Martin", company: "Acme Corp",     status: "active",  date: "Jun 22", value: "$4,200" },
  { name: "Bob Chen",     company: "Tech Inc",      status: "pending", date: "Jun 21", value: "$1,800" },
  { name: "Carol James",  company: "StartupXY",     status: "closed",  date: "Jun 20", value: "$9,000" },
  { name: "David Kim",    company: "CloudCo",       status: "active",  date: "Jun 19", value: "$3,400" },
  { name: "Eva Rossi",    company: "Design Studio", status: "pending", date: "Jun 18", value: "$2,100" },
];

const statusVariant = {
  active:  "success",
  pending: "warning",
  closed:  "neutral",
} as const;

export function Overview() {
  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <Text as="h1" variant="heading2">Overview</Text>
          <Text variant="secondary" size="xs">June 2025 · All time</Text>
        </div>
        <Button variant="secondary" size="sm" icon={<ArrowUpRight size={13} />}>Export</Button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        {metrics.map((m) => (
          <Surface key={m.label} className="rounded-lg border border-kumo-line p-4">
            <Text variant="secondary" size="xs" DANGEROUS_className="mb-1">{m.label}</Text>
            <Text as="p" variant="heading3" DANGEROUS_className="mb-1">{m.value}</Text>
            <div className="flex items-center gap-1.5 mb-3">
              {m.up
                ? <TrendUp size={12} className="text-kumo-success" />
                : <TrendDown size={12} className="text-kumo-danger" />
              }
              <Text as="span" variant="secondary" size="xs"
                DANGEROUS_className={m.up ? "text-kumo-success" : "text-kumo-danger"}>
                {m.delta}
              </Text>
              <Text variant="secondary" size="xs">{m.sub}</Text>
            </div>
            <Meter label={m.label} value={m.meter} />
          </Surface>
        ))}
      </div>

      <Surface className="rounded-lg border border-kumo-line overflow-hidden">
        <div className="flex items-center justify-between px-4 h-10 border-b border-kumo-line">
          <Text as="h3" variant="body" bold>Recent Leads</Text>
          <Button variant="ghost" size="sm">View all</Button>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Company</Table.Head>
              <Table.Head>Value</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Date</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {leads.map((l) => (
              <Table.Row key={l.name} className="cursor-pointer hover:bg-kumo-elevated">
                <Table.Cell>
                  <Text as="span" variant="body" bold>{l.name}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text as="span" variant="secondary" size="sm">{l.company}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text as="span" variant="body">{l.value}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    variant={statusVariant[l.status as keyof typeof statusVariant]}
                    appearance="dot"
                  >
                    {l.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text as="span" variant="secondary" size="sm">{l.date}</Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Surface>
    </>
  );
}
