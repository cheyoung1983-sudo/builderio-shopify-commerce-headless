import { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  MessageSquare,
  Bot,
  User,
  Copy,
  Check,
  Trash2,
  ArrowDown,
  Volume2,
  Sparkles,
  Info,
} from "lucide-react";

/**
 * VoiceTranscriptDisplay
 * Renders the live scrollable text transcript of the voice conversation between the user
 * and the ElevenLabs AI agent, allowing users to scroll back and review what was said.
 */
const VoiceTranscriptDisplay = memo(function VoiceTranscriptDisplay({
  transcript = [],
  isSpeaking = false,
  isConnected = false,
  status = "disconnected",
  onClearTranscript,
  className = "",
  maxHeight = "max-h-64 sm:max-h-72",
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [allCopied, setAllCopied] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [lastReadCount, setLastReadCount] = useState(0);

  const scrollContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Check whether user is near the bottom of the scroll container
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const threshold = 40; // px tolerance
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsAtBottom(atBottom);

    if (atBottom) {
      setLastReadCount(transcript.length);
    }
  }, [transcript.length]);

  // Smooth scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
      setIsAtBottom(true);
      setLastReadCount(transcript.length);
    }
  }, [transcript.length]);

  // Keep scrolled to bottom if user is at bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [transcript.length, isAtBottom]);

  // Derived: check if messages arrived while scrolled away from bottom
  const hasNewMessagesBelow = !isAtBottom && transcript.length > lastReadCount;

  // Format timestamp nicely
  const formatTime = (dateObj) => {
    if (!dateObj) return "";
    try {
      const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Copy individual message text
  const handleCopyMessage = async (id, text) => {
    if (!text || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.warn("[VoiceTranscriptDisplay] Failed to copy text:", err);
    }
  };

  // Copy entire conversation transcript
  const handleCopyAll = async () => {
    if (!transcript.length || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      const formatted = transcript
        .map((m) => {
          const senderLabel = m.sender === "agent" ? "DisplayCellPros AI Specialist" : "Customer";
          const time = m.timestamp ? ` [${formatTime(m.timestamp)}]` : "";
          return `${senderLabel}${time}:\n${m.text}\n`;
        })
        .join("\n");

      await navigator.clipboard.writeText(formatted);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    } catch (err) {
      console.warn("[VoiceTranscriptDisplay] Failed to copy full transcript:", err);
    }
  };

  return (
    <div
      id="voice-transcript-display-card"
      className={`flex flex-col w-full bg-neutral-50/90 rounded-xl border border-neutral-200/90 overflow-hidden shadow-xs transition-all duration-200 ${className}`}
    >
      {/* Transcript Toolbar Header */}
      <div
        id="voice-transcript-toolbar"
        className="flex items-center justify-between px-3 py-2 bg-white border-b border-neutral-200/80 text-xs"
      >
        <div className="flex items-center gap-1.5 font-medium text-neutral-800">
          <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
          <span className="font-semibold">Transcript</span>
          <span
            id="voice-transcript-count-badge"
            className="px-1.5 py-0.2 rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-600 border border-neutral-200"
          >
            {transcript.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {transcript.length > 0 && (
            <>
              <button
                id="voice-transcript-copy-all-btn"
                type="button"
                onClick={handleCopyAll}
                title="Copy entire transcript to clipboard"
                aria-label="Copy transcript"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                {allCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy All</span>
                  </>
                )}
              </button>

              {onClearTranscript && (
                <button
                  id="voice-transcript-clear-btn"
                  type="button"
                  onClick={onClearTranscript}
                  title="Clear conversation transcript"
                  aria-label="Clear transcript"
                  className="p-1 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Scrollable Transcript Message Feed */}
      <div className="relative">
        <div
          id="voice-transcript-scroll-area"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`overflow-y-auto p-3 space-y-3 ${maxHeight} scroll-smooth text-xs text-neutral-800 focus:outline-hidden`}
          tabIndex={0}
          aria-label="Scrollable voice conversation history"
        >
          {transcript.length === 0 ? (
            /* Empty State */
            <div
              id="voice-transcript-empty-state"
              className="flex flex-col items-center justify-center py-6 text-center px-3"
            >
              <div className="w-8 h-8 rounded-full bg-neutral-200/70 flex items-center justify-center text-neutral-500 mb-2">
                <MessageSquare className="w-4 h-4" />
              </div>
              <p className="font-semibold text-neutral-700 text-xs">
                No transcript recorded yet
              </p>
              <p className="text-[11px] text-neutral-500 mt-1 leading-normal max-w-xs">
                {isConnected
                  ? "Speak into your microphone or listen as the AI agent speaks to see transcribed text here in real time."
                  : "Start a call to speak with our AI specialist. Transcripts of the conversation will be recorded here for you to review."}
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-[10px] text-neutral-600 shadow-2xs">
                <Info className="w-3 h-3 text-neutral-400 shrink-0" />
                <span>You can scroll back to read past answers anytime</span>
              </div>
            </div>
          ) : (
            /* Message Bubbles */
            transcript.map((item, idx) => {
              const isAgent = item.sender === "agent";
              const isSystem = item.sender === "system";

              if (isSystem) {
                return (
                  <div
                    key={item.id || `sys-${idx}`}
                    id={`transcript-item-sys-${idx}`}
                    className="flex justify-center my-1"
                  >
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-200/70 text-[10px] text-neutral-600 font-medium">
                      <Info className="w-2.5 h-2.5" />
                      {item.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={item.id || `msg-${idx}`}
                  id={`transcript-item-${item.id || idx}`}
                  className={`group flex flex-col ${isAgent ? "items-start" : "items-end"}`}
                >
                  {/* Sender Header & Timestamp */}
                  <div
                    className={`flex items-center gap-1.5 mb-1 px-1 text-[10px] text-neutral-500 ${
                      isAgent ? "flex-row" : "flex-row-reverse"
                    }`}
                  >
                    <span className="flex items-center gap-1 font-semibold text-neutral-700">
                      {isAgent ? (
                        <>
                          <Bot className="w-3 h-3 text-sky-600" />
                          <span>AI Agent</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 text-neutral-500" />
                          <span>You</span>
                        </>
                      )}
                    </span>
                    {item.timestamp && (
                      <span className="text-neutral-400 text-[9px]">
                        {formatTime(item.timestamp)}
                      </span>
                    )}
                    {item.isCorrected && (
                      <span className="text-amber-600 text-[9px] italic">
                        (updated)
                      </span>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className="relative max-w-[90%] sm:max-w-[85%]">
                    <div
                      className={`px-3 py-2 rounded-xl text-xs leading-relaxed transition-colors select-text ${
                        isAgent
                          ? "bg-white text-neutral-900 border border-neutral-200/90 shadow-2xs rounded-tl-xs"
                          : "bg-neutral-900 text-white shadow-2xs rounded-tr-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{item.text}</p>
                    </div>

                    {/* Quick Copy Action */}
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(item.id || idx, item.text)}
                      title="Copy message"
                      aria-label="Copy message text"
                      className={`absolute top-1 -right-7 sm:-right-8 p-1 rounded-md bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-800 shadow-2xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer ${
                        copiedId === (item.id || idx) ? "opacity-100 text-emerald-600" : ""
                      }`}
                    >
                      {copiedId === (item.id || idx) ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Live Agent Speaking Indicator within Feed */}
          {isSpeaking && (
            <div
              id="voice-transcript-speaking-live-indicator"
              className="flex items-center gap-2 p-2 rounded-lg bg-sky-50 border border-sky-200/80 text-sky-800 text-[11px] animate-pulse"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <div className="flex-1 font-medium">
                AI Agent is speaking now...
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1 h-2.5 bg-sky-500 rounded-full animate-pulse" />
                <span className="w-1 h-3.5 bg-sky-600 rounded-full animate-pulse delay-75" />
                <span className="w-1 h-2 bg-sky-500 rounded-full animate-pulse delay-150" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-0" />
        </div>

        {/* Scroll To Latest Floating Pill */}
        {hasNewMessagesBelow && !isAtBottom && (
          <button
            id="voice-transcript-scroll-bottom-btn"
            type="button"
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 hover:bg-black text-white text-[11px] font-medium shadow-md backdrop-blur-xs transition-all duration-150 cursor-pointer animate-bounce"
            aria-label="Scroll to newest messages"
          >
            <ArrowDown className="w-3 h-3" />
            <span>New messages below</span>
          </button>
        )}
      </div>

      {/* Transcript Footer Helper */}
      <div
        id="voice-transcript-footer"
        className="flex items-center justify-between px-3 py-1.5 bg-neutral-100/80 border-t border-neutral-200/70 text-[10px] text-neutral-500"
      >
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-neutral-400" />
          <span>Real-time voice transcription</span>
        </span>
        <span>
          {isConnected ? "Active Call" : status === "connecting" ? "Connecting..." : "Stored History"}
        </span>
      </div>
    </div>
  );
});

export default VoiceTranscriptDisplay;
