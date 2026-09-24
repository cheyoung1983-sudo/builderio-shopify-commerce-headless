import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Volume2, Play, Download, Sparkles, Settings, ArrowLeft } from 'lucide-react';

export default function TextToSpeechPage() {
  const [text, setText] = useState('The first move is what sets everything in motion.');
  const [voiceId, setVoiceId] = useState('JBFqnCBsd6RMkjVDRZzb');
  const [modelId, setModelId] = useState('eleven_v3');
  const [outputFormat, setOutputFormat] = useState('mp3_44100_128');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setIsLoading(true);
    setError(null);
    setAudioUrl(null);

    try {
      const res = await fetch('/api/tts/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          model_id: modelId,
          output_format: outputFormat,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAudioUrl(data.audioBase64);
      } else {
        setError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Head>
        <title>Text-to-Speech Generation | ElevenLabs</title>
        <meta name="description" content="Generate speech from text using ElevenLabs eleven_v3 model." />
      </Head>

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
              <Volume2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                ElevenLabs Text-to-Speech <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">eleven_v3</span>
              </h1>
              <p className="text-xs text-slate-400">Generate high-fidelity audio from text</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Storefront
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              TTS Generation Studio
            </h2>
            <span className="text-xs font-mono text-slate-400">POST /v1/text-to-speech/:voice_id</span>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Text to Synthesize</label>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                placeholder="Enter text here..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Voice ID</label>
                <input
                  type="text"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Model ID</label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="eleven_v3">eleven_v3</option>
                  <option value="eleven_multilingual_v2">eleven_multilingual_v2</option>
                  <option value="eleven_turbo_v2_5">eleven_turbo_v2_5</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Output Format</label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500 font-mono text-xs"
                >
                  <option value="mp3_44100_128">mp3_44100_128</option>
                  <option value="mp3_22050_32">mp3_22050_32</option>
                  <option value="pcm_16000">pcm_16000</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !text.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isLoading ? 'Synthesizing Speech...' : 'Generate Audio (Convert)'}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-900/50 rounded-xl text-sm text-rose-300">
              {typeof error === 'string' ? error : JSON.stringify(error)}
            </div>
          )}

          {audioUrl && (
            <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                  <Play className="w-4 h-4" /> Synthesized Audio Ready
                </span>
                <a
                  href={audioUrl}
                  download="audio.mp3"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download MP3
                </a>
              </div>
              <audio controls src={audioUrl} className="w-full" />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
