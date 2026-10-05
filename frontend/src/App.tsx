import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, RefreshCw, AlertTriangle, Instagram, 
  Send, Filter, Activity, Terminal, ShieldAlert, 
  ExternalLink, Calendar, Search, MapPin, Briefcase, 
  Building, CheckCircle2, ChevronLeft, ChevronRight, Zap, ArrowUpDown, Clock, Layers,
  CheckSquare, BookmarkCheck, Sparkles, CheckCircle, Info
} from 'lucide-react';
import { api } from './api';
import { JobDetailModal } from './components/JobDetailModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sources' | 'filters' | 'logs'>('dashboard');
  
  // Dashboard & Jobs State
  const [selectedDate, setSelectedDate] = useState<string>('active24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterExperience, setFilterExperience] = useState('');
  const [filterWorkMode, setFilterWorkMode] = useState('');
  const [filterEmploymentType, setFilterEmploymentType] = useState('');
  const [filterRelevance, setFilterRelevance] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterUserStatus, setFilterUserStatus] = useState('');
  const [sortOption, setSortOption] = useState('newest_posted');

  // Pagination State
  const [page, setPage] = useState(1);

  // Data State
  const [jobs, setJobs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [daySummary, setDaySummary] = useState<any>({ total: 0, highRelevance: 0, mediumRelevance: 0, lowRelevance: 0 });
  const [dateLabel, setDateLabel] = useState<string>('Last 24 Hours');
  
  // Stats & Health
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  
  // UI & Scan Controls (Requirements 1, 9, 15, 20)
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Jobs and Stats
  const fetchJobsData = async () => {
    try {
      const params: any = {
        date: selectedDate,
        search: searchQuery,
        role: filterRole,
        location: filterLocation,
        experience: filterExperience,
        workMode: filterWorkMode,
        employmentType: filterEmploymentType,
        relevance: filterRelevance,
        source: filterSource,
        status: filterUserStatus,
        sort: sortOption,
        page,
        limit: 20
      };

      const [jobsRes, statsRes, historyRes, sourcesRes, filtersRes, logsRes] = await Promise.all([
        api.get('/api/jobs', { params }),
        api.get('/api/jobs/stats'),
        api.get('/api/jobs/history'),
        api.get('/api/sources'),
        api.get('/api/filters'),
        api.get('/api/logs')
      ]);

      if (jobsRes.data.success) {
        setJobs(jobsRes.data.data.jobs);
        setPagination(jobsRes.data.data.pagination);
        setDaySummary(jobsRes.data.data.daySummary);
        setDateLabel(jobsRes.data.dateLabel || jobsRes.data.date);
      }

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (historyRes.data.success) setHistory(historyRes.data.data);
      if (sourcesRes.data.success) setSources(sourcesRes.data.data);
      if (filtersRes.data.success) setFilters(filtersRes.data.data);
      if (logsRes.data.success) setLogs(logsRes.data.data);
    } catch (e) {
      console.error('API Error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsData();
  }, [selectedDate, searchQuery, filterRole, filterLocation, filterExperience, filterWorkMode, filterEmploymentType, filterRelevance, filterSource, filterUserStatus, sortOption, page]);

  // Trigger Manual Scan ("SCAN JOBS") with cold-start tolerance and status progression
  const handleManualScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanResult(null);
    setScanMessage('Waking scanner...');

    const messageTimer = setTimeout(() => {
      setScanMessage('Scanning 69 Instagram job sources...');
    }, 3000);

    let keepScanningState = false;

    try {
      const res = await api.post('/api/jobs/scan', {}, { timeout: 180000 });
      clearTimeout(messageTimer);
      if (res.data.success) {
        if (res.data.data?.isScanning) {
          keepScanningState = true;
          setScanMessage('Scanning 69 Instagram job sources in background...');
          const pollInterval = setInterval(async () => {
            try {
              const statusRes = await api.get('/api/jobs/scan-status');
              if (statusRes.data.success && !statusRes.data.data.isScanning) {
                clearInterval(pollInterval);
                setScanResult(statusRes.data.data.lastScanResult);
                await fetchJobsData();
                setIsScanning(false);
                setScanMessage('');
              }
            } catch (err) {
              console.error('Polling scan status error:', err);
            }
          }, 3000);
          return;
        }

        setScanResult(res.data.data);
        await fetchJobsData();
      } else {
        alert(res.data.error || 'Scan failed');
      }
    } catch (e: any) {
      clearTimeout(messageTimer);
      alert(e.response?.data?.error || e.message || 'Failed to trigger scan cycle');
    } finally {
      if (!keepScanningState) {
        setIsScanning(false);
        setScanMessage('');
      }
    }
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      await api.patch(`/api/jobs/${jobId}/status`, { status: newStatus });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, userStatus: newStatus } : j));
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob((prev: any) => ({ ...prev, userStatus: newStatus }));
      }
    } catch (err) {
      console.error('Failed to update job status:', err);
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setFilterRole('');
    setFilterLocation('');
    setFilterExperience('');
    setFilterWorkMode('');
    setFilterEmploymentType('');
    setFilterRelevance('');
    setFilterSource('');
    setFilterUserStatus('');
    setSortOption('newest_posted');
    setSelectedDate('active24h');
    setPage(1);
  };

  const getStatusBadge = () => {
    if (isScanning) return { label: 'SCANNING', color: 'bg-amber-500 animate-pulse text-amber-950 font-bold' };
    if (stats?.agentStatus === 'ERROR') return { label: 'ERROR', color: 'bg-rose-500 text-white font-bold' };
    if (scanResult) return { label: 'COMPLETED', color: 'bg-emerald-500 text-emerald-950 font-bold' };
    return { label: 'READY', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-12">
      
      {/* HEADER BAR (Requirements 9 & 15) */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Instagram Job Finder
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </h1>
            <p className="text-xs text-slate-400">Daily Public Instagram Job Search Dashboard • 69 Monitored Sources</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Last Scan Time */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Last Scan:</span>
            <span className="text-slate-200 font-semibold">
              {stats?.lastSuccessfulCheckFormatted || 'Never'}
            </span>
          </div>

          {/* SCAN JOBS Primary Button (Requirement 1, 9, 15) */}
          <button
            onClick={handleManualScan}
            disabled={isScanning}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-lg ${
              isScanning 
                ? 'bg-amber-600 cursor-not-allowed opacity-90' 
                : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-blue-600/30'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? (scanMessage || 'SCANNING INSTAGRAM...') : '🔍 SCAN JOBS'}
          </button>
        </div>
      </header>

      {/* SCAN RESULTS BANNER / MODAL SUMMARY */}
      {scanResult && (
        <div className="bg-blue-950/80 border-b border-blue-800 px-4 lg:px-8 py-3 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 text-blue-200">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>SCAN COMPLETE:</strong> {scanResult.jobsFound ?? scanResult.processed} new qualifying jobs found • {scanResult.duplicates} duplicates ignored • {scanResult.ignoredOld} older than 24h • {scanResult.errors} errors in {Math.round(scanResult.durationMs / 1000)}s
            </span>
          </div>
          <button onClick={() => setScanResult(null)} className="text-blue-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="px-4 lg:px-8 pt-4 pb-2 border-b border-slate-800/50 bg-slate-900/40 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" /> Daily Job Dashboard
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'sources'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Instagram className="w-4 h-4 text-pink-400" /> Monitored Accounts ({stats?.monitoredAccounts || 69})
        </button>

        <button
          onClick={() => setActiveTab('filters')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'filters'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Filter className="w-4 h-4 text-amber-400" /> Search Filters
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Terminal className="w-4 h-4 text-emerald-400" /> System Logs
        </button>
      </div>

      <main className="px-4 lg:px-8 pt-6 max-w-7xl mx-auto space-y-6">
        
        {activeTab === 'dashboard' && (
          <>
            {/* STATS OVERVIEW CARDS (Requirement 9) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Active Jobs (24h)</span>
                <span className="text-2xl font-black text-white">{stats?.newJobsCount ?? 0}</span>
                <span className="text-[10px] text-emerald-400 mt-1 font-medium">Last 24 Hours IST</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">High Relevance</span>
                <span className="text-2xl font-black text-emerald-400">{stats?.highRelevanceCount ?? 0}</span>
                <span className="text-[10px] text-slate-500 mt-1 font-medium">Top Match Quality</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Monitored Accounts</span>
                <span className="text-2xl font-black text-sky-400">{stats?.monitoredAccounts ?? 69}</span>
                <span className="text-[10px] text-slate-500 mt-1 font-medium">Public Instagram Sources</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Total DB Posts</span>
                <span className="text-2xl font-black text-indigo-400">{stats?.totalPostsScanned ?? 0}</span>
                <span className="text-[10px] text-slate-500 mt-1 font-medium">Historical Deduplication</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm col-span-2 sm:col-span-1">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Next Action</span>
                <span className="text-lg font-bold text-amber-400 flex items-center gap-1">
                  <RefreshCw className="w-4 h-4" /> Manual Scan
                </span>
                <span className="text-[10px] text-slate-400 mt-1 font-medium">Click 🔍 SCAN JOBS</span>
              </div>
            </div>

            {/* SEARCH AND FILTER BAR (Requirement 14) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-md">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Box */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search jobs by role, company, location, skills..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Date Window Toggle (Requirements 5 & 10) */}
                <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => { setSelectedDate('active24h'); setPage(1); }}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      selectedDate === 'active24h' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    LAST 24 HOURS
                  </button>
                  <button
                    onClick={() => { setSelectedDate('today'); setPage(1); }}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      selectedDate === 'today' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    TODAY
                  </button>
                  <button
                    onClick={() => { setSelectedDate('all'); setPage(1); }}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      selectedDate === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ALL HISTORY
                  </button>
                </div>

                {/* Sort dropdown */}
                <select
                  value={sortOption}
                  onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="newest_posted">Sort: Newest Posted</option>
                  <option value="newest_detected">Sort: Newest Detected</option>
                  <option value="highest_relevance">Sort: Highest Relevance</option>
                  <option value="oldest_posted">Sort: Oldest Posted</option>
                </select>

                <button
                  onClick={resetAllFilters}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Reset
                </button>
              </div>

              {/* Filter Dropdowns */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800/60 text-xs">
                <input
                  type="text"
                  placeholder="Role (e.g. Full Stack)"
                  value={filterRole}
                  onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 placeholder-slate-500"
                />

                <input
                  type="text"
                  placeholder="Location (Noida, Remote)"
                  value={filterLocation}
                  onChange={(e) => { setFilterLocation(e.target.value); setPage(1); }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 placeholder-slate-500"
                />

                <select
                  value={filterRelevance}
                  onChange={(e) => { setFilterRelevance(e.target.value); setPage(1); }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300"
                >
                  <option value="">Relevance: All</option>
                  <option value="HIGH">HIGH Only</option>
                  <option value="MEDIUM">MEDIUM Only</option>
                  <option value="LOW">LOW Only</option>
                </select>

                <select
                  value={filterUserStatus}
                  onChange={(e) => { setFilterUserStatus(e.target.value); setPage(1); }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300"
                >
                  <option value="">Status: All</option>
                  <option value="NEW">NEW</option>
                  <option value="APPLIED">APPLIED</option>
                  <option value="REGISTERED">REGISTERED</option>
                  <option value="VIEWED">VIEWED</option>
                </select>

                <input
                  type="text"
                  placeholder="Source (@account)"
                  value={filterSource}
                  onChange={(e) => { setFilterSource(e.target.value); setPage(1); }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 placeholder-slate-500"
                />

                <select
                  value={filterWorkMode}
                  onChange={(e) => { setFilterWorkMode(e.target.value); setPage(1); }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300"
                >
                  <option value="">Work Mode: All</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>
            </div>

            {/* JOB LIST / CARDS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200">
                  Showing {jobs.length} jobs ({dateLabel})
                </span>
                <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} Total)</span>
              </div>

              {loading ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  Loading jobs...
                </div>
              ) : jobs.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                  <h3 className="text-base font-semibold text-white">No job alerts match your filters</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Click <strong>🔍 SCAN JOBS</strong> in the header to run a new manual Instagram check cycle across all 69 monitored accounts.
                  </p>
                  <button
                    onClick={handleManualScan}
                    disabled={isScanning}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Run Scan Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-slate-900 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between gap-4 shadow-sm"
                    >
                      <div className="space-y-3">
                        {/* Top Metadata */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              job.relevance === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              job.relevance === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {job.relevance}
                            </span>

                            {job.userStatus && job.userStatus !== 'NEW' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                {job.userStatus}
                              </span>
                            )}
                          </div>

                          <span className="text-xs text-sky-400 font-medium flex items-center gap-1">
                            <Instagram className="w-3 h-3 text-pink-400" />
                            {job.sourceAccount}
                          </span>
                        </div>

                        {/* Title & Company */}
                        <div>
                          <h3 
                            onClick={() => setSelectedJob(job)}
                            className="text-base font-bold text-white hover:text-blue-400 cursor-pointer transition line-clamp-1"
                          >
                            {job.role}
                          </h3>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Building className="w-3.5 h-3.5 text-sky-400" />
                            {job.company}
                          </p>
                        </div>

                        {/* Attribute Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{job.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">{job.experience}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate">{job.workMode}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{job.postedAtFormatted}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateJobStatus(job.id, 'APPLIED')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                              job.userStatus === 'APPLIED' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {job.userStatus === 'APPLIED' ? 'Applied ✓' : 'Mark Applied'}
                          </button>

                          <button
                            onClick={() => handleUpdateJobStatus(job.id, 'REGISTERED')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                              job.userStatus === 'REGISTERED' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {job.userStatus === 'REGISTERED' ? 'Registered ✓' : 'Registered'}
                          </button>
                        </div>

                        <button
                          onClick={() => setSelectedJob(job)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PAGINATION */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 text-xs text-slate-400">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 disabled:opacity-50 hover:text-white"
                  >
                    Previous
                  </button>

                  <span>Page {page} of {pagination.totalPages}</span>

                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 disabled:opacity-50 hover:text-white"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* SOURCES TAB */}
        {activeTab === 'sources' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Instagram className="w-5 h-5 text-pink-400" /> Monitored Instagram Accounts ({sources.length})
            </h2>
            <p className="text-xs text-slate-400">
              Centralized accounts checked during manual <code>POST /api/jobs/scan</code> search cycles.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
              {sources.map((s) => (
                <div key={s.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-sky-400">{s.username}</span>
                  <span className={`w-2 h-2 rounded-full ${s.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FILTERS TAB */}
        {activeTab === 'filters' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-amber-400" /> Preference Configuration
            </h2>
            <p className="text-xs text-slate-400">
              User preference settings used to evaluate job post qualification.
            </p>

            {filters && (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Target Roles:</span>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-200">
                    {filters.roles || 'All Software & Tech Roles'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block font-semibold mb-1">Target Locations:</span>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-200">
                    {filters.locations || 'Delhi NCR, Remote, India'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SYSTEM LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" /> Recent System Logs
            </h2>

            <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 max-h-96 overflow-y-auto space-y-1 border border-slate-800">
              {logs.length === 0 ? (
                <div className="text-slate-500">No system logs recorded yet.</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="leading-relaxed">
                    <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                    <span className={log.level === 'ERROR' ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* JOB DETAIL MODAL */}
      <JobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onStatusUpdate={handleUpdateJobStatus}
      />
    </div>
  );
}
