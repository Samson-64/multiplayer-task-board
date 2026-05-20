import React, { useState } from 'react';
import { User as UserIcon, Keyboard, Eye, Settings2, Sparkles, Check } from 'lucide-react';
import { User } from '../types';

interface LiveUsersProps {
  activeUsers: { [id: string]: User };
  currentUserId: string;
  currentUser: User;
  onUpdateProfile: (name: string, colorClass: string) => void;
  isConnected: boolean;
}

const AVATAR_COLORS = [
  'bg-slate-700',
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-green-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-rose-500',
  'bg-emerald-500',
];

export default function LiveUsers({
  activeUsers,
  currentUserId,
  currentUser,
  onUpdateProfile,
  isConnected,
}: LiveUsersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [selectedColor, setSelectedColor] = useState(currentUser.avatarColor);

  const handleSave = () => {
    if (nameInput.trim()) {
      onUpdateProfile(nameInput.trim(), selectedColor);
      setIsOpen(false);
    }
  };

  const activeUserList = Object.values(activeUsers);

  return (
    <div id="live-users-container" className="flex flex-col gap-3 bg-white border-2 border-gray-900 p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className={`absolute top-0.5 right-0.5 block h-2.5 w-2.5 rounded-full border border-gray-900 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <div className="w-8 h-8 rounded border-2 border-gray-900 bg-slate-50 flex items-center justify-center text-slate-900">
              <UserIcon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-sans font-black text-xs uppercase tracking-widest text-gray-900">
              Co-workers {isConnected ? `(${activeUserList.length})` : '(Offline)'}
            </h3>
            <p className="font-mono text-[9px] font-bold text-indigo-600 uppercase tracking-tight">
              {isConnected ? 'LIVE SYNC ACTIVE' : 'CONNECTING TO HOST...'}
            </p>
          </div>
        </div>

        <button
          id="toggle-profile-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 bg-white text-gray-900 hover:bg-amber-400 border-2 border-gray-900 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all text-slate-500 hover:text-slate-800 cursor-pointer"
          title="Configure profile details"
        >
          <Settings2 className="w-4 h-4 text-gray-900" />
        </button>
      </div>

      {isOpen ? (
        <div id="profile-edit-panel" className="flex flex-col gap-3 border-2 border-gray-905 bg-slate-50 p-3 rounded animate-fadeIn">
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-900 mb-1">Your Name</label>
            <input
              id="profile-name-input"
              type="text"
              maxLength={20}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full text-xs font-bold px-2.5 py-1.5 rounded border-2 border-gray-900 bg-white focus:outline-hidden"
              placeholder="e.g. Rusty Falcon"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-gray-900 mb-1">Avatar Accent</label>
            <div className="flex flex-wrap gap-1.5">
              {AVATAR_COLORS.map((col) => (
                <button
                  key={col}
                  id={`color-select-${col}`}
                  onClick={() => setSelectedColor(col)}
                  className={`w-6 h-6 rounded border-2 border-gray-900 cursor-pointer transition-transform ${col} relative flex items-center justify-center`}
                >
                  {selectedColor === col && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-1 justify-end">
            <button
              id="cancel-profile-btn"
              onClick={() => {
                setNameInput(currentUser.name);
                setSelectedColor(currentUser.avatarColor);
                setIsOpen(false);
              }}
              className="px-2.5 py-1 text-[11px] font-black uppercase text-gray-900 bg-white border-2 border-gray-900 rounded cursor-pointer hover:bg-slate-100 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              Cancel
            </button>
            <button
              id="save-profile-btn"
              onClick={handleSave}
              className="px-3 py-1 text-[11px] font-black uppercase text-gray-900 bg-amber-400 border-2 border-gray-900 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-500 cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Save
            </button>
          </div>
        </div>
      ) : (
        <div id="users-badge-list" className="flex flex-col gap-2 max-h-[170px] overflow-y-auto pr-1">
          {activeUserList.map((user) => {
            const isMe = user.id === currentUserId;
            const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';

            return (
              <div
                key={user.id}
                id={`user-badge-${user.id}`}
                className={`flex items-center justify-between p-2 rounded border-2 border-gray-900 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mb-1 ${isMe ? 'bg-amber-50/40 border-indigo-600 shadow-[2px_2px_0px_0px_#4F46E5]' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded border border-gray-900 ${user.avatarColor} flex items-center justify-center text-white text-xs font-black leading-none text-center min-w-[28px]`}>
                    {initial}
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      {user.name}
                      {isMe && <span className="text-[9px] font-mono font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded">Me</span>}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500 mt-1">
                      {user.activeTaskId ? 'Specifying details' : 'Viewing Board'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {user.isTyping && (
                    <span className="p-1 rounded border border-gray-900 bg-amber-100 text-gray-900" title="Is typing comment or chat">
                      <Keyboard className="w-3 h-3 animate-bounce" />
                    </span>
                  )}
                  {user.activeTaskId && (
                    <span className="p-1 rounded border border-gray-900 bg-indigo-100 text-indigo-900" title="Is editing task details">
                      <Eye className="w-3 h-3 animate-pulse" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
