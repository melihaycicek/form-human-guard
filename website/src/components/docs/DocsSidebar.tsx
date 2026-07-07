"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { DocNavItem } from "@/lib/docs";

function NavList({ items, onNavigate }: { items: DocNavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const href = item.slug === "" ? "/docs" : `/docs/${item.slug}`;
        const active = pathname === href;
        return (
          <li key={item.slug}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              {item.title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function DocsSidebar({ items }: { items: DocNavItem[] }) {
  const t = useTranslations("docs");

  return (
    <>
      {/* Mobile drawer */}
      <details className="mb-6 rounded-xl border border-edge bg-card lg:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">
          {t("menu")}
        </summary>
        <nav aria-label={t("navLabel")} className="border-t border-edge p-3">
          <NavList items={items} />
        </nav>
      </details>

      {/* Desktop sidebar */}
      <nav
        aria-label={t("navLabel")}
        className="sticky top-24 hidden max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 lg:block"
      >
        <NavList items={items} />
      </nav>
    </>
  );
}
