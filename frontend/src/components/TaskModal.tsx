import React, { useState, useEffect } from 'react';
import { Task, Comment, ChecklistItem, User, ColumnType } from '../types';
import { X, Check, Save, Plus, Trash, MessageCircle, AlertCircle, Bookmark, ClipboardList } from 'lucide-react';

interface TaskModalProps {
  task: Task | null; // null if creating a new task
  defaultColumn?: ColumnType;
  currentUser: User;
  onClose: () => void;
  onSave: (task: Task) => void;
  onSetTyping: (isTyping: boolean) => void;
}

const PRIORITIES: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
const COLUMNS: { id: ColumnType; name: string }[] = [
  { id: 'todo', name: '📍 To Do' },
  { id: 'inprogress', name: '⚡ In Progress' },
  { id: 'review', name: '🔍 Under Review' },
  { id: 'done', name: '✅ Done' }
];

export default function TaskModal({
  task,
  defaultColumn,
  currentUser,
  onClose,
  onSave,
  onSetTyping,
}: TaskModalProps) {
  const isEditing = !!task;

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [column, setColumn] = useState<ColumnType>('todo');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [assignee, setAssignee] = useState('');
  const [assigneeColor, setAssigneeColor] = useState('bg-slate-700');
  const [tagInput, setTagInput] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  // Local helper states
  const [newCheckItem, setNewCheckItem] = useState('');
  const [newComment, setNewComment] = useState('');

  // Pre-load task details if in edit mode
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setColumn(task.column);
      setPriority(task.priority);
      setAssignee(task.assignee || '');
      setAssigneeColor(task.assigneeColor || 'bg-slate-700');
      setTagInput(task.tags.join(', '));
      setChecklist(task.checklist || []);
      setComments(task.comments || []);
    } else {
      setTitle('');
      setDescription('');
      setColumn(defaultColumn || 'todo');
      setPriority('medium');
      setAssignee('');
      setAssigneeColor('bg-blue-500');
      setTagInput('');
      setChecklist([]);
      setComments([]);
    }
  }, [task, defaultColumn]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Process tags (comma separated)
    const processedTags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updatedTask: Task = {
      id: isEditing ? task!.id : 'task-' + Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      description: description.trim(),
      column,
      priority,
      tags: processedTags,
      assignee: assignee.trim() || undefined,
      assigneeColor,
      checklist,
      comments,
      createdAt: isEditing ? task!.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedTask);
    onClose();
  };

  // Checklist Actions
  const handleAddCheckItem = () => {
    if (newCheckItem.trim()) {
      const newItem: ChecklistItem = {
        id: 'chk-' + Math.random().toString(36).substr(2, 9),
        text: newCheckItem.trim(),
        completed: false,
      };
      setChecklist([...checklist, newItem]);
      setNewCheckItem('');
    }
  };

  const handleToggleCheckItem = (id: string) => {
    setChecklist(
      checklist.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleDeleteCheckItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  // Comments Actions
  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: 'cmt-' + Math.random().toString(36).substr(2, 9),
        userName: currentUser.name,
        avatarColor: currentUser.avatarColor,
        text: newComment.trim(),
        createdAt: new Date().toISOString(),
      };
      setComments([...comments, comment]);
      setNewComment('');
      onSetTyping(false);
    }
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
    if (e.target.value.trim().length > 0) {
      onSetTyping(true);
    } else {
      onSetTyping(false);
    }
  };

  const handleCommentBlur = () => {
    onSetTyping(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[110] overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-xl border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-gray-900 px-6 py-4 bg-indigo-50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border-2 border-gray-900 bg-indigo-600 flex items-center justify-center text-white">
              <ClipboardList className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-black text-xs uppercase tracking-widest text-gray-900">
              {isEditing ? 'Describe Task Details' : 'Collaborate on New Task'}
            </h3>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-900 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-gray-900 stroke-[3]" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 flex-1 select-none">
          {/* Title input */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-900 mb-1">Task Title</label>
            <input
              id="task-title-input"
              type="text"
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-bold px-3.5 py-2 border-2 border-gray-900 rounded focus:outline-hidden bg-white"
              placeholder="e.g. Implement real-time filters"
            />
          </div>

          {/* Grid Layout fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column Selector */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-900 mb-1">Board Column</label>
              <select
                id="task-column-select"
                value={column}
                onChange={(e) => setColumn(e.target.value as ColumnType)}
                className="w-full text-xs font-bold px-3 py-2.5 border-2 border-gray-900 bg-white rounded focus:outline-hidden cursor-pointer"
              >
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Slider */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-900 mb-1">Task Priority</label>
              <div className="flex bg-slate-100 p-1.5 rounded border-2 border-gray-900">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    id={`priority-btn-${p}`}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 text-center py-1.5 text-xs font-mono font-black uppercase rounded transition-all cursor-pointer ${
                      priority === p
                        ? p === 'high'
                          ? 'bg-red-500 text-white border border-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                          : p === 'medium'
                          ? 'bg-amber-400 text-gray-900 border border-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                          : 'bg-emerald-400 text-gray-900 border border-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee Input */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-900 mb-1">Assignee Name</label>
              <input
                id="task-assignee-input"
                type="text"
                maxLength={20}
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2.5 border-2 border-gray-900 rounded focus:outline-hidden"
                placeholder="e.g. Alice Cooper"
              />
            </div>

            {/* Assignee color */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-900 mb-1">Assignee Indicator</label>
              <div className="flex gap-1 bg-slate-50 border-2 border-gray-900 p-1.5 rounded">
                {[
                  'bg-red-500',
                  'bg-orange-500',
                  'bg-amber-500',
                  'bg-green-500',
                  'bg-teal-500',
                  'bg-blue-500',
                  'bg-indigo-500',
                  'bg-purple-500',
                  'bg-pink-500',
                  'bg-slate-705 bg-slate-800',
                ].map((color) => (
                  <button
                    key={color}
                    id={`assignee-color-${color}`}
                    type="button"
                    onClick={() => setAssigneeColor(color)}
                    className={`w-6 h-6 rounded border border-gray-900 cursor-pointer transition-transform ${color} flex items-center justify-center`}
                  >
                    {assigneeColor === color && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-900 mb-1">Description Details</label>
            <textarea
              id="task-description-input"
              rows={3}
              maxLength={400}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs font-serif italic px-3.5 py-2.5 border-2 border-gray-900 rounded focus:outline-hidden resize-none"
              placeholder="Provide a clear, brief outline of goals..."
            />
          </div>

          {/* Tags (comma separated) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-gray-900" />
                Category Labels
              </label>
              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wide">Separated by commas</span>
            </div>
            <input
              id="task-tags-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="w-full text-xs font-bold px-3.5 py-2 border-2 border-gray-900 rounded focus:outline-hidden"
              placeholder="e.g. Frontend, Wireframe, Feedback"
            />
          </div>

          {/* Checklist Area */}
          <div className="pt-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-900 mb-2 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-gray-900" />
              Sub-Tasks Checklist
            </label>
            
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {checklist.length === 0 ? (
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider italic py-1">No checklist elements. Create one below!</p>
              ) : (
                checklist.map((item) => (
                  <div
                    key={item.id}
                    id={`check-item-${item.id}`}
                    className="flex items-center justify-between p-2 rounded border-2 border-gray-900 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mb-1"
                  >
                    <button
                      id={`check-toggle-${item.id}`}
                      type="button"
                      onClick={() => handleToggleCheckItem(item.id)}
                      className="flex items-center gap-2.5 cursor-pointer text-left flex-1"
                    >
                      <div className={`w-4 h-4 rounded border-2 border-gray-900 flex items-center justify-center transition-all ${
                        item.completed 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-white hover:bg-indigo-50'
                      }`}>
                        {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className={`text-xs font-bold ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {item.text}
                      </span>
                    </button>
                    
                    <button
                      id={`check-delete-${item.id}`}
                      type="button"
                      onClick={() => handleDeleteCheckItem(item.id)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer transition-colors"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add checklist item */}
            <div className="flex gap-2 mt-3.5">
              <input
                id="task-new-checklist-input"
                type="text"
                maxLength={60}
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                className="flex-1 text-xs px-3 py-2 border-2 border-gray-900 rounded bg-slate-50 font-bold focus:bg-white focus:outline-hidden"
                placeholder="Add sub-task parameter..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCheckItem();
                  }
                }}
              />
              <button
                id="add-checklist-item-btn"
                type="button"
                onClick={handleAddCheckItem}
                className="px-3.5 py-2 bg-amber-400 border-2 border-gray-900 text-gray-900 text-xs font-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="pt-2 border-t-2 border-gray-900">
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-900 mb-2 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-gray-900" />
              Activity Comments ({comments.length})
            </label>

            {/* Comments List */}
            <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 mb-4">
              {comments.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-900/40 rounded text-xs text-gray-500 font-bold uppercase tracking-wide">
                  <AlertCircle className="w-4 h-4 mx-auto mb-1 opacity-80" />
                  No comments published yet.
                </div>
              ) : (
                comments.map((cmt) => {
                  const initial = cmt.userName ? cmt.userName.charAt(0).toUpperCase() : '?';
                  return (
                    <div key={cmt.id} id={`comment-item-${cmt.id}`} className="flex gap-2.5 text-xs bg-white p-2.5 rounded border-2 border-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <div className={`w-6 h-6 rounded border border-gray-900 ${cmt.avatarColor} flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`}>
                        {initial}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900">{cmt.userName}</span>
                          <span className="text-[9px] font-mono font-bold text-gray-500">
                            {new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-gray-800 mt-0.5 leading-relaxed font-sans">{cmt.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comments Form */}
            <div className="flex flex-col gap-2">
              <textarea
                id="task-new-comment-input"
                rows={2}
                maxLength={200}
                value={newComment}
                onChange={handleCommentChange}
                onBlur={handleCommentBlur}
                className="w-full text-xs font-bold px-3 py-2 border-2 border-gray-900 rounded bg-slate-50 focus:bg-white focus:outline-hidden resize-none animate-fadeIn"
                placeholder="Write a comment..."
              />
              <button
                id="post-comment-btn"
                type="button"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="self-end px-3.5 py-1.5 bg-indigo-600 border-2 border-gray-900 text-white text-[10px] font-black uppercase rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                Add Comment
              </button>
            </div>
          </div>

          {/* Action Submits absolute buttons */}
          <div className="flex gap-3 justify-end border-t-2 border-gray-900 pt-5 mt-4 sticky bottom-0 bg-white">
            <button
              id="cancel-modal-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-gray-900 rounded bg-white text-gray-905 font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-modal-btn"
              type="submit"
              className="px-5 py-2 bg-amber-400 hover:bg-amber-500 border-2 border-gray-900 text-gray-900 text-xs font-black uppercase rounded shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              {isEditing ? 'Sync Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
