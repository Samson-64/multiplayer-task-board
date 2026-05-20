import React, { useState } from 'react';
import { ColumnType, Task, User } from '../types';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  id: ColumnType;
  title: string;
  colorTheme: {
    border: string;
    bullet: string;
    bg: string;
  };
  tasks: Task[];
  activeUsers: { [id: string]: User };
  currentUserId: string;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string, title: string) => void;
  onMoveTask: (taskId: string, targetColId: ColumnType) => void;
  onAddNewTask: (colId: ColumnType) => void;
}

export default function KanbanColumn({
  id,
  title,
  colorTheme,
  tasks,
  activeUsers,
  currentUserId,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onAddNewTask,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  // Handle Drag enter & leave effects
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onMoveTask(taskId, id);
    }
  };

  const colBg = id === 'inprogress' ? 'bg-indigo-50/30 p-4 rounded-xl border-2 border-dashed border-indigo-250/80' : 'p-4 rounded-xl border-2 border-transparent';

  return (
    <div
      id={`kanban-col-${id}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col flex-1 min-w-[280px] transition-all duration-200 ${colBg} ${
        isDragOver 
          ? 'border-solid border-2 border-gray-900 bg-amber-50/40 scale-[1.01]' 
          : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4.5 px-1 col-header-container">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full border border-gray-900 ${colorTheme.bullet}`} />
          <h3 className="font-sans font-black text-xs uppercase tracking-widest text-gray-900 flex items-center gap-2">
            {title}
          </h3>
          <span className="bg-gray-200 border border-gray-900 px-2 py-0.5 rounded text-xs font-black text-gray-950 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            {tasks.length < 10 ? `0${tasks.length}` : tasks.length}
          </span>
        </div>

        <button
          id={`add-task-col-btn-${id}`}
          onClick={() => onAddNewTask(id)}
          className="w-7 h-7 cursor-pointer bg-amber-400 text-gray-900 border-2 border-gray-900 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center"
          title={`Add task to ${title}`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

      {/* Task Cards Stack */}
      <div 
        id={`cards-list-${id}`}
        className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[580px] custom-scrollbar rounded-lg"
      >
        {tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-900/40 rounded-xl py-12 text-center text-gray-500 font-sans">
            <span className="text-xs font-bold uppercase tracking-wider">No tasks here yet</span>
            <button
              id={`empty-add-btn-${id}`}
              onClick={() => onAddNewTask(id)}
              className="mt-3 text-[10px] font-black uppercase text-gray-950 cursor-pointer flex items-center gap-1 border-2 border-gray-900 bg-white hover:bg-amber-400 px-2.5 py-1 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
            >
              <Plus className="w-3 h-3 stroke-[3]" /> Direct Create
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              activeUsers={activeUsers}
              currentUserId={currentUserId}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
            />
          ))
        )}
      </div>
    </div>
  );
}
