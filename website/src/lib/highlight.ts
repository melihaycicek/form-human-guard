import { codeToHtml } from "shiki";

/**
 * Server-side syntax highlighting with dual themes. Colors are emitted as
 * --shiki-light/--shiki-dark CSS variables; globals.css switches them with
 * the `.dark` class so code stays legible in both site themes.
 */
export async function highlight(code: string, lang: string): Promise<string> {
  return codeToHtml(code.trim(), {
    lang,
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    defaultColor: false,
  });
}
