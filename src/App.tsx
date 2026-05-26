import { useState } from 'react';
import Home from './pages/Home';
import Chat from './pages/Chat';

export default function App() {
  const [mode, setMode] = useState<'home' | 'chat'>('home');
  const [initialMessage, setInitialMessage] = useState('');

  if (mode === 'chat') {
    return <ChatPage onBack={() => setMode('home')} initialMessage={initialMessage} />;
  }

  return (
    <HomePage
      onStartChat={(msg: string) => {
        setInitialMessage(msg);
        setMode('chat');
      }}
    />
  );
}
