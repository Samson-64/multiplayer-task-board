import React from 'react';
import { Task, User } from '../types';
import { MessageSquare, CheckSquare, Edit3, Trash2, Eye } from 'lucide-react';

interface TaskCardProps {
  key?: string | number;
  task: Task;
  activeUsers: { [id: string]: User };
  currentUserId: string;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string, title: string) => void;
}

export default function TaskCard({
  task,
  activeUsers,
  currentUserId,
  onEditTask,
  onDeleteTask
}: TaskCardProps) {
  // Find other users who are currently viewing/editing this specific task
  const editorsViewing = Object.values(activeUsers).filter(
    (u) => u.id !== currentUserId && u.activeTaskId === task.id
  );

  const completedChecklist = task.checklist.filter((item) => item.completed).length;
  const totalChecklist = task.checklist.length;
  const checklistPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  // Handle HTML5 drag start
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    // Add opacity look to source item during drag
    const el = document.getElementById(`task-card-${task.id}`);
    if (el) {
      setTimeout(() => {
        el.style.opacity = '0.3';
      }, 0);
    }
  };

  const handleDragEnd = () => {
    const el = document.getElementById(`task-card-${task.id}`);
    if (el) {
      el.style.opacity = '1';
    }
  };

  const priorityColors = {
    high: 'text-red-900 bg-red-100 border border-gray-900',
    medium: 'text-amber-900 bg-amber-100 border border-gray-900',
    low: 'text-emerald-900 bg-emerald-100 border border-gray-900'
  };

  const priorityLeftBorders = {
    high: 'border-l-8 border-l-red-500',
    medium: 'border-l-8 border-l-amber-500',
    low: 'border-l-8 border-l-emerald-500'
  };

  const initial = task.assignee ? task.assignee.charAt(0).toUpperCase() : '';

  return (
    <div
      id={`task-card-${task.id}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group bg-white p-4 rounded-xl border-2 border-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 cursor-grab active:cursor-grabbing relative flex flex-col gap-3 select-none ${priorityLeftBorders[task.priority]}`}
    >
      {/* Real-time Viewing alert */}
      {editorsViewing.length > 0 && (
        <div 
          id={`viewers-banner-${task.id}`}
          className="absolute -top-3 right-4 px-2 py-0.5 rounded border border-gray-900 text-[9px] font-black text-white bg-indigo-600 shadow-md animate-pulse z-10"
        >
          <Eye className="w-2.5 h-2.5 inline mr-1" />
          <span>{editorsViewing.map(u => u.name).join(', ')} viewing</span>
        </div>
      )}

      {/* Card Header (Priority & Actions) */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase rounded ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        
        <div className="flex items-center gap-1 opacity-100">
          <button
            id={`edit-task-btn-${task.id}`}
            onClick={() => onEditTask(task)}
            className="p-1 border border-transparent hover:border-gray-900 hover:bg-slate-100 text-slate-700 rounded transition-colors cursor-pointer"
            title="Edit task details"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            id={`delete-task-btn-${task.id}`}
            onClick={() => onDeleteTask(task.id, task.title)}
            className="p-1 border border-transparent hover:border-red-950 hover:bg-red-50 text-slate-500 hover:text-red-700 rounded transition-colors cursor-pointer"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task Title & Details */}
      <div className="flex flex-col gap-1.5">
        <h4 className="font-sans font-bold text-sm text-gray-900 tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">
          {task.title}
        </h4>
        <p className="font-serif italic text-xs text-gray-700 line-clamp-2 leading-relaxed">
          {task.description || "No description provided."}
        </p>
      </div>

      {/* Tags Pilling */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[9px] font-bold text-gray-900 bg-emerald-100 border border-gray-900 px-1.5 py-0.5 rounded-sm uppercase tracking-wide"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Checklist Progress Bar (if exists) */}
      {totalChecklist > 0 && (
        <div className="flex flex-col gap-1 border-t-2 border-gray-100 pt-2.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-900 font-bold">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-gray-900" />
              Checklist
            </span>
            <span>{completedChecklist}/{totalChecklist} ({checklistPercent}%)</span>
          </div>
          {/* Progress road */}
          <div className="w-full bg-gray-105 h-2 border border-gray-900 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-300" 
              style={{ width: `${checklistPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer statistics and user badges */}
      <div className="flex items-center justify-between border-t-2 border-gray-100 pt-3 mt-0.5">
        <div className="flex items-center gap-3 text-[10px] font-mono text-gray-900 font-bold">
          {task.comments.length > 0 && (
            <span className="flex items-center gap-1" title={`${task.comments.length} comments`}>
              <MessageSquare className="w-3.5 h-3.5" />
              {task.comments.length}
            </span>
          )}
          <span className="text-[9px] text-gray-500" title="Created date">
            {formatDate(task.createdAt)}
          </span>
        </div>

        {/* Assignee Badge */}
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-900 truncate max-w-[70px]">
              {task.assignee}
            </span>
            <div 
              className={`w-5.5 h-5.5 rounded border border-gray-900 ${task.assigneeColor || 'bg-slate-600'} text-white text-[9px] font-black flex items-center justify-center leading-none`}
              title={`Assigned to ${task.assignee}`}
            >
              {initial}
            </div>
          </div>
        ) : (
          <span className="text-[9px] font-mono text-slate-500 font-bold">Unassigned</span>
        )}
      </div>
    </div>
  );
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
