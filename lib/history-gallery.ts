// Shared layout primitives for the full-screen "View History" galleries
// (ScriptHistoryModal + Creative Space "View History"). Mirrors the
// studio_frontend ProjectHistory page: Pinterest-style masonry columns, tiles
// at their natural aspect ratio (never cropped to a box), grouped by day.

// Pinterest-style masonry columns (responsive). Items keep their natural
// height and pack vertically; column-gap via `gap-3`, row-gap via tile mb-3.
export const MASONRY_COLS =
    "columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6";

/** Parse a "W:H" aspect-ratio string to {w,h} (default 16:9). */
export function parseAspectRatio(ratio: string | null | undefined): {
    w: number;
    h: number;
} {
    const [w, h] = String(ratio ?? "").split(":").map(Number);
    if (w > 0 && h > 0) return { w, h };
    return { w: 16, h: 9 };
}

/** A row carries a "reference" marker when its notes/description say so. */
export function isReferencePreviz(row: {
    notes?: string | null;
    description?: string | null;
}): boolean {
    return /reference/i.test(`${row.notes ?? ""} ${row.description ?? ""}`);
}

/**
 * Bucket items by day — "Today" / "Yesterday" / "Mon D, YYYY" — preserving the
 * incoming order within each bucket. `getDate` extracts the ISO timestamp.
 */
export function groupByDay<T>(
    items: T[],
    getDate: (item: T) => string | null | undefined,
): { label: string; items: T[] }[] {
    const startOfDay = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const today = startOfDay(new Date());
    const yesterday = today - 86_400_000;
    const groups = new Map<string, T[]>();
    const order: string[] = [];
    for (const item of items) {
        const raw = getDate(item);
        const date = raw ? new Date(raw) : new Date(NaN);
        const label = Number.isNaN(date.getTime())
            ? "Earlier"
            : (() => {
                  const day = startOfDay(date);
                  if (day === today) return "Today";
                  if (day === yesterday) return "Yesterday";
                  return date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                  });
              })();
        if (!groups.has(label)) {
            groups.set(label, []);
            order.push(label);
        }
        groups.get(label)!.push(item);
    }
    return order.map((label) => ({ label, items: groups.get(label)! }));
}
