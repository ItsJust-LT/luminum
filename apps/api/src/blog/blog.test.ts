import { describe, it, expect } from "vitest";
import { parseLiteralProps, readOpenTag } from "./parse-and-validate.js";

// ---------- parseLiteralProps ----------

describe("parseLiteralProps", () => {
  it("parses quoted string attributes", () => {
    const result = parseLiteralProps('src="hello" alt="world"');
    expect(result).toEqual({ src: "hello", alt: "world" });
  });

  it("parses bare boolean attributes", () => {
    const result = parseLiteralProps("disabled");
    expect(result).toEqual({ disabled: true });
  });

  it("coerces bare numbers", () => {
    const result = parseLiteralProps('width=800 height=600');
    expect(result).toEqual({ width: 800, height: 600 });
  });

  it("coerces bare true/false", () => {
    const result = parseLiteralProps("showLineNumbers=true disabled=false");
    expect(result).toEqual({ showLineNumbers: true, disabled: false });
  });

  it("parses a raw JSON object prop", () => {
    const result = parseLiteralProps('items={"title":"Hello","content":"World"}');
    expect(result).toEqual({ items: { title: "Hello", content: "World" } });
  });

  it("parses a raw JSON array prop", () => {
    const result = parseLiteralProps('items=[{"title":"A"},{"title":"B"}]');
    expect(result).toEqual({ items: [{ title: "A" }, { title: "B" }] });
  });

  it("handles JSON with nested braces", () => {
    const result = parseLiteralProps('data={"a":{"b":1},"c":[1,2]}');
    expect(result).toEqual({ data: { a: { b: 1 }, c: [1, 2] } });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseLiteralProps("items={not valid json}")).toThrow("Invalid JSON");
  });

  it("throws on unbalanced braces", () => {
    expect(() => parseLiteralProps("items={")).toThrow("Unbalanced");
  });

  it("mixes scalar and JSON props", () => {
    const result = parseLiteralProps('label="Hi" columns=3 items=[{"src":"a.jpg"}]');
    expect(result).toEqual({
      label: "Hi",
      columns: 3,
      items: [{ src: "a.jpg" }],
    });
  });

  it("handles JSON strings with escaped quotes", () => {
    const result = parseLiteralProps('data={"key":"val\\"ue"}');
    expect(result).toEqual({ data: { key: 'val"ue' } });
  });
});

// ---------- readOpenTag ----------

describe("readOpenTag", () => {
  it("reads a simple self-closing tag", () => {
    const r = readOpenTag("<Image src=\"test\" />", 0);
    expect(r).not.toBeNull();
    expect(r!.name).toBe("Image");
    expect(r!.selfClose).toBe(true);
  });

  it("reads an open tag", () => {
    const r = readOpenTag("<Callout variant=\"info\">content</Callout>", 0);
    expect(r).not.toBeNull();
    expect(r!.name).toBe("Callout");
    expect(r!.selfClose).toBe(false);
  });

  it("ignores non-uppercase tags", () => {
    const r = readOpenTag("<div>hello</div>", 0);
    expect(r).toBeNull();
  });

  it("handles JSON props in braces", () => {
    const r = readOpenTag('<Accordion items=[{"title":"A"}] />', 0);
    expect(r).not.toBeNull();
    expect(r!.name).toBe("Accordion");
    expect(r!.selfClose).toBe(true);
    expect(r!.attrString).toContain("[{");
  });

  it("handles nested JSON object props", () => {
    const r = readOpenTag('<Gallery images=[{"src":"a","meta":{"w":100}}] columns=3 />', 0);
    expect(r).not.toBeNull();
    expect(r!.selfClose).toBe(true);
    expect(r!.attrString).toContain('"meta":{"w":100}');
  });
});

// ---------- prop schema validation (via import) ----------

describe("prop schema validation", () => {
  it("accepts valid Accordion JSON prop", () => {
    const props = parseLiteralProps('items=[{"title":"A","content":"B"}]');
    expect(typeof props.items).toBe("object");
    expect(Array.isArray(props.items)).toBe(true);
  });

  it("accepts valid Gallery JSON prop", () => {
    const props = parseLiteralProps('images=[{"src":"a.jpg","alt":"desc"}] columns=3');
    expect(Array.isArray(props.images)).toBe(true);
    expect(props.columns).toBe(3);
  });

  it("rejects non-object for json type when validated", () => {
    const props = parseLiteralProps('items="notjson"');
    expect(typeof props.items).toBe("string");
  });
});
