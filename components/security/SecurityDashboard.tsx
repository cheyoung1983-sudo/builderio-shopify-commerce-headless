'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { ShieldAlert, ShieldCheck, AlertTriangle, Activity, Filter, RefreshCw, Lock, Zap, Download } from 'lucide-react';

export interface SecurityEventLog {
  id: string;
  type: 'RATE_LIMIT_EXCEEDED' | 'CORS_VIOLATION' | 'UNAUTHORIZED_ACCESS';
  timestamp: string;
  clientIp: string;
  path: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high';
}

const INITIAL_EVENTS: SecurityEventLog[] = [
  { id: 'evt-101', type: 'RATE_LIMIT_EXCEEDED', timestamp: '10:45:12', clientIp: '192.168.1.42', path: '/api/agent/token', userAgent: 'python-requests/2.28.1', severity: 'high' },
  { id: 'evt-102', type: 'CORS_VIOLATION', timestamp: '10:42:01', clientIp: '45.33.18.90', path: '/api/observability/log', userAgent: 'Mozilla/5.0 (Unknown)', severity: 'medium' },
  { id: 'evt-103', type: 'RATE_LIMIT_EXCEEDED', timestamp: '10:38:55', clientIp: '192.168.1.42', path: '/api/agent/token', userAgent: 'python-requests/2.28.1', severity: 'high' },
  { id: 'evt-104', type: 'UNAUTHORIZED_ACCESS', timestamp: '10:30:10', clientIp: '185.220.101.5', path: '/api/admin/config', userAgent: 'curl/7.68.0', severity: 'high' },
  { id: 'evt-105', type: 'CORS_VIOLATION', timestamp: '10:22:18', clientIp: '104.28.19.11', path: '/api/cart', userAgent: 'Safari/537.36', severity: 'low' },
  { id: 'evt-106', type: 'RATE_LIMIT_EXCEEDED', timestamp: '10:15:30', clientIp: '203.0.113.195', path: '/api/checkout', userAgent: 'Go-http-client/1.1', severity: 'medium' },
  { id: 'evt-107', type: 'CORS_VIOLATION', timestamp: '10:05:44', clientIp: '198.51.100.8', path: '/api/observability/log', userAgent: 'PostmanRuntime/7.29.2', severity: 'medium' },
  { id: 'evt-108', type: 'RATE_LIMIT_EXCEEDED', timestamp: '09:55:02', clientIp: '192.168.1.42', path: '/api/agent/token', userAgent: 'python-requests/2.28.1', severity: 'high' },
];

const TIME_SERIES_DATA = [
  { time: '08:00', rateLimits: 2, corsViolations: 1, unauthorized: 0 },
  { time: '08:30', rateLimits: 4, corsViolations: 3, unauthorized: 1 },
  { time: '09:00', rateLimits: 9, corsViolations: 2, unauthorized: 0 },
  { time: '09:30', rateLimits: 15, corsViolations: 5, unauthorized: 2 },
  { time: '10:00', rateLimits: 22, corsViolations: 8, unauthorized: 1 },
  { time: '10:30', rateLimits: 18, corsViolations: 4, unauthorized: 3 },
  { time: '11:00', rateLimits: 28, corsViolations: 11, unauthorized: 2 },
];

const EVENT_TYPE_PIE_DATA = [
  { name: 'Rate Limit Hits', value: 98, color: '#ef4444' },
  { name: 'CORS Rejections', value: 34, color: '#f59e0b' },
  { name: 'Unauthorized Access', value: 9, color: '#8b5cf6' },
];

const TOP_VIOLATING_IPS = [
  { ip: '192.168.1.42', hits: 48, status: 'Blocked' },
  { ip: '185.220.101.5', hits: 24, status: 'Flagged' },
  { ip: '45.33.18.90', hits: 19, status: 'Monitored' },
  { ip: '203.0.113.195', hits: 14, status: 'Monitored' },
  { ip: '104.28.19.11', hits: 8, status: 'Allowed' },
];

export default function SecurityDashboard() {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [events, setEvents] = useState<SecurityEventLog[]>(INITIAL_EVENTS);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const newEvt: SecurityEventLog = {
        id: `evt-${Date.now().toString().slice(-4)}`,
        type: Math.random() > 0.5 ? 'RATE_LIMIT_EXCEEDED' : 'CORS_VIOLATION',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        clientIp: `192.168.1.${Math.floor(Math.random() * 100)}`,
        path: '/api/agent/token',
        userAgent: 'automated-scanner/1.0',
        severity: 'high',
      };
      setEvents((prev) => [newEvt, ...prev]);
      setIsRefreshing(false);
    }, 600);
  };

  const filteredEvents = useMemo(() => {
    if (filterType === 'ALL') return events;
    return events.filter((e) => e.type === filterType);
  }, [events, filterType]);

  const handleExportCsv = () => {
    const csvRows: string[] = [];

    // Header 1: Security Audit Log Events
    csvRows.push('--- SECURITY AUDIT EVENT LOGS ---');
    csvRows.push('ID,Timestamp,Type,Client IP,Endpoint Path,Severity,User Agent');
    filteredEvents.forEach((evt) => {
      const cleanUa = `"${evt.userAgent.replace(/"/g, '""')}"`;
      csvRows.push(`${evt.id},${evt.timestamp},${evt.type},${evt.clientIp},${evt.path},${evt.severity},${cleanUa}`);
    });

    csvRows.push('');
    // Header 2: Security Events Timeline Chart Data
    csvRows.push('--- SECURITY EVENTS TIMELINE (CHART DATA) ---');
    csvRows.push('Time,Rate Limit Hits,CORS Violations,Unauthorized Access');
    TIME_SERIES_DATA.forEach((row) => {
      csvRows.push(`${row.time},${row.rateLimits},${row.corsViolations},${row.unauthorized}`);
    });

    csvRows.push('');
    // Header 3: Top Threat IP Data
    csvRows.push('--- TOP THREAT IP ADDRESSES ---');
    csvRows.push('IP Address,Violations Count,Quarantine Status');
    TOP_VIOLATING_IPS.forEach((row) => {
      csvRows.push(`${row.ip},${row.hits},${row.status}`);
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `security_audit_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8 bg-gray-50 dark:bg-gray-900 rounded-xl min-h-screen text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight">API Security Dashboard</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time monitoring of rate-limiting, CORS violations, and threat telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="1h">Last 1 Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate Limit Hits</p>
            <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">98</p>
            <span className="text-xs text-red-500 font-medium">+14% vs last window</span>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl">
            <Zap className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CORS Rejections</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">34</p>
            <span className="text-xs text-amber-500 font-medium">-5% vs last window</span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Blocked Threat IPs</p>
            <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">5</p>
            <span className="text-xs text-purple-500 font-medium">Auto-quarantined</span>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">System Health</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">99.8%</p>
            <span className="text-xs text-emerald-500 font-medium">Alert Notifier Active</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Series Area Chart */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Security Events Timeline
            </h2>
            <span className="text-xs text-gray-400">Captured by lib/api-security</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TIME_SERIES_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorCors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                />
                <Legend />
                <Area type="monotone" dataKey="rateLimits" name="Rate Limits" stroke="#ef4444" fillOpacity={1} fill="url(#colorRate)" />
                <Area type="monotone" dataKey="corsViolations" name="CORS Violations" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCors)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Breakdown Donut Chart */}
        <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <h2 className="text-base font-semibold">Event Type Distribution</h2>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={EVENT_TYPE_PIE_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                  {EVENT_TYPE_PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Threat IPs & Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Violating IPs Bar Chart */}
        <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <h2 className="text-base font-semibold">Top Threat IP Addresses</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TOP_VIOLATING_IPS} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis dataKey="ip" type="category" stroke="#9ca3af" fontSize={11} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }} />
                <Bar dataKey="hits" name="Violations" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Security Log Stream */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              Live Security Audit Logs
            </h2>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg text-xs">
              {['ALL', 'RATE_LIMIT_EXCEEDED', 'CORS_VIOLATION'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    filterType === type
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {type === 'ALL' ? 'All' : type === 'RATE_LIMIT_EXCEEDED' ? 'Rate Limits' : 'CORS'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Client IP</th>
                  <th className="py-2.5 px-3">Endpoint Path</th>
                  <th className="py-2.5 px-3">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                    <td className="py-2.5 px-3 font-mono text-gray-400">{evt.timestamp}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${
                          evt.type === 'RATE_LIMIT_EXCEEDED'
                            ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {evt.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">{evt.clientIp}</td>
                    <td className="py-2.5 px-3 font-mono text-indigo-600 dark:text-indigo-400">{evt.path}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          evt.severity === 'high'
                            ? 'bg-red-500 text-white'
                            : evt.severity === 'medium'
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-400 text-white'
                        }`}
                      >
                        {evt.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
