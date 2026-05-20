import { ActivityLog } from '../types';
import { ScrollText, Clock } from 'lucide-react';

interface TimelineLogsProps {
  logs: ActivityLog[];
}

export default function TimelineLogs({ logs }: TimelineLogsProps) {
  return (
    <div id="timeline-logs-container" className="flex flex-col gap-3 bg-white border-2 border-gray-900 p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
        <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-slate-705 border-2 border-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <ScrollText className="w-4 h-4 text-gray-900" />
        </div>
        <div>
          <h3 className="font-sans font-black text-xs uppercase tracking-widest text-gray-900">Activity Journal</h3>
          <p className="font-mono text-[9px] font-bold text-indigo-600 uppercase tracking-tight">Collaborative logs</p>
        </div>
      </div>

      <div id="logs-timeline-list" className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500 font-bold uppercase tracking-wide">
            No activities performed yet.
          </div>
        ) : (
          logs.map((log) => {
            const timeStr = formatCompactTime(log.timestamp);
            const userInitial = log.userName ? log.userName.charAt(0).toUpperCase() : '?';

            return (
              <div key={log.id} id={`log-item-${log.id}`} className="flex gap-2 text-xs border-l-2 border-gray-900 pl-2.5 py-1 relative">
                {/* Visual marker dot */}
                <span className="absolute -left-[6px] top-2 w-2.5 h-2.5 rounded-full border border-gray-900 bg-amber-400 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" />
                
                <div className="flex flex-col leading-relaxed pr-1">
                  <span className="text-gray-900 font-sans">
                    <span className="font-black text-gray-950">{log.userName}</span>{' '}
                    <span className="text-gray-600 font-serif italic text-[11px]">{log.action}</span>
                  </span>
                  
                  <span className="text-[9px] font-mono font-bold text-gray-500 flex items-center gap-1 mt-0.5 uppercase">
                    <Clock className="w-2.5 h-2.5 text-gray-900" />
                    {timeStr}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatCompactTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}
