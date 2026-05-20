import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, User } from '../types';
import { Send, MessageSquare, Flame } from 'lucide-react';

interface BoardChatProps {
  chat: ChatMessage[];
  currentUser: User;
  onSendMessage: (text: string) => void;
  onSetTyping: (isTyping: boolean) => void;
}

export default function BoardChat({
  chat,
  currentUser,
  onSendMessage,
  onSetTyping,
}: BoardChatProps) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bot on new chat messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
      onSetTyping(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (e.target.value.trim().length > 0) {
      onSetTyping(true);
    } else {
      onSetTyping(false);
    }
  };

  const handleBlur = () => {
    onSetTyping(false);
  };

  return (
    <div id="board-chat-container" className="flex flex-col h-full bg-white border-2 border-gray-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      <div className="flex items-center gap-2 border-b-2 border-gray-900 p-4 bg-slate-50">
        <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-slate-705 border-2 border-gray-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <MessageSquare className="w-4 h-4 text-gray-900" />
        </div>
        <div>
          <h3 className="font-sans font-black text-xs uppercase tracking-widest text-gray-900">Co-work Chat</h3>
          <p className="font-mono text-[9px] font-bold text-indigo-600 uppercase tracking-tight">Instant sync channel</p>
        </div>
      </div>

      {/* Messages list */}
      <div
        id="chat-messages-scroll"
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[280px]"
      >
        {chat.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center py-10">
            <Flame className="w-5 h-5 mb-1.5 text-rose-500 animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-wider">No comments yet. Introduce yourself!</p>
          </div>
        ) : (
          chat.map((msg) => {
            const isMe = msg.userId === currentUser.id;
            const initial = msg.userName ? msg.userName.charAt(0).toUpperCase() : '?';

            return (
              <div
                key={msg.id}
                id={`chat-msg-${msg.id}`}
                className={`flex gap-2 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar circle */}
                <div className={`w-6 h-6 rounded border border-gray-900 ${msg.avatarColor} flex items-center justify-center text-white text-[10px] font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] select-none min-w-[24px]`}>
                  {initial}
                </div>
                
                <div className="flex flex-col">
                  {/* Name header */}
                  {!isMe && (
                    <span className="text-[9px] font-mono font-bold text-gray-900 px-1 mb-0.5">
                      {msg.userName}
                    </span>
                  )}
                  {/* Message body */}
                  <div className={`px-2.5 py-1.5 rounded border-2 border-gray-900 text-xs font-sans leading-normal shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    isMe 
                      ? 'bg-gray-900 text-white rounded-tr-none shadow-[2px_2px_0px_0px_#4F46E5]' 
                      : 'bg-white text-gray-900 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <span className={`text-[8px] font-mono font-bold text-gray-500 mt-1 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form input */}
      <form onSubmit={handleSend} className="border-t-2 border-gray-900 p-3 bg-white flex items-center gap-2">
        <input
          id="chat-message-input"
          type="text"
          maxLength={150}
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Type a message..."
          className="flex-1 text-xs font-bold px-3 py-2 rounded border-2 border-gray-900 bg-slate-50 focus:bg-white focus:outline-hidden"
        />
        <button
          id="send-chat-btn"
          type="submit"
          className="p-2 bg-amber-400 border-2 border-gray-900 text-gray-900 rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all cursor-pointer flex items-center justify-center font-bold"
        >
          <Send className="w-3.5 h-3.5 stroke-[3]" />
        </button>
      </form>
    </div>
  );
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
