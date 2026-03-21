/** Match API `slugify` in apps/api blog routes — URL segment from title. */
export function slugifyFromTitle(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
  return s || "post";
}
