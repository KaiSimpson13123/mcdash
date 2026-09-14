import React, { useEffect, useState, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  Download,
  Trash2,
  RefreshCw,
  Palette,
} from 'lucide-react';
import { useWebSocketData, ActivityItem } from '../contexts/WebSocketContext';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { FormattedText } from '../components/FormattedText';
import { formatTime } from '../services/format';

const COLOR_PALETTE = [
  { code: '&0', name: 'Black', bg: '#000000', text: '#ffffff' },
  { code: '&1', name: 'Dark Blue', bg: '#0000aa', text: '#ffffff' },
  { code: '&2', name: 'Dark Green', bg: '#00aa00', text: '#ffffff' },
  { code: '&3', name: 'Dark Aqua', bg: '#00aaaa', text: '#ffffff' },
  { code: '&4', name: 'Dark Red', bg: '#aa0000', text: '#ffffff' },
  { code: '&5', name: 'Dark Purple', bg: '#aa00aa', text: '#ffffff' },
  { code: '&6', name: 'Gold', bg: '#ffaa00', text: '#000000' },
  { code: '&7', name: 'Gray', bg: '#aaaaaa', text: '#000000' },
  { code: '&8', name: 'Dark Gray', bg: '#555555', text: '#ffffff' },
  { code: '&9', name: 'Blue', bg: '#5555ff', text: '#ffffff' },
  { code: '&a', name: 'Green', bg: '#55ff55', text: '#000000' },
  { code: '&b', name: 'Aqua', bg: '#55ffff', text: '#000000' },
  { code: '&c', name: 'Red', bg: '#ff5555', text: '#ffffff' },
  { code: '&d', name: 'Light Purple', bg: '#ff55ff', text: '#000000' },
  { code: '&e', name: 'Yellow', bg: '#ffff55', text: '#000000' },
  { code: '&f', name: 'White', bg: '#ffffff', text: '#000000' },
  { code: '&l', name: 'Bold', bg: '#334155', text: '#ffffff', label: 'B' },
  { code: '&o', name: 'Italic', bg: '#334155', text: '#ffffff', label: 'I' },
  { code: '&r', name: 'Reset', bg: '#1e293b', text: '#94a3b8', label: 'Reset' },
];

interface ChatMessage {
  id: number;
  timestamp: string;
  sender: string;
  prefix?: string;
  message: string;
}

export const Chat: React.FC = () => {
  const { liveActivity } = useWebSocketData();
  const { addToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState('');
  const [outgoingText, setOutgoingText] = useState('');
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Load chat items from activity history
  useEffect(() => {
    api.getActivity({ limit: 100, category: 'CHAT' })
      .then((acts) => {
        if (acts) {
          const mapped: ChatMessage[] = acts.map((a: any) => ({
            id: a.id,
            timestamp: a.timestamp,
            sender: a.title.replace('Chat: ', ''),
            message: a.description,
          }));
          setMessages(mapped.reverse());
        }
      })
      .catch((e) => console.error('Failed to load chat history', e));
  }, []);

  // Listen for real-time CHAT activity events
  useEffect(() => {
    const latest = liveActivity[0];
    if (latest && latest.category === 'CHAT') {
      const msg: ChatMessage = {
        id: latest.id,
        timestamp: latest.timestamp,
        sender: latest.title.replace('Chat: ', ''),
        message: latest.description,
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }
  }, [liveActivity]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outgoingText.trim()) return;

    setSending(true);
    try {
      await api.sendChatMessage(outgoingText.trim());
      addToast('success', 'Message broadcasted to server');
      setOutgoingText('');
    } catch (e: any) {
      addToast('error', e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleExport = () => {
    const text = messages.map((m) => `[${m.timestamp}] ${m.sender}: ${m.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minecraft-chat-export.txt';
    a.click();
    URL.revokeObjectURL(url);
    addToast('info', 'Chat history exported');
  };

  const filteredMessages = messages.filter((m) =>
    !search ||
    m.sender.toLowerCase().includes(search.toLowerCase()) ||
    m.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <MessageSquare className="w-8 h-8 text-brand-400" />
              Live Server Chat
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
              Live Feed
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time in-game communication feed, formatted player tags, and server broadcast capability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Chat
          </button>
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 text-xs font-semibold transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden flex flex-col h-[650px] shadow-2xl">
        {/* Search header inside card */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4 bg-dark-950/40">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chat messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-dark-950 border border-white/10 text-white text-xs focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">{filteredMessages.length} messages</span>
        </div>

        {/* Message Log */}
        <div ref={chatScrollRef} className="flex-1 p-6 overflow-y-auto space-y-3 bg-dark-950/60 font-sans">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
              No chat messages yet. Chat messages from in-game players will appear here in real-time.
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className="p-3 rounded-xl bg-dark-900/60 border border-white/5 hover:border-white/10 transition-colors space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      <FormattedText text={msg.sender} />
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div className="text-sm text-slate-200 pl-1 font-medium break-words">
                  <FormattedText text={msg.message} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Live Color Preview */}
        {outgoingText.trim() && (
          <div className="px-4 py-2 bg-dark-900/80 border-t border-white/5 flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-mono flex-shrink-0">Preview:</span>
            <div className="font-medium text-slate-200 truncate">
              <FormattedText text={`§c[WebDashboard] §f${outgoingText}`} />
            </div>
          </div>
        )}

        {/* Color Palette Toolbar */}
        <div className="px-4 py-2 bg-dark-950 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold uppercase tracking-wider mr-1 flex-shrink-0">
            <Palette className="w-3.5 h-3.5 text-brand-400" />
            <span>Colors:</span>
          </div>
          {COLOR_PALETTE.map((chip) => (
            <button
              key={chip.code}
              type="button"
              onClick={() => setOutgoingText((prev) => prev + chip.code)}
              title={`${chip.name} (${chip.code})`}
              className="px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-transform hover:scale-110 active:scale-95 flex-shrink-0 border border-white/10 shadow-sm"
              style={{ backgroundColor: chip.bg, color: chip.text }}
            >
              {chip.label || chip.code}
            </button>
          ))}
        </div>

        {/* Broadcast input form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-dark-950/80 flex items-center gap-3">
          <div className="px-3 py-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-bold font-mono uppercase">
            [Dashboard]
          </div>
          <input
            type="text"
            placeholder="Send broadcast message to Minecraft server (supports &a, &b, &c color codes)..."
            value={outgoingText}
            onChange={(e) => setOutgoingText(e.target.value)}
            disabled={sending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-colors"
          />
          <button
            type="submit"
            disabled={sending || !outgoingText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
