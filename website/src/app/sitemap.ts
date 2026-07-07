import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { docsNav } from "@/lib/docs";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const paths = [
    "/",
    "/exclusive",
    "/docs",
    ...docsNav.filter((d) => d.slug !== "").map((d) => `/docs/${d.slug}`),
  ];

  const urlFor = (locale: string, path: string) => {
    const suffix = path === "/" ? "" : path;
    return locale === "en" ? `${base}${suffix || "/"}` : `${base}/${locale}${suffix}`;
  };

  return paths.map((path) => ({
    url: urlFor("en", path),
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/exclusive" ? 0.8 : 0.6,
    alternates: {
      languages: Object.fromEntries(
        locales.map((locale) => [locale, urlFor(locale, path)])
      ),
    },
  }));
}
