// STO-1854 — Character library picker (Seedance `character_id`).
//
// The create-character endpoint is gated behind fal early-access, so the FE
// renders this DISABLED with a clear "gated" message whenever the model can't
// accept characters (supports_character_id===false) or the model status is
// gated. It never produces a payload the server would 400. When the flag opens
// and `supports_character_id===true`, owned `ready` VideoCharacters become
// selectable up to `max_characters_per_generation`.
import { Lock, Users } from "lucide-react";

export interface VideoLibraryCharacter {
  id: string | number;
  name: string;
  status: "pending" | "ready" | "failed" | "disabled";
  thumbnail?: string | null;
}

interface CharacterLibraryPickerProps {
  supportsCharacterId: boolean;
  maxCharacters: number;
  gated: boolean;
  /** Owned characters (empty until the gated flow opens). */
  characters?: VideoLibraryCharacter[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
}

export default function CharacterLibraryPicker({
  supportsCharacterId,
  maxCharacters,
  gated,
  characters = [],
  value,
  onChange,
}: CharacterLibraryPickerProps) {
  const disabled = !supportsCharacterId || gated;

  if (disabled) {
    return (
      <div className="flex items-start gap-2 p-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] opacity-80">
        <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Character library
          </span>
          <p className="text-[10px] text-[var(--text-muted)] leading-snug">
            {supportsCharacterId
              ? "This operation is in provider early-access. Reusable characters will be selectable once enabled."
              : "This model doesn't support reusable characters. Use identity elements or reference media instead."}
          </p>
        </div>
      </div>
    );
  }

  const toggle = (id: string | number) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else if (value.length < maxCharacters) {
      onChange([...value, id]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        <Users className="w-3 h-3 inline mr-1" />
        Character library{" "}
        <span className="normal-case font-normal">
          ({value.length}/{maxCharacters})
        </span>
      </span>
      {characters.length === 0 ? (
        <p className="text-[10px] text-[var(--text-muted)] italic">
          No ready characters in your library yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {characters.map((c) => {
            const selected = value.includes(c.id);
            const selectable = c.status === "ready";
            return (
              <button
                key={c.id}
                type="button"
                disabled={!selectable}
                onClick={() => toggle(c.id)}
                className={`flex items-center gap-1.5 rounded-lg pl-1 pr-2 py-1 border transition-colors ${
                  selected
                    ? "bg-emerald-500/15 border-emerald-500/50"
                    : "bg-[var(--surface-hover)] border-[var(--border)] hover:border-[var(--border-hover)]"
                } ${selectable ? "" : "opacity-40 cursor-not-allowed"}`}
              >
                {c.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnail} alt={c.name} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <Users className="w-4 h-4 text-[var(--text-muted)]" />
                )}
                <span className="text-[11px] text-[var(--text-primary)]">{c.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
