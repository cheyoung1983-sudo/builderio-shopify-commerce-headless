import { memo } from "react";
import { Sparkles, Bot, Mic, Volume2 } from "lucide-react";

/**
 * VoicePulseAvatar
 * An animated visual avatar and acoustic pulse indicator that dynamically
 * changes size, aura, and ripple effects based on the AI agent's audio output volume.
 */
const VoicePulseAvatar = memo(function VoicePulseAvatar({
  volume = 0, // Normalized 0.0 to 1.0
  isSpeaking = false,
  isListening = false,
  isConnected = false,
  status = "offline",
  size = "lg", // "sm" | "md" | "lg"
  showVolumeMeter = true,
  className = "",
}) {
  // Clamp volume between 0 and 1
  const clampedVol = Math.min(1, Math.max(0, volume));

  // Determine current active mood
  const mood = isSpeaking
    ? "speaking"
    : isListening
    ? "listening"
    : status === "connecting"
    ? "connecting"
    : "idle";

  // Scale math based on audio output volume
  // Scale range: 1.0 at 0 vol to 1.35x at peak volume
  const avatarScale = isSpeaking ? 1 + clampedVol * 0.35 : isListening ? 1.04 : 1.0;

  // Outer pulse ring 1 (outermost)
  const ring1Scale = isSpeaking ? 1 + clampedVol * 0.8 : isListening ? 1.25 : 1.0;
  const ring1Opacity = isSpeaking ? 0.25 + clampedVol * 0.55 : isListening ? 0.35 : 0;

  // Outer pulse ring 2 (mid)
  const ring2Scale = isSpeaking ? 1 + clampedVol * 0.45 : isListening ? 1.15 : 1.0;
  const ring2Opacity = isSpeaking ? 0.35 + clampedVol * 0.45 : isListening ? 0.45 : 0;

  // Dynamic glow spread
  const glowSpread = isSpeaking ? Math.round(10 + clampedVol * 30) : 8;

  // Configuration per size variant
  const sizeConfig = {
    sm: {
      container: "w-10 h-10",
      orb: "w-8 h-8",
      icon: "w-4 h-4",
      meterHeight: "h-1",
    },
    md: {
      container: "w-16 h-16",
      orb: "w-12 h-12",
      icon: "w-6 h-6",
      meterHeight: "h-1.5",
    },
    lg: {
      container: "w-24 h-24 sm:w-28 sm:h-28",
      orb: "w-16 h-16 sm:w-20 sm:h-20",
      icon: "w-8 h-8 sm:w-10 sm:h-10",
      meterHeight: "h-2",
    },
  }[size] || {
    container: "w-24 h-24",
    orb: "w-16 h-16",
    icon: "w-8 h-8",
    meterHeight: "h-2",
  };

  return (
    <div
      id={`voice-pulse-avatar-${size}`}
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      aria-label={`Voice Agent Avatar (${mood}, audio volume: ${Math.round(clampedVol * 100)}%)`}
    >
      {/* Outer Pulse/Aura Stage */}
      <div
        className={`relative flex items-center justify-center ${sizeConfig.container}`}
      >
        {/* Outermost Acoustic Ripple Ring */}
        {isConnected && (
          <div
            id="voice-pulse-ring-outer"
            className={`absolute rounded-full pointer-events-none transition-transform duration-75 ease-out ${
              mood === "speaking"
                ? "border-2 border-sky-400 bg-sky-400/20"
                : mood === "listening"
                ? "border-2 border-emerald-400 bg-emerald-400/15 animate-ping"
                : "border border-amber-300 bg-amber-300/10"
            }`}
            style={{
              width: "100%",
              height: "100%",
              transform: `scale(${ring1Scale})`,
              opacity: ring1Opacity,
            }}
          />
        )}

        {/* Mid Acoustic Ripple Ring */}
        {isConnected && (
          <div
            id="voice-pulse-ring-mid"
            className={`absolute rounded-full pointer-events-none transition-transform duration-100 ease-out ${
              mood === "speaking"
                ? "border border-sky-300 bg-sky-300/25"
                : mood === "listening"
                ? "border border-emerald-300 bg-emerald-300/20"
                : "border border-amber-200"
            }`}
            style={{
              width: "85%",
              height: "85%",
              transform: `scale(${ring2Scale})`,
              opacity: ring2Opacity,
            }}
          />
        )}

        {/* Central Animated Avatar Core Orb */}
        <div
          id="voice-pulse-avatar-orb"
          className={`relative z-10 flex items-center justify-center rounded-full transition-all duration-100 ease-out shadow-lg ${
            sizeConfig.orb
          } ${
            mood === "speaking"
              ? "bg-gradient-to-tr from-sky-600 via-sky-500 to-indigo-500 text-white border-2 border-white/80"
              : mood === "listening"
              ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white border-2 border-white/80"
              : mood === "connecting"
              ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-white border-2 border-white/80 animate-pulse"
              : "bg-gradient-to-tr from-neutral-300 to-neutral-200 text-neutral-600 border border-neutral-300"
          }`}
          style={{
            transform: `scale(${avatarScale})`,
            boxShadow:
              mood === "speaking"
                ? `0 0 ${glowSpread}px rgba(14, 165, 233, ${0.4 + clampedVol * 0.5}), 0 4px 12px rgba(0, 0, 0, 0.15)`
                : mood === "listening"
                ? `0 0 16px rgba(16, 185, 129, 0.4), 0 4px 12px rgba(0, 0, 0, 0.1)`
                : "0 2px 8px rgba(0, 0, 0, 0.08)",
          }}
        >
          {/* Avatar Icon */}
          {mood === "speaking" ? (
            <div className="relative flex items-center justify-center">
              <Bot className={`${sizeConfig.icon} transition-transform duration-75`} />
              {/* Dynamic Sparkle accent on high volume */}
              {clampedVol > 0.4 && (
                <Sparkles
                  className={`absolute -top-1.5 -right-1.5 text-yellow-300 animate-pulse ${
                    size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5"
                  }`}
                />
              )}
            </div>
          ) : mood === "listening" ? (
            <Mic className={`${sizeConfig.icon} animate-pulse`} />
          ) : (
            <Bot className={sizeConfig.icon} />
          )}

          {/* Sound Wave Bars overlay inside orb for large view when speaking */}
          {size === "lg" && mood === "speaking" && (
            <div className="absolute bottom-1.5 flex items-end justify-center gap-0.5 h-3">
              <span
                className="w-0.5 bg-white/90 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(3, clampedVol * 12)}px` }}
              />
              <span
                className="w-0.5 bg-white rounded-full transition-all duration-75"
                style={{ height: `${Math.max(4, clampedVol * 14)}px` }}
              />
              <span
                className="w-0.5 bg-white/90 rounded-full transition-all duration-75"
                style={{ height: `${Math.max(3, clampedVol * 10)}px` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Live Volume Level Meter / Status Cue for large mode */}
      {size === "lg" && showVolumeMeter && isConnected && (
        <div
          id="voice-pulse-volume-meter"
          className="mt-2 flex flex-col items-center gap-1 w-full max-w-[140px]"
        >
          {/* Audio Output Volume Level Bar */}
          <div className="w-full bg-neutral-200/80 rounded-full h-1.5 overflow-hidden p-0.5 border border-neutral-300/60">
            <div
              id="voice-pulse-volume-fill"
              className={`h-full rounded-full transition-all duration-75 ease-out ${
                mood === "speaking"
                  ? "bg-gradient-to-r from-sky-500 to-indigo-500"
                  : mood === "listening"
                  ? "bg-emerald-500"
                  : "bg-neutral-400"
              }`}
              style={{
                width: `${Math.max(4, Math.round(clampedVol * 100))}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between w-full text-[10px] text-neutral-500 font-medium px-0.5">
            <span className="flex items-center gap-1">
              <Volume2 className="w-2.5 h-2.5 text-neutral-400" />
              <span>{isSpeaking ? "AI Volume" : "Microphone"}</span>
            </span>
            <span className="font-mono text-neutral-700">
              {isSpeaking ? `${Math.round(clampedVol * 100)}%` : isListening ? "Live" : "Standby"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default VoicePulseAvatar;
