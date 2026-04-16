import { useEffect, useRef, useState, useCallback } from 'react';
import api from '@/services/api';

const BACKOFF_DELAYS = [2000, 4000, 8000, 16000, 30000];
const MAX_ATTEMPTS = 10;

export function useTaskPoller(
  taskId: string | null,
  onSuccess: (result?: any) => void,
  onFailure: (error?: string) => void
): { isPolling: boolean; progressMessage: string | null } {
  const [isPolling, setIsPolling] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);
  const activeRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!taskId) {
      setIsPolling(false);
      setProgressMessage(null);
      return;
    }

    attemptsRef.current = 0;
    activeRef.current = true;
    setIsPolling(true);
    setProgressMessage(null);

    const poll = async () => {
      if (!activeRef.current) return;

      try {
        const response = await api.get('/api/project/v2/taskstatus/', {
          params: { task_id: taskId },
        });
        const data = response.data;
        const status: string = data?.status ?? '';

        if (data?.progress_message) {
          setProgressMessage(data.progress_message);
        }

        if (status === 'success' || status === 'completed') {
          if (activeRef.current) {
            activeRef.current = false;
            setIsPolling(false);
            setProgressMessage(null);
            onSuccess(data?.result);
          }
          return;
        }

        if (status === 'failure' || status === 'failed') {
          if (activeRef.current) {
            activeRef.current = false;
            setIsPolling(false);
            setProgressMessage(null);
            onFailure(data?.error ?? 'Task failed');
          }
          return;
        }

        // Still pending/started — schedule next poll
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          if (activeRef.current) {
            activeRef.current = false;
            setIsPolling(false);
            setProgressMessage(null);
            onFailure('Timed out');
          }
          return;
        }

        const delay = BACKOFF_DELAYS[Math.min(attemptsRef.current - 1, BACKOFF_DELAYS.length - 1)];
        timerRef.current = setTimeout(poll, delay);
      } catch {
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS || !activeRef.current) {
          if (activeRef.current) {
            activeRef.current = false;
            setIsPolling(false);
            setProgressMessage(null);
            onFailure('Timed out');
          }
          return;
        }
        const delay = BACKOFF_DELAYS[Math.min(attemptsRef.current - 1, BACKOFF_DELAYS.length - 1)];
        timerRef.current = setTimeout(poll, delay);
      }
    };

    // Start first poll after initial 2s delay
    timerRef.current = setTimeout(poll, BACKOFF_DELAYS[0]);

    return () => {
      activeRef.current = false;
      clearTimer();
      setIsPolling(false);
      setProgressMessage(null);
    };
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isPolling, progressMessage };
}
