/**
 * Utility to send periodic 'user_activity' events from the client
 * to the ElevenLabs conversation WebSocket to prevent turn timeouts.
 */

export const ELEVENLABS_ACTIVITY_EVENT = "elevenlabs:user_activity";

export interface ActivityKeeperOptions {
  intervalMs?: number;
  onPing?: () => void;
  onError?: (error: unknown) => void;
  debug?: boolean;
}

export type TargetResolver = () => any;

export interface ActivityKeeper {
  start: () => void;
  stop: () => void;
  pingNow: () => boolean;
  isRunning: () => boolean;
  setTarget: (target: any | TargetResolver) => void;
}

/**
 * Creates an activity keeper that emits 'user_activity' every 30 seconds
 * (or configured interval) while the conversation is active.
 */
export function createActivityKeeper(
  initialTarget: any | TargetResolver,
  options: ActivityKeeperOptions = {}
): ActivityKeeper {
  const { intervalMs = 30000, onPing, onError, debug = false } = options;

  let currentTarget = initialTarget;
  let timerId: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const resolveTarget = (): any => {
    if (typeof currentTarget === "function") {
      try {
        return currentTarget();
      } catch (err) {
        if (debug) console.warn("[ElevenLabs ActivityKeeper] Target resolution failed:", err);
        return null;
      }
    }
    return currentTarget;
  };

  const pingNow = (): boolean => {
    try {
      const target = resolveTarget();
      if (!target) {
        if (debug) console.warn("[ElevenLabs ActivityKeeper] No active target for user_activity ping");
        return false;
      }

      // Check if target provides sendUserActivity()
      if (typeof target.sendUserActivity === "function") {
        target.sendUserActivity();
        if (debug) console.log("[ElevenLabs ActivityKeeper] Sent user_activity via sendUserActivity()");
        onPing?.();
        return true;
      }

      // Check if target has a connection property with sendMessage
      const connection = target.connection || target;
      if (connection && typeof connection.sendMessage === "function") {
        connection.sendMessage({ type: "user_activity" });
        if (debug) console.log("[ElevenLabs ActivityKeeper] Sent user_activity via connection.sendMessage()");
        onPing?.();
        return true;
      }

      // Check if target is a raw WebSocket
      if (typeof target.send === "function" && target.readyState === 1 /* WebSocket.OPEN */) {
        target.send(JSON.stringify({ type: "user_activity" }));
        if (debug) console.log("[ElevenLabs ActivityKeeper] Sent user_activity via raw WebSocket");
        onPing?.();
        return true;
      }

      if (debug) console.warn("[ElevenLabs ActivityKeeper] Target is missing a valid send method", target);
      return false;
    } catch (error) {
      if (debug) console.error("[ElevenLabs ActivityKeeper] Failed to send user_activity:", error);
      onError?.(error);
      return false;
    }
  };

  const start = (): void => {
    if (running) return;
    running = true;
    if (timerId !== null) {
      clearInterval(timerId);
    }
    timerId = setInterval(() => {
      pingNow();
    }, intervalMs);
    if (debug) console.log(`[ElevenLabs ActivityKeeper] Started periodic pings every ${intervalMs}ms`);
  };

  const stop = (): void => {
    running = false;
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    if (debug) console.log("[ElevenLabs ActivityKeeper] Stopped periodic pings");
  };

  const isRunning = (): boolean => running;

  const setTarget = (nextTarget: any | TargetResolver): void => {
    currentTarget = nextTarget;
  };

  return {
    start,
    stop,
    pingNow,
    isRunning,
    setTarget,
  };
}

/**
 * Dispatches a client-side user activity event to trigger a ping
 * across any active listeners.
 */
export function dispatchClientActivity(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ELEVENLABS_ACTIVITY_EVENT));
  }
}
