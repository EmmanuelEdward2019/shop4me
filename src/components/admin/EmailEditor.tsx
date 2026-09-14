import { useRef, useState } from "react";
import { EditorContent, Node, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { BackgroundColor, Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Braces, Heading1, Heading2, Heading3,
  Highlighter, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Minus, MousePointerClick,
  Palette, Pilcrow, Quote, Redo2, RemoveFormatting, Strikethrough, Underline as UnderlineIcon,
  Undo2, Unlink, Video,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* ── Custom email blocks ────────────────────────────────────────────────────
 * Rendered as marked-up anchors. The sender turns them into email-safe
 * table buttons / clickable video thumbnails (email clients strip <video>). */
const EmailButton = Node.create({
  name: "emailButton",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { href: { default: "https://www.shop4meng.com/download" }, label: { default: "Learn more" } };
  },
  parseHTML() {
    return [{
      tag: "a[data-s4m-button]",
      getAttrs: (el) => ({
        href: (el as HTMLElement).getAttribute("href"),
        label: (el as HTMLElement).textContent,
      }),
    }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["a", {
      "data-s4m-button": "",
      href: HTMLAttributes.href,
      class: "s4m-editor-btn",
      target: "_blank",
      rel: "noopener noreferrer",
    }, HTMLAttributes.label || "Learn more"];
  },
});

const EmailVideo = Node.create({
  name: "emailVideo",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { href: { default: null }, thumbnail: { default: null }, title: { default: "Watch the video" } };
  },
  parseHTML() {
    return [{
      tag: "a[data-s4m-video]",
      getAttrs: (el) => {
        const e = el as HTMLElement;
        return {
          href: e.getAttribute("href"),
          thumbnail: e.querySelector("img")?.getAttribute("src"),
          title: e.getAttribute("title") || "Watch the video",
        };
      },
    }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["a", {
      "data-s4m-video": "",
      href: HTMLAttributes.href,
      title: HTMLAttributes.title,
      class: "s4m-editor-video",
      target: "_blank",
      rel: "noopener noreferrer",
    }, ["img", { src: HTMLAttributes.thumbnail, alt: HTMLAttributes.title }]];
  },
});

const youtubeId = (url: string): string | null => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

const editorCss = `
.s4m-email-editor .ProseMirror{min-height:360px;outline:none;padding:20px 24px;font-size:16px;line-height:1.65;color:#374151}
.s4m-email-editor .ProseMirror p{margin:0 0 14px}
.s4m-email-editor .ProseMirror h1{font-size:26px;font-weight:700;margin:0 0 14px;color:#111827;line-height:1.25}
.s4m-email-editor .ProseMirror h2{font-size:21px;font-weight:700;margin:22px 0 12px;color:#111827;line-height:1.3}
.s4m-email-editor .ProseMirror h3{font-size:18px;font-weight:700;margin:18px 0 10px;color:#111827}
.s4m-email-editor .ProseMirror ul{list-style:disc;padding-left:22px;margin:0 0 14px}
.s4m-email-editor .ProseMirror ol{list-style:decimal;padding-left:22px;margin:0 0 14px}
.s4m-email-editor .ProseMirror blockquote{border-left:4px solid #16a34a;background:#f0fdf4;padding:12px 18px;margin:18px 0;border-radius:6px}
.s4m-email-editor .ProseMirror hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
.s4m-email-editor .ProseMirror a{color:#16a34a;text-decoration:underline}
.s4m-email-editor .ProseMirror img{max-width:100%;height:auto;border-radius:10px;margin:16px auto;display:block}
.s4m-email-editor .ProseMirror img.ProseMirror-selectednode,.s4m-email-editor .ProseMirror .ProseMirror-selectednode{outline:3px solid #16a34a55;border-radius:10px}
.s4m-email-editor .ProseMirror .s4m-editor-btn{display:table;margin:22px auto;background:#16a34a;color:#fff!important;text-decoration:none!important;font-weight:700;padding:13px 28px;border-radius:10px}
.s4m-email-editor .ProseMirror .s4m-editor-video{display:block;position:relative;margin:20px auto;max-width:520px}
.s4m-email-editor .ProseMirror .s4m-editor-video img{margin:0}
.s4m-email-editor .ProseMirror .s4m-editor-video::after{content:"▶";position:absolute;inset:0;margin:auto;width:64px;height:64px;border-radius:9999px;background:rgba(0,0,0,.6);color:#fff;font-size:26px;display:flex;align-items:center;justify-content:center;padding-left:4px}
.s4m-email-editor .ProseMirror p.is-editor-empty:first-child::before{content:attr(data-placeholder);float:left;color:#9ca3af;pointer-events:none;height:0}
`;

type DialogKind = null | "link" | "image" | "video" | "button";

const ToolbarButton = ({
  onClick, active, disabled, title, children,
}: { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 transition hover:bg-muted disabled:opacity-40 ${
      active ? "bg-primary/15 text-primary" : "text-foreground/75"
    }`}
  >
    {children}
  </button>
);

const Divider = () => <span className="mx-1 h-6 w-px bg-border" aria-hidden />;

interface Props {
  value: string;
  onChange: (html: string) => void;
}

const EmailEditor = ({ value, onChange }: Props) => {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [fields, setFields] = useState({ url: "", label: "", thumbnail: "", alt: "" });
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<"image" | "thumbnail">("image");

  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TextStyle,
      Color,
      BackgroundColor,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder: "Hi {{first_name}}, write your message here…" }),
      EmailButton,
      EmailVideo,
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  if (!editor) return null;
  const ed: Editor = editor;

  const openDialog = (kind: DialogKind) => {
    const currentLink = ed.getAttributes("link").href as string | undefined;
    const selectedText = ed.state.doc.textBetween(ed.state.selection.from, ed.state.selection.to, " ");
    setFields({
      url: kind === "link" ? currentLink ?? "" : kind === "button" ? "https://www.shop4meng.com/download" : "",
      label: kind === "link" ? selectedText : kind === "button" ? "Download the app" : kind === "video" ? "Watch the video" : "",
      thumbnail: "",
      alt: "",
    });
    setDialog(kind);
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Images must be under 5 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `email/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      if (uploadTarget.current === "thumbnail") setFields((f) => ({ ...f, thumbnail: data.publicUrl }));
      else setFields((f) => ({ ...f, url: data.publicUrl }));
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const pickFile = (target: "image" | "thumbnail") => {
    uploadTarget.current = target;
    fileInput.current?.click();
  };

  const normalizeUrl = (u: string) => {
    const t = u.trim();
    if (!t) return "";
    if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
    return `https://${t}`;
  };

  const applyDialog = () => {
    const url = normalizeUrl(fields.url);
    if (dialog === "link") {
      if (!url) {
        ed.chain().focus().extendMarkRange("link").unsetLink().run();
      } else if (ed.state.selection.empty) {
        ed.chain().focus().insertContent({
          type: "text",
          text: fields.label.trim() || url,
          marks: [{ type: "link", attrs: { href: url } }],
        }).run();
      } else {
        ed.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
      }
    } else if (dialog === "image") {
      if (!url) return toast.error("Upload an image or paste an image URL");
      ed.chain().focus().setImage({ src: url, alt: fields.alt.trim() || undefined }).run();
    } else if (dialog === "button") {
      if (!url) return toast.error("Add the button link");
      ed.chain().focus().insertContent({ type: "emailButton", attrs: { href: url, label: fields.label.trim() || "Learn more" } }).run();
    } else if (dialog === "video") {
      if (!url) return toast.error("Paste the video link");
      const yt = youtubeId(url);
      const thumbnail = fields.thumbnail.trim() || (yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : "");
      if (!thumbnail) return toast.error("Add a thumbnail image for non-YouTube videos");
      ed.chain().focus().insertContent({
        type: "emailVideo",
        attrs: { href: url, thumbnail, title: fields.label.trim() || "Watch the video" },
      }).run();
    }
    setDialog(null);
  };

  const headingValue = ed.isActive("heading", { level: 1 }) ? "h1"
    : ed.isActive("heading", { level: 2 }) ? "h2"
      : ed.isActive("heading", { level: 3 }) ? "h3" : "p";
  const currentColor = (ed.getAttributes("textStyle").color as string | undefined) ?? "#374151";
  const currentHighlight = (ed.getAttributes("textStyle").backgroundColor as string | undefined) ?? "#fef08a";
  const currentSize = (ed.getAttributes("textStyle").fontSize as string | undefined) ?? "default";
  const ytPreview = dialog === "video" ? youtubeId(fields.url) : null;

  return (
    <div className="s4m-email-editor overflow-hidden rounded-xl border border-border bg-white">
      <style>{editorCss}</style>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadFile(f);
          e.target.value = "";
        }}
      />

      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
        <ToolbarButton title="Undo" onClick={() => ed.chain().focus().undo().run()} disabled={!ed.can().undo()}><Undo2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => ed.chain().focus().redo().run()} disabled={!ed.can().redo()}><Redo2 className="h-4 w-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Paragraph" active={headingValue === "p"} onClick={() => ed.chain().focus().setParagraph().run()}><Pilcrow className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Heading 1" active={headingValue === "h1"} onClick={() => ed.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Heading 2" active={headingValue === "h2"} onClick={() => ed.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Heading 3" active={headingValue === "h3"} onClick={() => ed.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolbarButton>
        <Select
          value={currentSize}
          onValueChange={(v) => (v === "default" ? ed.chain().focus().unsetFontSize().run() : ed.chain().focus().setFontSize(v).run())}
        >
          <SelectTrigger className="ml-1 h-8 w-[92px] text-xs" title="Font size"><SelectValue placeholder="Size" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Size</SelectItem>
            {["13px", "15px", "18px", "22px", "28px", "34px"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Divider />
        <ToolbarButton title="Bold" active={ed.isActive("bold")} onClick={() => ed.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Italic" active={ed.isActive("italic")} onClick={() => ed.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Underline" active={ed.isActive("underline")} onClick={() => ed.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Strikethrough" active={ed.isActive("strike")} onClick={() => ed.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarButton>
        <label title="Text colour" className="relative inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-1.5 text-foreground/75 hover:bg-muted">
          <Palette className="h-4 w-4" style={{ color: currentColor }} />
          <input type="color" value={currentColor} onChange={(e) => ed.chain().focus().setColor(e.target.value).run()} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Text colour" />
        </label>
        <label title="Highlight" className="relative inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-1.5 text-foreground/75 hover:bg-muted">
          <Highlighter className="h-4 w-4" />
          <input type="color" value={currentHighlight} onChange={(e) => ed.chain().focus().setBackgroundColor(e.target.value).run()} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Highlight colour" />
        </label>
        <ToolbarButton title="Clear formatting" onClick={() => ed.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="h-4 w-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Align left" active={ed.isActive({ textAlign: "left" })} onClick={() => ed.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Align centre" active={ed.isActive({ textAlign: "center" })} onClick={() => ed.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Align right" active={ed.isActive({ textAlign: "right" })} onClick={() => ed.chain().focus().setTextAlign("right").run()}><AlignRight className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Justify" active={ed.isActive({ textAlign: "justify" })} onClick={() => ed.chain().focus().setTextAlign("justify").run()}><AlignJustify className="h-4 w-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Bullet list" active={ed.isActive("bulletList")} onClick={() => ed.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Numbered list" active={ed.isActive("orderedList")} onClick={() => ed.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Quote" active={ed.isActive("blockquote")} onClick={() => ed.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Divider" onClick={() => ed.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolbarButton>
        <Divider />
        <ToolbarButton title="Insert / edit link" active={ed.isActive("link")} onClick={() => openDialog("link")}><Link2 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Remove link" disabled={!ed.isActive("link")} onClick={() => ed.chain().focus().extendMarkRange("link").unsetLink().run()}><Unlink className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Insert image" onClick={() => openDialog("image")}><ImagePlus className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Insert video" onClick={() => openDialog("video")}><Video className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Insert button" onClick={() => openDialog("button")}><MousePointerClick className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton title="Insert first name" onClick={() => ed.chain().focus().insertContent("{{first_name}}").run()}><Braces className="h-4 w-4" /></ToolbarButton>
      </div>

      <EditorContent editor={ed} />

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog === "link" && "Insert link"}
              {dialog === "image" && "Insert image"}
              {dialog === "video" && "Insert video"}
              {dialog === "button" && "Insert button"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {dialog === "image" && (
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => pickFile("image")} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Upload from computer
              </Button>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="s4m-url">
                {dialog === "image" ? "…or image URL" : dialog === "video" ? "Video link (YouTube, TikTok, Instagram…)" : "Link URL"}
              </Label>
              <Input
                id="s4m-url"
                autoFocus
                value={fields.url}
                placeholder={dialog === "video" ? "https://youtube.com/watch?v=…" : "https://"}
                onChange={(e) => setFields((f) => ({ ...f, url: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && applyDialog()}
              />
            </div>

            {(dialog === "link" || dialog === "button" || dialog === "video") && (
              <div className="space-y-1.5">
                <Label htmlFor="s4m-label">
                  {dialog === "link" ? "Link text" : dialog === "button" ? "Button text" : "Video caption / button text"}
                </Label>
                <Input id="s4m-label" value={fields.label} onChange={(e) => setFields((f) => ({ ...f, label: e.target.value }))} />
              </div>
            )}

            {dialog === "image" && (
              <div className="space-y-1.5">
                <Label htmlFor="s4m-alt">Description (for accessibility)</Label>
                <Input id="s4m-alt" value={fields.alt} onChange={(e) => setFields((f) => ({ ...f, alt: e.target.value }))} />
              </div>
            )}

            {dialog === "video" && (
              <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Email apps can't play video inline, so this shows a clickable thumbnail that opens the video.
                  {ytPreview ? " YouTube thumbnails are added automatically." : " Add a thumbnail for non-YouTube links."}
                </p>
                {!ytPreview && (
                  <>
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => pickFile("thumbnail")} disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      Upload thumbnail
                    </Button>
                    <Input value={fields.thumbnail} placeholder="…or thumbnail image URL" onChange={(e) => setFields((f) => ({ ...f, thumbnail: e.target.value }))} />
                  </>
                )}
                {(ytPreview || fields.thumbnail) && (
                  <img
                    src={fields.thumbnail || `https://img.youtube.com/vi/${ytPreview}/hqdefault.jpg`}
                    alt="Thumbnail preview"
                    className="w-full rounded-md"
                  />
                )}
              </div>
            )}

            {dialog === "image" && fields.url && (
              <img src={fields.url} alt="Preview" className="max-h-48 w-full rounded-md object-contain" />
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button type="button" onClick={applyDialog} disabled={uploading}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailEditor;
