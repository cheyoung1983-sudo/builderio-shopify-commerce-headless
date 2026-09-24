
"use client";

import React from "react";
import { Bot, Mic, Volume2 } from "lucide-react";

/**
 * Orb Component
 * A visual representation of the ElevenLabs AI agent that reacts to audio volume.
 */
export default function Orb({
  volume = 0,
  isSpeaking = false,
  isListening = false,
  isConnected = false,
  status = "disconnected",
  size = "lg",
  className = "",
}) {
  const clampedVol = Math.min(1, Math.max(0, volume));
  
  const sizeConfig = {
    sm: { container: "w-12 h-12", orb: "w-10 h-10", icon: "w-4 h-4" },
    md: { container: "w-20 h-20", orb: "w-16 h-16", icon: "w-6 h-6" },
    lg: { container: "w-32 h-32", orb: "w-24 h-24", icon: "w-10 h-10" },
  }[size] || { container: "w-32 h-32", orb: "w-24 h-24", icon: "w-10 h-10" };

  const avatarScale = isSpeaking ? 1 + clampedVol * 0.2 : isListening ? 1.05 : 1.0;
  const ringScale = isSpeaking ? 1 + clampedVol * 0.5 : isListening ? 1.2 : 1.0;

  return (
    <div className={`relative flex items-center justify-center ${sizeConfig.container} ${className}`}>
      {/* Outer Glow Ring */}
      {isConnected && (
        <div
          className={`absolute rounded-full transition-all duration-75 ease-out ${
            isSpeaking 
              ? "bg-sky-400/30 border-2 border-sky-400/50" 
              : isListening 
                ? "bg-emerald-400/20 border-2 border-emerald-400/40 animate-pulse" 
                : "bg-neutral-200/20 border border-neutral-300"
          }`}
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${ringScale})`,
            opacity: isSpeaking ? 0.6 + clampedVol * 0.4 : isListening ? 0.5 : 0.3,
          }}
        />
      )}

      {/* The Core Orb */}
      <div
        className={`relative z-10 flex items-center justify-center rounded-full transition-all duration-100 ease-out shadow-xl ${sizeConfig.orb} ${
          isSpeaking
            ? "bg-gradient-to-tr from-sky-600 via-sky-500 to-indigo-500 text-white border-2 border-white/80"
            : isListening
              ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white border-2 border-white/80"
              : "bg-gradient-to-tr from-neutral-400 to-neutral-200 text-neutral-600 border border-neutral-300"
        }`}
        style={{
          transform: `scale(${avatarScale})`,
          boxShadow: isSpeaking 
            ? `0 0 ${20 + clampedVol * 40}px rgba(14, 165, 233, 0.6)` 
            : "0 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        {isSpeaking ? (
          <Volume2 className={`${sizeConfig.icon} animate-pulse`} />
        ) : isListening ? (
          <Mic className={`${sizeConfig.icon} animate-pulse`} />
        ) : (
          <Bot className={sizeConfig.icon} />
        )}
      </div>
    </div>
  );
}
