import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Play, Pause, Square, RefreshCw, AlertTriangle, Instagram, 
  Send, Filter, Activity, Terminal, ShieldAlert, 
  ExternalLink, Plus, Trash2, Eye, Clock, CheckCircle, Wifi, Calendar
} from 'lucide-react';
import { JobDetailModal } from './components/JobDetailModal';
import { ResetStartTimeModal } from './components/ResetStartTimeModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'filters' | 'alerts' | 'sandbox' | 'logs'>('overview');
  
  // Agent Status State
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  // UI Controls & Selection
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Add Source Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPriority, setNewPriority] = useState('NORMAL');

  // Diagnostic State
  const [igDiagnosticResult, setIgDiagnosticResult] = useState<any>(null);
  const [igDiagnosticLoading, setIgDiagnosticLoading] = useState(false);

  // Sandbox State
  const [sandboxCaption, setSandboxCaption] = useState('🚨 HIRING ALERT! ABC Tech is hiring Full Stack Developers in Noida. Freshers apply now: https://abctech.careers');
  const [sandboxImageUrl, setSandboxImageUrl] = useState('');
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxTelegramStatus, setSandboxTelegramStatus] = useState<string | null>(null);

  // Fetch all initial data
  const fetchData = async () => {
    try {
      const [statusRes, metricsRes, sourcesRes, filtersRes, alertsRes, logsRes] = await Promise.all([
        axios.get('/api/agent/status'),
        axios.get('/api/alerts/metrics'),
        axios.get('/api/sources'),
        axios.get('/api/filters'),
        axios.get('/api/alerts'),
        axios.get('/api/logs')
      ]);

      setAgentStatus(statusRes.data.data);
      setMetrics(metricsRes.data.data);
      setSources(sourcesRes.data.data);
      setFilters(filtersRes.data.data);
      setAlerts(alertsRes.data.data);
      setLogs(logsRes.data.data);
    } catch (e) {
      console.error('API Fetch Error:', e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Agent Control Handlers
  const handleAgentControl = async (action: 'start' | 'pause' | 'stop' | 'run-now') => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/agent/${action}`);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResetStartTime = async () => {
    await axios.post('/api/agent/reset-start-time', { confirm: true });
    await fetchData();
  };

  // Run Real Instagram Connection Test
  const handleTestInstagramConnection = async () => {
    setIgDiagnosticLoading(true);
    try {
      const res = await axios.post('/api/test/instagram');
      setIgDiagnosticResult(res.data.data);
    } catch (e: any) {
      setIgDiagnosticResult({ status: 'FAILED', errorDetails: e.message });
    } finally {
      setIgDiagnosticLoading(false);
    }
  };

  // Add Source Handler
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername) return;
    try {
      await axios.post('/api/sources', { username: newUsername, priority: newPriority });
      setNewUsername('');
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSource = async (id: string) => {
    try {
      await axios.patch(`/api/sources/${id}/toggle`);
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      await axios.delete(`/api/sources/${id}`);
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Update Filters Handler
  const handleSaveFilters = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put('/api/filters', filters);
      alert('Job preferences updated successfully!');
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Sandbox Classification Handler
  const handleRunSandbox = async () => {
    setSandboxLoading(true);
    setSandboxTelegramStatus(null);
    try {
      const res = await axios.post('/api/test/classify', {
        caption: sandboxCaption,
        imageUrl: sandboxImageUrl
      });
      setSandboxResult(res.data.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setSandboxLoading(false);
    }
  };

  const handleSendTestTelegram = async () => {
    try {
      const res = await axios.post('/api/test/telegram');
      setSandboxTelegramStatus(res.data.message);
    } catch (e: any) {
      setSandboxTelegramStatus('Failed to send test alert');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl shadow-lg shadow-sky-500/20">
              <Instagram className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Instagram Job Alert Agent</h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Calendar className="w-3 h-3 text-sky-400" />
                  SCHEDULED (Every 2 Hours)
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold text-slate-300">AGENT_START_TIME:</span> {agentStatus?.agentStartTimeFormatted || 'Loading...'}
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleAgentControl('run-now')}
              disabled={loadingAction}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-sky-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAction ? 'animate-spin' : ''}`} /> RUN NOW
            </button>

            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium text-xs transition flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Reset Start Time
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-700/60 flex space-x-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Schedule', icon: Activity },
            { id: 'sources', label: 'Monitored Sources', icon: Instagram },
            { id: 'filters', label: 'Job Filters', icon: Filter },
            { id: 'alerts', label: 'Job Alerts Feed', icon: Send },
            { id: 'sandbox', label: 'Manual Sandbox & Diagnostics', icon: ShieldAlert },
            { id: 'logs', label: 'Logs', icon: Terminal }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Scheduled Status Banner */}
            <div className="bg-slate-800/90 border border-sky-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
              <div>
                <span className="text-xs text-sky-400 font-bold uppercase tracking-wider block">Scheduled Execution Model</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Wakes up every 2 hours to scan Instagram feeds</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Last Checkpoint: <strong className="text-white">{agentStatus?.lastSuccessfulCheckFormatted || 'Never'}</strong> • Next Execution: <strong className="text-sky-300">In ~2 Hours (via GitHub Actions Cron / Scheduled Worker)</strong>
                </p>
              </div>
              <button
                onClick={() => handleAgentControl('run-now')}
                disabled={loadingAction}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition flex items-center gap-2 whitespace-nowrap shadow-lg shadow-sky-600/30"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAction ? 'animate-spin' : ''}`} /> Trigger Immediate Run Now
              </button>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Scanned</span>
                <p className="text-3xl font-extrabold text-white mt-1">{metrics?.totalScanned || 0}</p>
                <span className="text-xs text-slate-500 mt-1 block">Filtered by timestamp</span>
              </div>

              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
                <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">High Relevance</span>
                <p className="text-3xl font-extrabold text-emerald-400 mt-1">{metrics?.highRelevanceCount || 0}</p>
                <span className="text-xs text-slate-500 mt-1 block">Full match preference</span>
              </div>

              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
                <span className="text-xs text-sky-400 uppercase tracking-wider font-semibold">Telegram Alerts Sent</span>
                <p className="text-3xl font-extrabold text-sky-400 mt-1">{metrics?.notificationsCount || 0}</p>
                <span className="text-xs text-slate-500 mt-1 block">Live bot notifications</span>
              </div>

              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ignored / Low Match</span>
                <p className="text-3xl font-extrabold text-slate-400 mt-1">{metrics?.irrelevantCount || 0}</p>
                <span className="text-xs text-slate-500 mt-1 block">Non-job / Out of location</span>
              </div>
            </div>

            {/* Diagnostic Bar Quick Action */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-sky-400" /> Real Instagram Adapter Connectivity Test
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Test adapter mode, API authorization, post retrieval, and Reel support.</p>
              </div>
              <button
                onClick={handleTestInstagramConnection}
                disabled={igDiagnosticLoading}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition flex items-center gap-2 whitespace-nowrap shadow-md shadow-sky-600/20"
              >
                {igDiagnosticLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Test Instagram Connection
              </button>
            </div>

            {/* Diagnostic Results Card */}
            {igDiagnosticResult && (
              <div className={`p-5 rounded-2xl border ${igDiagnosticResult.status === 'SUCCESS' ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200' : 'bg-amber-950/20 border-amber-500/40 text-amber-200'}`}>
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                  Adapter Diagnostic Report: <span className="uppercase font-mono">{igDiagnosticResult.status}</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div><span className="text-slate-400 block">Adapter:</span> <strong>{igDiagnosticResult.adapter}</strong></div>
                  <div><span className="text-slate-400 block">Auth Status:</span> <strong>{igDiagnosticResult.authentication}</strong></div>
                  <div><span className="text-slate-400 block">Posts Retrieved:</span> <strong>{igDiagnosticResult.postsRetrieved}</strong></div>
                  <div><span className="text-slate-400 block">Reel Support:</span> <strong>{igDiagnosticResult.reelSupport}</strong></div>
                </div>
                {igDiagnosticResult.errorDetails && (
                  <p className="mt-3 text-xs bg-black/40 p-2.5 rounded-lg border border-amber-500/30 text-amber-300 font-mono">
                    {igDiagnosticResult.errorDetails}
                  </p>
                )}
              </div>
            )}

            {/* Recent Scanned Feed */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                <span>Recent Job Detections</span>
                <span className="text-xs text-slate-400 font-normal">Auto-updating every 5s</span>
              </h2>

              <div className="space-y-3">
                {alerts.slice(0, 5).map(post => (
                  <div key={post.id} className="p-4 bg-slate-850 border border-slate-700/60 rounded-xl flex items-center justify-between hover:border-slate-600 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          post.relevance_score === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400' :
                          post.relevance_score === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {post.relevance_score}
                        </span>
                        <h4 className="font-semibold text-white">{post.job_alert?.role || 'Post Scanned'}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span>🏢 {post.job_alert?.company || 'Not specified'}</span>
                        <span>📍 {post.job_alert?.location || 'Not specified'}</span>
                        <span>📅 {post.publishedAtFormatted}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedJob(post)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SOURCES */}
        {activeTab === 'sources' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-white mb-4">Add Instagram Source</h2>
              <form onSubmit={handleAddSource} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="@account_username"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="HIGH">HIGH Priority</option>
                  <option value="NORMAL">NORMAL Priority</option>
                  <option value="LOW">LOW Priority</option>
                </select>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Source
                </button>
              </form>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-850 text-slate-400 uppercase text-xs border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Account</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Checked</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {sources.map(src => (
                    <tr key={src.id} className="hover:bg-slate-850/50 transition">
                      <td className="px-6 py-4 font-semibold text-white flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-sky-400" />
                        <a href={src.profile_url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                          {src.username} <ExternalLink className="w-3 h-3 text-slate-500" />
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-700 text-slate-300">
                          {src.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${src.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {src.enabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {src.last_checked_at ? new Date(src.last_checked_at).toLocaleTimeString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleSource(src.id)}
                          className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 transition"
                        >
                          {src.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteSource(src.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: JOB FILTERS */}
        {activeTab === 'filters' && filters && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
            <h2 className="text-lg font-bold text-white">Configurable Job Preferences & Filters</h2>
            
            <form onSubmit={handleSaveFilters} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Minimum Relevance Score Threshold
                </label>
                <select
                  value={filters.minRelevance}
                  onChange={e => setFilters({ ...filters, minRelevance: e.target.value })}
                  className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="HIGH">HIGH Relevance Only</option>
                  <option value="MEDIUM">HIGH & MEDIUM Relevance (Recommended)</option>
                  <option value="LOW">All Job Posts (Include LOW)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Preferred Job Roles (Comma Separated)
                </label>
                <textarea
                  rows={3}
                  value={filters.roles.join(', ')}
                  onChange={e => setFilters({ ...filters, roles: e.target.value.split(',').map(s => s.trim()) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Preferred Locations (Includes Synonym Resolution Gurgaon/Gurugram/Noida/Delhi NCR)
                </label>
                <textarea
                  rows={3}
                  value={filters.locations.join(', ')}
                  onChange={e => setFilters({ ...filters, locations: e.target.value.split(',').map(s => s.trim()) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition shadow-lg shadow-sky-600/30"
              >
                Save Preferences
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: ALERTS FEED */}
        {activeTab === 'alerts' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h2 className="text-lg font-bold text-white">All Scanned & Detected Instagram Job Posts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map(post => (
                <div key={post.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-3 hover:border-slate-600 transition">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      post.relevance_score === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      post.relevance_score === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {post.relevance_score} Relevance
                    </span>
                    <span className="text-xs text-slate-400">{post.publishedAtFormatted}</span>
                  </div>

                  <h3 className="text-base font-bold text-white">{post.job_alert?.role || 'Instagram Post'}</h3>
                  <p className="text-xs text-slate-300 line-clamp-2">{post.job_alert?.company || 'Company Not specified'}</p>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-700/60 text-xs">
                    <span className="text-slate-400">{post.source_account}</span>
                    <button
                      onClick={() => setSelectedJob(post)}
                      className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 font-medium transition"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MANUAL SANDBOX */}
        {activeTab === 'sandbox' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">Manual Test Mode & AI Sandbox</h2>
              <p className="text-xs text-slate-400">Paste any Instagram caption or job flyer image URL to test AI extraction and Telegram alerts.</p>
              
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={sandboxCaption}
                  onChange={e => setSandboxCaption(e.target.value)}
                  placeholder="Paste Instagram post caption here..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-sky-500"
                />

                <input
                  type="text"
                  value={sandboxImageUrl}
                  onChange={e => setSandboxImageUrl(e.target.value)}
                  placeholder="Optional Flyer Image URL for OCR extraction..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />

                <div className="flex gap-3">
                  <button
                    onClick={handleRunSandbox}
                    disabled={sandboxLoading}
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition flex items-center gap-2 shadow-lg shadow-sky-600/20"
                  >
                    {sandboxLoading && <RefreshCw className="w-4 h-4 animate-spin" />} Analyze Content
                  </button>

                  <button
                    onClick={handleSendTestTelegram}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <Send className="w-4 h-4" /> Send Test Telegram Alert
                  </button>
                </div>
              </div>
            </div>

            {sandboxTelegramStatus && (
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-300 text-sm">
                {sandboxTelegramStatus}
              </div>
            )}

            {sandboxResult && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
                <h3 className="text-md font-bold text-white">Extraction Result JSON</h3>
                <pre className="p-4 bg-slate-900 rounded-xl text-xs text-emerald-400 overflow-x-auto border border-slate-700">
                  {JSON.stringify(sandboxResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 animate-in fade-in duration-300">
            <h2 className="text-lg font-bold text-white">System Logs</h2>
            <div className="p-4 bg-slate-900 rounded-xl text-xs font-mono text-slate-300 space-y-1 max-h-[60vh] overflow-y-auto border border-slate-700">
              {logs.map((log, i) => (
                <div key={i} className="py-0.5">
                  <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span className={log.level === 'ERROR' ? 'text-rose-400 font-bold' : log.level === 'WARN' ? 'text-amber-400' : 'text-sky-400'}>
                    [{log.level}]
                  </span>{' '}
                  {log.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      
      <ResetStartTimeModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirmReset={handleResetStartTime}
      />
    </div>
  );
}
