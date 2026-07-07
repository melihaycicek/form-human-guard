import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { docsNav } from "@/lib/docs";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <DocsSidebar items={docsNav} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
