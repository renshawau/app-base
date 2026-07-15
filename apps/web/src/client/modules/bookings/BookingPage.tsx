import { Text } from "@cloudflare/kumo";
import { BookingFlow } from "../../components/BookingFlow";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { useTenant } from "../../hooks/useTenant";

export function BookingPage() {
  const tenant = useTenant();

  return (
    <div className="min-h-screen bg-kumo-canvas flex flex-col">
      <SiteHeader />

      <main className="max-w-2xl mx-auto w-full px-6 py-10 flex-1">
        <Text as="h1" variant="heading2" DANGEROUS_className="mb-2">Book a consult</Text>
        <Text variant="secondary" size="sm" DANGEROUS_className="mb-8 block">
          {tenant ? `Book time with ${tenant.branding.name} — pick a service and a slot that suits.` : ""}
        </Text>
        <BookingFlow />
      </main>

      <SiteFooter />
    </div>
  );
}
