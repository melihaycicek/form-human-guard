import { getTranslations } from "next-intl/server";
import { CopyButton } from "@/components/ui/CopyButton";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tabs } from "@/components/ui/Tabs";
import { expressSnippet, nextSnippet, reactSnippet } from "@/lib/code-snippets";
import { highlight } from "@/lib/highlight";
import { GITHUB_URL } from "@/lib/site";

function CodeCard({ html, raw }: { html: string; raw: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-edge bg-card">
      <div className="absolute right-3 top-3 z-10">
        <CopyButton text={raw} />
      </div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export async function CodeSection() {
  const t = await getTranslations("code");
  const [reactHtml, nextHtml, expressHtml] = await Promise.all([
    highlight(reactSnippet, "tsx"),
    highlight(nextSnippet, "ts"),
    highlight(expressSnippet, "ts"),
  ]);

  return (
    <section aria-labelledby="code-heading" className="border-t border-edge">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <SectionHeading kicker={t("kicker")} title={t("heading")} lead={t("lead")} id="code-heading" />
        <div className="mt-10">
          <Tabs
            ariaLabel={t("heading")}
            items={[
              {
                id: "react",
                label: "React",
                content: <CodeCard html={reactHtml} raw={reactSnippet} />,
              },
              {
                id: "next",
                label: "Next.js",
                content: (
                  <div>
                    <CodeCard html={nextHtml} raw={nextSnippet} />
                    <p className="mt-3 text-sm text-muted">
                      {t("nextNote")}{" "}
                      <a
                        href={GITHUB_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent underline underline-offset-4"
                      >
                        {t("viewSource")}
                      </a>
                    </p>
                  </div>
                ),
              },
              {
                id: "express",
                label: "Express",
                content: <CodeCard html={expressHtml} raw={expressSnippet} />,
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
