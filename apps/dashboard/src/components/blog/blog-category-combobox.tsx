"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Suggestion = { name: string; slug: string };

export function BlogCategoryCombobox(props: {
  selected: string[];
  onChange: (next: string[]) => void;
  suggestions: Suggestion[];
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v || props.selected.includes(v)) return;
    props.onChange([...props.selected, v]);
    setDraft("");
    setOpen(false);
  };

  const names = React.useMemo(() => {
    const s = new Set<string>();
    for (const x of props.suggestions) s.add(x.name);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [props.suggestions]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {props.selected.map((cat, i) => (
          <span
            key={`${cat}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            {cat}
            <button
              type="button"
              className="ml-0.5 rounded-sm text-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => props.onChange(props.selected.filter((_, j) => j !== i))}
              aria-label={`Remove ${cat}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={props.disabled}
            className="h-8 w-full justify-between gap-2 font-normal sm:max-w-md"
          >
            <span className="truncate text-muted-foreground">Add category…</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 sm:w-[400px]" align="start">
          <Command>
            <CommandInput
              placeholder="Search or type a new category…"
              value={draft}
              onValueChange={setDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add(draft);
                }
              }}
            />
            <CommandList>
              <CommandEmpty className="py-3 text-xs text-muted-foreground">
                {draft.trim()
                  ? "Press Enter to add this label, or pick a suggestion below."
                  : "Type a new category and press Enter, or choose from the list."}
              </CommandEmpty>
              {names.length > 0 ? (
                <CommandGroup heading="Used in this organization">
                  {names
                    .filter((n) => !props.selected.includes(n))
                    .map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={() => add(name)}
                      >
                        <Check
                          className={cn("mr-2 h-4 w-4", props.selected.includes(name) ? "opacity-100" : "opacity-0")}
                        />
                        {name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        Pick a label others have used, or type a new one and press Enter.
      </p>
    </div>
  );
}
