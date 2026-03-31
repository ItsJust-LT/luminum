"use client"

import { useCallback, useEffect } from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import { Button } from "@/components/ui/button"
import { Bold, Italic, Link2, List, ListOrdered, Underline as UnderlineIcon, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function Toolbar({ editor, onInsertImage }: { editor: Editor | null; onInsertImage: () => void }) {
  if (!editor) return null
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 bg-muted/30 px-2 py-1.5">
      <Button
        type="button"
        variant={editor.isActive("bold") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("italic") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("underline") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet list"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => {
          const prev = window.prompt("Link URL", "https://")
          if (prev) editor.chain().focus().extendMarkRange("link").setLink({ href: prev }).run()
        }}
        aria-label="Insert link"
      >
        <Link2 className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onInsertImage} aria-label="Insert image">
        <ImageIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function MailRichEditor(props: {
  sessionKey: number
  initialHtml: string
  disabled?: boolean
  placeholder?: string
  className?: string
  onChange: (html: string, plain: string) => void
}) {
  const { sessionKey, initialHtml, disabled, placeholder, className, onChange } = props

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [2, 3] }, link: false }),
        Underline,
        Link.configure({ openOnClick: false, autolink: true }),
        Image.configure({ inline: false, allowBase64: true }),
        Placeholder.configure({ placeholder: placeholder || "Write your message…" }),
      ],
      content: initialHtml || "<p></p>",
      editable: !disabled,
      editorProps: {
        attributes: {
          class:
            "prose prose-sm dark:prose-invert max-w-none min-h-[7.5rem] max-h-[min(28vh,220px)] overflow-y-auto px-3 py-2 focus:outline-none text-[14px] leading-relaxed",
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML(), ed.getText({ blockSeparator: "\n" }))
      },
    },
    [sessionKey]
  )

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])

  const onInsertImageClick = useCallback(() => {
    if (!editor) return
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const r = new FileReader()
      r.onload = () => {
        const dataUrl = String(r.result || "")
        if (!dataUrl.startsWith("data:")) return
        editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run()
      }
      r.readAsDataURL(file)
    }
    input.click()
  }, [editor])

  return (
    <div className={cn("rounded-lg border border-border/80 bg-background overflow-hidden", className)}>
      <Toolbar editor={editor} onInsertImage={onInsertImageClick} />
      <EditorContent editor={editor} />
    </div>
  )
}
