import React, { useState } from 'react';
import Head from 'next/head';
import TranscriptDisplay, {
  ElevenLabsWebhookEvent,
} from '@components/TranscriptDisplay';
import { PhoneCall, RefreshCw, FileCode, CheckCircle2 } from 'lucide-react';

const samplePostCallWebhookEvent: ElevenLabsWebhookEvent = {
  type: 'post_call_transcription',
  event_id: 'evt_sample_77209',
  conversation_id: 'conv_8819x3k_displaycellpros',
  timestamp: 1727125000,
  data: {
    conversation_id: 'conv_8819x3k_displaycellpros',
    agent_id: 'agent_6301kqxr35beedj8n91eq7gz73d7',
    metadata: {
      call_duration_secs: 52,
      cost: 0.04,
    },
    analysis: {
      transcript_summary:
        'Customer inquired about express iPhone 15 Pro screen replacement cost and availability. Agent provided details ($189.99), verified store stock, and offered express mail-in or same-day walk-in scheduling.',
      call_successful: 'success',
      data_collection_results: {
        device_model: 'iPhone 15 Pro',
        service_requested: 'Screen & Touchscreen Replacement',
        customer_intent: 'In-store repair schedule',
      },
    },
    transcript: [
      {
        id: 'msg_1',
        role: 'user',
        message: 'Hi there! I accidentally cracked my iPhone 15 Pro screen today. Do you have replacement parts in stock?',
        time_in_call_secs: 3,
      },
      {
        id: 'msg_2',
        role: 'agent',
        message: 'Hello! Welcome to DisplayCellPros. Yes, we carry OEM-grade display and touchscreen assemblies for the iPhone 15 Pro in stock right now.',
        time_in_call_secs: 10,
      },
      {
        id: 'msg_3',
        role: 'user',
        message: 'Awesome! How long does the repair take and how much does it cost?',
        time_in_call_secs: 19,
      },
      {
        id: 'msg_4',
        role: 'agent',
        message: 'Our express glass and OLED replacement for iPhone 15 Pro is $189.99 including our 1-year warranty. The repair typically takes about 45 minutes.',
        time_in_call_secs: 28,
      },
      {
        id: 'msg_5',
        role: 'user',
        message: 'That sounds great! Can I drop it off this afternoon around 2 PM?',
        time_in_call_secs: 39,
      },
      {
        id: 'msg_6',
        role: 'agent',
        message: 'Absolutely! I have reserved a 2:00 PM express slot for you. Just bring your device in and our technician will handle the rest.',
        time_in_call_secs: 47,
      },
    ],
  },
};

export default function TranscriptDemoPage() {
  const [jsonInput, setJsonInput] = useState<string>(
    JSON.stringify(samplePostCallWebhookEvent, null, 2)
  );
  const [activeData, setActiveData] = useState<ElevenLabsWebhookEvent>(
    samplePostCallWebhookEvent
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setActiveData(parsed);
      setJsonError(null);
    } catch (err) {
      setJsonError((err as Error).message);
    }
  };

  const handleResetSample = () => {
    setJsonInput(JSON.stringify(samplePostCallWebhookEvent, null, 2));
    setActiveData(samplePostCallWebhookEvent);
    setJsonError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <Head>
        <title>Post-Call Transcript Viewer | DisplayCellPros</title>
        <meta
          name="description"
          content="Inspect ElevenLabs post-call transcriptions with detailed message modal view."
        />
      </Head>

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <PhoneCall className="w-3.5 h-3.5" />
            Webhook Transcript Viewer
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            ElevenLabs Post-Call Transcription
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Consumes <code className="text-blue-300 font-mono">post_call_transcription</code> webhook events and renders full conversation timelines. Click the <strong className="text-slate-200 font-medium">Details</strong> link on any message entry to inspect the entry in a dedicated modal.
          </p>
        </div>

        {/* Live Interactive Transcript Component */}
        <TranscriptDisplay data={activeData} />

        {/* JSON Tester Sandbox */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              Webhook Payload Tester
            </h3>
            <button
              onClick={handleResetSample}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Sample
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Paste or edit an ElevenLabs <code className="text-blue-300 font-mono">post_call_transcription</code> JSON payload below to test rendering and modal inspection.
          </p>

          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={10}
            className="w-full p-4 font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
          />

          {jsonError && (
            <p className="text-xs font-mono text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
              JSON Syntax Error: {jsonError}
            </p>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleApplyJson}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Update Transcript Display
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
