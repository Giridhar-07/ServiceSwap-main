import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChat } from '@/contexts/ChatContext';

interface ChatPanelProps {
  sessionId: string;
}

/**
 * ChatPanel shows real-time messages for a trade session and lets the user send messages.
 * It displays connection status and handles message list auto-scroll.
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({ sessionId }) => {
  const { messagesBySession, joinSession, sendMessage, markRead, isConnected, connectionError } = useChat();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  const messages = useMemo(() => messagesBySession[sessionId] || [], [messagesBySession, sessionId]);

  useEffect(() => {
    joinSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    // auto-scroll to bottom on new messages
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const onSend = async () => {
    if (!text.trim()) return;
    await sendMessage(sessionId, text.trim());
    setText('');
  };

  const onMarkAllRead = async () => {
    await markRead(sessionId);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Trade Chat</CardTitle>
        <Button variant="outline" size="sm" onClick={onMarkAllRead}>Mark all read</Button>
      </CardHeader>
      <CardContent>
        {!isConnected && (
          <div className="mb-2 p-2 text-xs rounded bg-yellow-100 text-yellow-900">
            {connectionError ? `Connection issue: ${connectionError}` : 'Connecting... If this persists, chat will still load via history.'}
          </div>
        )}
        <div ref={listRef} className="h-64 overflow-y-auto border rounded p-2 space-y-2 bg-muted/30">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground">No messages yet. Say hi!</div>
          )}
          {messages.map(m => (
            <div key={m.id} className="text-sm">
              <div className="font-medium">{m.senderId}</div>
              <div className="text-foreground">
                {m.content || (m.ciphertext ? '[encrypted]' : '') || (m.contentEnc ? '[secured]' : '')}
              </div>
              <div className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input value={text} onChange={e => setText(e.target.value)} placeholder="Type message" />
          <Button onClick={onSend}>Send</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatPanel;