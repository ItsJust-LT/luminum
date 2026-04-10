import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import type { BlogComponentMap } from "@itsjust-lt/website-kit/blog"
import type { VariantProps } from "class-variance-authority"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Info,
  Sparkles,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>

function pickString(props: Record<string, unknown>, key: string): string | undefined {
  const v = props[key]
  return typeof v === "string" ? v : undefined
}

function pickBool(props: Record<string, unknown>, key: string): boolean {
  return props[key] === true
}

function pickRecordArray(props: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = props[key]
  if (!Array.isArray(v)) return []
  return v.filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
}

const CALLOUT_STYLES: Record<
  string,
  { box: string; icon: React.ElementType; iconWrap: string }
> = {
  info: {
    box: "border-[#302cff]/25 bg-gradient-to-br from-[#302cff]/[0.07] to-white",
    icon: Info,
    iconWrap: "bg-[#302cff] text-white shadow-md shadow-[#302cff]/25",
  },
  warning: {
    box: "border-amber-300/60 bg-gradient-to-br from-amber-50 to-white",
    icon: AlertTriangle,
    iconWrap: "bg-amber-500 text-white shadow-md shadow-amber-500/25",
  },
  danger: {
    box: "border-red-300/60 bg-gradient-to-br from-red-50 to-white",
    icon: XCircle,
    iconWrap: "bg-red-600 text-white shadow-md shadow-red-600/25",
  },
  success: {
    box: "border-emerald-300/60 bg-gradient-to-br from-emerald-50 to-white",
    icon: CheckCircle2,
    iconWrap: "bg-emerald-600 text-white shadow-md shadow-emerald-600/25",
  },
  tip: {
    box: "border-violet-300/50 bg-gradient-to-br from-violet-50 to-white",
    icon: Sparkles,
    iconWrap: "bg-violet-600 text-white shadow-md shadow-violet-600/25",
  },
}

export function LuminumCallout({
  children,
  ...props
}: Record<string, unknown> & { children?: React.ReactNode }) {
  const variant = pickString(props, "variant") ?? "info"
  const title = pickString(props, "title")
  const cfg = CALLOUT_STYLES[variant] ?? CALLOUT_STYLES.info
  const Icon = cfg.icon

  return (
    <aside
      className={cn(
        "not-prose my-8 rounded-2xl border-2 p-5 shadow-sm sm:p-6",
        "backdrop-blur-[2px]",
        cfg.box,
      )}
      role="note"
    >
      <div className="flex gap-4">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            cfg.iconWrap,
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          {title ? (
            <p className="font-heading mb-2 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              {title}
            </p>
          ) : null}
          <div className="space-y-3 text-[0.9375rem] leading-relaxed text-slate-700 [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2">
            {children}
          </div>
        </div>
      </div>
    </aside>
  )
}

export function LuminumBlogBodyImage(props: Record<string, unknown>) {
  const src = pickString(props, "src") ?? ""
  const alt = pickString(props, "alt") ?? ""
  const caption = pickString(props, "caption")
  const width = typeof props.width === "number" ? props.width : 1200
  const height = typeof props.height === "number" ? props.height : 675
  const roundedOff = props.rounded === false
  const objectFit = pickString(props, "objectFit") ?? "cover"
  const maxWidth = typeof props.maxWidth === "number" ? props.maxWidth : undefined
  const layout = pickString(props, "layout")
  const isFull = layout === "full"

  if (!src) return null

  return (
    <figure
      className={cn(
        "not-prose my-8 w-full",
        isFull ? "lg:-mx-4 xl:-mx-10" : "mx-auto max-w-3xl",
      )}
      style={maxWidth ? { maxWidth: isFull ? undefined : `${maxWidth}px` } : undefined}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden bg-slate-100 shadow-lg ring-1 ring-slate-900/5",
          roundedOff ? "rounded-none" : "rounded-2xl",
        )}
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={
            isFull
              ? "(max-width: 1024px) 100vw, min(100vw, 56rem)"
              : "(max-width: 768px) 100vw, 42rem"
          }
          className={cn(objectFit === "contain" ? "object-contain" : "object-cover")}
        />
      </div>
      {caption ? (
        <figcaption className="mt-3 text-center text-sm font-medium tracking-wide text-slate-500">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

export function LuminumBlogButton(props: Record<string, unknown>) {
  const href = pickString(props, "href") ?? "#"
  const label = pickString(props, "label") ?? "Learn more"
  const variant = pickString(props, "variant")
  const external = /^https?:\/\//i.test(href)

  const variantMap: Record<string, ButtonVariant> = {
    default: "default",
    primary: "default",
    outline: "outline",
    ghost: "ghost",
    secondary: "secondary",
    destructive: "destructive",
    link: "link",
  }
  const btnVariant = variant ? variantMap[variant] ?? "default" : "default"
  const isBrand =
    btnVariant === "default" && (!variant || variant === "default" || variant === "primary")

  const inner = (
    <>
      {label}
      {external ? <ExternalLink className="h-4 w-4 opacity-80" aria-hidden /> : null}
    </>
  )

  const className = cn(
    "my-3 rounded-xl px-6 font-semibold",
    isBrand &&
      "border-0 bg-gradient-to-r from-[#302cff] to-[#5b57ff] text-white shadow-lg shadow-[#302cff]/25 hover:from-[#2820dd] hover:to-[#4f4bff]",
    btnVariant === "outline" && "border-2 border-slate-200 bg-white hover:border-[#302cff]/35 hover:bg-slate-50",
  )

  if (external) {
    return (
      <Button asChild variant={btnVariant} className={className}>
        <a href={href} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      </Button>
    )
  }

  return (
    <Button asChild variant={btnVariant} className={className}>
      <Link href={href}>{inner}</Link>
    </Button>
  )
}

export function LuminumAccordion(props: Record<string, unknown>) {
  const items = pickRecordArray(props, "items")

  return (
    <div className="not-prose my-8 space-y-3">
      {items.map((item, i) => {
        const title = typeof item.title === "string" ? item.title : `Section ${i + 1}`
        const content = typeof item.content === "string" ? item.content : ""
        return (
          <details
            key={i}
            className="group rounded-2xl border-2 border-slate-200/90 bg-white shadow-sm transition-shadow open:border-[#302cff]/25 open:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-heading font-bold text-slate-900 marker:hidden [&::-webkit-details-marker]:hidden">
              <span>{title}</span>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-[#302cff] transition-transform duration-300 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div
              className="blog-body prose prose-slate max-w-none border-t border-slate-100 px-5 pb-5 pt-4 prose-p:my-2 prose-p:text-[0.9375rem] prose-p:leading-relaxed prose-p:text-slate-600 prose-headings:font-heading prose-a:text-[#302cff] prose-strong:text-slate-800"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </details>
        )
      })}
    </div>
  )
}

export function LuminumGallery(props: Record<string, unknown>) {
  const images = pickRecordArray(props, "images")
  const columns = typeof props.columns === "number" ? Math.min(4, Math.max(1, props.columns)) : 2

  const gridCols =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : columns === 3
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"

  return (
    <div className={cn("not-prose my-8 grid gap-3 sm:gap-4", gridCols)}>
      {images.map((img, i) => {
        const src = typeof img.src === "string" ? img.src : ""
        const alt = typeof img.alt === "string" ? img.alt : ""
        if (!src) return null
        return (
          <div
            key={i}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 shadow-md ring-1 ring-slate-900/5 transition-transform duration-300 hover:z-[1] hover:scale-[1.02] hover:shadow-xl"
          >
            <Image
              src={src}
              alt={alt}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )
      })}
    </div>
  )
}

export function LuminumVideo(props: Record<string, unknown>) {
  const src = pickString(props, "src")
  const poster = pickString(props, "poster")
  const title = pickString(props, "title")
  const width = typeof props.width === "number" ? props.width : undefined
  const height = typeof props.height === "number" ? props.height : undefined

  if (!src) return null

  return (
    <div className="not-prose my-8 w-full overflow-hidden rounded-2xl border-2 border-slate-200/90 bg-slate-950 shadow-xl ring-1 ring-slate-900/10">
      {title ? (
        <p className="border-b border-slate-800 bg-slate-900 px-4 py-3 font-heading text-sm font-bold tracking-wide text-white">
          {title}
        </p>
      ) : null}
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        className="h-auto w-full"
        width={width}
        height={height}
        preload="metadata"
      >
        {title ?? "Video"}
      </video>
    </div>
  )
}

export function LuminumCodeBlock(props: Record<string, unknown>) {
  const code = pickString(props, "code") ?? ""
  const language = pickString(props, "language")
  const filename = pickString(props, "filename")
  const showLineNumbers = pickBool(props, "showLineNumbers")
  const lines = code.split("\n")

  return (
    <figure className="not-prose my-8 overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-950 text-slate-100 shadow-2xl ring-1 ring-slate-900/20">
      {(filename || language) && (
        <figcaption className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs font-medium">
          <span className="truncate font-mono text-slate-300">{filename ?? "Snippet"}</span>
          {language ? (
            <span className="shrink-0 rounded-md bg-slate-800 px-2 py-0.5 font-mono uppercase tracking-wider text-[#7cff6b]">
              {language}
            </span>
          ) : null}
        </figcaption>
      )}
      <div className="overflow-x-auto">
        {showLineNumbers ? (
          <pre className="flex min-w-0 p-4 text-[0.8125rem] leading-relaxed sm:text-sm">
            <div
              className="select-none border-r border-slate-800 pr-4 text-right font-mono text-slate-500 tabular-nums"
              aria-hidden
            >
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <code className="block flex-1 pl-4 font-mono text-slate-100">{code}</code>
          </pre>
        ) : (
          <pre className="p-4 text-[0.8125rem] leading-relaxed sm:text-sm">
            <code className="font-mono text-slate-100 whitespace-pre-wrap">{code}</code>
          </pre>
        )}
      </div>
    </figure>
  )
}

export function LuminumAuthorCard(props: Record<string, unknown>) {
  const name = pickString(props, "name") ?? "Author"
  const bio = pickString(props, "bio")
  const avatarSrc = typeof props.avatarSrc === "string" ? props.avatarSrc : undefined
  const url = pickString(props, "url")

  return (
    <Card className="not-prose my-10 overflow-hidden border-2 border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 shadow-lg">
      <CardContent className="relative p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          aria-hidden
          style={{
            background:
              "linear-gradient(135deg, rgba(48,44,255,0.12) 0%, transparent 45%, rgba(255,107,53,0.08) 100%)",
          }}
        />
        <div className="relative flex gap-5 sm:gap-6">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-inner ring-2 ring-[#302cff]/20 sm:h-24 sm:w-24">
            {avatarSrc ? (
              <Image src={avatarSrc} alt="" fill className="object-cover" sizes="96px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#302cff] to-[#5b57ff] font-heading text-2xl font-black text-white">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-heading inline-flex items-center gap-1 text-lg font-bold text-slate-900 transition-colors hover:text-[#302cff]"
              >
                {name}
                <ExternalLink className="h-4 w-4 text-[#302cff]" aria-hidden />
              </a>
            ) : (
              <p className="font-heading text-lg font-bold text-slate-900">{name}</p>
            )}
            {bio ? <p className="mt-2 text-pretty text-[0.9375rem] leading-relaxed text-slate-600">{bio}</p> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const luminumBlogMap = {
  Callout: LuminumCallout,
  Image: LuminumBlogBodyImage,
  Button: LuminumBlogButton,
  Accordion: LuminumAccordion,
  Gallery: LuminumGallery,
  Video: LuminumVideo,
  CodeBlock: LuminumCodeBlock,
  AuthorCard: LuminumAuthorCard,
} as BlogComponentMap
