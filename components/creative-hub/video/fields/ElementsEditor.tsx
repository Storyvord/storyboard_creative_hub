// STO-1854 — Kling identity `elements` editor.
//
// Elements are rendered from the spec's `item_schema` (per the catalog), capped
// at `max_elements`, and each inserts an `@Element{n}` tag (built from
// `reference_tag_format`) into the prompt. The element shape is loose — a combo
// element may carry a frontal image + reference images OR a video — so each
// sub-field is uploaded as a media URL and stored under its declared name.
import { useRef, useState } from "react";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";
import { toast } from "react-toastify";
import { VideoParamSpec, ElementInput } from "@/types/video";
import { uploadVideoMedia } from "@/services/video";
import { extractApiError } from "@/lib/extract-api-error";

interface ElementsEditorProps {
  itemSchema: VideoParamSpec[];
  maxElements: number;
  scriptId: number | null;
  value: ElementInput[];
  onChange: (value: ElementInput[]) => void;
  /** Build the @Element{n} tag from reference_tag_format. */
  tagFor: (oneBasedIndex: number) => string;
  onInsertTag?: (tag: string) => void;
}

export default function ElementsEditor({
  itemSchema,
  maxElements,
  scriptId,
  value,
  onChange,
  tagFor,
  onInsertTag,
}: ElementsEditorProps) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileRef = useRef<{ idx: number; field: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sub-fields that hold media URLs (heuristic: name contains "url"/"image"/
  // "video"). Everything else renders as a text input. Driven by item_schema.
  const isMediaField = (s: VideoParamSpec) =>
    /url|image|video/i.test(s.name) && s.type !== "list";

  const addElement = () => onChange([...value, {}]);
  const removeElement = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const updateField = (idx: number, field: string, v: unknown) =>
    onChange(value.map((el, i) => (i === idx ? { ...el, [field]: v } : el)));

  const triggerUpload = (idx: number, field: string) => {
    fileRef.current = { idx, field };
    inputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    if (!scriptId || !fileRef.current) return;
    const { idx, field } = fileRef.current;
    setUploadingKey(`${idx}-${field}`);
    try {
      const media = await uploadVideoMedia(scriptId, file);
      if (!media.url) throw new Error("Upload returned no URL");
      updateField(idx, field, media.url);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to upload element media"));
    } finally {
      setUploadingKey(null);
      fileRef.current = null;
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        Identity elements{" "}
        <span className="normal-case font-normal">
          ({value.length}/{maxElements})
        </span>
      </span>

      <div className="flex flex-col gap-2">
        {value.map((el, idx) => {
          const tag = tagFor(idx + 1);
          return (
            <div
              key={idx}
              className="flex flex-col gap-2 p-2 rounded-md border border-[var(--border)] bg-[var(--surface)]"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onInsertTag?.(tag)}
                  title={`Insert ${tag} into the prompt`}
                  className="flex items-center gap-1 text-[10px] font-mono text-amber-400 hover:text-amber-300"
                >
                  <Tag className="w-2.5 h-2.5" /> {tag}
                </button>
                <button
                  type="button"
                  onClick={() => removeElement(idx)}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  aria-label={`Remove element ${idx + 1}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {itemSchema.map((s) => {
                const key = `${idx}-${s.name}`;
                if (isMediaField(s)) {
                  const url = el[s.name] as string | undefined;
                  return (
                    <div key={s.name} className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] w-24">
                        {s.name.replace(/_/g, " ")}
                      </span>
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={s.name} className="w-9 h-9 rounded object-cover bg-[var(--background)]" />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => triggerUpload(idx, s.name)}
                        className="px-2 py-1 text-[10px] rounded border border-dashed border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-emerald-400 hover:border-emerald-500/40 transition-colors flex items-center gap-1"
                      >
                        {uploadingKey === key ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                        {url ? "Replace" : "Upload"}
                      </button>
                    </div>
                  );
                }
                return (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] w-24">
                      {s.name.replace(/_/g, " ")}
                    </span>
                    <input
                      type="text"
                      value={(el[s.name] as string) ?? ""}
                      onChange={(e) => updateField(idx, s.name, e.target.value)}
                      placeholder={s.help}
                      className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)] px-2 py-1 outline-none focus:border-emerald-500/40"
                    />
                  </div>
                );
              })}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addElement}
          disabled={value.length >= maxElements}
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-dashed border-[var(--border-hover)] text-[11px] text-[var(--text-secondary)] hover:text-emerald-400 hover:border-emerald-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" /> Add element
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
