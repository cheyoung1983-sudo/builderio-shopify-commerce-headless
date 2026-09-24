import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Cpu, Sparkles, Mic, Music, Volume2, Shield, Zap, Search, CheckCircle2 } from 'lucide-react';

export default function ModelsOverviewPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'tts' | 'stt' | 'music'>('all');

  const models = [
    {
      id: 'eleven_v3',
      name: 'Eleven v3',
      category: 'tts',
      description: 'Our most emotionally rich, expressive speech synthesis model with dramatic delivery and 70+ languages.',
      limit: '5,000 chars (~5 min)',
      latency: '~350ms',
      languages: '70+ languages',
      badge: 'Flagship TTS',
    },
    {
      id: 'eleven_v3_conversational',
      name: 'Eleven v3 Conversational',
      category: 'tts',
      description: 'Our most expressive, realtime speech synthesis model with ultra-low latency (~280ms).',
      limit: 'Realtime WebSocket',
      latency: '~280ms',
      languages: '70+ languages',
      badge: 'Realtime Agent',
    },
    {
      id: 'eleven_multilingual_v2',
      name: 'Eleven Multilingual v2',
      category: 'tts',
      description: 'Lifelike, consistent quality speech synthesis model supporting 29 languages with rich emotion.',
      limit: '10,000 chars (~10 min)',
      latency: '~500ms',
      languages: '29 languages',
      badge: 'Stable Multilingual',
    },
    {
      id: 'eleven_flash_v2_5',
      name: 'Eleven Flash v2.5',
      category: 'tts',
      description: 'Ultra-fast speech synthesis model with ~75ms latency across 32 languages at 50% lower price.',
      limit: '40,000 chars (~40 min)',
      latency: '~75ms',
      languages: '32 languages',
      badge: 'Ultra Fast & Cheap',
    },
    {
      id: 'scribe_v2',
      name: 'Scribe v2',
      category: 'stt',
      description: 'State-of-the-art speech recognition model with 90+ languages, keyterm prompting, and speaker diarization.',
      limit: '5.0 GB File size',
      latency: 'Batch / Async',
      languages: '90+ languages',
      badge: 'State of Art STT',
    },
    {
      id: 'scribe_v2_realtime',
      name: 'Scribe v2 Realtime',
      category: 'stt',
      description: 'Real-time speech recognition model delivering partial transcripts in ~150ms over WSS.',
      limit: 'Streaming WSS',
      latency: '~150ms',
      languages: '90+ languages',
      badge: 'Live WSS STT',
    },
    {
      id: 'scribe_v2_medical',
      name: 'Scribe v2 Medical',
      category: 'stt',
      description: 'Speech recognition fine-tuned for clinical audio (35% fewer errors on medication and medical terms).',
      limit: '5.0 GB File size',
      latency: 'Batch / HIPAA ZRM',
      languages: '90+ languages',
      badge: 'Clinical / HIPAA',
    },
    {
      id: 'music_v2_5',
      name: 'Eleven Music v2.5',
      category: 'music',
      description: 'Studio-grade music generation from text prompts, composition plans, and audio references.',
      limit: 'Composition Plans',
      latency: 'Studio Render',
      languages: 'Multilingual',
      badge: 'Studio Music',
    },
  ];

  const filteredModels = models.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Head>
        <title>Models Overview & Capabilities | ElevenLabs</title>
        <meta name="description" content="Explore ElevenLabs audio models for Text to Speech, Speech to Text, and Music." />
      </Head>

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                ElevenLabs Models Directory <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">v3.x / Scribe v2</span>
              </h1>
              <p className="text-xs text-slate-400">Flagship speech, recognition, and music generation models</p>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${selectedCategory === 'all' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              All Models
            </button>
            <button
              onClick={() => setSelectedCategory('tts')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${selectedCategory === 'tts' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Text to Speech
            </button>
            <button
              onClick={() => setSelectedCategory('stt')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${selectedCategory === 'stt' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Speech to Text
            </button>
            <button
              onClick={() => setSelectedCategory('music')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${selectedCategory === 'music' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Music
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map((m) => (
            <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-purple-500/50 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-semibold">{m.badge}</span>
                  <span className="text-xs font-mono text-slate-400">{m.id}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{m.name}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{m.description}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Character Limit:</span>
                  <span className="text-slate-200 font-medium">{m.limit}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Latency:</span>
                  <span className="text-slate-200 font-medium">{m.latency}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Languages:</span>
                  <span className="text-slate-200 font-medium">{m.languages}</span>
                </div>
                <div className="pt-2">
                  <Link
                    href={m.category === 'stt' ? '/speech-to-text' : m.category === 'tts' ? '/tts' : '/transcript-demo'}
                    className="block text-center py-2 bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white rounded-xl font-medium transition"
                  >
                    Test Model
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
