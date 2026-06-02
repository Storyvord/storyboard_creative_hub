// STO-1854 — Dynamic, schema-driven video form.
//
// Renders inputs PURELY from the selected model's `parameters` + `media_roles`
// via a widget registry. A field absent from the spec is never rendered — that
// is the "only supported options" guarantee. The widget is chosen by
// `param.ui_widget` (override) then a `type`-based default.
//
// State is controlled by the parent (page) so it can run the cost preflight and
// build the submit payload. The shared `prompt` lives in the bottom-bar
// MentionInput, so it is excluded here by default.
import { useMemo } from "react";
import {
  VideoModel,
  VideoParamSpec,
  MediaRoleSpec,
  UploadedMedia,
  ElementInput,
} from "@/types/video";
import { VideoFormState } from "./payload";
import { buildTag } from "./payload";
import EnumSelect from "./fields/EnumSelect";
import BoolToggle from "./fields/BoolToggle";
import NumberSlider from "./fields/NumberSlider";
import TextField from "./fields/TextField";
import TextArea from "./fields/TextArea";
import SeedField from "./fields/SeedField";
import MultiPromptShotEditor, { ShotRow } from "./fields/MultiPromptShotEditor";
import MediaRoleUploader from "./fields/MediaRoleUploader";
import ElementsEditor from "./fields/ElementsEditor";
import CharacterLibraryPicker from "./fields/CharacterLibraryPicker";
import MotionControlDualInput from "./fields/MotionControlDualInput";

interface DynamicVideoFormProps {
  model: VideoModel;
  state: VideoFormState;
  onStateChange: (next: VideoFormState) => void;
  scriptId: number | null;
  /** Insert an in-prompt reference tag (chip click) into the shared prompt. */
  onInsertTag?: (tag: string) => void;
  /** Params handled elsewhere (the shared prompt input). */
  excludeParams?: string[];
}

function prettyLabel(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\burl\b/gi, "")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Pick a widget for a param: explicit ui_widget hint, else type-based. */
function widgetFor(spec: VideoParamSpec): string {
  if (spec.ui_widget) return spec.ui_widget;
  switch (spec.type) {
    case "enum":
      return "select";
    case "bool":
      return "toggle";
    case "int":
    case "float":
      return typeof spec.min === "number" && typeof spec.max === "number" ? "slider" : "number";
    case "list":
      return "list";
    case "string":
    default:
      return "text";
  }
}

/**
 * Layout span for a param so each control is sized to its purpose rather than a
 * full-width bar. Grid is 2 cols (mobile) / 3 cols (sm+).
 *  - compact (col-span-1): small box — enum selectors (duration, resolution,
 *    aspect ratio, shot type), toggles, seed, bare numbers.
 *  - medium (col-span-2): sliders (need track + readout) and free single-line text.
 *  - full (col-span-full): textareas, repeatable list editors, opaque path data.
 */
function spanFor(spec: VideoParamSpec): string {
  switch (widgetFor(spec)) {
    case "textarea":
    case "list":
    case "motion_path":
      return "col-span-full";
    case "slider":
    case "text":
      return "col-span-2";
    case "select":
    case "toggle":
    case "number":
    case "seed":
    default:
      return "col-span-1";
  }
}

const MOTION_ROLES = new Set(["image", "video"]);

export default function DynamicVideoForm({
  model,
  state,
  onStateChange,
  scriptId,
  onInsertTag,
  excludeParams = ["prompt"],
}: DynamicVideoFormProps) {
  const { values, mediaRoles, elements, characterIds } = state;

  const setValue = (name: string, value: unknown) =>
    onStateChange({ ...state, values: { ...values, [name]: value } });
  const setMedia = (role: string, files: UploadedMedia[]) =>
    onStateChange({ ...state, mediaRoles: { ...mediaRoles, [role]: files } });
  const setElements = (els: ElementInput[]) => onStateChange({ ...state, elements: els });
  const setCharacterIds = (ids: (string | number)[]) =>
    onStateChange({ ...state, characterIds: ids });

  const isGated = model.status === "gated" || !model.is_selectable;
  const isMotionControl = model.operation === "motion_control";

  // Split media roles into "motion-control pair" (rendered by the composite
  // widget) and the rest (single/multi uploaders).
  const { motionRoles, otherRoles } = useMemo(() => {
    const motion: Record<string, MediaRoleSpec> = {};
    const other: MediaRoleSpec[] = [];
    for (const r of model.media_roles) {
      if (isMotionControl && MOTION_ROLES.has(r.role)) motion[r.role] = r;
      else other.push(r);
    }
    return { motionRoles: motion, otherRoles: other };
  }, [model, isMotionControl]);

  // Params consumed by the motion-control composite widget so we don't render
  // them twice.
  const motionConsumedParams = useMemo(() => {
    if (!isMotionControl) return new Set<string>();
    return new Set(["character_orientation", "keep_original_sound"]);
  }, [isMotionControl]);

  const tagFor = (type: string, n: number) =>
    buildTag(model.reference_tag_format, type, n);

  // In-prompt media reference tags (@Image1/@Video1/@Audio1) are a
  // reference-to-video feature: those media are cited in the prompt. For
  // image-to-video the `image`/`end_image` roles are POSITIONAL frames (start/
  // end), not prompt-referenced — so they must not show a tag chip (otherwise
  // the start frame shows @Image1 while the end frame shows nothing).
  const usesReferenceTags = model.operation === "reference_to_video";

  const renderParam = (spec: VideoParamSpec) => {
    if (excludeParams.includes(spec.name)) return null;
    if (motionConsumedParams.has(spec.name)) return null;
    const widget = widgetFor(spec);
    const label = prettyLabel(spec.name);
    const key = `param-${spec.name}`;

    switch (widget) {
      case "select":
        return (
          <EnumSelect
            key={key}
            spec={spec}
            label={label}
            value={values[spec.name] as string | number | undefined}
            onChange={(v) => setValue(spec.name, v)}
          />
        );
      case "toggle":
        return (
          <BoolToggle
            key={key}
            label={label}
            help={spec.help}
            value={values[spec.name] === undefined ? Boolean(spec.default) : Boolean(values[spec.name])}
            onChange={(v) => setValue(spec.name, v)}
          />
        );
      case "slider":
      case "number":
        return (
          <NumberSlider
            key={key}
            spec={spec}
            label={label}
            value={values[spec.name] as number | undefined}
            onChange={(v) => setValue(spec.name, v)}
          />
        );
      case "textarea":
        return (
          <TextArea
            key={key}
            spec={spec}
            label={label}
            value={values[spec.name] as string | undefined}
            onChange={(v) => setValue(spec.name, v)}
          />
        );
      case "list":
        // Multi-prompt shot list (item_schema with prompt + duration).
        if (spec.item_schema?.some((s) => s.name === "prompt")) {
          return (
            <MultiPromptShotEditor
              key={key}
              spec={spec}
              label={label}
              value={values[spec.name] as ShotRow[] | undefined}
              onChange={(rows) => setValue(spec.name, rows)}
            />
          );
        }
        // Other lists fall through to a generic text area of comma values.
        return (
          <TextArea
            key={key}
            spec={spec}
            label={label}
            value={(values[spec.name] as string[] | undefined)?.join(", ")}
            onChange={(v) =>
              setValue(spec.name, v.split(",").map((s) => s.trim()).filter(Boolean))
            }
          />
        );
      case "seed":
        return (
          <SeedField
            key={key}
            spec={spec}
            label={label}
            value={values[spec.name] as number | undefined}
            onChange={(v) => setValue(spec.name, v)}
          />
        );
      case "motion_path":
        // No drawing canvas this round — accept opaque data via a text field so
        // a declared motion_path param still round-trips (PRD out-of-scope note).
        return (
          <TextField
            key={key}
            spec={spec}
            label={`${label} (path data)`}
            value={values[spec.name] as string | undefined}
            onChange={(v) => setValue(spec.name, v)}
          />
        );
      case "text":
      default:
        // Seed params often declare name "seed" without a ui_widget hint.
        if (spec.name === "seed") {
          return (
            <SeedField
              key={key}
              spec={spec}
              label={label}
              value={values[spec.name] as number | undefined}
              onChange={(v) => setValue(spec.name, v)}
            />
          );
        }
        return (
          <TextField
            key={key}
            spec={spec}
            label={label}
            value={values[spec.name] as string | undefined}
            onChange={(v) => setValue(spec.name, v)}
          />
        );
    }
  };

  // Element item schema (Kling). Falls back to a single image_url field when the
  // seed doesn't expose the sub-schema (combo element is partially unconfirmed).
  const elementItemSchema: VideoParamSpec[] = useMemo(() => {
    const elemParam = model.parameters.find((p) => p.name === "elements");
    if (elemParam?.item_schema?.length) return elemParam.item_schema;
    return [{ name: "frontal_image_url", type: "string" }];
  }, [model]);

  return (
    <div className="flex flex-col gap-3">
      {/* Motion-control composite (image + video + orientation + sound) */}
      {isMotionControl && (motionRoles.image || motionRoles.video) && (
        <MotionControlDualInput
          imageSpec={motionRoles.image}
          videoSpec={motionRoles.video}
          orientationSpec={model.parameters.find((p) => p.name === "character_orientation")}
          keepSoundSpec={model.parameters.find((p) => p.name === "keep_original_sound")}
          scriptId={scriptId}
          mediaRoles={mediaRoles}
          onMediaChange={setMedia}
          values={values}
          onValueChange={setValue}
        />
      )}

      {/* Media-role uploaders (start/end frames, R2V multi-uploaders) */}
      {otherRoles.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {otherRoles.map((role) => (
            <MediaRoleUploader
              key={`role-${role.role}`}
              spec={role}
              scriptId={scriptId}
              value={mediaRoles[role.role] ?? []}
              onChange={(files) => setMedia(role.role, files)}
              tagFor={usesReferenceTags ? tagFor : undefined}
              onInsertTag={usesReferenceTags ? onInsertTag : undefined}
            />
          ))}
        </div>
      )}

      {/* Declared parameters — proportional grid. Compact controls (duration,
          resolution, aspect ratio, seed, toggles) sit in small boxes; long text
          and repeatable editors span the full row. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-3 items-start">
        {model.parameters.map((spec) => {
          const el = renderParam(spec);
          if (!el) return null;
          return (
            <div key={`cell-${spec.name}`} className={spanFor(spec)}>
              {el}
            </div>
          );
        })}
      </div>

      {/* Kling identity elements */}
      {model.supports_elements && model.max_elements > 0 && (
        <ElementsEditor
          itemSchema={elementItemSchema}
          maxElements={model.max_elements}
          scriptId={scriptId}
          value={elements}
          onChange={setElements}
          tagFor={(n) => buildTag(model.reference_tag_format || "@Element{n}", "Element", n)}
          onInsertTag={onInsertTag}
        />
      )}

      {/* Character library (gated/disabled message when unsupported) */}
      {(model.supports_character_id || model.operation === "reference_to_video") && (
        <CharacterLibraryPicker
          supportsCharacterId={model.supports_character_id}
          maxCharacters={model.max_characters_per_generation}
          gated={isGated || model.status === "gated"}
          value={characterIds}
          onChange={setCharacterIds}
        />
      )}
    </div>
  );
}
