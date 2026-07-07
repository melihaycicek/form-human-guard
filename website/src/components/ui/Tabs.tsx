"use client";

import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

/** Minimal accessible tabs: roving focus, arrow-key navigation. */
export function Tabs({ items, ariaLabel }: { items: TabItem[]; ariaLabel: string }) {
  const [active, setActive] = useState(items[0]?.id);
  const baseId = useId();
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const delta =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = items[(index + delta + items.length) % items.length]!;
    setActive(next.id);
    tabRefs.current.get(next.id)?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex flex-wrap gap-1 rounded-xl border border-edge bg-surface p-1"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => {
              if (el) tabRefs.current.set(item.id, el);
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.id}`}
            aria-selected={active === item.id}
            aria-controls={`${baseId}-panel-${item.id}`}
            tabIndex={active === item.id ? 0 : -1}
            onClick={() => setActive(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active === item.id
                ? "bg-card text-foreground shadow-sm ring-1 ring-edge"
                : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={active !== item.id}
          className="mt-4"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
