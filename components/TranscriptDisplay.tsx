'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Bot,
  Sparkles,
  Clock,
  ExternalLink,
  Eye,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  FileText,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  BarChart2,
} from 'lucide-react';

export interface ElevenLabsTranscriptMessage {
  role?: 'user' | 'agent' | 'assistant' | string;
  message?: string;
  text?: string;
  time_in_call_secs?: number;
  id?: string | number;
  [key: string]: unknown;
}

export interface PostCallTranscriptionData {
  conversation_id?: string;
  agent_id?: string;
  transcript?: ElevenLabsTranscriptMessage[];
  metadata?: {
    call_duration_secs?: number;
    cost?: number;
    [key: string]: unknown;
  };
  analysis?: {
    transcript_summary?: string;
    call_successful?: string | boolean;
    data_collection_results?: Record<string, unknown>;
    evaluation_criteria_results?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ElevenLabsWebhookEvent {
  type?: string;
  event_id?: string;
  conversation_id?: string;
  data?: PostCallTranscriptionData;
  timestamp?: number;
  [key: string]: unknown;
}

export interface TranscriptDisplayProps {
  /**
   * Accepts the full webhook event, data payload, or transcript array
   */
  data?: ElevenLabsWebhookEvent | PostCallTranscriptionData | ElevenLabsTranscriptMessage[];
  /**
   * Optional title override for the header
   */
  title?: string;
  /**
   * Optional custom CSS class for outer container
   */
  className?: string;
}

/**
 * Formats seconds into MM:SS display
 */
function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function TranscriptDisplay({
  data,
  title = 'Post-Call Conversation Transcript',
  className = '',
}: TranscriptDisplayProps) {
  const [selectedEntryIndex, setSelectedEntryIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedModalText, setCopiedModalText] = useState<boolean>(false);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // Normalize input data
  let webhookEvent: ElevenLabsWebhookEvent | undefined;
  let transcriptionData: PostCallTranscriptionData | undefined;
  let rawTranscript: ElevenLabsTranscriptMessage[] = [];

  if (Array.isArray(data)) {
    rawTranscript = data;
  } else if (data && typeof data === 'object') {
    if ('type' in data && data.type === 'post_call_transcription' && 'data' in data && data.data) {
      webhookEvent = data as ElevenLabsWebhookEvent;
      transcriptionData = webhookEvent.data;
      rawTranscript = transcriptionData?.transcript || [];
    } else if ('transcript' in data && Array.isArray(data.transcript)) {
      transcriptionData = data as PostCallTranscriptionData;
      rawTranscript = transcriptionData.transcript || [];
    } else if ('data' in data && data.data && typeof data.data === 'object' && 'transcript' in (data.data as object)) {
      transcriptionData = (data as { data: PostCallTranscriptionData }).data;
      rawTranscript = transcriptionData.transcript || [];
    }
  }

  const conversationId =
    transcriptionData?.conversation_id ||
    webhookEvent?.conversation_id ||
    (data as PostCallTranscriptionData)?.conversation_id ||
    'N/A';

  const agentId =
    transcriptionData?.agent_id ||
    (data as PostCallTranscriptionData)?.agent_id ||
    'N/A';

  const durationSecs = transcriptionData?.metadata?.call_duration_secs;
  const summary = transcriptionData?.analysis?.transcript_summary;
  const callSuccessful = transcriptionData?.analysis?.call_successful;

  // Selected entry for modal
  const selectedEntry =
    selectedEntryIndex !== null && selectedEntryIndex >= 0 && selectedEntryIndex < rawTranscript.length
      ? rawTranscript[selectedEntryIndex]
      : null;

  // Key bindings for Modal navigation
  useEffect(() => {
    if (selectedEntryIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedEntryIndex(null);
      } else if (e.key === 'ArrowLeft' && selectedEntryIndex > 0) {
        setSelectedEntryIndex(selectedEntryIndex - 1);
      } else if (e.key === 'ArrowRight' && selectedEntryIndex < rawTranscript.length - 1) {
        setSelectedEntryIndex(selectedEntryIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntryIndex, rawTranscript.length]);

  const copyToClipboard = async (text: string, isModal = false, index?: number) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (isModal) {
        setCopiedModalText(true);
        setTimeout(() => setCopiedModalText(false), 2000);
      } else if (index !== undefined) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      }
    } catch (err) {
      console.warn('Failed to copy text:', err);
    }
  };

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Container Header & Metadata Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Conv ID: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 font-mono">{conversationId}</code></span>
                {agentId !== 'N/A' && (
                  <span>• Agent: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300 font-mono">{agentId}</code></span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            {durationSecs !== undefined && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>{formatDuration(durationSecs)}</span>
              </span>
            )}
            {callSuccessful !== undefined && (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                String(callSuccessful) === 'true' || String(callSuccessful) === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Call {String(callSuccessful) === 'true' || String(callSuccessful) === 'success' ? 'Successful' : 'Completed'}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>{rawTranscript.length} Messages</span>
            </span>
          </div>
        </div>

        {/* AI Summary Banner if present */}
        {summary && (
          <div className="mt-4 p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-100 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-300 mb-1">
                Post-Call AI Summary
              </h4>
              <p className="text-sm leading-relaxed text-blue-100/90">{summary}</p>
            </div>
          </div>
        )}
      </div>

      {/* Transcript Messages List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            Conversation Timeline
          </h3>
          <span className="text-xs text-slate-400">
            Click entry link to inspect details
          </span>
        </div>

        {rawTranscript.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
            <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">No transcript entries recorded for this call.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rawTranscript.map((entry, index) => {
              const isUser = entry.role === 'user';
              const messageText = entry.text || entry.message || '[No message text]';
              const timeSecs = entry.time_in_call_secs;

              return (
                <div
                  key={entry.id || index}
                  className={`group relative p-4 rounded-xl border transition-all duration-200 ${
                    isUser
                      ? 'bg-slate-800/60 border-slate-700/80 hover:border-blue-500/50'
                      : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Speaker Header */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                          isUser
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold tracking-wide text-slate-200 capitalize">
                            {isUser ? 'User' : 'Agent (AI)'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            #{index + 1}
                          </span>
                          {timeSecs !== undefined && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {formatDuration(timeSecs)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar (Copy & Modal Link) */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(messageText, false, index)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Copy message"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Dedicated Modal Entry Detail Link */}
                      <button
                        onClick={() => setSelectedEntryIndex(index)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-all"
                        title="View entry details in modal"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </button>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="mt-3 pl-10 text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                    {messageText}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dedicated Transcript Entry Details Modal */}
      {selectedEntry && selectedEntryIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedEntryIndex(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    selectedEntry.role === 'user'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {selectedEntry.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Transcript Entry #{selectedEntryIndex + 1} Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    Role: <span className="text-slate-200 font-semibold capitalize">{selectedEntry.role || 'Unknown'}</span>
                    {selectedEntry.time_in_call_secs !== undefined && (
                      <span className="ml-2">• Timestamp: <span className="font-mono text-blue-300">{formatDuration(selectedEntry.time_in_call_secs)}</span> ({selectedEntry.time_in_call_secs}s)</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedEntryIndex(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Main Content: Full Message */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Message Content</span>
                <span>
                  {(selectedEntry.text || selectedEntry.message || '').length} chars •{' '}
                  {(selectedEntry.text || selectedEntry.message || '').split(/\s+/).filter(Boolean).length} words
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto font-sans">
                {selectedEntry.text || selectedEntry.message || '[No message text]'}
              </div>
            </div>

            {/* Metadata & Raw JSON Toggle Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                  Entry Metadata & Raw Payload
                </span>
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {showRawJson ? 'Hide Raw JSON' : 'Show Raw JSON'}
                </button>
              </div>

              {showRawJson && (
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-40">
                  {JSON.stringify(selectedEntry, null, 2)}
                </pre>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  disabled={selectedEntryIndex === 0}
                  onClick={() => setSelectedEntryIndex(selectedEntryIndex - 1)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded-lg border border-slate-700 flex items-center gap-1 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  disabled={selectedEntryIndex === rawTranscript.length - 1}
                  onClick={() => setSelectedEntryIndex(selectedEntryIndex + 1)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none rounded-lg border border-slate-700 flex items-center gap-1 transition-all"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(selectedEntry.text || selectedEntry.message || '', true)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all"
                >
                  {copiedModalText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSelectedEntryIndex(null)}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-600/20 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
