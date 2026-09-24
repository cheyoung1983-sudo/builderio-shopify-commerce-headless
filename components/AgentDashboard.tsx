'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface AgentStatus {
  status: string;
  [key: string]: any;
}

interface AgentHealthData {
  elevenLabs: AgentStatus;
  audioWorklet: AgentStatus;
  apiKeys: AgentStatus;
}

const StatusIndicator = ({ status }: { status: string }) => 
  status === 'connected' || status === 'available' || status === 'configured' 
    ? <div className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" /> Healthy</div>
    : <div className="flex items-center gap-1 text-red-600"><AlertCircle className="w-4 h-4" /> Error</div>;

export default function AgentDashboard() {
  const [data, setData] = useState<AgentHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  if (loading && !data) return <div className="p-4 flex items-center text-sm"><Loader2 className="animate-spin mr-2 w-4 h-4" /> Monitoring agent...</div>;

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">ElevenLabs Agent Monitor</h2>
        <button onClick={fetchData} className="flex items-center gap-1 text-sm bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">
          <RefreshCw className="w-3 h-3" /> Reconnect
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex justify-between">
          <span>Connection:</span>
          <StatusIndicator status={data!.elevenLabs.status} />
        </div>
        <div className="flex justify-between">
          <span>Audio Worklet:</span>
          <StatusIndicator status={data!.audioWorklet.status} />
        </div>
        <div className="flex justify-between">
          <span>API Key:</span>
          <StatusIndicator status={data!.apiKeys.status} />
        </div>
      </div>
    </div>
  );
}
