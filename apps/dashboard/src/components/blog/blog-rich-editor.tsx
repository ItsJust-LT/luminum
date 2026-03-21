"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Link2,
  ImageIcon,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Pilcrow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { htmlToMarkdown, markdownToHtml } from "@/lib/blog-markdown-bridge";

export type BlogRichEditorHandle = {
  insertImageAtCursor: (url: string, alt?: string) => void;
  /** Replace full document from markdown (e.g. after inserting a custom block). */
  setMarkdown: (markdown: string) => void;
  focus: () => void;
};

type ToolbarProps = {
  editor: Editor | null;
  onInsertImageClick: () => void;
};

function Toolbar({ editor, onInsertImageClick }: ToolbarProps) {
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");

  if (!editor) return null;

  const setLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const href =
        /^https?:\/\//i.test(url) || url.startsWith("/") ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
    setLinkUrl("");
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-xl border border-border/60 bg-muted/30 p-1.5">
      <Button
        type="button"
        variant={editor.isActive("bold") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("italic") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("underline") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("strike") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("highlight") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Highlight"
      >
        <Highlighter className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="mx-0.5 h-6 self-center" />
      <Button
        type="button"
        variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("paragraph") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().setParagraph().run()}
        title="Normal text"
      >
        <Pilcrow className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="mx-0.5 h-6 self-center" />
      <Button
        type="button"
        variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("code") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
      >
        <Code className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("codeBlock") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code block"
      >
        <span className="text-[10px] font-mono font-bold">{"{}"}</span>
      </Button>
      <Separator orientation="vertical" className="mx-0.5 h-6 self-center" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="Align left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="Align center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="Align right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="mx-0.5 h-6 self-center" />
      <Popover
        open={linkOpen}
        onOpenChange={(o) => {
          setLinkOpen(o);
          if (o) {
            const prev = editor.getAttributes("link").href as string | undefined;
            setLinkUrl(prev ?? "");
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            size="sm"
            className="h-8 w-8 px-0"
            title="Link"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3" align="start">
          <div className="space-y-2">
            <Label htmlFor="blog-link-url">URL</Label>
            <Input
              id="blog-link-url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLink();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={setLink}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 px-0"
        onClick={onInsertImageClick}
        title="Insert image"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal line"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="mx-0.5 h-6 self-center" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export const BlogRichEditor = React.forwardRef<
  BlogRichEditorHandle,
  {
    initialMarkdown: string;
    onChange: (markdown: string) => void;
    onInsertImageClick: () => void;
    className?: string;
    editorClassName?: string;
  }
>(function BlogRichEditor(
  { initialMarkdown, onChange, onInsertImageClick, className, editorClassName },
  ref
) {
  const lastEmitted = React.useRef<string | null>(null);
  const skipEmit = React.useRef(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4 font-medium",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg border border-border/60 max-w-full h-auto my-4",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Placeholder.configure({
        placeholder:
          "Start writing — select text and use the toolbar, just like Word.",
      }),
    ],
    content: markdownToHtml(initialMarkdown),
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm md:prose-base max-w-none focus:outline-none min-h-[300px] px-4 py-4",
          "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground",
          "prose-p:leading-relaxed prose-p:text-foreground prose-p:my-3",
          "prose-a:text-primary prose-a:underline",
          "prose-strong:text-foreground prose-strong:font-semibold",
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
          "prose-pre:bg-muted prose-pre:border prose-pre:rounded-xl prose-pre:p-4",
          "prose-img:rounded-xl prose-img:border prose-img:shadow-sm prose-img:my-4",
          "prose-blockquote:border-l-primary prose-blockquote:bg-muted/20 prose-blockquote:py-1 prose-blockquote:rounded-r-lg",
          "dark:prose-invert",
          editorClassName
        ),
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (skipEmit.current) return;
      const md = htmlToMarkdown(ed.getHTML());
      if (md === lastEmitted.current) return;
      lastEmitted.current = md;
      onChange(md);
    },
  });

  React.useImperativeHandle(
    ref,
    () => ({
      insertImageAtCursor: (url: string, alt?: string) => {
        if (!editor) return;
        editor.chain().focus().setImage({ src: url, alt: alt || "" }).run();
      },
      setMarkdown: (markdown: string) => {
        if (!editor) return;
        skipEmit.current = true;
        const html = markdownToHtml(markdown);
        editor.commands.setContent(html);
        lastEmitted.current = markdown;
        onChange(markdown);
        queueMicrotask(() => {
          skipEmit.current = false;
        });
      },
      focus: () => editor?.chain().focus().run(),
    }),
    [editor, onChange]
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Toolbar editor={editor} onInsertImageClick={onInsertImageClick} />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background/80 ring-1 ring-border/30">
        <EditorContent editor={editor} className="blog-rich-editor min-h-[max(24rem,calc(100dvh-19rem))] overflow-y-auto" />
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: select text, then press a button — or use Ctrl+B / Ctrl+I / Ctrl+U for bold, italic, underline.
      </p>
    </div>
  );
});

BlogRichEditor.displayName = "BlogRichEditor";

export type BlogRichEditorProps = React.ComponentProps<typeof BlogRichEditor>;
