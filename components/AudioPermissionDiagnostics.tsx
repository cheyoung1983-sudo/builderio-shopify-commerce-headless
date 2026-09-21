"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export type MicStatus =
  | "checking"
  | "supported"
  | "unsupported"
  | "granted"
  | "denied"
  | "prompt"
  | "error";

interface DiagnosticResult {
  status: MicStatus;
  message: string;
  detail?: string;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  permissionState: PermissionState | "unsupported" | "unknown";
  audioInputs: MediaDeviceInfo[];
  isIframe: boolean;
}

export default function AudioPermissionDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult>({
    status: "checking",
    message: "Analyzing microphone availability...",
    hasMediaDevices: false,
    hasGetUserMedia: false,
    permissionState: "unknown",
    audioInputs: [],
    isIframe: false,
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const checkCompatibility = useCallback(async () => {
    if (typeof window === "undefined") return;

    let isIframe = false;
    try {
      isIframe = window.self !== window.top;
    } catch {
      isIframe = true;
    }

    const hasMediaDevices = !!(
      typeof navigator !== "undefined" && navigator.mediaDevices
    );
    const hasGetUserMedia = !!(
      hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"
    );

    if (!hasGetUserMedia) {
      setDiagnostics({
        status: "unsupported",
        message: "Microphone recording is not supported in this browser environment.",
        detail:
          "navigator.mediaDevices.getUserMedia is unavailable. Modern WebRTC audio requires a secure HTTPS connection and an updated browser.",
        hasMediaDevices,
        hasGetUserMedia,
        permissionState: "unsupported",
        audioInputs: [],
        isIframe,
      });
      return;
    }

    let permissionState: PermissionState | "unsupported" | "unknown" = "unknown";
    try {
      if (navigator.permissions && typeof navigator.permissions.query === "function") {
        const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
        permissionState = status.state;
      }
    } catch {
      permissionState = "unknown";
    }

    let audioInputs: MediaDeviceInfo[] = [];
    try {
      if (hasMediaDevices && typeof navigator.mediaDevices.enumerateDevices === "function") {
        const devices = await navigator.mediaDevices.enumerateDevices();
        audioInputs = devices.filter((d) => d.kind === "audioinput");
      }
    } catch {
      // Ignored
    }

    if (permissionState === "denied") {
      setDiagnostics({
        status: "denied",
        message: "Microphone permission is blocked in your browser settings.",
        detail: isIframe
          ? "Microphone permissions may be restricted inside the embedded preview frame. Open the app in a new browser tab or adjust site permissions in your browser address bar."
          : "Click the tune/lock icon in your browser address bar and enable Microphone access for this site.",
        hasMediaDevices,
        hasGetUserMedia,
        permissionState,
        audioInputs,
        isIframe,
      });
    } else if (permissionState === "granted") {
      setDiagnostics({
        status: "granted",
        message: "Microphone is enabled and ready.",
        detail: `Detected ${audioInputs.length} audio input device(s). Voice assistance is fully operational.`,
        hasMediaDevices,
        hasGetUserMedia,
        permissionState,
        audioInputs,
        isIframe,
      });
    } else {
      setDiagnostics({
        status: "prompt",
        message: "Microphone permissions will be requested when you start a call.",
        detail:
          "Click 'Test Microphone' below to grant permissions in advance and ensure audio captures without delay.",
        hasMediaDevices,
        hasGetUserMedia,
        permissionState,
        audioInputs,
        isIframe,
      });
    }
  }, []);

  useEffect(() => {
    checkCompatibility();
  }, [checkCompatibility]);

  const requestMicrophoneAccess = async () => {
    setIsTesting(true);
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia is not supported.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Stop stream tracks immediately after probe
      stream.getTracks().forEach((track) => track.stop());

      // Re-enumerate devices now that label access might be unmasked
      let audioInputs: MediaDeviceInfo[] = [];
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        audioInputs = devices.filter((d) => d.kind === "audioinput");
      } catch {
        // Ignored
      }

      setDiagnostics((prev) => ({
        ...prev,
        status: "granted",
        message: "Microphone access test succeeded!",
        detail: `Hardware microphone is connected and authorized (${audioInputs.length} audio input(s) found).`,
        permissionState: "granted",
        audioInputs,
      }));
    } catch (err: any) {
      console.warn("[AudioDiagnostic] Microphone probe result:", err?.name || err?.message);
      const isDenied =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError" ||
        err?.message?.includes("Permission") ||
        err?.message?.includes("denied");

      setDiagnostics((prev) => ({
        ...prev,
        status: isDenied ? "denied" : "error",
        message: isDenied
          ? "Microphone permission was denied."
          : `Microphone error: ${err?.message || "Unable to acquire audio stream"}`,
        detail: isDenied
          ? prev.isIframe
            ? "Your browser or iframe sandbox denied microphone capture. Use 'Open in New Tab' to grant permissions cleanly."
            : "Please check your browser address bar permissions or operating system microphone privacy settings."
          : err?.message,
        permissionState: isDenied ? "denied" : prev.permissionState,
      }));
    } finally {
      setIsTesting(false);
    }
  };

  // If dismissed or granted without error, keep banner unobtrusive
  if (isDismissed) return null;

  // We only show a prominent alert if status is 'denied', 'unsupported', or 'error',
  // or provide a compact diagnostic helper.
  const isAlertState =
    diagnostics.status === "denied" ||
    diagnostics.status === "unsupported" ||
    diagnostics.status === "error";

  if (!isAlertState) {
    // When everything is fine or ready, don't clutter the screen unless user opens it
    return null;
  }

  return (
    <div
      id="audio-permission-diagnostic-alert"
      role="alert"
      aria-live="polite"
      className="fixed top-20 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-2xl border border-red-200 shadow-2xl p-4 text-neutral-900 transition-all duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-red-100 text-red-600 shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-700">
              Microphone Notice
            </h4>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-neutral-400 hover:text-neutral-700 text-xs p-1 rounded-md transition-colors"
              aria-label="Dismiss microphone alert"
            >
              ✕
            </button>
          </div>

          <p className="text-xs font-semibold text-neutral-900 mt-1 leading-snug">
            {diagnostics.message}
          </p>

          {diagnostics.detail && (
            <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
              {diagnostics.detail}
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={requestMicrophoneAccess}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  Test Microphone Again
                </>
              )}
            </button>

            {diagnostics.isIframe && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open(window.location.href, "_blank");
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in New Tab
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 px-2 py-1 rounded-md transition-colors ml-auto"
            >
              <span>{showDetails ? "Hide specs" : "Details"}</span>
              {showDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Technical breakdown drawer */}
          {showDetails && (
            <div className="mt-3 pt-3 border-t border-neutral-100 text-[10px] space-y-1 text-neutral-600 bg-neutral-50/70 p-2.5 rounded-lg font-mono">
              <div className="flex justify-between">
                <span>mediaDevices API:</span>
                <span className={diagnostics.hasMediaDevices ? "text-emerald-600" : "text-red-600"}>
                  {diagnostics.hasMediaDevices ? "Supported" : "Unavailable"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>getUserMedia method:</span>
                <span className={diagnostics.hasGetUserMedia ? "text-emerald-600" : "text-red-600"}>
                  {diagnostics.hasGetUserMedia ? "Available" : "Unavailable"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Permission State:</span>
                <span className="font-semibold text-neutral-800">
                  {diagnostics.permissionState}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Embedded Iframe:</span>
                <span>{diagnostics.isIframe ? "Yes (Preview mode)" : "No (Top window)"}</span>
              </div>
              <div className="flex justify-between">
                <span>Audio Inputs Found:</span>
                <span>{diagnostics.audioInputs.length} device(s)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
