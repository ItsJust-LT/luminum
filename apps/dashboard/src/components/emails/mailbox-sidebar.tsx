"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Inbox, Send, Star, FileEdit, Clock, PenSquare, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

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
  emailsBasePath,
  composeHref,
  settingsHref,
  activeSection,
  className,
}: {
  active: MailboxId
  onSelect: (m: MailboxId) => void
  counts: FolderCounts
  emailsBasePath: string
  composeHref: string
  settingsHref: string
  activeSection: "inbox" | "compose" | "settings" | null
  className?: string
}) {
  const folderActive = activeSection === "inbox" || activeSection === null

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 border-b border-border/60 bg-card/80 backdrop-blur-sm",
        "md:sticky md:top-0 md:self-stretch",
        className
      )}
    >
      <div className="flex flex-col md:min-h-0 md:flex-1 md:max-h-full">
        <div className="hidden md:block px-3 pt-4 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Mail</p>
          <p className="mt-0.5 text-xs text-muted-foreground/90 leading-snug">Folders and quick actions</p>
        </div>

        <ScrollArea className="md:flex-1 md:min-h-0">
          <nav className="flex flex-row gap-1 overflow-x-auto px-2 py-2 md:flex-col md:gap-0.5 md:overflow-visible md:px-2 md:py-2 md:pr-3">
            {items.map((item, i) => {
              const Icon = item.icon
              const n = item.countKey ? counts[item.countKey] : 0
              const showBadge = Boolean(item.countKey && n > 0)
              const isInboxUnread = item.id === "inbox" && n > 0
              const isActive = folderActive && active === item.id
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 28 }}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors whitespace-nowrap md:w-full md:py-2",
                    isActive
                      ? "bg-primary/14 font-medium text-foreground shadow-sm ring-1 ring-primary/15"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
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
        </ScrollArea>

        <Separator className="hidden md:block opacity-40" />

        <div className="flex flex-row gap-2 border-t border-border/50 p-2 md:flex-col md:border-t-0 md:px-2 md:pb-4 md:pt-2">
          <Button
            asChild
            variant={activeSection === "compose" ? "default" : "secondary"}
            className={cn(
              "h-10 flex-1 rounded-xl shadow-sm md:h-11 md:w-full",
              activeSection === "compose" && "shadow-md shadow-primary/20"
            )}
          >
            <Link href={composeHref} className="gap-2">
              <PenSquare className="h-4 w-4" />
              <span className="text-sm font-medium">Compose</span>
            </Link>
          </Button>
          <Button
            asChild
            variant={activeSection === "settings" ? "default" : "outline"}
            className={cn(
              "h-10 flex-1 rounded-xl md:h-11 md:w-full",
              activeSection === "settings" && "shadow-md shadow-primary/20"
            )}
          >
            <Link href={settingsHref} className="gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </Button>
        </div>

        <p className="hidden px-3 pb-3 text-[11px] leading-relaxed text-muted-foreground md:block">
          <Link href={emailsBasePath} className="text-primary hover:underline">
            All mail
          </Link>
          {" · "}
          Workspace sidebar on the left
        </p>
      </div>
    </aside>
  )
}
