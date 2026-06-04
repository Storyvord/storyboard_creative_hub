// STO-1854 — Kling motion-control dual input.
//
// Composes the required appearance `image` + driving `video` uploaders with the
// `character_orientation` enum (image→≤10s, video→≤30s) and the
// `keep_original_sound` toggle. All sub-specs are passed in from the catalog so
// nothing is hardcoded; this widget only arranges them into the documented pair.
import { MediaRoleSpec, VideoParamSpec, UploadedMedia } from "@/types/video";
import MediaRoleUploader from "./MediaRoleUploader";
import EnumSelect from "./EnumSelect";
import BoolToggle from "./BoolToggle";

interface MotionControlDualInputProps {
  imageSpec?: MediaRoleSpec;
  videoSpec?: MediaRoleSpec;
  orientationSpec?: VideoParamSpec;
  keepSoundSpec?: VideoParamSpec;
  scriptId: number | null;
  mediaRoles: Record<string, UploadedMedia[]>;
  onMediaChange: (role: string, files: UploadedMedia[]) => void;
  values: Record<string, unknown>;
  onValueChange: (name: string, value: unknown) => void;
}

export default function MotionControlDualInput({
  imageSpec,
  videoSpec,
  orientationSpec,
  keepSoundSpec,
  scriptId,
  mediaRoles,
  onMediaChange,
  values,
  onValueChange,
}: MotionControlDualInputProps) {
  return (
    <div className="flex flex-col gap-3 p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)]">
      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">
        Motion control
      </span>
      <div className="grid grid-cols-2 gap-3">
        {imageSpec && (
          <MediaRoleUploader
            spec={imageSpec}
            scriptId={scriptId}
            value={mediaRoles[imageSpec.role] ?? []}
            onChange={(files) => onMediaChange(imageSpec.role, files)}
          />
        )}
        {videoSpec && (
          <MediaRoleUploader
            spec={videoSpec}
            scriptId={scriptId}
            value={mediaRoles[videoSpec.role] ?? []}
            onChange={(files) => onMediaChange(videoSpec.role, files)}
          />
        )}
      </div>
      {(orientationSpec || keepSoundSpec) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5 items-center">
          {orientationSpec && (
            <EnumSelect
              spec={orientationSpec}
              label="Character orientation"
              value={values[orientationSpec.name] as string | number | undefined}
              onChange={(v) => onValueChange(orientationSpec.name, v)}
            />
          )}
          {keepSoundSpec && (
            <BoolToggle
              label="Keep original sound"
              help={keepSoundSpec.help}
              value={Boolean(values[keepSoundSpec.name])}
              onChange={(v) => onValueChange(keepSoundSpec.name, v)}
            />
          )}
        </div>
      )}
    </div>
  );
}
