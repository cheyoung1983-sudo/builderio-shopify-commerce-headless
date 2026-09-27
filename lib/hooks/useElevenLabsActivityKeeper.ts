import { useEffect, useRef, useCallback } from "react";
import {
  createActivityKeeper,
  type ActivityKeeper,
  type ActivityKeeperOptions,
  type TargetResolver,
  ELEVENLABS_ACTIVITY_EVENT,
} from "../elevenlabs-activity";

export interface UseElevenLabsActivityKeeperOptions extends ActivityKeeperOptions {
  enabled?: boolean;
}

/**
 * Hook to manage the 30-second activity heartbeat for an ElevenLabs conversation session.
 */
export function useElevenLabsActivityKeeper(
  target: any | TargetResolver,
  options: UseElevenLabsActivityKeeperOptions = {}
) {
  const { enabled = true, intervalMs = 30000, onPing, onError, debug = false } = options;
  const targetRef = useRef<any | TargetResolver>(target);
  const keeperRef = useRef<ActivityKeeper | null>(null);

  useEffect(() => {
    targetRef.current = target;
    keeperRef.current?.setTarget(target);
  }, [target]);

  useEffect(() => {
    const keeper = createActivityKeeper(() => targetRef.current, {
      intervalMs,
      onPing,
      onError,
      debug,
    });
    keeperRef.current = keeper;

    if (enabled) {
      keeper.start();
    }

    const handleManualActivity = () => {
      keeper.pingNow();
    };

    if (typeof window !== "undefined") {
      window.addEventListener(ELEVENLABS_ACTIVITY_EVENT, handleManualActivity);
    }

    return () => {
      keeper.stop();
      keeperRef.current = null;
      if (typeof window !== "undefined") {
        window.removeEventListener(ELEVENLABS_ACTIVITY_EVENT, handleManualActivity);
      }
    };
  }, [enabled, intervalMs, onPing, onError, debug]);

  const pingNow = useCallback(() => {
    return keeperRef.current?.pingNow() ?? false;
  }, []);

  return { pingNow };
}
