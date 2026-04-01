import { DEPENDENCIES } from "@luminum/org-permissions"

function depsOf(id: string): readonly string[] {
  return DEPENDENCIES[id as keyof typeof DEPENDENCIES] ?? []
}

/** Turn on a permission and everything it depends on. */
export function addPermissionWithDependencies(set: Set<string>, id: string): Set<string> {
  const next = new Set(set)
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    if (next.has(cur)) continue
    next.add(cur)
    for (const d of depsOf(cur)) stack.push(d)
  }
  return next
}

/** Turn off a permission and anything that required it. */
export function removePermissionAndPrune(set: Set<string>, id: string): Set<string> {
  const next = new Set(set)
  next.delete(id)
  let changed = true
  while (changed) {
    changed = false
    for (const p of [...next]) {
      const deps = depsOf(p)
      if (!deps.length) continue
      if (!deps.every((d) => next.has(d))) {
        next.delete(p)
        changed = true
      }
    }
  }
  return next
}
