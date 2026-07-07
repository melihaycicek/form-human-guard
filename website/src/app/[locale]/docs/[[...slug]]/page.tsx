import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { getTranslations, setRequestLocale } from "next-intl/server";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { mdxComponents } from "@/components/docs/mdx-components";
import {
  docsNav,
  extractToc,
  getDocSource,
  isValidDocSlug,
  prevNext,
} from "@/lib/docs";
import { buildLanguageAlternates, canonicalUrl } from "@/lib/site";

interface DocsPageParams {
  locale: string;
  slug?: string[];
}

interface Frontmatter {
  title: string;
  description?: string;
}

export function generateStaticParams(): { slug?: string[] }[] {
  return docsNav.map((item) => ({
    slug: item.slug === "" ? undefined : [item.slug],
  }));
}

export const dynamicParams = false;

function slugFromParams(slug?: string[]): string {
  return (slug ?? []).join("/");
}

const prettyCodeOptions = {
  theme: {
    light: "github-light",
    dark: "github-dark",
  },
  defaultLang: "ts",
  keepBackground: false,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<DocsPageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const docSlug = slugFromParams(slug);
  const doc = await getDocSource(locale, docSlug);
  if (!doc) return {};
  const { frontmatter } = await compileMDX<Frontmatter>({
    source: doc.source,
    options: { parseFrontmatter: true },
  });
  const docPath = docSlug === "" ? "/docs" : `/docs/${docSlug}`;
  return {
    title: frontmatter.title,
    description: frontmatter.description,
    alternates: {
      canonical: canonicalUrl(locale, docPath),
      languages: buildLanguageAlternates(docPath),
    },
  };
}

export default async function DocsPage({
  params,
}: {
  params: Promise<DocsPageParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const docSlug = slugFromParams(slug);
  if (!isValidDocSlug(docSlug)) notFound();

  const doc = await getDocSource(locale, docSlug);
  if (!doc) notFound();

  const t = await getTranslations("docs");
  const { content, frontmatter } = await compileMDX<Frontmatter>({
    source: doc.source,
    components: mdxComponents,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
      },
    },
  });
  const toc = extractToc(doc.source.replace(/^---[\s\S]*?---/, ""));
  const { prev, next } = prevNext(docSlug);

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-10">
      <article className="prose-docs min-w-0">
        {locale !== routing.defaultLocale && doc.fallbackToEnglish && (
          <p className="mb-6 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
            {t("englishOnly")}
          </p>
        )}
        <h1>{frontmatter.title}</h1>
        {content}

        <nav aria-label={t("pagination")} className="mt-12 flex gap-3 border-t border-edge pt-6">
          {prev && (
            <Link
              href={prev.slug === "" ? "/docs" : `/docs/${prev.slug}`}
              className="flex-1 rounded-xl border border-edge p-4 !no-underline transition-colors hover:bg-surface"
            >
              <span className="block text-xs text-muted">← {t("prev")}</span>
              <span className="mt-1 block text-sm font-semibold !text-foreground">{prev.title}</span>
            </Link>
          )}
          {next && (
            <Link
              href={`/docs/${next.slug}`}
              className="flex-1 rounded-xl border border-edge p-4 text-right !no-underline transition-colors hover:bg-surface"
            >
              <span className="block text-xs text-muted">{t("next")} →</span>
              <span className="mt-1 block text-sm font-semibold !text-foreground">{next.title}</span>
            </Link>
          )}
        </nav>
      </article>

      {toc.length > 1 && (
        <nav aria-label={t("onThisPage")} className="sticky top-24 hidden max-h-[calc(100vh-8rem)] self-start overflow-y-auto xl:block">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("onThisPage")}
          </h2>
          <ul className="mt-3 space-y-1.5 border-l border-edge">
            {toc.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className={`block border-l-2 border-transparent py-0.5 text-[13px] text-muted transition-colors hover:border-accent hover:text-foreground ${
                    entry.level === 3 ? "pl-7" : "pl-4"
                  }`}
                >
                  {entry.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
