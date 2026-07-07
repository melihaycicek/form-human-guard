import type { ComponentProps, ReactNode } from "react";
import { slugifyHeading } from "@/lib/docs";

function textOf(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(textOf).join("");
  if (children && typeof children === "object" && "props" in children) {
    return textOf((children.props as { children?: ReactNode }).children);
  }
  return "";
}

function Heading({
  level,
  children,
  ...rest
}: { level: 2 | 3; children?: ReactNode } & ComponentProps<"h2">) {
  const id = slugifyHeading(textOf(children));
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag id={id} {...rest}>
      <a href={`#${id}`} className="!text-inherit !no-underline hover:!text-accent">
        {children}
      </a>
    </Tag>
  );
}

/** MDX renderers: anchored headings + horizontally-scrollable tables. */
export const mdxComponents = {
  h2: (props: ComponentProps<"h2">) => <Heading level={2} {...props} />,
  h3: (props: ComponentProps<"h3">) => <Heading level={3} {...props} />,
  table: (props: ComponentProps<"table">) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
};
