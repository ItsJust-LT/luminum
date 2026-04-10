"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const ISO_DATE = "yyyy-MM-dd"

export type DatePickerProps = {
  /** Selected calendar day as `yyyy-MM-dd` in local timezone */
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  /** Inclusive minimum calendar day */
  fromDate?: Date
  /** Inclusive maximum calendar day */
  toDate?: Date
  align?: "start" | "center" | "end"
  /** Show clear action for optional fields */
  allowClear?: boolean
}

function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value?.trim()) return undefined
  const d = parse(value, ISO_DATE, new Date())
  return isValid(d) ? d : undefined
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  id,
  fromDate,
  toDate,
  align = "start",
  allowClear,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = React.useMemo(() => parseIsoDate(value), [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          {selected ? format(selected, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) onChange(format(d, ISO_DATE))
            setOpen(false)
          }}
          disabled={(date) => {
            const t = date.setHours(0, 0, 0, 0)
            if (fromDate) {
              const f = new Date(fromDate)
              f.setHours(0, 0, 0, 0)
              if (t < f.getTime()) return true
            }
            if (toDate) {
              const x = new Date(toDate)
              x.setHours(0, 0, 0, 0)
              if (t > x.getTime()) return true
            }
            return false
          }}
          defaultMonth={selected}
          initialFocus
        />
        {allowClear && selected ? (
          <div className="border-border border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 w-full text-xs"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
            >
              Clear date
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
