import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, RefreshCw, AlertTriangle, Instagram, 
  Send, Filter, Activity, Terminal, ShieldAlert, 
  ExternalLink, Calendar, Search, MapPin, Briefcase, 
  Building, CheckCircle2, ChevronLeft, ChevronRight, Zap, ArrowUpDown, Clock, Layers
} from 'lucide-react';
import { api } from './api';
import { JobDetailModal } from './components/JobDetailModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sources' | 'filters' | 'logs'>('dashboard');
  
  // Dashboard & Jobs State
  const [selectedDate, setSelectedDate] = useState<string>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterExperience, setFilterExperience] = useState('');
  const [filterWorkMode, setFilterWorkMode] = useState('');
  const [filterEmploymentType, setFilterEmploymentType] = useState('');
  const [filterRelevance, setFilterRelevance] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [sortOption, setSortOption] = useState('newest_posted');

  // Pagination State
  const [page, setPage] = useState(1);

  // Data State
  const [jobs, setJobs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [daySummary, setDaySummary] = useState<any>({ total: 0, highRelevance: 0, mediumRelevance: 0, lowRelevance: 0 });
  const [dateLabel, setDateLabel] = useState<string>('');
  
  // Stats & Health
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  
  // UI Controls
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
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
  }, [selectedDate, searchQuery, filterRole, filterLocation, filterExperience, filterWorkMode, filterEmploymentType, filterRelevance, filterSource, sortOption, page]);

  // Auto-polling every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJobsData();
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedDate, searchQuery, filterRole, filterLocation, filterExperience, filterWorkMode, filterEmploymentType, filterRelevance, filterSource, sortOption, page]);

  // Trigger Manual Scan ("SCAN NOW")
  const handleManualScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      await api.post('/api/jobs/scan');
      await fetchJobsData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to trigger scan cycle');
    } finally {
      setIsScanning(false);
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
    setSortOption('newest_posted');
    setSelectedDate('today');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-12">
      
      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Insta-Automate
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                Job Alert Dashboard
              </span>
            </h1>
            <p className="text-xs text-slate-400">Automated Public Instagram Monitoring Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Agent Health Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium">
            <span className={`w-2.5 h-2.5 rounded-full ${
              stats?.agentStatus === 'RUNNING' ? 'bg-emerald-500 animate-pulse' :
              stats?.agentStatus === 'PAUSED' ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            <span className="text-slate-300">
              Agent {stats?.agentStatus === 'RUNNING' ? 'Healthy' : stats?.agentStatus || 'Ready'}
            </span>
          </div>

          {/* Last Successful Check */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Last Check:</span>
            <span className="text-slate-200 font-semibold">
              {stats?.lastSuccessfulCheckFormatted || 'Loading...'}
            </span>
          </div>

          {/* SCAN NOW Button */}
          <button
            onClick={handleManualScan}
            disabled={isScanning}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-lg ${
              isScanning 
                ? 'bg-slate-700 cursor-not-allowed opacity-75' 
                : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-blue-600/30'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'SCANNING INSTAGRAM...' : '🚀 SCAN NOW'}
          </button>
        </div>
      </header>

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
          <Layers className="w-4 h-4" /> Job Dashboard
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'sources'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Instagram className="w-4 h-4 text-pink-400" /> Monitored Sources ({stats?.monitoredAccounts || 69})
        </button>

        <button
          onClick={() => setActiveTab('filters')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'filters'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Filter className="w-4 h-4 text-amber-400" /> Preferences
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
            {/* STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Today's Jobs</span>
                <span className="text-2xl font-black text-white">{stats?.todaysJobsCount ?? 0}</span>
                <span className="text-[10px] text-emerald-400 mt-1 font-medium">Calendar IST</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">New Jobs (24h)</span>
                <span className="text-2xl font-black text-blue-400">{stats?.newJobsCount ?? 0}</span>
                <span className="text-[10px] text-blue-400 mt-1 font-medium">Recently Detected</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">High Relevance</span>
                <span className="text-2xl font-black text-emerald-400">{stats?.highRelevanceCount ?? 0}</span>
                <span className="text-[10px] text-emerald-400 mt-1 font-medium">Top Priority Matches</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Monitored Accounts</span>
                <span className="text-2xl font-black text-pink-400">{stats?.monitoredAccounts ?? 69}</span>
                <span className="text-[10px] text-pink-400 mt-1 font-medium">Active Instagram Feeds</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Total Scanned</span>
                <span className="text-2xl font-black text-slate-200">{stats?.totalPostsScanned ?? 0}</span>
                <span className="text-[10px] text-slate-400 mt-1 font-medium">Processed Posts</span>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Timezone</span>
                <span className="text-sm font-bold text-indigo-400">Asia/Kolkata</span>
                <span className="text-[10px] text-indigo-400 mt-1 font-medium">IST Day Grouping</span>
              </div>
            </div>

            {/* DATE SELECTION & DAY SUMMARY */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 lg:p-6 shadow-md space-y-4">
              
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      📅 {selectedDate === 'today' ? 'TODAY' : dateLabel}
                      <span className="text-xs font-normal text-slate-400">({dateLabel})</span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Showing {daySummary.total} job post{daySummary.total === 1 ? '' : 's'} recorded on this date
                    </p>
                  </div>
                </div>

                {/* DATE NAVIGATION & PICKER */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => { setSelectedDate('today'); setPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      selectedDate === 'today' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Today
                  </button>

                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <input
                      type="date"
                      value={selectedDate === 'today' ? '' : selectedDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDate(e.target.value);
                          setPage(1);
                        }
                      }}
                      className="bg-transparent text-xs text-slate-200 px-2 py-1 outline-none font-medium"
                    />
                  </div>

                  {history.length > 0 && (
                    <select
                      value={selectedDate}
                      onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
                      className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded-xl outline-none font-medium"
                    >
                      <option value="today">Select Date from History...</option>
                      {history.map((h) => (
                        <option key={h.date} value={h.date}>
                          {h.label} ({h.count} jobs)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* DAY SUMMARY BADGES */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
                <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                  Total Jobs: <strong className="text-white ml-1">{daySummary.total}</strong>
                </span>
                <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  High Relevance: <strong className="ml-1">{daySummary.highRelevance}</strong>
                </span>
                <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  Medium Relevance: <strong className="ml-1">{daySummary.mediumRelevance}</strong>
                </span>
                <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-400">
                  Low Relevance: <strong className="ml-1">{daySummary.lowRelevance}</strong>
                </span>
              </div>
            </div>

            {/* SEARCH & FILTERS BAR */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search jobs by role, company, location, caption, or username..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Sort Option */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-slate-400 hidden md:block" />
                  <select
                    value={sortOption}
                    onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
                    className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none font-medium cursor-pointer"
                  >
                    <option value="newest_posted">Sort: Newest Posted</option>
                    <option value="oldest_posted">Sort: Oldest Posted</option>
                    <option value="newest_detected">Sort: Newest Detected</option>
                    <option value="highest_relevance">Sort: Highest Relevance</option>
                  </select>
                </div>
              </div>

              {/* Filter Selectors Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-800/60">
                {/* Location */}
                <select
                  value={filterLocation}
                  onChange={(e) => { setFilterLocation(e.target.value); setPage(1); }}
                  className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none"
                >
                  <option value="">All Locations</option>
                  <option value="Delhi">Delhi / New Delhi</option>
                  <option value="Noida">Noida / Greater Noida</option>
                  <option value="Gurgaon">Gurgaon / Gurugram</option>
                  <option value="Ghaziabad">Ghaziabad</option>
                  <option value="Faridabad">Faridabad</option>
                  <option value="Remote">Remote / WFH</option>
                  <option value="India">Pan India</option>
                </select>

                {/* Role */}
                <select
                  value={filterRole}
                  onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
                  className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="Software Engineer">Software Engineer</option>
                  <option value="Full Stack">Full Stack Developer</option>
                  <option value="Frontend">Frontend Developer</option>
                  <option value="Backend">Backend Developer</option>
                  <option value="QA">QA / Tester</option>
                  <option value="BDE">BDE / Business Dev</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="UI/UX">UI/UX Designer</option>
                  <option value="Internship">Internships</option>
                </select>

                {/* Relevance */}
                <select
                  value={filterRelevance}
                  onChange={(e) => { setFilterRelevance(e.target.value); setPage(1); }}
                  className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none"
                >
                  <option value="">All Relevance</option>
                  <option value="HIGH">High Relevance</option>
                  <option value="MEDIUM">Medium Relevance</option>
                  <option value="LOW">Low Relevance</option>
                </select>

                {/* Work Mode */}
                <select
                  value={filterWorkMode}
                  onChange={(e) => { setFilterWorkMode(e.target.value); setPage(1); }}
                  className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none"
                >
                  <option value="">All Work Modes</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>

                {/* Employment Type */}
                <select
                  value={filterEmploymentType}
                  onChange={(e) => { setFilterEmploymentType(e.target.value); setPage(1); }}
                  className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 outline-none"
                >
                  <option value="">All Types</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Internship">Internship</option>
                </select>

                {/* Reset Button */}
                <button
                  onClick={resetAllFilters}
                  className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* JOBS GRID FEED */}
            {loading ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                <p className="text-xs">Loading job alerts...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-16 text-center bg-slate-900/60 border border-slate-800/80 rounded-2xl space-y-3">
                <span className="text-4xl block">📭</span>
                <h3 className="text-base font-bold text-white">No Job Alerts Found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No job posts matched your search filters on {selectedDate === 'today' ? 'today' : selectedDate}. The agent will automatically scan again on schedule.
                </p>
                <button
                  onClick={resetAllFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-500 transition"
                >
                  Reset Search & Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="bg-slate-900 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition shadow-md flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Badges & Account */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          job.relevance === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          job.relevance === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {job.relevance} Relevance
                        </span>

                        <span className="text-xs text-sky-400 font-medium flex items-center gap-1">
                          <Instagram className="w-3.5 h-3.5 text-pink-400" />
                          @{job.sourceUsername}
                        </span>
                      </div>

                      {/* Job Title & Company */}
                      <div>
                        <h3 className="text-base font-bold text-white leading-snug line-clamp-2">{job.role}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-medium">
                          <Building className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          {job.company}
                        </p>
                      </div>

                      {/* Attributes */}
                      <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-slate-800/60">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">{job.experience}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="text-emerald-400 font-bold shrink-0">💰</span>
                          <span className="truncate">{job.salary}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate">{job.workMode}</span>
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div className="pt-2 text-[11px] text-slate-400 space-y-0.5 border-t border-slate-800/40">
                        <div className="flex justify-between">
                          <span>Posted:</span>
                          <span className="text-slate-300 font-medium">{job.postedAtFormatted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Detected:</span>
                          <span className="text-slate-300 font-medium">{job.detectedAtFormatted}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium transition text-center"
                      >
                        View Details
                      </button>

                      <a
                        href={job.instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-pink-400 transition"
                        title="View on Instagram"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>

                      {job.applyUrl && job.applyUrl !== 'Not specified' && job.applyUrl.startsWith('http') && (
                        <a
                          href={job.applyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                          title="Apply Directly"
                        >
                          Apply
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION FOOTER */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <span className="text-xs text-slate-400">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total jobs)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-xl bg-slate-800 text-white disabled:opacity-50 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                    className="p-2 rounded-xl bg-slate-800 text-white disabled:opacity-50 text-xs"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* SOURCES TAB (69 Monitored Accounts) */}
        {activeTab === 'sources' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-pink-400" /> Monitored Instagram Sources ({sources.length})
                </h2>
                <p className="text-xs text-slate-400">Centralized list of public accounts monitored every 2 hours</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sources.map((s) => (
                <div key={s.id || s.username} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <a 
                      href={s.profile_url || `https://www.instagram.com/${s.username.replace('@', '')}/`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-sm font-bold text-white hover:text-sky-400 transition flex items-center gap-1.5"
                    >
                      <Instagram className="w-3.5 h-3.5 text-pink-400" />
                      {s.username}
                    </a>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Priority: {s.priority || 'NORMAL'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PREFERENCES TAB */}
        {activeTab === 'filters' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-amber-400" /> Job Matching Preferences
            </h2>
            <p className="text-xs text-slate-400">Active roles and location preferences configured for automatic relevance classification</p>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div>
                <strong className="text-slate-300 block mb-1">Target Roles:</strong>
                <p className="text-slate-400">{filters?.roles ? JSON.parse(filters.roles).join(', ') : 'Software Developer, Full Stack, Frontend, Backend, QA, BDE, Customer Support, UI/UX, Internships'}</p>
              </div>
              <div>
                <strong className="text-slate-300 block mb-1">Target Locations:</strong>
                <p className="text-slate-400">{filters?.locations ? JSON.parse(filters.locations).join(', ') : 'Delhi, New Delhi, Delhi NCR, Gurugram, Gurgaon, Noida, Greater Noida, Ghaziabad, Faridabad, Remote, India'}</p>
              </div>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" /> Worker Logs
            </h2>
            <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-1 max-h-96 overflow-y-auto border border-slate-800">
              {logs.length === 0 ? (
                <p className="text-slate-500">No logs captured yet.</p>
              ) : (
                logs.map((log: any, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-slate-500">[{log.timestamp}]</span>
                    <span className={log.level === 'ERROR' ? 'text-rose-400' : 'text-slate-300'}>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* JOB DETAIL MODAL */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}
