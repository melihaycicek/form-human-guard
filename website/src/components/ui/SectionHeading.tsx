import { ArrowMark } from "@/components/site/ArrowMark";

interface SectionHeadingProps {
  kicker: string;
  title: string;
  lead?: string;
  id?: string;
}

export function SectionHeading({ kicker, title, lead, id }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl">
      <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-accent">
        <ArrowMark size={16} />
        {kicker}
      </p>
      <h2 id={id} className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {lead ? <p className="mt-4 text-base text-muted sm:text-lg">{lead}</p> : null}
    </div>
  );
}
