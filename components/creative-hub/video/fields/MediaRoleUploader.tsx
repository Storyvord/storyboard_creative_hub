// STO-1854 — Media-role uploader (single or multi).
//
// Renders one uploader per declared media_role. Files are validated against the
// role's mime_types/max_bytes client-side, uploaded to hosted URLs, and tracked
// as UploadedMedia. For tag-addressable roles (image/video/audio in Seedance
// R2V) a chip per file inserts the in-prompt tag (@Image1, @Video1, …) built
// from `reference_tag_format`.
import { useRef, useState } from "react";
import { Loader2, Plus, X, Tag, History } from "lucide-react";
import { toast } from "react-toastify";
import { MediaRoleSpec, UploadedMedia } from "@/types/video";
import { uploadVideoMedia } from "@/services/video";
import { extractApiError } from "@/lib/extract-api-error";
import VideoHistoryImagePicker from "./VideoHistoryImagePicker";

interface MediaRoleUploaderProps {
  spec: MediaRoleSpec;
  scriptId: number | null;
  value: UploadedMedia[];
  onChange: (value: UploadedMedia[]) => void;
  /** Optional: build + insert the in-prompt tag for a file at index i. */
  tagFor?: (roleLabel: string, oneBasedIndex: number) => string;
  onInsertTag?: (tag: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  start_image: "Start frame",
  end_image: "End frame",
  image: "Image",
  video: "Video",
  audio: "Audio",
  element: "Element",
};

const ROLE_TAG_NAME: Record<string, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
};

function prettyRole(role: string): string {
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ");
}

function acceptFor(spec: MediaRoleSpec): string | undefined {
  if (spec.mime_types && spec.mime_types.length > 0) return spec.mime_types.join(",");
  if (spec.role === "video") return "video/*";
  if (spec.role === "audio") return "audio/*";
  return "image/*";
}

// STO-1854: the "From history" picker serves stills only — gate it to image
// roles. Explicit allow-list of image roles, plus a defensive check that the
// resolved `accept` is image-only (never offer it for video/audio roles).
const IMAGE_ROLES = new Set(["start_image", "end_image", "image"]);
function isImageRole(spec: MediaRoleSpec): boolean {
  if (spec.role === "video" || spec.role === "audio") return false;
  if (IMAGE_ROLES.has(spec.role)) return true;
  const accept = acceptFor(spec);
  return accept === "image/*";
}

export default function MediaRoleUploader({
  spec,
  scriptId,
  value,
  onChange,
  tagFor,
  onInsertTag,
}: MediaRoleUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const max = spec.max_count ?? 1;
  const isMulti = max > 1;
  const label = prettyRole(spec.role);
  const tagName = ROLE_TAG_NAME[spec.role];
  // "From history" is offered for image roles only (stills); never video/audio.
  const allowHistory = isImageRole(spec);

  // Collect every failing rule across the whole batch so we surface ONE
  // consolidated toast instead of one per file/rule. Returns the files that
  // passed plus a single newline-joined issue string (null when all valid).
  const validate = (files: File[]): { valid: File[]; issues: string | null } => {
    const valid: File[] = [];
    const issues: string[] = [];
    for (const file of files) {
      if (spec.mime_types && spec.mime_types.length > 0 && file.type && !spec.mime_types.includes(file.type)) {
        issues.push(`${file.name}: unsupported type ${file.type}. Allowed: ${spec.mime_types.join(", ")}`);
        continue;
      }
      if (spec.max_bytes && file.size > spec.max_bytes) {
        const mb = (spec.max_bytes / (1024 * 1024)).toFixed(0);
        issues.push(`${file.name}: exceeds ${mb} MB limit.`);
        continue;
      }
      valid.push(file);
    }
    return { valid, issues: issues.length > 0 ? issues.join("\n") : null };
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!scriptId) {
      toast.error("Open a script first.");
      return;
    }
    const incoming = Array.from(files);
    const room = max - value.length;
    if (room <= 0) {
      toast.error(`${label}: at most ${max} file${max > 1 ? "s" : ""}.`);
      return;
    }
    const slice = incoming.slice(0, room);
    const { valid, issues } = validate(slice);
    if (issues) toast.error(issues);
    if (valid.length === 0) return;
    setUploading((n) => n + valid.length);
    // Accumulate within the batch so multiple files selected at once all land
    // (a per-iteration onChange against the stale `value` would clobber prior
    // uploads). Commit once at the end for multi; replace for single.
    const uploaded: UploadedMedia[] = [];
    for (const file of valid) {
      try {
        const media = await uploadVideoMedia(scriptId, file);
        if (!media.url) throw new Error("Upload returned no URL");
        uploaded.push(media);
      } catch (err) {
        toast.error(extractApiError(err, `Failed to upload ${file.name}`));
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (uploaded.length === 0) return;
    onChange(isMulti ? [...value, ...uploaded].slice(0, max) : [uploaded[uploaded.length - 1]]);
  };

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  // STO-1854: append a history-picked still as already-hosted media — no
  // re-upload, so mime/bytes are null (the backend tolerates hosted URLs and
  // skips mime/size checks when metadata is absent). Mirrors the upload commit:
  // replace for single, append + cap for multi.
  const handleHistoryPick = (image: { url: string; description: string | null }) => {
    if (!image.url) return;
    if (value.some((m) => m.url === image.url)) {
      toast.info(`${label}: that image is already added.`);
      return;
    }
    const picked: UploadedMedia = {
      url: image.url,
      mime: undefined,
      bytes: undefined,
      name: image.description ?? undefined,
    };
    onChange(isMulti ? [...value, picked].slice(0, max) : [picked]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          {label}
          {spec.required ? <span className="text-emerald-500 ml-0.5">*</span> : null}
          {isMulti ? (
            <span className="ml-1 normal-case font-normal">
              ({value.length}/{max})
            </span>
          ) : null}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {value.map((m, idx) => {
          const num = idx + 1;
          const tag =
            tagName && tagFor ? tagFor(tagName, num) : undefined;
          const isVideo = m.mime?.startsWith("video/") || spec.role === "video";
          const isAudio = m.mime?.startsWith("audio/") || spec.role === "audio";
          return (
            <div
              key={`${m.url}-${idx}`}
              className="relative flex items-center gap-1.5 rounded-lg pl-1 pr-1.5 py-1 bg-[var(--surface-hover)] border border-[var(--border)]"
              title={m.name}
            >
              {isAudio ? (
                <div className="w-9 h-9 rounded bg-[var(--background)] flex items-center justify-center text-[9px] text-[var(--text-muted)]">
                  ♪
                </div>
              ) : isVideo ? (
                <video src={m.url} className="w-9 h-9 rounded object-cover bg-[var(--background)]" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={m.name || label} className="w-9 h-9 rounded object-cover bg-[var(--background)]" />
              )}
              {tag ? (
                <button
                  type="button"
                  onClick={() => onInsertTag?.(tag)}
                  title={`Insert ${tag} into the prompt`}
                  className="flex items-center gap-0.5 text-[10px] font-mono text-amber-400 hover:text-amber-300"
                >
                  <Tag className="w-2.5 h-2.5" /> {tag}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => remove(idx)}
                className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label={`Remove ${label} ${num}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {Array.from({ length: uploading }).map((_, i) => (
          <div
            key={`up-${i}`}
            className="w-[60px] h-[44px] rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center"
          >
            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!scriptId}
            className="w-[60px] h-[44px] rounded-lg border border-dashed border-[var(--border-hover)] text-[var(--text-muted)] hover:text-emerald-400 hover:border-emerald-500/40 transition-colors flex items-center justify-center disabled:opacity-40"
            title={`Upload ${label.toLowerCase()}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* STO-1854: pick an existing still from history (image roles only). */}
        {allowHistory && value.length < max && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            disabled={!scriptId}
            className="h-[44px] px-2 rounded-lg border border-dashed border-[var(--border-hover)] text-[10px] font-medium text-[var(--text-muted)] hover:text-emerald-400 hover:border-emerald-500/40 transition-colors flex items-center gap-1 disabled:opacity-40"
            title={`Pick ${label.toLowerCase()} from history`}
          >
            <History className="w-3.5 h-3.5" />
            <span>From history</span>
          </button>
        )}
      </div>

      {spec.notes ? (
        <p className="text-[10px] text-[var(--text-muted)] leading-snug">{spec.notes}</p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={acceptFor(spec)}
        multiple={isMulti}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {allowHistory && scriptId != null && (
        <VideoHistoryImagePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          scriptId={scriptId}
          roleLabel={label}
          onPick={handleHistoryPick}
        />
      )}
    </div>
  );
}
