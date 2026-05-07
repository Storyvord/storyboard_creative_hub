"use client";

import { useEffect, useRef } from "react";
import {
    getLatestTaskStatus,
    LatestTaskStatus,
    TaskStatusKind,
} from "@/services/creative-hub";

interface UseRestoreInflightTaskOptions {
    /** Lowercased model name on the backend, e.g. "character", "location", "scenecharacter". */
    contentType: string;
    /** Subject's primary key. The hook is a no-op while this is null/undefined. */
    objectId: number | null | undefined;
    /** Backend TaskStatus.task_type value, e.g. "character_portrait_generation". */
    taskType: string;
    /**
     * Invoked once on mount (and whenever `objectId` changes) if the latest
     * TaskStatus row for the tuple is in pending/processing/retrying. Callers
     * use this to flip their local "generating" state back on and let their
     * existing polling effect take over.
     */
    onInflight: (taskStatus: LatestTaskStatus) => void;
    /** Set to false to skip the fetch entirely. Defaults to true. */
    enabled?: boolean;
}

const INFLIGHT_STATUSES: ReadonlySet<TaskStatusKind> = new Set<TaskStatusKind>([
    "pending",
    "processing",
    "retrying",
]);

/**
 * Mount-time recovery hook for Celery jobs kicked off in a previous tab/device.
 *
 * The backend persists a TaskStatus row per (content_type, object_id, task_type)
 * triple. On reload, the page asks "is there an in-flight job for me?" and, if
 * yes, restores the spinner by calling back into whatever local state the page
 * already uses for in-flight generation. No polling — that's the caller's job.
 */
export function useRestoreInflightTask(
    options: UseRestoreInflightTaskOptions,
): void {
    const { contentType, objectId, taskType, onInflight, enabled = true } = options;

    // Pin the callback in a ref so consumers don't need to memoise it for the
    // effect's dependency array to behave.
    const onInflightRef = useRef(onInflight);
    onInflightRef.current = onInflight;

    useEffect(() => {
        if (!enabled) return;
        if (objectId === null || objectId === undefined) return;

        let cancelled = false;
        (async () => {
            try {
                const status = await getLatestTaskStatus(
                    contentType,
                    objectId,
                    taskType,
                );
                if (cancelled || !status) return;
                if (INFLIGHT_STATUSES.has(status.status)) {
                    onInflightRef.current(status);
                }
            } catch (err) {
                // Swallow 4xx/5xx silently — restore is best-effort, the page
                // still loads. Log so it shows up in dev consoles.
                console.warn(
                    `[useRestoreInflightTask] failed to fetch latest task for ${contentType}#${objectId} (${taskType})`,
                    err,
                );
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [contentType, objectId, taskType, enabled]);
}
