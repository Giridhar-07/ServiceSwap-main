import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

declare global {
  interface Window { io: typeof import('socket.io-client').io }
}
const io = window.io;

export type ChatMessage = {
  id: string;
  sessionId: string;
  senderId: string;
  content?: string | null;
  contentEnc?: string | null;
  ciphertext?: string | null;
  attachments?: { url: string; name?: string; size?: number; mime?: string }[];
  readBy: string[];
  createdAt: string;
};

type ChatContextType = {
  messagesBySession: Record<string, ChatMessage[]>;
  typingBySession: Record<string, Record<string, boolean>>; // sessionId -> userId -> typing
  joinSession: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, content: string) => Promise<void>;
  sendCiphertext: (sessionId: string, ciphertext: string) => Promise<void>;
  markRead: (sessionId: string, messageId?: string) => Promise<void>;
  isConnected: boolean;
  connectionError?: string | null;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};

/**
 * ChatProvider manages real-time chat via Socket.IO and REST fallbacks.
 * It validates connection, handles reconnection, and exposes chat operations.
 */
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [messagesBySession, setMessagesBySession] = useState<Record<string, ChatMessage[]>>({});
  const [typingBySession, setTypingBySession] = useState<Record<string, Record<string, boolean>>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const joinedSessionsRef = useRef<Set<string>>(new Set());

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('serviceswap_token');
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('serviceswap_token');
    const s = io('http://localhost:5000', { auth: { token }, transports: ['websocket'] });
    socketRef.current = s;
    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));
    s.on('connect_error', (err: any) => {
      const msg = err?.message || 'Could not establish connection';
      setConnectionError(msg);
      setIsConnected(false);
      // No crash; UI can continue with REST-only chat history.
    });
    s.on('error', (err: any) => {
      const msg = err?.message || 'Socket error';
      setConnectionError(msg);
    });

    s.on('chat:message', (evt: any) => {
      const { _id, session, sender, content, contentEnc, ciphertext, attachments, createdAt } = evt || {};
      const msg: ChatMessage = {
        id: _id,
        sessionId: session,
        senderId: sender,
        content: content || null,
        contentEnc: contentEnc || null,
        ciphertext: ciphertext || null,
        attachments: attachments || [],
        readBy: [],
        createdAt
      };
      setMessagesBySession(prev => ({
        ...prev,
        [msg.sessionId]: [...(prev[msg.sessionId] || []), msg]
      }));
    });

    s.on('chat:typing', ({ sessionId, userId, isTyping }: any) => {
      setTypingBySession(prev => ({
        ...prev,
        [sessionId]: { ...(prev[sessionId] || {}), [userId]: !!isTyping }
      }));
    });

    s.on('chat:read', ({ sessionId, messageId, by }: any) => {
      setMessagesBySession(prev => ({
        ...prev,
        [sessionId]: (prev[sessionId] || []).map(m => {
          if (!messageId || m.id === messageId) {
            const already = m.readBy.includes(by);
            return { ...m, readBy: already ? m.readBy : [...m.readBy, by] };
          }
          return m;
        })
      }));
    });

    // Auto-join sessions when opened via trades
    s.on('trade_session_opened', ({ id }: any) => {
      joinSession(id);
    });

    // Rejoin previously joined sessions on reconnect
    s.on('connect', () => {
      for (const sid of joinedSessionsRef.current) {
        s.emit('join_session', { sessionId: sid });
      }
    });

    return () => { s.disconnect(); };
  }, [isAuthenticated]);

  /**
   * Join a chat session room and fetch its message history.
   * Guards against invalid session ids and handles backend errors.
   */
  const joinSession = async (sessionId: string) => {
    if (!sessionId) return;
    joinedSessionsRef.current.add(sessionId);
    socketRef.current?.emit('join_session', { sessionId });
    try {
      const res = await axios.get(`/api/trade-sessions/${sessionId}/messages`, { headers: authHeaders });
      const list: ChatMessage[] = (res.data || []).map((m: any) => ({
        id: m._id,
        sessionId: m.session,
        senderId: m.sender,
        content: m.content,
        contentEnc: m.contentEnc,
        ciphertext: m.ciphertext,
        attachments: m.attachments,
        readBy: m.readBy || [],
        createdAt: m.createdAt
      }));
      setMessagesBySession(prev => ({ ...prev, [sessionId]: list }));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load messages';
      console.error('[ChatContext:joinSession:error]', msg);
      setMessagesBySession(prev => ({ ...prev, [sessionId]: prev[sessionId] || [] }));
    }
  };

  const sendMessage = async (sessionId: string, content: string) => {
    if (!content.trim()) return;
    // Prefer socket for instant send; backend persists it
    socketRef.current?.emit('chat:message', { sessionId, content });
  };

  const sendCiphertext = async (sessionId: string, ciphertext: string) => {
    if (!ciphertext) return;
    socketRef.current?.emit('chat:message', { sessionId, ciphertext });
  };

  const markRead = async (sessionId: string, messageId?: string) => {
    socketRef.current?.emit('chat:read', { sessionId, messageId });
    await axios.post(`/api/trade-sessions/${sessionId}/read`, { messageId }, { headers: authHeaders });
  };

  const value: ChatContextType = {
    messagesBySession,
    typingBySession,
    joinSession,
    sendMessage,
    sendCiphertext,
    markRead,
    isConnected,
    connectionError
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};