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
        "flex flex-col shrink-0 border-b border-border/60 bg-card/95 md:w-[min(15rem,28vw)] md:max-w-[16rem] lg:w-64 md:border-b-0 md:border-r",
        "md:min-h-[calc(100dvh-4.5rem)] md:self-stretch",
        "py-4 pl-[max(0px,env(safe-area-inset-left))] pr-3 md:py-6 md:pl-[max(0px,env(safe-area-inset-left))] md:pr-4",
        className
      )}
    >
      <p className="hidden md:block px-1 pb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Mail
      </p>
      <nav className="flex flex-row gap-1 overflow-x-auto pb-1 md:flex-col md:gap-1 md:overflow-visible md:pb-0">
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
                "relative flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all whitespace-nowrap md:w-full md:py-3",
                active === item.id
                  ? "bg-primary/12 font-medium text-foreground shadow-sm ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
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
      <Separator className="my-4 hidden opacity-50 md:block" />
      <p className="hidden px-1 text-[11px] leading-relaxed text-muted-foreground md:block">
        Inbox shows received mail. Sent and scheduled messages use your organization domain.
      </p>
    </aside>
  )
}
