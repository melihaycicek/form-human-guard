import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale detection + redirects. API routes, static assets, and files are
// excluded — the guard endpoints must never be rewritten or localized.
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
