import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ResetStartTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => Promise<void>;
}

export const ResetStartTimeModal: React.FC<ResetStartTimeModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirmReset();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-amber-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-start justify-between">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">Reset Monitoring Start Time?</h3>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            This will establish a <strong className="text-amber-400">new monitoring start time timestamp</strong> set to the current moment. 
            Instagram posts published prior to this new timestamp will be strictly ignored.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition flex items-center gap-2 shadow-lg shadow-amber-600/30"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            Confirm Reset
          </button>
        </div>
      </div>
    </div>
  );
};
