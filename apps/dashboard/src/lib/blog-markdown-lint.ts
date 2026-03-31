/**
 * Lightweight client-side checks before/ alongside API validation (non-blocking hints).
 */
export function quickLintBlogMarkdown(markdown: string): string[] {
  const hints: string[] = [];
  if (!markdown.trim()) return hints;

  const fenceMatches = markdown.match(/^```/gm);
  const fenceCount = fenceMatches?.length ?? 0;
  if (fenceCount % 2 !== 0) {
    hints.push("Unclosed fenced code block — check ``` pairs.");
  }

  const lines = markdown.split("\n");
  let h1 = 0;
  for (const line of lines) {
    if (/^#\s/.test(line)) h1 += 1;
  }
  if (h1 > 1) {
    hints.push("Multiple H1 headings — consider a single title per post.");
  }

  return hints;
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
