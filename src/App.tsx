import { useState } from 'react';
import Home from './pages/Home';
import Chat from './pages/Chat';
import ProductDetail from './pages/ProductDetail';

type View = { name: 'home' } | { name: 'chat' } | { name: 'product'; id: string };

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' });

  const navigateToChat = () => setView({ name: 'chat' });
  const navigateToProduct = (id: string) => setView({ name: 'product', id });
  const navigateToHome = () => setView({ name: 'home' });

  switch (view.name) {
    case 'home':
      return <Home onNavigateChat={navigateToChat} onNavigateProduct={navigateToProduct} />;
    case 'chat':
      return <Chat onBack={navigateToHome} />;
    case 'product':
      return <ProductDetail id={view.id} onBack={navigateToHome} />;
    default:
      return <Home onNavigateChat={navigateToChat} onNavigateProduct={navigateToProduct} />;
  }
}
