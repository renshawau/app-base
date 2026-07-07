// The Vite plugin writes its deploy-config redirect at the Vite root
// (apps/web/.wrangler/deploy/config.json), but wrangler only honors a
// redirect that sits next to the user config — which lives at the repo
// root so the Deploy to Cloudflare button can detect it (ADR 005).
// This script translates the plugin's redirect to the root. Run it after
// `pnpm build`, before `wrangler deploy`.
import fs from "node:fs";
import path from "node:path";

const source = "apps/web/.wrangler/deploy/config.json";
const target = ".wrangler/deploy/config.json";

const redirect = JSON.parse(fs.readFileSync(source, "utf8"));
const retarget = (p) =>
  path.relative(path.dirname(target), path.join(path.dirname(source), p));

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(
  target,
  JSON.stringify({
    ...redirect,
    configPath: retarget(redirect.configPath),
    auxiliaryWorkers: (redirect.auxiliaryWorkers ?? []).map((w) => ({
      ...w,
      configPath: retarget(w.configPath),
    })),
  })
);
console.log(`wrote ${target} → ${retarget(redirect.configPath)}`);
