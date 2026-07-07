import { ContentAdminPanel } from "../../components/ContentAdminPanel";

export function Panel() {
  return <ContentAdminPanel title="Blog" apiPath="/api/admin/blog/posts" />;
}
