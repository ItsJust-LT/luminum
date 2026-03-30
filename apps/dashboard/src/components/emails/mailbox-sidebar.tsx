"use client"

import { motion } from "framer-motion"
import { Inbox, Send, Star, FileEdit, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

export type MailboxId = "inbox" | "sent" | "starred" | "drafts" | "scheduled"

export interface FolderCounts {
  inboxUnread: number
  sent: number
  starred: number
  drafts: number
  scheduled: number
}

const items: { id: MailboxId; label: string; icon: typeof Inbox; countKey?: keyof FolderCounts }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox, countKey: "inboxUnread" },
  { id: "sent", label: "Sent", icon: Send, countKey: "sent" },
  { id: "starred", label: "Starred", icon: Star, countKey: "starred" },
  { id: "drafts", label: "Drafts", icon: FileEdit, countKey: "drafts" },
  { id: "scheduled", label: "Scheduled", icon: Clock, countKey: "scheduled" },
]

export function MailboxSidebar({
  active,
  onSelect,
  counts,
  className,
}: {
  active: MailboxId
  onSelect: (m: MailboxId) => void
  counts: FolderCounts
  className?: string
}) {
  return (
    <aside
      className={cn(
        "flex flex-col md:w-[220px] shrink-0 border-b md:border-b-0 md:border-r border-border/80 bg-muted/20 backdrop-blur-sm py-3 md:py-4 px-2",
        className
      )}
    >
      <p className="hidden md:block px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mail</p>
      <nav className="flex flex-row md:flex-col gap-1 md:gap-0.5 overflow-x-auto pb-1 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0">
        {items.map((item, i) => {
          const Icon = item.icon
          const n = item.countKey ? counts[item.countKey] : 0
          const showBadge = Boolean(item.countKey && n > 0)
          const isInboxUnread = item.id === "inbox" && n > 0
          return (
            <motion.button
              key={item.id}
              type="button"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 380, damping: 28 }}
              onClick={() => onSelect(item.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-3 py-2 md:py-2.5 text-left text-sm transition-colors shrink-0 whitespace-nowrap",
                active === item.id
                  ? "bg-primary/12 text-foreground font-medium shadow-sm ring-1 ring-primary/15"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active === item.id && "text-primary")} />
              <span className="truncate flex-1">{item.label}</span>
              {showBadge ? (
                <span
                  className={cn(
                    "tabular-nums text-[11px] font-medium min-w-[1.25rem] text-center rounded-md px-1.5 py-0.5",
                    isInboxUnread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {n > 99 ? "99+" : n}
                </span>
              ) : null}
            </motion.button>
          )
        })}
      </nav>
      <Separator className="my-3 md:my-4 opacity-60 hidden md:block" />
      <p className="hidden md:block px-3 text-[11px] leading-relaxed text-muted-foreground">
        Inbox shows received mail. Sent and scheduled use your org domain in Resend.
      </p>
    </aside>
  )
}
