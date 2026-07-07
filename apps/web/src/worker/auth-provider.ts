import { cloudflareAccessProvider, devAuthProvider } from "@app-base/auth";

// Swap this to change the authentication provider for the whole app.
// import.meta.env.DEV is replaced at build time, so the dev provider (which
// authenticates everyone as an admin) is statically eliminated from
// production bundles — never gate this on a runtime value.
export const authProvider = import.meta.env.DEV ? devAuthProvider : cloudflareAccessProvider;
