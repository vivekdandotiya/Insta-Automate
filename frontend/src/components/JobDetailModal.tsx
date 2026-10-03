import React from 'react';
import { X, ExternalLink, Calendar, MapPin, Briefcase, DollarSign, Building, CheckCircle2, ShieldCheck } from 'lucide-react';

interface JobDetailModalProps {
  job: any | null;
  onClose: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose }) => {
  if (!job) return null;

  const alert = job.job_alert || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-700 flex items-center justify-between bg-slate-850">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                job.relevance_score === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                job.relevance_score === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-slate-700 text-slate-300'
              }`}>
                {job.relevance_score} Relevance
              </span>
              <span className="text-xs text-slate-400">{job.post_type}</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">{alert.role || 'Job Opportunity'}</h2>
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Building className="w-4 h-4 text-sky-400" />
              {alert.company || 'Not specified'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Key Attribute Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Location</span>
              <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                <MapPin className="w-4 h-4 text-emerald-400" />
                {alert.location || 'Not specified'}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Experience</span>
              <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                <Briefcase className="w-4 h-4 text-amber-400" />
                {alert.experience || 'Not specified'}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Salary</span>
              <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                {alert.salary || 'Not specified'}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Work Mode</span>
              <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
                <Building className="w-4 h-4 text-indigo-400" />
                {alert.work_mode || 'Not specified'}
              </div>
            </div>
          </div>

          {/* Timestamps Section */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/50 space-y-2 text-sm">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" /> Instagram Posted:
              </span>
              <span className="font-semibold text-white">{job.publishedAtFormatted}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400" /> Agent Detected:
              </span>
              <span className="font-semibold text-white">{job.detectedAtFormatted}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> AI Confidence:
              </span>
              <span className="font-semibold text-white">{(job.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Application & Source Links */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={job.post_url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-sm transition border border-slate-600"
            >
              <ExternalLink className="w-4 h-4" /> Open Instagram Post
            </a>
            
            {alert.application_link && alert.application_link.startsWith('http') && (
              <a
                href={alert.application_link}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition shadow-lg shadow-sky-600/30"
              >
                <ExternalLink className="w-4 h-4" /> Apply Directly
              </a>
            )}
          </div>

          {/* Reason & Classification details */}
          {alert.reason && (
            <div className="p-3 bg-slate-900/80 rounded-xl text-xs text-slate-400 border border-slate-700/50">
              <span className="text-slate-300 font-semibold block mb-0.5">Classification Reason:</span>
              {alert.reason}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-850 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
