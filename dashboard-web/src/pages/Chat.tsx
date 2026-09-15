import React, { useEffect, useState, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  Download,
  Trash2,
  Palette,
  Crown,
  Shield,
  Bot,
  User,
  CheckCircle2,
} from 'lucide-react';
import { useWebSocketData } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext';
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
  id: number | string;
  timestamp: string;
  sender: string;
  message: string;
  isSent?: boolean;
  role?: 'sudo' | 'admin' | 'player' | 'server';
  senderName?: string;
}

export const Chat: React.FC = () => {
  const { liveActivity } = useWebSocketData();
  const { user, isSudo } = useAuth();
  const { addToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState('');
  const [outgoingText, setOutgoingText] = useState('');
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Helper to extract clean username from LuckPerms / Minecraft formatted string
  const extractCleanUsername = (raw: string): string => {
    if (!raw) return 'Steve';
    // Remove color codes
    let s = raw.replace(/[§&][0-9a-fk-or]/gi, '');
    // If it's a role like [Sudo] or [Admin]
    if (s.includes('[Sudo]') || s.includes('[sudo]')) return 'sudo';
    if (s.includes('[Admin]') || s.includes('[admin]')) return 'admin';
    if (s.includes('[WebDashboard]')) return 'admin';
    // Remove prefixes inside brackets e.g. [Admin] Notch -> Notch
    s = s.replace(/\[.*?\]/g, '');
    const trimmed = s.trim();
    return trimmed || 'Steve';
  };

  // Helper to detect if a message was sent from dashboard (admin/sudo)
  const parseActivityMessage = (a: any): ChatMessage => {
    let sender = a.title || 'Server';
    if (sender.startsWith('Chat: ')) {
      sender = sender.replace('Chat: ', '');
    }

    const sLower = sender.toLowerCase();
    const isDashboardSudo = sLower.includes('[sudo]') || sLower.startsWith('sudo');
    const isDashboardAdmin = sLower.includes('[admin]') || sLower.includes('webdashboard') || sLower.startsWith('admin');
    const isSent = isDashboardSudo || isDashboardAdmin;

    let role: 'sudo' | 'admin' | 'player' | 'server' = 'player';
    if (isDashboardSudo) role = 'sudo';
    else if (isDashboardAdmin) role = 'admin';
    else if (sLower === 'server' || sLower.includes('broadcast')) role = 'server';

    return {
      id: a.id || Date.now() + Math.random(),
      timestamp: a.timestamp || new Date().toISOString(),
      sender,
      message: a.description || '',
      isSent,
      role,
      senderName: extractCleanUsername(sender),
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
        if (
          last &&
          last.sender === parsed.sender &&
          last.message === parsed.message &&
          Math.abs(Date.now() - new Date(parsed.timestamp).getTime()) < 3000
        ) {
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
    const activeRole = isSudo ? 'sudo' : 'admin';
    const activeUsername = user || (isSudo ? 'sudo' : 'admin');

    try {
      const res = await api.sendChatMessage(textToSend);
      addToast('success', 'Message broadcasted to server');

      // Optimistically add to messages immediately so user sees it right away!
      const optimisticMsg: ChatMessage = {
        id: 'msg-' + Date.now(),
        timestamp: res?.timestamp || new Date().toISOString(),
        sender: res?.senderTitle || (isSudo ? `[Sudo] ${activeUsername}` : `[Admin] ${activeUsername}`),
        message: res?.message || textToSend,
        isSent: true,
        role: activeRole,
        senderName: activeUsername,
      };

      setMessages((prev) => {
        // Avoid duplicate if websocket was faster
        if (prev.some((m) => m.message === optimisticMsg.message && (m.isSent || m.sender.toLowerCase().includes(activeRole)))) {
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

  const filteredMessages = messages.filter(
    (m) =>
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
              SERVER LIVE CHAT
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-heading bg-[#1e3816] text-[#55ff55] border border-[#11240c]">
              SYNCHRONIZED FEED
            </span>
          </div>
          <p className="text-xs font-mono text-[#aaaaaa] mt-1">
            Real-time chat with in-game players, player avatars, and privileged administrative broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Operator Status Tag */}
          <div className={`px-2.5 py-1 text-xs font-heading border flex items-center gap-1.5 ${
            isSudo
              ? 'bg-[#3b1212] text-[#ff5555] border-[#ff5555]'
              : 'bg-[#152336] text-[#55ffff] border-[#55ffff]'
          }`}>
            {isSudo ? <Crown className="w-3.5 h-3.5 text-[#ffaa00]" /> : <Shield className="w-3.5 h-3.5 text-[#55ffff]" />}
            <span>CHATTING AS {isSudo ? 'SUDO (SUPER ADMIN)' : 'ADMIN'}</span>
          </div>

          <button onClick={handleExport} className="mc-btn px-3 py-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            EXPORT
          </button>
          <button onClick={() => setMessages([])} className="mc-btn px-3 py-1.5 text-xs">
            <Trash2 className="w-3.5 h-3.5" />
            CLEAR
          </button>
        </div>
      </div>

      {/* Chat Application Main Container */}
      <div className="bg-[#313233] border-4 border-[#141415] shadow-[inset_3px_3px_0_#48494a,inset_-3px_-3px_0_#1e1e1f] flex flex-col h-[700px]">
        {/* Search header inside chat card */}
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

          <div className="flex items-center gap-4 text-xs font-mono text-[#aaaaaa]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-[#252526] border border-[#555] inline-block" /> Received (Left)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-[#152336] border border-[#55ffff] inline-block" /> Admin (Right)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-[#381414] border border-[#ff5555] inline-block" /> Sudo (Right)
              </span>
            </div>
            <span className="border-l border-[#444] pl-3 text-[#d0d1d4]">{filteredMessages.length} messages</span>
          </div>
        </div>

        {/* Message Thread - Left side received, Right side sent */}
        <div
          ref={chatScrollRef}
          className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#141415] font-mono text-xs shadow-[inset_3px_3px_0_#0a0a0b]"
        >
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#777777] text-xs space-y-2">
              <MessageSquare className="w-10 h-10 opacity-30 text-[#aaaaaa]" />
              <p className="italic">No chat messages recorded yet. Player and dashboard messages will stream here.</p>
            </div>
          ) : (
            filteredMessages.map((msg, idx) => {
              const isSent = Boolean(msg.isSent);
              const isSudoMsg = msg.role === 'sudo' || msg.sender.toLowerCase().includes('sudo');
              const avatarUser = msg.senderName || extractCleanUsername(msg.sender);

              return (
                <div
                  key={msg.id || idx}
                  className={`flex items-start gap-3 w-full ${isSent ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Left Side (Received) Avatar */}
                  {!isSent && (
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <img
                        src={`https://mc-heads.net/avatar/${encodeURIComponent(avatarUser)}/36`}
                        alt={avatarUser}
                        className="w-9 h-9 border-2 border-black pixelated bg-[#1a1a1b] shadow-[1px_1px_0_#333]"
                        onError={(e: any) => {
                          e.target.onerror = null;
                          e.target.src = 'https://mc-heads.net/avatar/Steve/36';
                        }}
                      />
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div className={`max-w-[75%] md:max-w-[65%] flex flex-col ${isSent ? 'items-end' : 'items-start'}`}>
                    {/* Header Info */}
                    <div className="flex items-center gap-2 mb-1 px-1">
                      {isSent ? (
                        <>
                          <span className="text-[10px] text-[#777777] font-mono">
                            {formatTime(msg.timestamp)}
                          </span>
                          {isSudoMsg ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-heading uppercase bg-[#4a1313] text-[#ff5555] border border-[#ff5555] flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5 text-[#ffaa00]" />
                              SUDO
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[9px] font-heading uppercase bg-[#0f2d4a] text-[#55ffff] border border-[#55ffff] flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5 text-[#55ffff]" />
                              ADMIN
                            </span>
                          )}
                          <span className="font-heading text-xs text-white">
                            <FormattedText text={msg.sender} />
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-heading text-xs text-white">
                            <FormattedText text={msg.sender} />
                          </span>
                          <span className="text-[10px] text-[#777777] font-mono">
                            {formatTime(msg.timestamp)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Chat Bubble Body */}
                    <div
                      className={`p-3 text-xs break-words border-2 shadow-sm font-mono ${
                        isSent
                          ? isSudoMsg
                            ? 'bg-[#2b1212] border-[#7f1d1d] text-[#ffe0e0] shadow-[inset_1px_1px_0_#4a1f1f]'
                            : 'bg-[#142336] border-[#1d4ed8] text-[#e0f2fe] shadow-[inset_1px_1px_0_#1e3a5f]'
                          : 'bg-[#1e1e1f] border-[#313233] text-[#f3f4f6] shadow-[inset_1px_1px_0_#2b2b2c]'
                      }`}
                    >
                      <FormattedText text={msg.message} />
                    </div>
                  </div>

                  {/* Right Side (Sent) Avatar */}
                  {isSent && (
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div
                        className={`w-9 h-9 border-2 border-black flex items-center justify-center ${
                          isSudoMsg ? 'bg-[#5c1616] text-[#ffaa00] shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-[#103055] text-[#55ffff]'
                        }`}
                        title={isSudoMsg ? 'Sudo Operator' : 'Dashboard Admin'}
                      >
                        {isSudoMsg ? <Crown className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Live Broadcast Preview */}
        {outgoingText.trim() && (
          <div className="px-3 py-2 bg-[#252526] border-t-2 border-[#1e1e1f] flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 truncate">
              <span className="text-[#888888] flex-shrink-0">Outbound Preview:</span>
              <span className={`px-1.5 py-0.2 text-[10px] font-heading uppercase border ${
                isSudo ? 'bg-[#4a1313] text-[#ff5555] border-[#ff5555]' : 'bg-[#0f2d4a] text-[#55ffff] border-[#55ffff]'
              }`}>
                {isSudo ? '[SUDO]' : '[ADMIN]'}
              </span>
              <div className="text-white truncate">
                <FormattedText text={outgoingText} />
              </div>
            </div>
            <span className="text-[10px] text-[#55ff55] font-heading flex-shrink-0 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> READY TO SEND
            </span>
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
          <div className={`px-2.5 py-1.5 border-2 border-[#141415] font-heading text-xs flex items-center gap-1.5 ${
            isSudo ? 'bg-[#3d1414] text-[#ff5555]' : 'bg-[#152336] text-[#55ffff]'
          }`}>
            {isSudo ? <Crown className="w-3.5 h-3.5 text-[#ffaa00]" /> : <Shield className="w-3.5 h-3.5" />}
            <span>[{isSudo ? 'SUDO CHAT' : 'ADMIN CHAT'}]</span>
          </div>
          <input
            type="text"
            placeholder={`Type message to broadcast to Minecraft server as ${isSudo ? 'Sudo' : 'Admin'} (supports &a, &c color codes)...`}
            value={outgoingText}
            onChange={(e) => setOutgoingText(e.target.value)}
            disabled={sending}
            className="form-input flex-1 text-xs"
          />
          <button
            type="submit"
            disabled={sending || !outgoingText.trim()}
            className={`button ${isSudo ? 'button-danger' : 'button-primary'} px-4 py-2 text-xs flex-shrink-0 flex items-center gap-1.5`}
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'SENDING...' : 'BROADCAST'}
          </button>
        </form>
      </div>
    </div>
  );
};
