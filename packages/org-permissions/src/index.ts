/** API / client error code for permission denials */
export const INSUFFICIENT_PERMISSIONS_CODE = "INSUFFICIENT_PERMISSIONS" as const;

/** organization_role.kind in Prisma */
export const ORG_ROLE_KIND = {
  owner: "owner",
  admin: "admin",
  member_template: "member_template",
  custom: "custom",
} as const;

export type OrgRoleKind = (typeof ORG_ROLE_KIND)[keyof typeof ORG_ROLE_KIND];

export type PermissionDefinition = {
  id: string;
  label: string;
  description: string;
  group: string;
};

export const PERMISSIONS: readonly PermissionDefinition[] = [
  {
    id: "dashboard:view",
    label: "Dashboard",
    description: "View the organization dashboard and overview.",
    group: "General",
  },
  {
    id: "org:settings:read",
    label: "Organization settings (read)",
    description: "View organization profile, branding, and configuration.",
    group: "Organization",
  },
  {
    id: "org:settings:write",
    label: "Organization settings (write)",
    description: "Change organization profile, branding, and configuration.",
    group: "Organization",
  },
  {
    id: "org:websites:read",
    label: "Websites (read)",
    description: "View connected websites and domains.",
    group: "Organization",
  },
  {
    id: "org:websites:write",
    label: "Websites (write)",
    description: "Add and update websites.",
    group: "Organization",
  },
  {
    id: "org:websites:delete",
    label: "Websites (delete)",
    description: "Remove websites from the organization.",
    group: "Organization",
  },
  {
    id: "org:storage:read",
    label: "Storage usage",
    description: "View storage usage and breakdown for the organization.",
    group: "Organization",
  },
  {
    id: "billing:read",
    label: "Billing (read)",
    description: "View subscriptions, invoices, and payment history.",
    group: "Billing",
  },
  {
    id: "billing:manage",
    label: "Billing (manage)",
    description: "Change subscription, payment methods, and billing settings.",
    group: "Billing",
  },
  {
    id: "team:read",
    label: "Team (read)",
    description: "View members and invitations.",
    group: "Team",
  },
  {
    id: "team:invite",
    label: "Team (invite)",
    description: "Invite new members to the organization.",
    group: "Team",
  },
  {
    id: "team:remove",
    label: "Team (remove)",
    description: "Remove members from the organization.",
    group: "Team",
  },
  {
    id: "team:roles:assign",
    label: "Assign roles",
    description: "Change a member’s role or custom role assignment.",
    group: "Team",
  },
  {
    id: "team:roles:manage",
    label: "Manage custom roles",
    description: "Create, edit, and delete custom roles and their permissions.",
    group: "Team",
  },
  {
    id: "forms:read",
    label: "Forms (read)",
    description: "View form submissions and details.",
    group: "Forms",
  },
  {
    id: "forms:submissions:manage",
    label: "Forms (manage submissions)",
    description: "Update submission status and mark submissions as seen.",
    group: "Forms",
  },
  {
    id: "blog:read",
    label: "Blog (read)",
    description: "View blog posts including drafts.",
    group: "Blog",
  },
  {
    id: "blog:write",
    label: "Blog (write)",
    description: "Create and edit blog posts (drafts).",
    group: "Blog",
  },
  {
    id: "blog:publish",
    label: "Blog (publish)",
    description: "Publish, unpublish, and schedule posts.",
    group: "Blog",
  },
  {
    id: "blog:delete",
    label: "Blog (delete)",
    description: "Delete blog posts and related content.",
    group: "Blog",
  },
  {
    id: "blog:assets:write",
    label: "Blog media",
    description: "Upload and manage images and assets for the blog.",
    group: "Blog",
  },
  {
    id: "email:read",
    label: "Email (read)",
    description: "View mailbox, threads, and message content.",
    group: "Email",
  },
  {
    id: "email:send",
    label: "Email (send)",
    description: "Compose, send, save drafts, and schedule outbound email.",
    group: "Email",
  },
  {
    id: "email:settings:read",
    label: "Email settings (read)",
    description: "View email signatures, forwarding, and composer settings.",
    group: "Email",
  },
  {
    id: "email:settings:write",
    label: "Email settings (write)",
    description: "Change signatures, forwarding rules, and composer defaults.",
    group: "Email",
  },
  {
    id: "email:domain:manage",
    label: "Email domain",
    description: "Connect and verify the organization email domain (admin-level).",
    group: "Email",
  },
  {
    id: "whatsapp:read",
    label: "WhatsApp (read)",
    description: "View WhatsApp chats and messages.",
    group: "WhatsApp",
  },
  {
    id: "whatsapp:send",
    label: "WhatsApp (send)",
    description: "Send WhatsApp messages on behalf of the organization.",
    group: "WhatsApp",
  },
  {
    id: "whatsapp:settings:read",
    label: "WhatsApp settings (read)",
    description: "View WhatsApp connection and settings.",
    group: "WhatsApp",
  },
  {
    id: "whatsapp:settings:write",
    label: "WhatsApp settings (write)",
    description: "Change WhatsApp connection and settings.",
    group: "WhatsApp",
  },
  {
    id: "analytics:read",
    label: "Analytics (read)",
    description: "View analytics dashboards and reports.",
    group: "Analytics",
  },
  {
    id: "analytics:setup",
    label: "Analytics (setup)",
    description: "Verify tracking script and run setup checks.",
    group: "Analytics",
  },
  {
    id: "audits:read",
    label: "Site audits (read)",
    description: "View site audit results and history.",
    group: "Audits",
  },
  {
    id: "audits:run",
    label: "Site audits (run)",
    description: "Start and manage new site audits.",
    group: "Audits",
  },
  {
    id: "invoices:read",
    label: "Invoices (read)",
    description: "View invoices, quotes, and PDFs.",
    group: "Invoices",
  },
  {
    id: "invoices:write",
    label: "Invoices (write)",
    description: "Create and edit invoices and quotes.",
    group: "Invoices",
  },
  {
    id: "invoices:delete",
    label: "Invoices (delete)",
    description: "Delete invoices and quotes.",
    group: "Invoices",
  },
  {
    id: "invoices:send",
    label: "Invoices (send)",
    description: "Send invoices via email or linked channels.",
    group: "Invoices",
  },
  {
    id: "invoice_schedules:read",
    label: "Recurring invoices (read)",
    description: "View recurring invoice schedules.",
    group: "Invoices",
  },
  {
    id: "invoice_schedules:manage",
    label: "Recurring invoices (manage)",
    description: "Create, edit, and remove recurring schedules.",
    group: "Invoices",
  },
  {
    id: "support:read",
    label: "Support (read)",
    description: "View support tickets for the organization.",
    group: "Support",
  },
  {
    id: "support:create",
    label: "Support (create)",
    description: "Open new support tickets linked to the organization.",
    group: "Support",
  },
  {
    id: "support:reply",
    label: "Support (reply)",
    description: "Reply to support ticket threads.",
    group: "Support",
  },
] as const;

export const PERMISSION_IDS: readonly string[] = PERMISSIONS.map((p) => p.id);

const PERMISSION_ID_SET = new Set(PERMISSION_IDS);

/** Prerequisites: to hold key K, member must effectively hold each listed permission. */
export const DEPENDENCIES: Readonly<Record<string, readonly string[]>> = {
  "org:settings:write": ["org:settings:read"],
  "org:websites:write": ["org:websites:read"],
  "org:websites:delete": ["org:websites:read"],
  "team:invite": ["team:read"],
  "team:remove": ["team:read"],
  "team:roles:assign": ["team:read"],
  "team:roles:manage": ["team:roles:assign"],
  "forms:submissions:manage": ["forms:read"],
  "blog:write": ["blog:read"],
  "blog:publish": ["blog:write"],
  "blog:delete": ["blog:read"],
  "blog:assets:write": ["blog:read"],
  "email:send": ["email:read"],
  "email:settings:write": ["email:settings:read"],
  "email:domain:manage": ["email:settings:read", "email:settings:write"],
  "whatsapp:send": ["whatsapp:read"],
  "whatsapp:settings:write": ["whatsapp:settings:read"],
  "analytics:setup": ["analytics:read"],
  "audits:run": ["audits:read"],
  "invoices:write": ["invoices:read"],
  "invoices:delete": ["invoices:read"],
  "invoices:send": ["invoices:read"],
  "invoice_schedules:manage": ["invoice_schedules:read", "invoices:read"],
  "billing:manage": ["billing:read"],
  "support:create": ["support:read"],
  "support:reply": ["support:read"],
};

/** Every grantable permission (same as catalog). Owner-only actions are enforced separately in API. */
export const GRANTABLE_PERMISSION_IDS: readonly string[] = [...PERMISSION_IDS];

export function expandPermissionSet(grants: Iterable<string>): Set<string> {
  const out = new Set<string>();
  const stack = [...grants];
  while (stack.length) {
    const id = stack.pop()!;
    if (!PERMISSION_ID_SET.has(id)) continue;
    if (out.has(id)) continue;
    out.add(id);
    const deps = DEPENDENCIES[id];
    if (deps) for (const d of deps) stack.push(d);
  }
  return out;
}

export function hasAllPermissions(effective: Set<string>, required: readonly string[]): boolean {
  return required.every((r) => effective.has(r));
}

export function permissionMeta(id: string): PermissionDefinition | undefined {
  return PERMISSIONS.find((p) => p.id === id);
}

/** Default seed for member_template — full access except team administration (matches typical legacy member). */
export const DEFAULT_MEMBER_TEMPLATE_PERMISSION_IDS: readonly string[] = GRANTABLE_PERMISSION_IDS.filter(
  (id) =>
    !id.startsWith("team:roles:") &&
    id !== "team:invite" &&
    id !== "team:remove",
);

export const ROLE_TEMPLATES: readonly {
  id: string;
  name: string;
  description: string;
  permissionIds: readonly string[];
}[] = [
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only across workspace areas.",
    permissionIds: [
      "dashboard:view",
      "org:settings:read",
      "org:websites:read",
      "org:storage:read",
      "forms:read",
      "blog:read",
      "email:read",
      "email:settings:read",
      "whatsapp:read",
      "whatsapp:settings:read",
      "analytics:read",
      "audits:read",
      "invoices:read",
      "invoice_schedules:read",
      "billing:read",
      "support:read",
    ],
  },
  {
    id: "content",
    name: "Content",
    description: "Blog and forms; no billing or team admin.",
    permissionIds: [
      "dashboard:view",
      "org:settings:read",
      "forms:read",
      "forms:submissions:manage",
      "blog:read",
      "blog:write",
      "blog:publish",
      "blog:assets:write",
      "analytics:read",
    ],
  },
  {
    id: "sales",
    name: "Sales",
    description: "Invoices, quotes, and communications.",
    permissionIds: [
      "dashboard:view",
      "org:settings:read",
      "invoices:read",
      "invoices:write",
      "invoices:send",
      "invoice_schedules:read",
      "invoice_schedules:manage",
      "email:read",
      "email:send",
      "whatsapp:read",
      "whatsapp:send",
    ],
  },
  {
    id: "support_agent",
    name: "Support",
    description: "Support tickets and read access to context.",
    permissionIds: [
      "dashboard:view",
      "org:settings:read",
      "support:read",
      "support:create",
      "support:reply",
      "email:read",
    ],
  },
];

export const BUILTIN_ROLE_UI = {
  owner: {
    label: "Owner",
    color: "#7c3aed",
    iconKey: "Crown",
  },
  admin: {
    label: "Admin",
    color: "#475569",
    iconKey: "ShieldCheck",
  },
  member_template: {
    label: "Member",
    color: "#059669",
    iconKey: "User",
  },
} as const;

/**
 * Primary nav / page gate: user must have every permission in the tuple.
 * Keys are path segments after org slug (no leading slash), e.g. "blogs/new".
 */
export const PAGE_REQUIRED_PERMISSIONS: Readonly<Record<string, readonly string[]>> = {
  dashboard: ["dashboard:view"],
  analytics: ["analytics:read"],
  audits: ["audits:read"],
  forms: ["forms:read"],
  blogs: ["blog:read"],
  "blogs/new": ["blog:read", "blog:write"],
  emails: ["email:read"],
  "emails/compose": ["email:read", "email:send"],
  "emails/settings": ["email:settings:read"],
  whatsapp: ["whatsapp:read"],
  "whatsapp/settings": ["whatsapp:settings:read"],
  invoices: ["invoices:read"],
  "invoices/new": ["invoices:read", "invoices:write"],
  "invoices/schedules": ["invoices:read", "invoice_schedules:read"],
  "invoices/schedules/new": ["invoices:read", "invoice_schedules:read", "invoice_schedules:manage"],
  team: ["team:read"],
  settings: ["org:settings:read"],
  billing: ["billing:read"],
  support: ["support:read"],
  reports: ["dashboard:view"],
};

/** Nav item id -> required permissions (subset of pages). */
export const NAV_ITEM_REQUIRED_PERMISSIONS: Readonly<Record<string, readonly string[]>> = {
  dashboard: PAGE_REQUIRED_PERMISSIONS.dashboard!,
  analytics: PAGE_REQUIRED_PERMISSIONS.analytics!,
  audits: PAGE_REQUIRED_PERMISSIONS.audits!,
  forms: PAGE_REQUIRED_PERMISSIONS.forms!,
  blogs: PAGE_REQUIRED_PERMISSIONS.blogs!,
  emails: PAGE_REQUIRED_PERMISSIONS.emails!,
  whatsapp: PAGE_REQUIRED_PERMISSIONS.whatsapp!,
  invoices: PAGE_REQUIRED_PERMISSIONS.invoices!,
  "invoices/schedules": PAGE_REQUIRED_PERMISSIONS["invoices/schedules"]!,
  team: PAGE_REQUIRED_PERMISSIONS.team!,
  settings: PAGE_REQUIRED_PERMISSIONS.settings!,
  billing: PAGE_REQUIRED_PERMISSIONS.billing!,
  support: PAGE_REQUIRED_PERMISSIONS.support!,
  reports: PAGE_REQUIRED_PERMISSIONS.reports!,
};

/**
 * Resolve org-relative subpath (e.g. from pathname after /[slug]/) to required permissions.
 * Dynamic segments: numeric or cuid-like ids are treated as single segment wildcards.
 */
export function getRequiredPermissionsForOrgSubpath(subpath: string): readonly string[] {
  const trimmed = subpath.replace(/^\/+|\/+$/g, "");
  if (!trimmed) return PAGE_REQUIRED_PERMISSIONS.dashboard!;
  const segments = trimmed.split("/").filter(Boolean);
  const joined = segments.join("/");

  if (PAGE_REQUIRED_PERMISSIONS[joined]) return PAGE_REQUIRED_PERMISSIONS[joined]!;

  // blogs/[id]/edit
  if (segments[0] === "blogs" && segments.length >= 3 && segments[2] === "edit") {
    return ["blog:read", "blog:write"];
  }
  if (segments[0] === "blogs" && segments.length === 2 && segments[1] !== "new") {
    return ["blog:read"];
  }
  // emails/[id]
  if (segments[0] === "emails" && segments.length === 2 && segments[1] !== "compose" && segments[1] !== "settings") {
    return ["email:read"];
  }
  // invoices/[id]
  if (segments[0] === "invoices" && segments.length === 2 && segments[1] !== "new" && segments[1] !== "schedules") {
    return ["invoices:read"];
  }
  if (segments[0] === "invoices" && segments.length === 3 && segments[2] === "edit") {
    return ["invoices:read", "invoices:write"];
  }
  // whatsapp/groups|contacts/[id]
  if (segments[0] === "whatsapp" && (segments[1] === "groups" || segments[1] === "contacts") && segments.length === 3) {
    return ["whatsapp:read"];
  }
  // forms/[formId]
  if (segments[0] === "forms" && segments.length === 2) {
    return ["forms:read"];
  }
  // support/[ticketId]
  if (segments[0] === "support" && segments.length === 2) {
    return ["support:read"];
  }

  // team/invite, team/roles, team/members/.../access|remove, team/invitations/.../cancel
  if (segments[0] === "team") {
    if (segments[1] === "invite") return ["team:invite"];
    if (segments[1] === "roles") {
      if (segments.length === 2) return ["team:read"];
      if (segments[2] === "new") return ["team:roles:manage"];
      if (segments.length === 3) return ["team:roles:manage"];
    }
    if (segments[1] === "members" && segments.length === 4) {
      if (segments[3] === "access") return ["team:roles:assign"];
      if (segments[3] === "remove") return ["team:remove"];
    }
    if (segments[1] === "invitations" && segments.length === 4 && segments[3] === "cancel") {
      return ["team:invite"];
    }
  }

  const first = segments[0];
  if (first && PAGE_REQUIRED_PERMISSIONS[first]) return PAGE_REQUIRED_PERMISSIONS[first]!;

  return PAGE_REQUIRED_PERMISSIONS.dashboard!;
}

export function validatePermissionSelection(selected: string[]): { ok: true; expanded: string[] } | { ok: false; error: string } {
  for (const id of selected) {
    if (!PERMISSION_ID_SET.has(id)) return { ok: false, error: `Unknown permission: ${id}` };
  }
  const expanded = expandPermissionSet(selected);
  for (const id of selected) {
    const deps = DEPENDENCIES[id];
    if (!deps) continue;
    for (const d of deps) {
      if (!expanded.has(d)) return { ok: false, error: `${id} requires ${d}` };
    }
  }
  return { ok: true, expanded: [...expanded] };
}

export function getAllGrantablePermissionsSet(): Set<string> {
  return new Set(GRANTABLE_PERMISSION_IDS);
}
