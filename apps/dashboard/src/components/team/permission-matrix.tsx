"use client"

import type { PermissionDefinition } from "@luminum/org-permissions"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { addPermissionWithDependencies, removePermissionAndPrune } from "@/lib/team/permission-ui"

function groupDefinitions(defs: readonly PermissionDefinition[]) {
  const m = new Map<string, PermissionDefinition[]>()
  for (const d of defs) {
    const g = d.group || "Other"
    if (!m.has(g)) m.set(g, [])
    m.get(g)!.push(d)
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export function PermissionMatrix({
  definitions,
  selected,
  onChange,
  disabled,
  idPrefix = "perm",
}: {
  definitions: readonly PermissionDefinition[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  disabled?: boolean
  idPrefix?: string
}) {
  const groups = groupDefinitions(definitions)

  return (
    <div className="space-y-8">
      {groups.map(([group, items]) => (
        <section key={group} className="scroll-mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border/60">
            {group}
          </h3>
          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {items.map((def) => {
              const on = selected.has(def.id)
              return (
                <div
                  key={def.id}
                  className={cn(
                    "flex gap-3 rounded-xl border p-3 sm:p-4 transition-colors",
                    on ? "border-primary/30 bg-primary/[0.04]" : "border-border/60 bg-card/40"
                  )}
                >
                  <Switch
                    id={`${idPrefix}-${def.id}`}
                    checked={on}
                    disabled={disabled}
                    className="mt-0.5 shrink-0"
                    onCheckedChange={(checked) => {
                      onChange(
                        checked
                          ? addPermissionWithDependencies(selected, def.id)
                          : removePermissionAndPrune(selected, def.id)
                      )
                    }}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label
                      htmlFor={`${idPrefix}-${def.id}`}
                      className="text-sm font-medium leading-snug cursor-pointer"
                    >
                      {def.label}
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">{def.description}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/70 truncate" title={def.id}>
                      {def.id}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
