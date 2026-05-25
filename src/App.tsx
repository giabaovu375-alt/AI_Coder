import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Chat from './pages/Chat';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const genId = () => crypto.randomUUID();

export default function App() {
  const [view, setView] = useState<'home' | 'chat'>('home');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Tải session từ localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai-sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        const restored = parsed.map((s: Session) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
        setSessions(restored);
      }
    } catch {}
  }, []);

  // Lưu session vào localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('ai-sessions', JSON.stringify(sessions));
    } else {
      localStorage.removeItem('ai-sessions');
    }
  }, [sessions]);

  const createSession = (firstMessage?: string) => {
    const newSession: Session = {
      id: genId(),
      title: firstMessage ? firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '') : 'Cuộc trò chuyện mới',
      messages: [],
      createdAt: new Date(),
    };
    setSessions(prev => [newSession, ...prev]);
    return newSession.id;
  };

  const updateSession = (sessionId: string, messages: Message[]) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? { ...s, messages, title: messages[0]?.role === 'user' ? messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? '...' : '') : s.title }
          : s
      )
    );
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  };

  const navigateToChat = (sessionId?: string) => {
    if (sessionId) {
      setActiveSessionId(sessionId);
    }
    setView('chat');
  };

  const navigateToHome = () => {
    setView('home');
    setActiveSessionId(null);
  };

  return view === 'home' ? (
    <Home
      sessions={sessions}
      onCreateSession={createSession}
      onNavigateChat={navigateToChat}
    />
  ) : (
    <Chat
      sessions={sessions}
      activeSessionId={activeSessionId}
      onCreateSession={createSession}
      onUpdateSession={updateSession}
      onDeleteSession={deleteSession}
      onBack={navigateToHome}
    />
  );
}
