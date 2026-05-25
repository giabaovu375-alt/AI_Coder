import { useState } from 'react';
import Home from './pages/Home';
import Chat from './pages/Chat';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'chat'>('home');

  const navigateToChat = () => setCurrentPage('chat');
  const navigateToHome = () => setCurrentPage('home');

  return currentPage === 'home' ? (
    <Home onNavigateChat={navigateToChat} />
  ) : (
    <Chat onBack={navigateToHome} />
  );
}
