import { ContentAdminPanel } from "../../components/ContentAdminPanel";

export function Panel() {
  return (
    <div className="flex flex-col gap-10">
      <ContentAdminPanel title="Sections" apiPath="/api/admin/pages/sections" />
      <ContentAdminPanel title="Pages" apiPath="/api/admin/pages/pages" />
    </div>
  );
}
