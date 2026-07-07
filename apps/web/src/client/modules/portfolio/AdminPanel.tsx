import { ContentAdminPanel } from "../../components/ContentAdminPanel";

export function Panel() {
  return (
    <div className="flex flex-col gap-10">
      <ContentAdminPanel title="Projects" apiPath="/api/admin/portfolio/projects" />
      <ContentAdminPanel title="Profile" apiPath="/api/admin/portfolio/profile" />
    </div>
  );
}
