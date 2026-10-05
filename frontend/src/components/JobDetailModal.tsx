import React, { useState } from 'react';
import { X, ExternalLink, Calendar, MapPin, Briefcase, DollarSign, Building, CheckCircle2, Instagram, CheckSquare, BookmarkCheck, FileText, Award } from 'lucide-react';
import { api } from '../api';

interface JobDetailModalProps {
  job: any | null;
  onClose: () => void;
  onStatusUpdate?: (jobId: string, newStatus: string) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose, onStatusUpdate }) => {
  if (!job) return null;

  const [currentStatus, setCurrentStatus] = useState<string>(job.userStatus || job.user_status || 'NEW');
  const [updating, setUpdating] = useState<boolean>(false);

  const role = job.role || job.job_alert?.role || 'Job Opportunity';
  const company = job.company || job.job_alert?.company || 'Not specified';
  const location = job.location || job.job_alert?.location || 'Not specified';
  const experience = job.experience || job.job_alert?.experience || 'Not specified';
  const salary = job.salary || job.job_alert?.salary || 'Not specified';
  const workMode = job.workMode || job.work_mode || job.job_alert?.work_mode || 'Not specified';
  const employmentType = job.employmentType || job.employment_type || job.job_alert?.employment_type || 'Not specified';
  const relevance = job.relevanceScore || job.relevance || job.relevance_score || 'MEDIUM';
  const relevanceReason = job.relevanceReason || job.job_alert?.relevance_reason;
  const instagramUrl = job.instagramUrl || job.post_url || '#';
  const isReel = job.mediaType === 'REEL';

  const appUrl = job.applicationUrl || job.applyUrl !== 'Not specified' ? job.applyUrl : undefined;
  const testOrInterviewUrl = job.testUrl || job.interviewUrl;

  const sourceAccount = job.sourceAccount || job.source_account || '@instagram';
  const postedAtFormatted = job.postedAtFormatted || job.publishedAtFormatted || 'Not specified';
  const detectedAtFormatted = job.detectedAtFormatted || 'Not specified';
  const reason = job.caption || job.job_alert?.reason || '';

  const handleUpdateStatus = async (newStatus: string) => {
    if (updating) return;
    setUpdating(true);
    try {
      await api.patch(`/api/jobs/${job.id}/status`, { status: newStatus });
      setCurrentStatus(newStatus);
      if (onStatusUpdate) {
        onStatusUpdate(job.id, newStatus);
      }
    } catch (err) {
      console.error('Failed to update job status:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                relevance === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                relevance === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {relevance} Relevance
              </span>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                isReel ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {isReel ? '🎬 REEL' : '📝 POST'}
              </span>

              {currentStatus && currentStatus !== 'NEW' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  {currentStatus}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">{role}</h2>
            <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Building className="w-3.5 h-3.5 text-sky-400" />
              {company} • <span className="text-sky-400">{sourceAccount}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
          
          {relevanceReason && (
            <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
              <Award className="w-4 h-4 text-emerald-400 shrink-0" />
              <span><strong>Relevance Score Explanation:</strong> {relevanceReason}</span>
            </div>
          )}

          {/* Key Attribute Grid */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">Location</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">Experience</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium truncate">
                <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{experience}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">Salary / Stipend</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium truncate">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{salary}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">Work Mode</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium truncate">
                <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{workMode}</span>
              </div>
            </div>
          </div>

          {/* Timestamps Section */}
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Posted Time:
              </span>
              <span className="font-semibold text-white">{postedAtFormatted}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" /> Detected Time:
              </span>
              <span className="font-semibold text-white">{detectedAtFormatted}</span>
            </div>
          </div>

          {/* Action Status Toggles */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Application Status:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleUpdateStatus('APPLIED')}
                disabled={updating}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  currentStatus === 'APPLIED' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" /> Mark Applied
              </button>

              <button
                onClick={() => handleUpdateStatus('REGISTERED')}
                disabled={updating}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  currentStatus === 'REGISTERED' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" /> Registered
              </button>
            </div>
          </div>

          {/* External Action Links (Part 7: Only display when URL actually exists) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {appUrl && appUrl !== 'Not specified' && appUrl.startsWith('http') && (
              <a
                href={appUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md shadow-blue-600/30"
              >
                <ExternalLink className="w-4 h-4" /> APPLY NOW DIRECTLY
              </a>
            )}

            {testOrInterviewUrl && (
              <a
                href={testOrInterviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md shadow-indigo-600/30"
              >
                <FileText className="w-4 h-4" /> TEST / INTERVIEW LINK
              </a>
            )}

            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition border border-slate-700"
            >
              <Instagram className="w-4 h-4 text-pink-400" /> {isReel ? 'VIEW INSTAGRAM REEL' : 'VIEW INSTAGRAM POST'}
            </a>
          </div>

          {/* Caption / Context */}
          {reason && (
            <div className="p-3 bg-slate-950/80 rounded-xl text-xs text-slate-400 border border-slate-800 space-y-1">
              <span className="text-slate-300 font-semibold block">Post Caption & Extracted Details:</span>
              <p className="whitespace-pre-wrap leading-relaxed">{reason}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
