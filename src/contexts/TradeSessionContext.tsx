import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

declare global {
  interface Window { io: typeof import('socket.io-client').io }
}
const io = window.io;

export type SessionItem = { code: string; type: 'card' | 'currency'; qty?: number };
export type Participant = { id: string; name?: string };
export type TradeSession = {
  id: string;
  status: 'open' | 'review' | 'confirmed' | 'finalized';
  participants: { a: Participant | string; b: Participant | string };
  items: { a: SessionItem[]; b: SessionItem[] };
  confirmations: { a: boolean; b: boolean };
  mfa?: { a: string; b: string; }; // Add MFA codes to the session type
};

interface TradeSessionContextType {
  sessionsById: Record<string, TradeSession>;
  currentSessionId: string | null;
  setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>; // Expose the setter
  startSession: (command: string, targetUserId?: string) => Promise<string>;
  addItems: (sessionId: string, items: SessionItem[]) => Promise<void>;
  confirm: (sessionId: string) => Promise<void>;
  finalize: (sessionId: string, mfaA: string, mfaB: string) => Promise<void>;
  getSession: (sessionId: string) => TradeSession | undefined;
  isLoading: boolean;
  mfaCodeForYou: string | null; // Expose MFA code for the current user
}

const TradeSessionContext = createContext<TradeSessionContextType | undefined>(undefined);
export const useTradeSession = () => {
  const ctx = useContext(TradeSessionContext);
  if (!ctx) throw new Error('useTradeSession must be used within TradeSessionProvider');
  return ctx;
};

export const TradeSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [sessionsById, setSessionsById] = useState<Record<string, TradeSession>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mfaCodeForYou, setMfaCodeForYou] = useState<string | null>(null); // Initialize mfaCodeForYou
  const socketRef = useRef<WebSocket | null>(null); // Use WebSocket type

  // Establish a socket connection
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('serviceswap_token');
    const s = io('http://localhost:5000', { auth: { token }, transports: ['websocket'] });
    socketRef.current = s;

    s.on('trade_session_opened', ({ id }: { id: string }) => {
      setCurrentSessionId(id);
      setSessionsById(prev => ({
        ...prev,
        [id]: prev[id] || { id, status: 'open', participants: { a: '', b: '' }, items: { a: [], b: [] }, confirmations: { a: false, b: false } }
      }));
    });
    s.on('trade_session_items_updated', ({ id }: { id: string }) => {
      setSessionsById(prev => ({ ...prev, [id]: { ...(prev[id] || { id, status: 'review', participants: { a: '', b: '' }, items: { a: [], b: [] }, confirmations: { a: false, b: false } }) } }));
    });
    s.on('trade_session_confirmed', ({ id }: { id: string }) => {
      setSessionsById(prev => ({ ...prev, [id]: { ...(prev[id] || { id, status: 'confirmed', participants: { a: '', b: '' }, items: { a: [], b: [] }, confirmations: { a: true, b: true } }) } }));
    });
    s.on('trade_session_finalized', ({ id }: { id: string }) => {
      setSessionsById(prev => ({ ...prev, [id]: { ...(prev[id] || { id, status: 'finalized', participants: { a: '', b: '' }, items: { a: [], b: [] }, confirmations: { a: true, b: true } }) } }));
    });

    return () => { s.disconnect(); };
  }, [isAuthenticated]);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('serviceswap_token');
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }, [isAuthenticated]);

  const startSession = async (command: string, targetUserId?: string): Promise<string> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/trade-sessions', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ command, targetUserId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to start session');
      }
      const data = await res.json();
      const id = data.id as string;
      setCurrentSessionId(id);
      setSessionsById(prev => ({ ...prev, [id]: {
        id,
        status: data.status,
        participants: data.participants,
        items: { a: [], b: [] },
        confirmations: { a: false, b: false },
        mfa: { a: data.mfaCodeForYou, b: '' }, // Store mfaCodeForYou
      }}));
      setMfaCodeForYou(data.mfaCodeForYou); // Set mfaCodeForYou in state
      return id;
    } finally {
      setIsLoading(false);
    }
  };

  const addItems = async (sessionId: string, items: SessionItem[]) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trade-sessions/${sessionId}/items`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add items');
      }
      const data = await res.json();
      setSessionsById(prev => ({ ...prev, [sessionId]: {
        id: data.id,
        status: data.status,
        participants: data.participants || (prev[sessionId]?.participants ?? { a: '', b: '' }),
        items: data.items,
        confirmations: prev[sessionId]?.confirmations ?? { a: false, b: false },
      }}));
    } finally {
      setIsLoading(false);
    }
  };

  const confirm = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trade-sessions/${sessionId}/confirm`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to confirm');
      }
      const data = await res.json();
      setSessionsById(prev => ({ ...prev, [sessionId]: {
        id: data.id,
        status: data.status,
        participants: prev[sessionId]?.participants ?? { a: '', b: '' },
        items: prev[sessionId]?.items ?? { a: [], b: [] },
        confirmations: data.confirmations,
      }}));
    } finally {
      setIsLoading(false);
    }
  };

  const finalize = async (sessionId: string, mfaA: string, mfaB: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trade-sessions/${sessionId}/finalize`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ mfaA, mfaB }),
      });
      if (!res.ok) {
        let backend: { error?: string } = {};
        try { backend = await res.json(); } catch (e: unknown) { /* ignore parsing errors */ }
        const raw = backend?.error || 'Failed to finalize';
        let message = raw;
        switch (res.status) {
          case 400:
            message = backend?.error || 'Session not ready or already finalized. Ensure both sides confirmed.';
            break;
          case 401:
            message = 'Your session expired. Please log in again.';
            break;
          case 403:
            if (backend?.error === 'Invalid MFA codes') {
              message = 'MFA codes are incorrect. Verify and try again.';
            } else {
              message = 'You are not a participant in this session.';
            }
            break;
          case 404:
            message = 'Trade session not found.';
            break;
          default:
            message = raw;
        }
        throw new Error(message);
      }
      const data = await res.json();
      setSessionsById(prev => ({ ...prev, [sessionId]: {
        id: data.id,
        status: data.status,
        participants: prev[sessionId]?.participants ?? { a: '', b: '' },
        items: prev[sessionId]?.items ?? { a: [], b: [] },
        confirmations: prev[sessionId]?.confirmations ?? { a: true, b: true },
      }}));
    } finally {
      setIsLoading(false);
    }
  };

  const getSession = (sessionId: string) => sessionsById[sessionId];

  return (
    <TradeSessionContext.Provider value={{ sessionsById, currentSessionId, setCurrentSessionId, startSession, addItems, confirm, finalize, getSession, isLoading, mfaCodeForYou }}>
      {children}
    </TradeSessionContext.Provider>
  );
};