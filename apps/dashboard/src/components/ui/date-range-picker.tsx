"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const ISO_DATE = "yyyy-MM-dd"

export type DateRangeValue = { from: Date; to: Date }

export type DateRangePickerProps = {
  value?: DateRangeValue | null
  onChange: (range: DateRangeValue | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  align?: "start" | "center" | "end"
  /** Number of months shown (2 recommended on md+) */
  numberOfMonths?: 1 | 2
}

function parseIsoToDate(s: string | undefined): Date | undefined {
  if (!s?.trim()) return undefined
  const d = parse(s, ISO_DATE, new Date())
  return isValid(d) ? d : undefined
}

/** Build range from optional `yyyy-MM-dd` strings (e.g. URL or API). */
export function dateRangeFromStrings(from?: string, to?: string): DateRangeValue | null {
  const a = parseIsoToDate(from)
  const b = parseIsoToDate(to)
  if (!a || !b) return null
  return { from: a, to: b }
}

export function dateRangeToStrings(range: DateRangeValue | null): { from: string; to: string } {
  if (!range) return { from: "", to: "" }
  return {
    from: format(range.from, ISO_DATE),
    to: format(range.to, ISO_DATE),
  }
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  disabled,
  className,
  align = "start",
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<DateRange | undefined>(() =>
    value ? { from: value.from, to: value.to } : undefined
  )

  React.useEffect(() => {
    if (open) setDraft(value ? { from: value.from, to: value.to } : undefined)
  }, [open, value])

  const label = React.useMemo(() => {
    if (!value?.from || !value?.to) return null
    const sameYear = value.from.getFullYear() === value.to.getFullYear()
    const a = format(value.from, sameYear ? "MMM d" : "MMM d, yyyy")
    const b = format(value.to, "MMM d, yyyy")
    return `${a} – ${b}`
  }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 justify-start text-left font-normal",
            !label && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          {label ?? <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="range"
          selected={draft}
          onSelect={(r) => {
            setDraft(r)
            if (r?.from && r?.to) {
              onChange({ from: r.from, to: r.to })
              setOpen(false)
            }
          }}
          numberOfMonths={numberOfMonths}
          defaultMonth={draft?.from ?? value?.from}
          className="p-2 sm:p-3"
          initialFocus
        />
        <div className="border-border flex items-center justify-between gap-2 border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-8 text-xs"
            onClick={() => {
              onChange(null)
              setDraft(undefined)
              setOpen(false)
            }}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            disabled={!draft?.from || !draft?.to}
            onClick={() => {
              if (draft?.from && draft?.to) {
                onChange({ from: draft.from, to: draft.to })
                setOpen(false)
              }
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
