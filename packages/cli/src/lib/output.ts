export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(rows: Record<string, unknown>[], columns?: string[]): void {
  if (rows.length === 0) {
    console.log("(no results)");
    return;
  }

  const cols = columns ?? Object.keys(rows[0]!);
  const widths = cols.map((col) => {
    const maxVal = rows.reduce(
      (max, row) => Math.max(max, String(row[col] ?? "").length),
      col.length,
    );
    return Math.min(maxVal, 40);
  });

  const header = cols.map((c, i) => c.toUpperCase().padEnd(widths[i]!)).join("  ");
  const separator = widths.map((w) => "-".repeat(w)).join("  ");

  console.log(header);
  console.log(separator);

  for (const row of rows) {
    const line = cols
      .map((c, i) => {
        const val = String(row[c] ?? "");
        return val.length > widths[i]! ? val.slice(0, widths[i]! - 1) + "…" : val.padEnd(widths[i]!);
      })
      .join("  ");
    console.log(line);
  }
}

export function printKeyValue(obj: Record<string, unknown>): void {
  const maxKey = Object.keys(obj).reduce((max, k) => Math.max(max, k.length), 0);
  for (const [key, value] of Object.entries(obj)) {
    console.log(`${key.padEnd(maxKey)}  ${value ?? "(none)"}`);
  }
}

export function output(data: unknown, json: boolean): void {
  if (json) {
    printJson(data);
  } else if (Array.isArray(data)) {
    printTable(data as Record<string, unknown>[]);
  } else if (typeof data === "object" && data !== null) {
    printKeyValue(data as Record<string, unknown>);
  } else {
    console.log(data);
  }
}
