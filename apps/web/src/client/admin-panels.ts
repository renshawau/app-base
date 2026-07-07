import type { AdminPanel } from "./admin-panel";
import { adminPanel as blogAdminPanel } from "./modules/blog";
import { adminPanel as portfolioAdminPanel } from "./modules/portfolio";
import { adminPanel as pagesAdminPanel } from "./modules/pages";

// Base-owned registry of module admin panels, consumed by the dashboard
// module (nav + child routes). Modules never import each other — this file
// is the mediator (ADR 007). Importing a panel entry pulls only its
// metadata; the component stays behind the entry's dynamic import.
export const adminPanels: AdminPanel[] = [blogAdminPanel, pagesAdminPanel, portfolioAdminPanel];
