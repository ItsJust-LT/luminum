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
import { TableKit } from "@tiptap/extension-table";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Textarea } from "@/components/ui/textarea";
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Pilcrow,
  Trash2,
  Pencil,
  Table as TableIcon,
  Rows,
  Trash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { htmlToMarkdown, markdownToHtml } from "@/lib/blog-markdown-bridge";
import { BlogComponentBlock } from "./blog-component-extension";

export type BlogRichEditorHandle = {
  insertImageAtCursor: (url: string, alt?: string) => void;
  insertBlogComponent: (source: string) => void;
  /** Replace full document from markdown (e.g. after inserting a custom block). */
  setMarkdown: (markdown: string) => void;
  focus: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

type ToolbarProps = {
  editor: Editor | null;
  onInsertImageClick: () => void;
};

function Toolbar({ editor, onInsertImageClick }: ToolbarProps) {
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");

  if (!editor) return null;

  const activeH1 = editor.isActive("heading", { level: 1 });
  const activeH2 = editor.isActive("heading", { level: 2 });
  const activeH3 = editor.isActive("heading", { level: 3 });

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
    <div className="-mx-0.5 overflow-x-auto pb-0.5 [scrollbar-width:thin] md:mx-0">
      <div className="flex min-w-[min(100%,52rem)] flex-wrap items-center gap-0.5 rounded-xl border border-border/60 bg-muted/30 p-1.5">
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
        variant={activeH1 ? "secondary" : "ghost"}
        size="sm"
        className="h-auto min-h-8 w-auto px-1.5 py-1"
        onClick={() => {
          editor.chain().focus().toggleHeading({ level: 1 }).run();
        }}
        title="Heading 1 — ~2.25rem"
      >
        <span className="flex flex-col items-center justify-center gap-0 leading-none">
          <Heading1 className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[8px] font-medium text-muted-foreground">2.25rem</span>
        </span>
      </Button>
      <Button
        type="button"
        variant={activeH2 ? "secondary" : "ghost"}
        size="sm"
        className="h-auto min-h-8 w-auto px-1.5 py-1"
        onClick={() => {
          editor.chain().focus().toggleHeading({ level: 2 }).run();
        }}
        title="Heading 2 — ~1.875rem"
      >
        <span className="flex flex-col items-center justify-center gap-0 leading-none">
          <Heading2 className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[8px] font-medium text-muted-foreground">1.875rem</span>
        </span>
      </Button>
      <Button
        type="button"
        variant={activeH3 ? "secondary" : "ghost"}
        size="sm"
        className="h-auto min-h-8 w-auto px-1.5 py-1"
        onClick={() => {
          editor.chain().focus().toggleHeading({ level: 3 }).run();
        }}
        title="Heading 3 — ~1.5rem"
      >
        <span className="flex flex-col items-center justify-center gap-0 leading-none">
          <Heading3 className="h-3.5 w-3.5 shrink-0" />
          <span className="text-[8px] font-medium text-muted-foreground">1.5rem</span>
        </span>
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
        variant={editor.isActive("table") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 px-0"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        title="Insert table (3×3, header row)"
      >
        <TableIcon className="h-4 w-4" />
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
      </div>
    </div>
  );
}

function findImageAtClick(editor: Editor, clientX: number, clientY: number): {
  pos: number;
  src: string;
  alt: string;
  width: string | null;
  height: string | null;
} | null {
  const coords = editor.view.posAtCoords({ left: clientX, top: clientY });
  if (coords == null) return null;
  const { pos } = coords;
  const doc = editor.state.doc;
  const $pos = doc.resolve(pos);
  const pack = (node: { attrs: Record<string, unknown> }, p: number) => ({
    pos: p,
    src: String(node.attrs.src ?? ""),
    alt: String(node.attrs.alt ?? ""),
    width: node.attrs.width != null ? String(node.attrs.width) : null,
    height: node.attrs.height != null ? String(node.attrs.height) : null,
  });
  const nodeAfter = $pos.nodeAfter;
  if (nodeAfter?.type.name === "image") {
    return pack(nodeAfter, pos);
  }
  const nodeBefore = $pos.nodeBefore;
  if (nodeBefore?.type.name === "image") {
    const beforePos = pos - nodeBefore.nodeSize;
    return pack(nodeBefore, beforePos);
  }
  for (let d = $pos.depth; d > 0; d--) {
    const n = $pos.node(d);
    if (n.type.name === "image") {
      const start = $pos.before(d);
      return pack(n, start);
    }
  }
  return null;
}

function findBlockContextAtClick(
  editor: Editor,
  clientX: number,
  clientY: number
): { pos: number; name: string } | null {
  const coords = editor.view.posAtCoords({ left: clientX, top: clientY });
  if (coords == null) return null;
  const $pos = editor.state.doc.resolve(coords.pos);
  for (let d = $pos.depth; d > 0; d--) {
    const node = $pos.node(d);
    const name = node.type.name;
    if (
      [
        "paragraph",
        "heading",
        "blockquote",
        "codeBlock",
        "horizontalRule",
        "bulletList",
        "orderedList",
        "listItem",
        "table",
        "blogComponent",
      ].includes(name)
    ) {
      return { pos: $pos.before(d), name };
    }
  }
  return null;
}

function findBlogComponentAtClick(
  editor: Editor,
  clientX: number,
  clientY: number
): { pos: number; source: string } | null {
  const coords = editor.view.posAtCoords({ left: clientX, top: clientY });
  if (coords == null) return null;
  const $pos = editor.state.doc.resolve(coords.pos);
  const nodeAfter = $pos.nodeAfter;
  if (nodeAfter?.type.name === "blogComponent") {
    return { pos: coords.pos, source: String(nodeAfter.attrs.source ?? "") };
  }
  const nodeBefore = $pos.nodeBefore;
  if (nodeBefore?.type.name === "blogComponent") {
    return {
      pos: coords.pos - nodeBefore.nodeSize,
      source: String(nodeBefore.attrs.source ?? ""),
    };
  }
  for (let d = $pos.depth; d > 0; d--) {
    const n = $pos.node(d);
    if (n.type.name === "blogComponent") {
      return { pos: $pos.before(d), source: String(n.attrs.source ?? "") };
    }
  }
  return null;
}

export const BlogRichEditor = React.forwardRef<
  BlogRichEditorHandle,
  {
    initialMarkdown: string;
    onChange: (markdown: string) => void;
    onInsertImageClick: () => void;
    /** Fires on undo/redo stack changes so parent can refresh toolbar buttons. */
    onHistoryChange?: () => void;
    className?: string;
    editorClassName?: string;
  }
>(function BlogRichEditor(
  { initialMarkdown, onChange, onInsertImageClick, onHistoryChange, className, editorClassName },
  ref
) {
  const lastEmitted = React.useRef<string | null>(null);
  const skipEmit = React.useRef(false);
  const [ctxImage, setCtxImage] = React.useState<{
    pos: number;
    src: string;
    alt: string;
    width: string | null;
    height: string | null;
  } | null>(null);
  const [ctxBlog, setCtxBlog] = React.useState<{ pos: number; source: string } | null>(null);
  const [ctxBlock, setCtxBlock] = React.useState<{ pos: number; name: string } | null>(null);
  const [imageEditOpen, setImageEditOpen] = React.useState(false);
  const [imageEditSrc, setImageEditSrc] = React.useState("");
  const [imageEditAlt, setImageEditAlt] = React.useState("");
  const [imageEditWidth, setImageEditWidth] = React.useState("");
  const [imageEditHeight, setImageEditHeight] = React.useState("");
  const [blogCompEditOpen, setBlogCompEditOpen] = React.useState(false);
  const [blogCompDraft, setBlogCompDraft] = React.useState("");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, HTMLAttributes: { class: "list-disc pl-6 my-2 space-y-1" } },
        orderedList: { keepMarks: true, HTMLAttributes: { class: "list-decimal pl-6 my-2 space-y-1" } },
        blockquote: { HTMLAttributes: { class: "border-l-4 border-primary/40 pl-4 py-1 my-4 italic text-muted-foreground" } },
        horizontalRule: { HTMLAttributes: { class: "my-8 border-border" } },
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
        inline: false,
        allowBase64: true,
        resize: {
          enabled: true,
          minWidth: 80,
          minHeight: 48,
        },
        HTMLAttributes: {
          class:
            "rounded-xl border border-border/70 bg-muted/20 shadow-md max-w-full h-auto my-6 mx-auto block ring-offset-2 transition-shadow hover:shadow-lg",
        },
      }),
      TableKit.configure({
        table: { resizable: true },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        multicolor: false,
      }),
      BlogComponentBlock,
      Placeholder.configure({
        placeholder:
          "Start writing — headings, lists, and quotes show live. Right‑click an image to edit or remove.",
      }),
    ],
    content: markdownToHtml(initialMarkdown),
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm md:prose-base lg:prose-lg max-w-none focus:outline-none min-h-[min(50vh,22rem)] sm:min-h-[300px] px-3 py-4 sm:px-5 sm:py-5",
          "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground prose-headings:scroll-mt-20",
          "prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl",
          "prose-p:leading-[1.75] prose-p:text-foreground prose-p:my-3",
          "prose-a:text-primary prose-a:underline",
          "prose-strong:text-foreground prose-strong:font-semibold",
          "prose-ul:list-disc prose-ol:list-decimal prose-li:my-1 prose-li:marker:text-primary/80",
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none",
          "prose-pre:bg-muted/80 prose-pre:border prose-pre:rounded-xl prose-pre:p-4 prose-pre:shadow-inner",
          "prose-img:rounded-xl prose-img:border prose-img:shadow-md prose-img:my-6 prose-img:mx-auto prose-img:block",
          "prose-blockquote:border-l-primary prose-blockquote:bg-muted/25 prose-blockquote:py-2 prose-blockquote:px-3 prose-blockquote:rounded-r-xl prose-blockquote:not-italic",
          "prose-table:block prose-table:w-full prose-table:overflow-x-auto prose-table:my-4 prose-th:border prose-td:border prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-table:text-sm",
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

  React.useEffect(() => {
    if (!editor) return;
    const fn = () => onHistoryChange?.();
    editor.on("transaction", fn);
    return () => {
      editor.off("transaction", fn);
    };
  }, [editor, onHistoryChange]);

  React.useImperativeHandle(
    ref,
    () => ({
      insertImageAtCursor: (url: string, alt?: string) => {
        if (!editor) return;
        editor.chain().focus().setImage({ src: url, alt: alt || "" }).run();
      },
      insertBlogComponent: (source: string) => {
        if (!editor) return;
        editor
          .chain()
          .focus()
          .insertContent([
            { type: "blogComponent", attrs: { source } },
            { type: "paragraph" },
          ])
          .run();
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
      undo: () => {
        editor?.chain().focus().undo().run();
      },
      redo: () => {
        editor?.chain().focus().redo().run();
      },
      canUndo: () => !!editor?.can().undo(),
      canRedo: () => !!editor?.can().redo(),
    }),
    [editor, onChange]
  );

  const openImageEdit = () => {
    if (!ctxImage || !editor) return;
    setImageEditSrc(ctxImage.src);
    setImageEditAlt(ctxImage.alt);
    setImageEditWidth(ctxImage.width ?? "");
    setImageEditHeight(ctxImage.height ?? "");
    setImageEditOpen(true);
  };

  const applyImageEdit = () => {
    if (!editor || !ctxImage) return;
    const src = imageEditSrc.trim();
    if (!src) {
      return;
    }
    const w = imageEditWidth.trim();
    const h = imageEditHeight.trim();
    editor
      .chain()
      .focus()
      .setNodeSelection(ctxImage.pos)
      .updateAttributes("image", {
        src,
        alt: imageEditAlt.trim(),
        width: w ? (Number.isFinite(Number(w)) ? Number(w) : w) : null,
        height: h ? (Number.isFinite(Number(h)) ? Number(h) : h) : null,
      })
      .run();
    setImageEditOpen(false);
    const md = htmlToMarkdown(editor.getHTML());
    lastEmitted.current = md;
    onChange(md);
  };

  const openBlogCompEdit = () => {
    if (!ctxBlog) return;
    setBlogCompDraft(ctxBlog.source);
    setBlogCompEditOpen(true);
  };

  const applyBlogCompEdit = () => {
    if (!editor || !ctxBlog) return;
    editor
      .chain()
      .focus()
      .setNodeSelection(ctxBlog.pos)
      .updateAttributes("blogComponent", { source: blogCompDraft })
      .run();
    setBlogCompEditOpen(false);
    const md = htmlToMarkdown(editor.getHTML());
    lastEmitted.current = md;
    onChange(md);
  };

  const deleteBlogComp = () => {
    if (!editor || !ctxBlog) return;
    editor.chain().focus().setNodeSelection(ctxBlog.pos).deleteSelection().run();
    setCtxBlog(null);
    const md = htmlToMarkdown(editor.getHTML());
    lastEmitted.current = md;
    onChange(md);
  };

  const removeCtxImage = () => {
    if (!editor || !ctxImage) return;
    editor.chain().focus().setNodeSelection(ctxImage.pos).deleteSelection().run();
    setCtxImage(null);
    const md = htmlToMarkdown(editor.getHTML());
    lastEmitted.current = md;
    onChange(md);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Toolbar editor={editor} onInsertImageClick={onInsertImageClick} />
      <ContextMenu
        onOpenChange={(open) => {
          if (!open) {
            setCtxImage(null);
            setCtxBlog(null);
            setCtxBlock(null);
          }
        }}
      >
        <ContextMenuTrigger asChild>
          <div
            className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background/80 ring-1 ring-border/30"
            onContextMenu={(e) => {
              if (!editor) return;
              const img = findImageAtClick(editor, e.clientX, e.clientY);
              const comp = findBlogComponentAtClick(editor, e.clientX, e.clientY);
              const blk = findBlockContextAtClick(editor, e.clientX, e.clientY);
              setCtxImage(img);
              setCtxBlog(comp);
              setCtxBlock(img || comp ? null : blk);
            }}
          >
            <EditorContent
              editor={editor}
              className="blog-rich-editor min-h-[max(18rem,calc(100dvh-22rem))] overflow-y-auto sm:min-h-[max(24rem,calc(100dvh-19rem))] [&_.ProseMirror-selectednode]:ring-2 [&_.ProseMirror-selectednode]:ring-primary/50 [&_.ProseMirror-selectednode]:rounded-xl"
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="max-h-[min(70vh,28rem)] w-60 overflow-y-auto">
          {ctxImage ? (
            <>
              <ContextMenuLabel>Image</ContextMenuLabel>
              <ContextMenuItem onClick={() => openImageEdit()}>
                <Pencil className="h-4 w-4" />
                Edit URL, alt, size…
              </ContextMenuItem>
              <ContextMenuItem variant="destructive" onClick={() => removeCtxImage()}>
                <Trash2 className="h-4 w-4" />
                Remove image
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : null}
          {ctxBlog ? (
            <>
              <ContextMenuLabel>Custom block</ContextMenuLabel>
              <ContextMenuItem onClick={() => openBlogCompEdit()}>
                <Pencil className="h-4 w-4" />
                Edit source…
              </ContextMenuItem>
              <ContextMenuItem variant="destructive" onClick={() => deleteBlogComp()}>
                <Trash className="h-4 w-4" />
                Remove block
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : null}
          {editor?.isActive("table") ? (
            <>
              <ContextMenuLabel>Table</ContextMenuLabel>
              <ContextMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
                <Rows className="h-4 w-4" />
                Row before
              </ContextMenuItem>
              <ContextMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                <Rows className="h-4 w-4" />
                Row after
              </ContextMenuItem>
              <ContextMenuItem variant="destructive" onClick={() => editor.chain().focus().deleteTable().run()}>
                <Trash className="h-4 w-4" />
                Delete table
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : null}
          {ctxBlock && !ctxImage && !ctxBlog && editor ? (
            <>
              <ContextMenuLabel>Block</ContextMenuLabel>
              <ContextMenuItem
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .setTextSelection(ctxBlock.pos + 1)
                    .setTextAlign("left")
                    .run()
                }
              >
                <AlignLeft className="h-4 w-4" />
                Align left
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .setTextSelection(ctxBlock.pos + 1)
                    .setTextAlign("center")
                    .run()
                }
              >
                <AlignCenter className="h-4 w-4" />
                Align center
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .setTextSelection(ctxBlock.pos + 1)
                    .setTextAlign("right")
                    .run()
                }
              >
                <AlignRight className="h-4 w-4" />
                Align right
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .setTextSelection(ctxBlock.pos + 1)
                    .toggleHeading({ level: 1 })
                    .run()
                }
              >
                <Heading1 className="h-4 w-4" />
                Turn into Heading 1
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .setTextSelection(ctxBlock.pos + 1)
                    .toggleHeading({ level: 2 })
                    .run()
                }
              >
                <Heading2 className="h-4 w-4" />
                Turn into Heading 2
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .setTextSelection(ctxBlock.pos + 1)
                    .toggleHeading({ level: 3 })
                    .run()
                }
              >
                <Heading3 className="h-4 w-4" />
                Turn into Heading 3
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() =>
                  editor.chain().focus().setTextSelection(ctxBlock.pos + 1).setParagraph().run()
                }
              >
                <Pilcrow className="h-4 w-4" />
                Paragraph
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() =>
                  editor.chain().focus().setTextSelection(ctxBlock.pos + 1).toggleBlockquote().run()
                }
              >
                <Quote className="h-4 w-4" />
                Blockquote
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : null}
          <ContextMenuLabel>Text</ContextMenuLabel>
          <ContextMenuItem
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor}
          >
            Bold
            <ContextMenuShortcut>⌘B</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={!editor}>
            Italic
            <ContextMenuShortcut>⌘I</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={!editor}
          >
            Bullet list
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={!editor}
          >
            Numbered list
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={!editor}
          >
            Quote
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            disabled={!editor}
          >
            Code block
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() =>
              editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            disabled={!editor}
          >
            <TableIcon className="h-4 w-4" />
            Insert table
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={imageEditOpen} onOpenChange={setImageEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit image</DialogTitle>
            <DialogDescription>Update the image URL and alt text for accessibility and SEO.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="ctx-img-alt">Alt text</Label>
              <Input
                id="ctx-img-alt"
                value={imageEditAlt}
                onChange={(e) => setImageEditAlt(e.target.value)}
                placeholder="Describe the image"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctx-img-src">Image URL</Label>
              <Input
                id="ctx-img-src"
                value={imageEditSrc}
                onChange={(e) => setImageEditSrc(e.target.value)}
                placeholder="https://… or /path"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyImageEdit();
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ctx-img-w">Width (px or %)</Label>
                <Input
                  id="ctx-img-w"
                  value={imageEditWidth}
                  onChange={(e) => setImageEditWidth(e.target.value)}
                  placeholder="e.g. 480 or 80%"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctx-img-h">Height (px or %)</Label>
                <Input
                  id="ctx-img-h"
                  value={imageEditHeight}
                  onChange={(e) => setImageEditHeight(e.target.value)}
                  placeholder="e.g. 320"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              You can also drag the image handles in the editor. Sizes are stored in the post.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setImageEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => applyImageEdit()}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blogCompEditOpen} onOpenChange={setBlogCompEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit custom block</DialogTitle>
            <DialogDescription>
              JSX-style source (Callout, Gallery, …). Use the Block menu in the toolbar to insert presets.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={blogCompDraft}
            onChange={(e) => setBlogCompDraft(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
            spellCheck={false}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setBlogCompEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => applyBlogCompEdit()}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">
        Tip: select text and use the toolbar, or right‑click for block actions. Undo/redo is in the editor header.
        Drag image corners to resize.
      </p>
    </div>
  );
});

BlogRichEditor.displayName = "BlogRichEditor";

export type BlogRichEditorProps = React.ComponentProps<typeof BlogRichEditor>;
