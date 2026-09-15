import React, { useEffect, useState, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  Download,
  Trash2,
  Palette,
} from 'lucide-react';
import { useWebSocketData } from '../contexts/WebSocketContext';
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
  { code: '&r', name: 'Reset', bg: '#1e293b', text: '#ffffff', label: 'R' },
];

interface ChatMessage {
  id: number;
  timestamp: string;
  sender: string;
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

  // Helper to parse activity items into ChatMessage
  const parseActivityMessage = (a: any): ChatMessage => {
    let sender = a.title || 'Server';
    if (sender.startsWith('Chat: ')) {
      sender = sender.replace('Chat: ', '');
    }
    return {
      id: a.id || Date.now() + Math.random(),
      timestamp: a.timestamp || new Date().toISOString(),
      sender,
      message: a.description || '',
    };
  };

  // Load chat items from activity history on mount
  useEffect(() => {
    api.getActivity({ limit: 100, category: 'CHAT' })
      .then((acts) => {
        if (acts && Array.isArray(acts)) {
          const mapped: ChatMessage[] = acts.map(parseActivityMessage);
          setMessages(mapped.reverse());
        }
      })
      .catch((e) => console.error('Failed to load chat history', e));
  }, []);

  // Listen for real-time CHAT activity events via WebSocket
  useEffect(() => {
    const latest = liveActivity[0];
    if (latest && latest.category === 'CHAT') {
      const parsed = parseActivityMessage(latest);
      setMessages((prev) => {
        // Prevent duplicate messages by id or identical recent content & sender
        if (prev.some((m) => m.id === parsed.id)) return prev;
        const last = prev[prev.length - 1];
        if (last && last.sender === parsed.sender && last.message === parsed.message && Math.abs(Date.now() - new Date(parsed.timestamp).getTime()) < 3000) {
          return prev;
        }
        return [...prev, parsed];
      });
    }
  }, [liveActivity]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle sending message from dashboard to Minecraft server
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSend = outgoingText.trim();
    if (!textToSend) return;

    setSending(true);
    try {
      const res = await api.sendChatMessage(textToSend);
      addToast('success', 'Message broadcasted to server');

      // Optimistically add to messages immediately so user sees it right away!
      const optimisticMsg: ChatMessage = {
        id: Date.now(),
        timestamp: res?.timestamp || new Date().toISOString(),
        sender: res?.sender || '§c[WebDashboard]',
        message: res?.message || textToSend,
      };

      setMessages((prev) => {
        // Avoid duplicate if websocket was faster
        if (prev.some((m) => m.message === optimisticMsg.message && m.sender.includes('WebDashboard'))) {
          return prev;
        }
        return [...prev, optimisticMsg];
      });

      setOutgoingText('');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to send message');
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
    a.download = 'minecraft-chat.txt';
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
    <div className="space-y-6 select-none animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#2e2f30] border-2 border-[#1e1e1f] shadow-[inset_2px_2px_0_#48494a,inset_-2px_-2px_0_#222223] p-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading tracking-wide text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-[#55ffff]" />
              LIVE SERVER CHAT
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-heading bg-[#1e3816] text-[#55ff55] border border-[#11240c]">
              SYNCHRONIZED FEED
            </span>
          </div>
          <p className="text-xs font-mono text-[#aaaaaa] mt-1">
            Real-time in-game communication feed, formatted player badges, and server broadcasting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="mc-btn px-3 py-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT CHAT
          </button>
          <button
            onClick={() => setMessages([])}
            className="mc-btn px-3 py-1.5 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            CLEAR
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-[#313233] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] flex flex-col h-[650px]">
        {/* Search header inside card */}
        <div className="p-3 border-b-2 border-[#222223] flex items-center justify-between gap-4 bg-[#242425]">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-[#888888] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search chat messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-8 py-1.5 text-xs h-8"
            />
          </div>
          <span className="text-xs text-[#aaaaaa] font-mono">{filteredMessages.length} messages</span>
        </div>

        {/* Message Log */}
        <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-2 bg-[#141415] font-mono text-xs shadow-[inset_3px_3px_0_#0a0a0b]">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[#777777] text-xs italic">
              No chat messages recorded yet. Player and dashboard messages will stream here in real time.
            </div>
          ) : (
            filteredMessages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className="p-2 bg-[#1e1e1f] border border-[#272728] shadow-[inset_1px_1px_0_#2b2b2c] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading text-white text-xs">
                    <FormattedText text={msg.sender} />
                  </span>
                  <span className="text-[10px] text-[#777777] font-mono">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div className="text-xs text-[#e0e0e0] pl-1 break-words font-mono">
                  <FormattedText text={msg.message} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Live Color Preview */}
        {outgoingText.trim() && (
          <div className="px-3 py-1.5 bg-[#252526] border-t-2 border-[#1e1e1f] flex items-center gap-2 text-xs font-mono">
            <span className="text-[#888888]">Broadcast Preview:</span>
            <div className="text-white truncate">
              <FormattedText text={`§c[WebDashboard] §f${outgoingText}`} />
            </div>
          </div>
        )}

        {/* Color Palette Toolbar */}
        <div className="px-3 py-2 bg-[#242425] border-t-2 border-[#1e1e1f] flex items-center gap-1.5 overflow-x-auto">
          <div className="flex items-center gap-1 text-[11px] font-heading text-[#aaaaaa] uppercase mr-2 flex-shrink-0">
            <Palette className="w-3.5 h-3.5 text-[#ffaa00]" />
            <span>COLOR CODES:</span>
          </div>
          {COLOR_PALETTE.map((chip) => (
            <button
              key={chip.code}
              type="button"
              onClick={() => setOutgoingText((prev) => prev + chip.code)}
              title={`${chip.name} (${chip.code})`}
              className="px-2 py-0.5 text-[10px] font-heading flex-shrink-0 border border-black shadow-[inset_1px_1px_0_rgba(255,255,255,0.4)] transition-none hover:scale-110 active:scale-95"
              style={{ backgroundColor: chip.bg, color: chip.text }}
            >
              {chip.label || chip.code}
            </button>
          ))}
        </div>

        {/* Broadcast input form */}
        <form onSubmit={handleSendMessage} className="p-3 border-t-4 border-[#141415] bg-[#2e2f30] flex items-center gap-2">
          <div className="px-2.5 py-1.5 bg-[#1e1e1f] text-[#55ff55] border-2 border-[#141415] font-heading text-xs">
            [CHAT]
          </div>
          <input
            type="text"
            placeholder="Type message to broadcast to Minecraft server (supports &a, &c color codes)..."
            value={outgoingText}
            onChange={(e) => setOutgoingText(e.target.value)}
            disabled={sending}
            className="form-input flex-1 text-xs"
          />
          <button
            type="submit"
            disabled={sending || !outgoingText.trim()}
            className="button button-primary px-4 py-2 text-xs flex-shrink-0 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'SENDING...' : 'BROADCAST'}
          </button>
        </form>
      </div>
    </div>
  );
};
