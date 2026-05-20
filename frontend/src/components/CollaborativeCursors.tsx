import { useState, useEffect } from 'react';
import { MousePointer2 } from 'lucide-react';

interface CursorProps {
  cursors: {
    [userId: string]: {
      userName: string;
      avatarColor: string;
      x: number;
      y: number;
    };
  };
  currentUserId: string;
}

export default function CollaborativeCursors({ cursors, currentUserId }: CursorProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {Object.entries(cursors).map(([userId, data]) => {
        if (userId === currentUserId) return null;
        
        // Ensure coordinates stay within responsive boundaries
        const x = Math.max(2, Math.min(data.x, 98));
        const y = Math.max(2, Math.min(data.y, 98));

        return (
          <div
            key={userId}
            id={`cursor-${userId}`}
            className="absolute transition-all duration-100 ease-out"
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
          >
            {/* Elegant collaborative arrow pointer */}
            <div className="relative">
              <MousePointer2 
                className={`w-5 h-5 filter drop-shadow-sm rotate-[-90deg]`}
                style={{
                  fill: getTailwindBgColor(data.avatarColor),
                  color: '#ffffff'
                }}
              />
              <div 
                id={`cursor-label-${userId}`}
                className={`absolute left-3 top-3 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-white shadow-sm whitespace-nowrap flex items-center gap-1 ${data.avatarColor}`}
              >
                <span>{data.userName}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Map standard Tailwind colors to actual CSS color codes for svg fill
function getTailwindBgColor(colorClass: string): string {
  if (colorClass.includes('bg-red-')) return '#ef4444';
  if (colorClass.includes('bg-orange-')) return '#f97316';
  if (colorClass.includes('bg-yellow-')) return '#eab308';
  if (colorClass.includes('bg-green-')) return '#22c55e';
  if (colorClass.includes('bg-teal-')) return '#14b8a6';
  if (colorClass.includes('bg-blue-')) return '#3b82f6';
  if (colorClass.includes('bg-indigo-')) return '#6366f1';
  if (colorClass.includes('bg-purple-')) return '#a855f7';
  if (colorClass.includes('bg-pink-')) return '#ec4899';
  if (colorClass.includes('bg-sky-')) return '#0ea5e9';
  if (colorClass.includes('bg-violet-')) return '#8b5cf6';
  if (colorClass.includes('bg-emerald-')) return '#10b981';
  return '#6b7280'; // gray-500
}
