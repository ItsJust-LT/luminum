"use client"

import Link from "next/link"
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
        "bg-card/90 flex shrink-0 flex-col border-b border-border/60 backdrop-blur-sm",
        "md:sticky md:top-0 md:self-stretch",
        className
      )}
    >
      <div className="flex flex-col md:max-h-full md:min-h-0 md:flex-1">
        <div className="hidden px-3 pb-2 pt-4 md:block">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.18em]">Mail</p>
          <p className="text-muted-foreground/90 mt-0.5 text-xs leading-snug">Folders</p>
        </div>

        <ScrollArea className="md:min-h-0 md:flex-1">
          <nav className="flex flex-row gap-1 overflow-x-auto px-2 py-2 md:flex-col md:gap-0.5 md:overflow-visible md:px-2 md:py-2 md:pr-3">
            {items.map((item) => {
              const Icon = item.icon
              const n = item.countKey ? counts[item.countKey] : 0
              const showBadge = Boolean(item.countKey && n > 0)
              const isInboxUnread = item.id === "inbox" && n > 0
              const isActive = folderActive && active === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors whitespace-nowrap md:w-full md:py-2",
                    isActive
                      ? "bg-primary/12 text-foreground ring-primary/20 font-medium shadow-sm ring-1"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {showBadge ? (
                    <span
                      className={cn(
                        "min-w-[1.25rem] rounded-md px-1.5 py-0.5 text-center text-[11px] font-medium tabular-nums",
                        isInboxUnread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {n > 99 ? "99+" : n}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>
        </ScrollArea>

        <Separator className="hidden opacity-40 md:block" />

        <div className="flex flex-row gap-2 border-t border-border/50 p-2 md:flex-col md:border-t-0 md:px-2 md:pb-4 md:pt-2">
          <Button
            asChild
            variant={activeSection === "compose" ? "default" : "secondary"}
            className={cn("h-10 flex-1 md:h-10 md:w-full", activeSection === "compose" && "shadow-sm")}
          >
            <Link href={composeHref} className="gap-2">
              <PenSquare className="h-4 w-4" />
              <span className="text-sm font-medium">Compose</span>
            </Link>
          </Button>
          <Button
            asChild
            variant={activeSection === "settings" ? "default" : "outline"}
            className={cn("h-10 flex-1 md:h-10 md:w-full", activeSection === "settings" && "shadow-sm")}
          >
            <Link href={settingsHref} className="gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </Button>
        </div>

        <p className="text-muted-foreground hidden px-3 pb-3 text-[11px] leading-relaxed md:block">
          <Link href={emailsBasePath} className="text-primary hover:underline">
            Inbox list
          </Link>
        </p>
      </div>
    </aside>
  )
}
