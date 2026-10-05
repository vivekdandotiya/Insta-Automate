import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, RefreshCw, AlertTriangle, Instagram, 
  Send, Filter, Activity, Terminal, ShieldAlert, 
  ExternalLink, Calendar, Search, MapPin, Briefcase, 
  Building, CheckCircle2, ChevronLeft, ChevronRight, Zap, ArrowUpDown, Clock, Layers,
  CheckSquare, BookmarkCheck, Sparkles, CheckCircle, Info, X, SlidersHorizontal, Film, FileText, Check, List
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
  const [filterMediaType, setFilterMediaType] = useState('all');
  const [sortOption, setSortOption] = useState('newest_posted');

  // Mobile Filter Drawer Toggle
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
  
  // UI & Scan Controls
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
        mediaType: filterMediaType,
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
  }, [selectedDate, searchQuery, filterRole, filterLocation, filterExperience, filterWorkMode, filterEmploymentType, filterRelevance, filterSource, filterUserStatus, filterMediaType, sortOption, page]);

  // Trigger Manual Scan ("SCAN JOBS") with non-blocking status polling
  const handleManualScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanResult(null);
    setScanMessage('Waking scanner...');

    const messageTimer = setTimeout(() => {
      setScanMessage('Scanning 73 Instagram job sources...');
    }, 3000);

    let keepScanningState = false;

    try {
      const res = await api.post('/api/jobs/scan', {}, { timeout: 180000 });
      clearTimeout(messageTimer);
      if (res.data.success) {
        if (res.data.data?.isScanning) {
          keepScanningState = true;
          setScanMessage('Scanning Reels & Posts in background...');
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
    setFilterMediaType('all');
    setSortOption('newest_posted');
    setSelectedDate('active24h');
    setPage(1);
    setShowMobileFilters(false);
  };

  const getStatusBadge = () => {
    if (isScanning) return { label: 'SCANNING', color: 'bg-amber-500 animate-pulse text-amber-950 font-bold' };
    if (stats?.agentStatus === 'ERROR') return { label: 'ERROR', color: 'bg-rose-500 text-white font-bold' };
    if (scanResult) return { label: 'COMPLETED', color: 'bg-emerald-500 text-emerald-950 font-bold' };
    return { label: 'READY', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-20 md:pb-12">
      
      {/* MOBILE-FIRST COMPACT HEADER BAR */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shrink-0">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
              Instagram Job Finder
              <span className={`text-[9px] px-2 py-0.2 rounded-full uppercase tracking-wider ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">
              {stats?.monitoredAccounts || 73} Monitored Sources • Reels & Posts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Last Scan Time */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-blue-400" />
            <span>{stats?.lastSuccessfulCheckFormatted || 'Never'}</span>
          </div>

          {/* SCAN JOBS Primary Button */}
          <button
            onClick={handleManualScan}
            disabled={isScanning}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-md ${
              isScanning 
                ? 'bg-amber-600 cursor-not-allowed opacity-90' 
                : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-blue-600/30'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? (scanMessage || 'SCANNING...') : '🔍 SCAN JOBS'}</span>
          </button>
        </div>
      </header>

      {/* SCAN RESULTS BANNER */}
      {scanResult && (
        <div className="bg-blue-950/90 border-b border-blue-800 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-blue-200 truncate">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              <strong>SCAN COMPLETE:</strong> {scanResult.jobsFound ?? scanResult.processed} new jobs • {scanResult.duplicates} duplicates • {scanResult.ignoredOld} older than 24h
            </span>
          </div>
          <button onClick={() => setScanResult(null)} className="text-blue-400 hover:text-white font-bold text-xs p-1">✕</button>
        </div>
      )}

      {/* DESKTOP TABS BAR */}
      <div className="hidden md:flex px-6 pt-3 pb-2 border-b border-slate-800/50 bg-slate-900/40 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Job Alerts
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'sources' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Instagram className="w-3.5 h-3.5 text-pink-400" /> Monitored Sources ({stats?.monitoredAccounts || 73})
        </button>

        <button
          onClick={() => setActiveTab('filters')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'filters' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Filter className="w-3.5 h-3.5 text-amber-400" /> Preferences
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeTab === 'logs' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" /> System Logs
        </button>
      </div>

      <main className="px-3 sm:px-6 pt-4 max-w-7xl mx-auto space-y-4">
        
        {activeTab === 'dashboard' && (
          <>
            {/* MOBILE-FIRST COMPACT STATS GRID (Part 10) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Active (24h)</span>
                  <span className="text-xl sm:text-2xl font-black text-white">{stats?.newJobsCount ?? 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">High Match</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400">{stats?.highRelevanceCount ?? 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Sources</span>
                  <span className="text-xl sm:text-2xl font-black text-sky-400">{stats?.monitoredAccounts ?? 73}</span>
                </div>
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <Instagram className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Today</span>
                  <span className="text-xl sm:text-2xl font-black text-indigo-400">{stats?.todaysJobsCount ?? 0}</span>
                </div>
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* SEARCH AND CONTROLS BAR */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-2">
                {/* Search Input */}
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search roles, companies, Delhi/Noida..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Mobile Filter Button */}
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="md:hidden flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" /> Filters
                </button>
              </div>

              {/* DATE WINDOW & MEDIA TYPE TOGGLES */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Date Window */}
                <div className="flex items-center bg-slate-950 border border-slate-800 p-0.5 rounded-xl">
                  <button
                    onClick={() => { setSelectedDate('active24h'); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      selectedDate === 'active24h' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    24h Active
                  </button>
                  <button
                    onClick={() => { setSelectedDate('today'); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      selectedDate === 'today' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => { setSelectedDate('all'); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      selectedDate === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    All History
                  </button>
                </div>

                {/* Media Type Filter (Part 11) */}
                <div className="flex items-center bg-slate-950 border border-slate-800 p-0.5 rounded-xl">
                  <button
                    onClick={() => { setFilterMediaType('all'); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      filterMediaType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    All Types
                  </button>
                  <button
                    onClick={() => { setFilterMediaType('reels'); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      filterMediaType === 'reels' ? 'bg-pink-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    🎬 Reels
                  </button>
                  <button
                    onClick={() => { setFilterMediaType('posts'); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      filterMediaType === 'posts' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    📝 Posts
                  </button>
                </div>

                {/* Sort Option */}
                <select
                  value={sortOption}
                  onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
                  className="hidden sm:block px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300"
                >
                  <option value="newest_posted">Sort: Newest Posted</option>
                  <option value="highest_relevance">Sort: Highest Relevance</option>
                  <option value="newest_detected">Sort: Newest Detected</option>
                </select>
              </div>

              {/* DESKTOP DETAILED FILTERS */}
              <div className="hidden md:grid grid-cols-6 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                <input
                  type="text"
                  placeholder="Role (e.g. Full Stack)"
                  value={filterRole}
                  onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 placeholder-slate-500"
                />

                <input
                  type="text"
                  placeholder="Location (Noida, Remote)"
                  value={filterLocation}
                  onChange={(e) => { setFilterLocation(e.target.value); setPage(1); }}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 placeholder-slate-500"
                />

                <select
                  value={filterRelevance}
                  onChange={(e) => { setFilterRelevance(e.target.value); setPage(1); }}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-slate-300"
                >
                  <option value="">Relevance: All</option>
                  <option value="HIGH">HIGH Only</option>
                  <option value="MEDIUM">MEDIUM Only</option>
                  <option value="LOW">LOW Only</option>
                </select>

                <select
                  value={filterUserStatus}
                  onChange={(e) => { setFilterUserStatus(e.target.value); setPage(1); }}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-slate-300"
                >
                  <option value="">Status: All</option>
                  <option value="NEW">NEW</option>
                  <option value="APPLIED">APPLIED</option>
                  <option value="REGISTERED">REGISTERED</option>
                </select>

                <input
                  type="text"
                  placeholder="Source (@account)"
                  value={filterSource}
                  onChange={(e) => { setFilterSource(e.target.value); setPage(1); }}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 placeholder-slate-500"
                />

                <button
                  onClick={resetAllFilters}
                  className="px-2.5 py-1 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Reset All
                </button>
              </div>
            </div>

            {/* JOB LIST / SINGLE-COLUMN CARDS FOR PHONE (Part 9 & Part 10) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-semibold text-slate-200">
                  Showing {jobs.length} jobs ({dateLabel})
                </span>
                <span>Page {pagination.page} of {pagination.totalPages}</span>
              </div>

              {loading ? (
                <div className="text-center py-12 text-slate-400 text-xs">Loading jobs...</div>
              ) : jobs.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                  <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-semibold text-white">No job alerts match your filters</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click <strong>🔍 SCAN JOBS</strong> to execute a manual Reels & Posts check cycle across all 73 monitored accounts.
                  </p>
                  <button
                    onClick={handleManualScan}
                    disabled={isScanning}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Run Scan Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {jobs.map((job) => {
                    const isReel = job.mediaType === 'REEL';
                    const hasAppUrl = job.applicationUrl || (job.applyUrl && job.applyUrl !== 'Not specified' && job.applyUrl.startsWith('http'));
                    const hasTestUrl = job.testUrl || job.interviewUrl;
                    
                    return (
                      <div
                        key={job.id}
                        className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 hover:border-slate-700 transition flex flex-col justify-between gap-3 shadow-sm"
                      >
                        <div className="space-y-2.5">
                          {/* Top Badges & Source */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                job.relevance === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                job.relevance === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {job.relevance}
                              </span>

                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isReel ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              }`}>
                                {isReel ? '🎬 REEL' : '📝 POST'}
                              </span>

                              {job.userStatus && job.userStatus !== 'NEW' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                  {job.userStatus}
                                </span>
                              )}
                            </div>

                            <span className="text-xs text-sky-400 font-medium flex items-center gap-1 truncate">
                              <Instagram className="w-3 h-3 text-pink-400 shrink-0" />
                              <span className="truncate">{job.sourceAccount}</span>
                            </span>
                          </div>

                          {/* Role & Company */}
                          <div>
                            <h3 
                              onClick={() => setSelectedJob(job)}
                              className="text-sm sm:text-base font-bold text-white hover:text-blue-400 cursor-pointer transition line-clamp-1"
                            >
                              {job.role}
                            </h3>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Building className="w-3 h-3 text-sky-400 shrink-0" />
                              <span className="truncate">{job.company}</span>
                            </p>
                          </div>

                          {/* Attribute Grid */}
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-0.5">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate">{job.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{job.experience}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Building className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span className="truncate">{job.workMode}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{job.postedAtFormatted}</span>
                            </div>
                          </div>

                          {/* Relevance Explanation */}
                          {job.relevanceReason && (
                            <div className="text-[10px] text-emerald-400/90 font-medium bg-emerald-950/30 px-2 py-1 rounded-lg border border-emerald-900/50 truncate">
                              ✓ {job.relevanceReason}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons (Part 7 & Part 9: Display only when URL actually exists) */}
                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {hasAppUrl && (
                              <a
                                href={job.applicationUrl || job.applyUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition shadow-md shadow-blue-600/20"
                              >
                                <ExternalLink className="w-3 h-3" /> APPLY NOW
                              </a>
                            )}

                            {hasTestUrl && (
                              <a
                                href={job.testUrl || job.interviewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition shadow-md shadow-indigo-600/20"
                              >
                                <FileText className="w-3 h-3" /> TEST / INTERVIEW
                              </a>
                            )}

                            <a
                              href={job.instagramUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-[11px] transition border border-slate-700"
                            >
                              <Instagram className="w-3 h-3 text-pink-400" /> {isReel ? 'VIEW REEL' : 'VIEW POST'}
                            </a>
                          </div>

                          {/* Quick Status Toggles */}
                          <div className="flex items-center justify-between text-[10px] pt-1">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateJobStatus(job.id, 'APPLIED')}
                                className={`px-2 py-0.5 rounded-md font-semibold transition ${
                                  job.userStatus === 'APPLIED' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {job.userStatus === 'APPLIED' ? 'Applied ✓' : 'Mark Applied'}
                              </button>
                              <button
                                onClick={() => handleUpdateJobStatus(job.id, 'REGISTERED')}
                                className={`px-2 py-0.5 rounded-md font-semibold transition ${
                                  job.userStatus === 'REGISTERED' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {job.userStatus === 'REGISTERED' ? 'Registered ✓' : 'Registered'}
                              </button>
                            </div>

                            <button
                              onClick={() => setSelectedJob(job)}
                              className="text-slate-400 hover:text-white font-medium"
                            >
                              Details →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PAGINATION */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 text-xs text-slate-400">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 disabled:opacity-50 hover:text-white"
                  >
                    Previous
                  </button>
                  <span>Page {page} of {pagination.totalPages}</span>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 disabled:opacity-50 hover:text-white"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* SOURCES TAB (Part 12) */}
        {activeTab === 'sources' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" /> Monitored Sources ({sources.length})
              </h2>
              <span className="text-xs text-emerald-400 font-semibold">Active Reels & Posts Scraper</span>
            </div>
            <p className="text-xs text-slate-400">
              Accounts checked during manual <code>POST /api/jobs/scan</code> search cycles. Includes Posts & Reels verification.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
              {sources.map((s) => (
                <div key={s.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400 truncate">{s.username}</span>
                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                      s.last_status === 'RATE_LIMITED' ? 'bg-amber-500/20 text-amber-400' :
                      s.last_status === 'ERROR' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {s.last_status || 'ACTIVE'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                    <div>Posts: <strong className="text-slate-200">{s.last_posts_count || 0}</strong></div>
                    <div>Reels: <strong className="text-slate-200">{s.last_reels_count || 0}</strong></div>
                    <div>Jobs: <strong className="text-emerald-400">{s.last_jobs_found || 0}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FILTERS PREFERENCES TAB */}
        {activeTab === 'filters' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" /> Preference Configuration
            </h2>
            <p className="text-xs text-slate-400">
              Normalized target roles, Delhi NCR/Remote location rules, and job classification parameters.
            </p>

            <div className="space-y-3">
              <div>
                <span className="text-slate-400 block font-semibold mb-1">Target Roles & Tech Stack:</span>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 text-xs leading-relaxed">
                  Software Developer, SDE, Full Stack (MERN/MEAN), Frontend (React/Next), Backend (Node/Java/Python), QA & Automation Tester, DevOps/Cloud, IT Support, Business Development (BDE/BDA), Government Recruitment (DSSSB, SSC, Railway, Banking, Court).
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-1">Target Locations & Priority:</span>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-200 text-xs leading-relaxed">
                  Delhi NCR (Delhi, New Delhi, Noida, Greater Noida, Gurgaon, Gurugram, Ghaziabad, Faridabad), Remote / WFH, India.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" /> Recent System Logs
            </h2>

            <div className="bg-slate-950 p-3 sm:p-4 rounded-xl font-mono text-[11px] text-slate-300 max-h-96 overflow-y-auto space-y-1 border border-slate-800">
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

      {/* MOBILE BOTTOM NAVIGATION BAR (Part 10) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md flex justify-around p-2 text-[10px]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${
            activeTab === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Jobs</span>
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${
            activeTab === 'sources' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Instagram className="w-4 h-4" />
          <span>Sources</span>
        </button>

        <button
          onClick={() => setShowMobileFilters(true)}
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-slate-400"
        >
          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          <span>Filters</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${
            activeTab === 'logs' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Logs</span>
        </button>
      </div>

      {/* MOBILE FILTERS DRAWER / MODAL */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm p-0 md:hidden animate-in slide-in-from-bottom">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-2xl p-4 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" /> Filter Jobs
              </h3>
              <button onClick={() => setShowMobileFilters(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Target Role</label>
                <input
                  type="text"
                  placeholder="e.g. Full Stack, SDE, QA"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Noida, Delhi NCR, Remote"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Media Type</label>
                <select
                  value={filterMediaType}
                  onChange={(e) => setFilterMediaType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                >
                  <option value="all">All Media Types</option>
                  <option value="reels">🎬 Reels Only</option>
                  <option value="posts">📝 Posts Only</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Relevance Level</label>
                <select
                  value={filterRelevance}
                  onChange={(e) => setFilterRelevance(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                >
                  <option value="">All Relevance</option>
                  <option value="HIGH">HIGH Only</option>
                  <option value="MEDIUM">MEDIUM Only</option>
                  <option value="LOW">LOW Only</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Application Status</label>
                <select
                  value={filterUserStatus}
                  onChange={(e) => setFilterUserStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                >
                  <option value="">All Statuses</option>
                  <option value="NEW">NEW</option>
                  <option value="APPLIED">APPLIED</option>
                  <option value="REGISTERED">REGISTERED</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => { setPage(1); setShowMobileFilters(false); }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
              >
                APPLY FILTERS
              </button>
              <button
                onClick={resetAllFilters}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOB DETAIL MODAL */}
      <JobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onStatusUpdate={handleUpdateJobStatus}
      />
    </div>
  );
}
