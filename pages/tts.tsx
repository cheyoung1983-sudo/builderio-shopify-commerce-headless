import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Volume2, Play, Download, Sparkles, ArrowLeft, Trash2, Clock } from 'lucide-react';

interface AudioCard {
  id: string;
  text: string;
  voiceId: string;
  modelId: string;
  outputFormat: string;
  audioUrl: string;
  format: string;
  createdAt: string;
}

export default function TextToSpeechPage() {
  const [text, setText] = useState('The first move is what sets everything in motion.');
  const [voiceId, setVoiceId] = useState('JBFqnCBsd6RMkjVDRZzb');
  const [modelId, setModelId] = useState('eleven_v3');
  const [outputFormat, setOutputFormat] = useState('mp3_44100_128');
  const [history, setHistory] = useState<AudioCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setIsLoading(true);
    setError(null);

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
        const newCard: AudioCard = {
          id: Math.random().toString(36).substring(2, 9),
          text,
          voiceId,
          modelId,
          outputFormat,
          audioUrl: data.audioBase64,
          format: data.format || (outputFormat.startsWith('pcm') ? 'wav' : 'mp3'),
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setHistory((prev) => [newCard, ...prev]);
      } else {
        setError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleDeleteCard = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Head>
        <title>Text-to-Speech Generation | ElevenLabs</title>
        <meta name="description" content="Generate and download speech as WAV or MP3 from text using ElevenLabs models." />
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
              <p className="text-xs text-slate-400">Generate high-fidelity audio and download as WAV or MP3</p>
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
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
                  <option value="mp3_44100_128">mp3_44100_128 (MP3)</option>
                  <option value="mp3_22050_32">mp3_22050_32 (MP3)</option>
                  <option value="pcm_16000">pcm_16000 (WAV)</option>
                  <option value="pcm_22050">pcm_22050 (WAV)</option>
                  <option value="pcm_44100">pcm_44100 (WAV)</option>
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
        </div>

        {/* Audio Generation Cards Section */}
        {history.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-semibold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-400" /> Generated Audio Cards ({history.length})
              </h3>
              <button
                onClick={handleClearHistory}
                className="text-xs text-slate-400 hover:text-rose-400 transition flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            </div>

            <div className="space-y-4">
              {history.map((card) => (
                <div key={card.id} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl relative group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-200 line-clamp-2 italic">&ldquo;{card.text}&rdquo;</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono pt-1">
                        <span className="px-2 py-0.5 bg-slate-800 rounded-md text-purple-300">Voice: {card.voiceId.slice(0, 8)}...</span>
                        <span className="px-2 py-0.5 bg-slate-800 rounded-md text-indigo-300">Model: {card.modelId}</span>
                        <span className="px-2 py-0.5 bg-slate-800 rounded-md text-slate-300">Format: {card.format.toUpperCase()}</span>
                        <span className="flex items-center gap-1 text-slate-500"><Clock className="w-3 h-3" /> {card.createdAt}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={card.audioUrl}
                        download={`audio_${card.id}.${card.format}`}
                        className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-medium transition flex items-center gap-1.5 shadow-md"
                      >
                        <Download className="w-4 h-4" /> Download {card.format.toUpperCase()}
                      </a>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition"
                        title="Delete card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <audio controls src={card.audioUrl} className="w-full h-10 accent-purple-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
