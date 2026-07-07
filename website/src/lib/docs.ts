import fs from "node:fs/promises";
import path from "node:path";

/**
 * Docs navigation + loader. Docs are English-only in v1; the loader looks
 * for a per-locale folder first so translated docs can be dropped into
 * content/docs/<locale>/ later without any route changes.
 */

export interface DocNavItem {
  slug: string;
  title: string;
}

export const docsNav: DocNavItem[] = [
  { slug: "", title: "Introduction" },
  { slug: "getting-started", title: "Getting started" },
  { slug: "react", title: "React components" },
  { slug: "nextjs", title: "Next.js Route Handlers" },
  { slug: "express", title: "Express adapter" },
  { slug: "server", title: "Server utilities" },
  { slug: "stores", title: "Stores" },
  { slug: "theming", title: "Theming" },
  { slug: "risk-scoring", title: "Risk scoring" },
  { slug: "security", title: "Security model" },
  { slug: "error-codes", title: "Error codes" },
];

const CONTENT_ROOT = path.join(process.cwd(), "content", "docs");

function fileFor(slug: string): string {
  return `${slug === "" ? "index" : slug}.mdx`;
}

export interface DocSource {
  source: string;
  /** True when the requested locale had no translation and en was served. */
  fallbackToEnglish: boolean;
}

export async function getDocSource(
  locale: string,
  slug: string
): Promise<DocSource | null> {
  const candidates =
    locale === "en"
      ? [{ dir: "en", fallback: false }]
      : [
          { dir: locale, fallback: false },
          { dir: "en", fallback: true },
        ];

  for (const candidate of candidates) {
    try {
      const source = await fs.readFile(
        path.join(CONTENT_ROOT, candidate.dir, fileFor(slug)),
        "utf8"
      );
      return { source, fallbackToEnglish: candidate.fallback };
    } catch {
      // try next candidate
    }
  }
  return null;
}

export function isValidDocSlug(slug: string): boolean {
  return docsNav.some((item) => item.slug === slug);
}

export function prevNext(slug: string): {
  prev: DocNavItem | null;
  next: DocNavItem | null;
} {
  const index = docsNav.findIndex((item) => item.slug === slug);
  return {
    prev: index > 0 ? docsNav[index - 1]! : null,
    next: index >= 0 && index < docsNav.length - 1 ? docsNav[index + 1]! : null,
  };
}

/** GitHub-style slugs for heading anchors; must match the h2/h3 renderer. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Extract h2/h3 headings for the table of contents (code fences ignored). */
export function extractToc(source: string): TocEntry[] {
  const withoutCode = source.replace(/```[\s\S]*?```/g, "");
  const entries: TocEntry[] = [];
  for (const match of withoutCode.matchAll(/^(#{2,3})\s+(.+)$/gm)) {
    const text = match[2]!.trim().replace(/`/g, "");
    entries.push({
      id: slugifyHeading(match[2]!),
      text,
      level: match[1]!.length === 2 ? 2 : 3,
    });
  }
  return entries;
}
