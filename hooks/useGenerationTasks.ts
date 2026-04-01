"use client";
import { useEffect, useRef } from "react";
import { getBulkTaskStatus } from "@/services/creative-hub";

const ACTIVE_STATUSES = new Set(['processing', 'pending', 'retrying', 'started']);
const COMPLETE_STATUSES = new Set(['completed', 'success']);
const FAILED_STATUSES = new Set(['failed', 'failure', 'revoked']);

interface Options {
  /** All task IDs currently being tracked. Caller manages this list. */
  taskIds: string[];
  /** Map a taskId to the object it belongs to (e.g. characterId, locationId) */
  getObjectId: (taskId: string) => number;
  onComplete: (taskId: string, objectId: number) => void;
  onError: (taskId: string, objectId: number, error: string) => void;
}

/**
 * Generic exponential-backoff polling hook for background Celery task tracking.
 * Mirrors the storyboard page polling pattern.
 */
export function useGenerationTasks({ taskIds, getObjectId, onComplete, onError }: Options) {
  // Keep callbacks in refs to avoid stale closure issues
  const refs = useRef({ taskIds, getObjectId, onComplete, onError });
  refs.current = { taskIds, getObjectId, onComplete, onError };

  // Use a stable key derived from the current task IDs to re-run when the set changes
  const taskKey = taskIds.slice().sort().join(',');

  useEffect(() => {
    if (taskIds.length === 0) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let polls = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      const { taskIds: ids, getObjectId: getObjId, onComplete: onDone, onError: onErr } = refs.current;
      if (ids.length === 0) return;

      try {
        const data = await getBulkTaskStatus(ids);
        const tasks: any[] = data?.tasks || [];

        for (const taskId of ids) {
          const task = tasks.find((t: any) => t.task_id === taskId);
          const objectId = getObjId(taskId);

          if (!task) {
            // Task not found in DB — treat as expired/failed after several polls
            if (polls >= 3) {
              onErr(taskId, objectId, 'Task not found. It may have expired.');
            }
          } else if (COMPLETE_STATUSES.has(task.status)) {
            onDone(taskId, objectId);
          } else if (FAILED_STATUSES.has(task.status)) {
            onErr(taskId, objectId, task.error || 'Generation failed.');
          }
          // pending/processing/retrying/started → keep polling
        }
      } catch {
        // Silent — retry next interval
      }

      if (!cancelled && refs.current.taskIds.length > 0) {
        polls++;
        // Exponential backoff: 3s → 4.5s → 6.75s … max 30s
        const delay = Math.min(3000 * Math.pow(1.5, polls), 30_000);
        timeoutId = setTimeout(poll, delay);
      }
    };

    timeoutId = setTimeout(poll, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskKey]);
}
