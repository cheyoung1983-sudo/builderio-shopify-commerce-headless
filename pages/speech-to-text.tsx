import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Mic, MicOff, Settings, Activity, FileText, Shield, Zap, RefreshCw, Terminal, CheckCircle2, AlertTriangle, Volume2 } from 'lucide-react';

export default function SpeechToTextRealtimePage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [modelId, setModelId] = useState('scribe_v2_realtime');
  const [audioFormat, setAudioFormat] = useState('pcm_16000');
  const [commitStrategy, setCommitStrategy] = useState<'vad' | 'manual'>('vad');
  const [vadThreshold, setVadThreshold] = useState(0.5);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [entityDetection, setEntityDetection] = useState('all');
  const [languageCode, setLanguageCode] = useState('');
  const [transcripts, setTranscripts] = useState<Array<{ type: string; text: string; timestamp: string; details?: any }>>([]);
  const [eventLogs, setEventLogs] = useState<Array<{ time: string; type: string; payload: any }>>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState({ chunksSent: 0, partialsReceived: 0, commitsReceived: 0 });
  const [transcriptIdInput, setTranscriptIdInput] = useState('');
  const [retrievedTranscript, setRetrievedTranscript] = useState<any>(null);
  const [isFetchingTranscript, setIsFetchingTranscript] = useState(false);
  const [isDeletingTranscript, setIsDeletingTranscript] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [sourceUrlInput, setSourceUrlInput] = useState('');
  const [batchModelId, setBatchModelId] = useState('scribe_v2');
  const [diarize, setDiarize] = useState(true);
  const [tagAudioEvents, setTagAudioEvents] = useState(true);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [isBatchConverting, setIsBatchConverting] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  const handleBatchConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFile && !sourceUrlInput.trim()) {
      alert('Please provide either an audio/video file or a source URL.');
      return;
    }
    setIsBatchConverting(true);
    setBatchError(null);
    setBatchResult(null);

    try {
      const formData = new FormData();
      formData.append('model_id', batchModelId);
      formData.append('diarize', String(diarize));
      formData.append('tag_audio_events', String(tagAudioEvents));
      if (batchFile) formData.append('file', batchFile);
      if (sourceUrlInput.trim()) formData.append('source_url', sourceUrlInput.trim());

      const res = await fetch('/api/speech-to-text/convert', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        setBatchResult(data.result);
      } else {
        setBatchError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      }
    } catch (err) {
      setBatchError((err as Error).message);
    } finally {
      setIsBatchConverting(false);
    }
  };

  const handleFetchTranscript = async () => {
    if (!transcriptIdInput.trim()) return;
    setIsFetchingTranscript(true);
    setFetchError(null);
    setDeleteSuccess(null);
    setRetrievedTranscript(null);
    try {
      const res = await fetch(`/api/speech-to-text/transcript/${encodeURIComponent(transcriptIdInput.trim())}`);
      const data = await res.json();
      if (data.ok) {
        setRetrievedTranscript(data.transcript);
      } else {
        setFetchError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      }
    } catch (err) {
      setFetchError((err as Error).message);
    } finally {
      setIsFetchingTranscript(false);
    }
  };

  const handleDeleteTranscript = async () => {
    if (!transcriptIdInput.trim()) return;
    if (!confirm(`Are you sure you want to delete transcript ${transcriptIdInput.trim()}?`)) return;
    setIsDeletingTranscript(true);
    setFetchError(null);
    setDeleteSuccess(null);
    try {
      const res = await fetch(`/api/speech-to-text/transcript/${encodeURIComponent(transcriptIdInput.trim())}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.ok) {
        setDeleteSuccess('Delete completed successfully.');
        setRetrievedTranscript(null);
      } else {
        setFetchError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      }
    } catch (err) {
      setFetchError((err as Error).message);
    } finally {
      setIsDeletingTranscript(false);
    }
  };

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);

  const addLog = (type: string, payload: any) => {
    const time = new Date().toLocaleTimeString();
    setEventLogs((prev) => [{ time, type, payload }, ...prev.slice(0, 99)]);
  };

  const handleConnect = async () => {
    try {
      addLog('system', { message: 'Acquiring ephemeral token...' });
      const res = await fetch('/api/speech-to-text/token', { method: 'POST' });
      const data = await res.json();
      const token = data.token;

      // Construct WebSocket URL with query parameters
      const params = new URLSearchParams({
        model_id: modelId,
        audio_format: audioFormat,
        commit_strategy: commitStrategy,
        vad_threshold: String(vadThreshold),
        include_timestamps: String(includeTimestamps),
        entity_detection: entityDetection,
      });
      if (languageCode) params.append('language_code', languageCode);
      if (token && token.length > 20) {
        params.append('token', token);
      }

      const wssUrl = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?${params.toString()}`;
      addLog('system', { message: `Connecting to ${wssUrl}` });

      const ws = new WebSocket(wssUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        addLog('websocket', { event: 'connected', url: wssUrl });
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          addLog(parsed.message_type || 'message', parsed);

          if (parsed.message_type === 'session_started') {
            setSessionId(parsed.session_id);
          } else if (parsed.message_type === 'partial_transcript') {
            setStats((s) => ({ ...s, partialsReceived: s.partialsReceived + 1 }));
            setTranscripts((prev) => {
              const last = prev[0];
              if (last && last.type === 'partial') {
                return [{ type: 'partial', text: parsed.text, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(1)];
              }
              return [{ type: 'partial', text: parsed.text, timestamp: new Date().toLocaleTimeString() }, ...prev];
            });
          } else if (parsed.message_type === 'committed_transcript' || parsed.message_type === 'committed_transcript_with_timestamps') {
            setStats((s) => ({ ...s, commitsReceived: s.commitsReceived + 1 }));
            setTranscripts((prev) => [
              { type: 'committed', text: parsed.text, timestamp: new Date().toLocaleTimeString(), details: parsed },
              ...prev.filter((t) => t.type !== 'partial'),
            ]);
          } else if (parsed.message_type === 'warning' || parsed.message_type.includes('error')) {
            addLog('error', parsed);
          }
        } catch (e) {
          addLog('error', { raw: event.data });
        }
      };

      ws.onerror = (err) => {
        addLog('error', { error: 'WebSocket error occurred', details: String(err) });
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        setIsRecording(false);
        addLog('websocket', { event: 'closed', code: event.code, reason: event.reason });
      };
    } catch (err) {
      addLog('error', { message: 'Failed to connect', error: String(err) });
    }
  };

  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopRecording();
    setIsConnected(false);
    setIsRecording(false);
  };

  const startRecording = async () => {
    if (!isConnected || !wsRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32Array to PCM 16-bit Base64
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const uint8Bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        const len = uint8Bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8Bytes[i]);
        }
        const base64Audio = btoa(binary);

        const chunkMessage = {
          message_type: 'input_audio_chunk',
          audio_base_64: base64Audio,
        };

        wsRef.current.send(JSON.stringify(chunkMessage));
        setStats((s) => ({ ...s, chunksSent: s.chunksSent + 1 }));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      setIsRecording(true);
      addLog('system', { message: 'Microphone streaming started' });
    } catch (err) {
      addLog('error', { message: 'Microphone access denied or failed', error: String(err) });
    }
  };

  const stopRecording = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
    addLog('system', { message: 'Microphone streaming stopped' });
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Head>
        <title>Realtime Speech-to-Text Scribe v2 | ElevenLabs</title>
        <meta name="description" content="Realtime speech-to-text transcription service using ElevenLabs Scribe v2 WebSocket API." />
      </Head>

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                ElevenLabs Scribe v2 <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">Realtime WSS</span>
              </h1>
              <p className="text-xs text-slate-400">Live streaming audio transcription with speaker diarization & timestamps</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Back to Storefront
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Configuration & Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-purple-400" />
              Session Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Model ID</label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="scribe_v2_realtime">scribe_v2_realtime</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Audio Format & Sample Rate</label>
                <select
                  value={audioFormat}
                  onChange={(e) => setAudioFormat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="pcm_16000">PCM 16kHz (Recommended)</option>
                  <option value="pcm_22050">PCM 22.05kHz</option>
                  <option value="pcm_24000">PCM 24kHz</option>
                  <option value="pcm_44100">PCM 44.1kHz</option>
                  <option value="ulaw_8000">μ-law 8kHz</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Commit Strategy</label>
                <select
                  value={commitStrategy}
                  onChange={(e) => setCommitStrategy(e.target.value as 'vad' | 'manual')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="vad">VAD (Silence detection automatic commit)</option>
                  <option value="manual">Manual commit</option>
                </select>
              </div>

              {commitStrategy === 'vad' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">VAD Threshold ({vadThreshold})</label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={vadThreshold}
                    onChange={(e) => setVadThreshold(parseFloat(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Entity Detection</label>
                <select
                  value={entityDetection}
                  onChange={(e) => setEntityDetection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All (PII, PHI, PCI, Offensive)</option>
                  <option value="pii">PII Only</option>
                  <option value="none">Disabled</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-300">Include Timestamps</span>
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(e) => setIncludeTimestamps(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
              </div>

              <div className="pt-4 space-y-2">
                {!isConnected ? (
                  <button
                    onClick={handleConnect}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Connect WebSocket
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    className="w-full py-3 bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600/30 text-rose-300 font-medium rounded-xl transition flex items-center justify-center gap-2"
                  >
                    Disconnect WebSocket
                  </button>
                )}

                {isConnected && (
                  !isRecording ? (
                    <button
                      onClick={startRecording}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg transition flex items-center justify-center gap-2 animate-pulse"
                    >
                      <Mic className="w-4 h-4" />
                      Start Speaking / Mic Stream
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <MicOff className="w-4 h-4" />
                      Stop Mic Stream
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Transcript Retrieval by ID Component */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Get Transcript By ID
            </h2>
            <p className="text-xs text-slate-400">Retrieve a previously generated transcript using GET /v1/speech-to-text/transcripts/:id</p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter transcription ID..."
                value={transcriptIdInput}
                onChange={(e) => setTranscriptIdInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                onClick={handleFetchTranscript}
                disabled={isFetchingTranscript || !transcriptIdInput.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {isFetchingTranscript ? 'Fetching...' : 'Retrieve Transcript'}
              </button>
              <button
                onClick={handleDeleteTranscript}
                disabled={isDeletingTranscript || !transcriptIdInput.trim()}
                className="w-full py-2.5 bg-rose-600/20 border border-rose-500/30 hover:bg-rose-600/30 disabled:opacity-50 text-rose-300 font-medium rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {isDeletingTranscript ? 'Deleting...' : 'Delete Transcript'}
              </button>
            </div>
            {fetchError && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-xs text-rose-300">
                {typeof fetchError === 'string' ? fetchError : JSON.stringify(fetchError)}
              </div>
            )}
            {deleteSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {deleteSuccess}
              </div>
            )}
            {retrievedTranscript && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
                <div className="text-indigo-400 font-bold">Transcript Result:</div>
                <pre className="whitespace-pre-wrap text-slate-300">{JSON.stringify(retrievedTranscript, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Create Batch Transcript Component */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Create Transcript (POST /v1/speech-to-text)
            </h2>
            <p className="text-xs text-slate-400">Transcribe an audio/video file or source URL with Scribe v2 models.</p>
            <form onSubmit={handleBatchConvert} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Source Audio/Video File</label>
                <input
                  type="file"
                  onChange={(e) => setBatchFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Or Source URL (YouTube, hosted audio/video)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={sourceUrlInput}
                  onChange={(e) => setSourceUrlInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Model ID</label>
                  <select
                    value={batchModelId}
                    onChange={(e) => setBatchModelId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="scribe_v2">scribe_v2</option>
                  </select>
                </div>
                <div className="flex items-center justify-between pt-5 px-2">
                  <span className="text-xs text-slate-300">Diarize Speakers</span>
                  <input
                    type="checkbox"
                    checked={diarize}
                    onChange={(e) => setDiarize(e.target.checked)}
                    className="w-4 h-4 accent-purple-600 rounded"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isBatchConverting}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {isBatchConverting ? 'Transcribing...' : 'Submit Transcription Request'}
              </button>
            </form>
            {batchError && (
              <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-xl text-xs text-rose-300">
                {typeof batchError === 'string' ? batchError : JSON.stringify(batchError)}
              </div>
            )}
            {batchResult && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono space-y-1 max-h-60 overflow-y-auto">
                <div className="text-purple-400 font-bold">Transcription Success:</div>
                <pre className="whitespace-pre-wrap text-slate-300">{JSON.stringify(batchResult, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Connection Stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Stream Telemetry
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-lg font-bold text-purple-400">{stats.chunksSent}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Chunks Sent</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-lg font-bold text-indigo-400">{stats.partialsReceived}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Partials</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-lg font-bold text-emerald-400">{stats.commitsReceived}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">Commits</div>
              </div>
            </div>
            {sessionId && (
              <div className="text-xs text-slate-400 pt-2 flex items-center justify-between">
                <span>Session ID:</span>
                <span className="font-mono text-slate-200">{sessionId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Transcripts & WebSocket Frame Inspector */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Transcript View */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[400px]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                Live Transcription Stream
              </h2>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-xs text-slate-400">{isConnected ? (isRecording ? 'Listening...' : 'Connected') : 'Disconnected'}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-2">
              {transcripts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                  <Volume2 className="w-10 h-10 mb-2 opacity-40" />
                  <p>Connect WebSocket and start speaking to view live transcription.</p>
                </div>
              ) : (
                transcripts.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      t.type === 'partial'
                        ? 'bg-slate-950/60 border-purple-900/30 text-purple-200 italic animate-pulse'
                        : 'bg-slate-950 border-slate-800 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-medium uppercase tracking-wider text-[10px] text-purple-400">
                        {t.type === 'partial' ? 'Interim Partial' : 'Committed Transcript'}
                      </span>
                      <span>{t.timestamp}</span>
                    </div>
                    <p className="text-base">{t.text}</p>
                    {t.details?.committed_transcript_with_timestamps && (
                      <div className="mt-2 text-xs text-slate-400 font-mono bg-slate-900 p-2 rounded">
                        {JSON.stringify(t.details.committed_transcript_with_timestamps)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* WebSocket Event Inspector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[320px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                WebSocket Frame Inspector
              </h3>
              <button
                onClick={() => setEventLogs([])}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                Clear Logs
              </button>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 py-3 pr-2">
              {eventLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-10">No WebSocket frames recorded yet.</div>
              ) : (
                eventLogs.map((log, i) => (
                  <div key={i} className="p-2 bg-slate-950 rounded border border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span className="text-purple-400 font-bold">{log.type}</span>
                      <span>{log.time}</span>
                    </div>
                    <pre className="text-slate-300 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(log.payload, null, 2)}</pre>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
