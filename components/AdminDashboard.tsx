'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface HealthStatus {
  status: string;
  [key: string]: any;
}

interface HealthData {
  elevenLabs: HealthStatus;
  webhooks: HealthStatus;
  apiKeys: HealthStatus;
}

const StatusIcon = ({ status }: { status: string }) => 
    status === 'connected' || status === 'healthy' || status === 'configured' 
      ? <CheckCircle className="text-green-500 w-5 h-5" /> 
      : <AlertCircle className="text-red-500 w-5 h-5" />;

const HealthCard = ({ title, status }: { title: string, status: string }) => (
    <div className="border rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold flex items-center gap-2 mb-2">
        <StatusIcon status={status} />
        {title}
      </h3>
      <p className="text-sm text-gray-600">Status: {status}</p>
    </div>
  );

export default function AdminDashboard() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4 flex items-center"><Loader2 className="animate-spin mr-2" /> Loading system health...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <HealthCard title="ElevenLabs Agent" status={data!.elevenLabs.status} />
      <HealthCard title="Webhooks" status={data!.webhooks.status} />
      <HealthCard title="API Config" status={data!.apiKeys.status} />
    </div>
  );
}
