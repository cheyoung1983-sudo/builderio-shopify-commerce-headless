'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';

export default function ConfigDashboard() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      });
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    await fetch('/api/config', {
      method: 'POST',
      body: JSON.stringify(config),
      headers: { 'Content-Type': 'application/json' },
    });
    setSaving(false);
  };

  if (loading) return <div className="p-4"><Loader2 className="animate-spin w-4 h-4" /></div>;

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h2 className="text-lg font-bold mb-4">System Configuration</h2>
      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={config.shopifyCartEnabled} 
                 onChange={e => setConfig({...config, shopifyCartEnabled: e.target.checked})} />
          Enable Shopify Cart
        </label>
        <label className="block text-sm">
          Webhook Endpoint:
          <input className="border rounded w-full p-1" value={config.webhookEndpoint} 
                 onChange={e => setConfig({...config, webhookEndpoint: e.target.value})} />
        </label>
        <button onClick={saveConfig} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded">
          {saving ? <Loader2 className="animate-spin w-3 h-3" /> : <Save className="w-3 h-3" />}
          Save Configuration
        </button>
      </div>
    </div>
  );
}
