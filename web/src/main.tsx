import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Note: StrictMode disabled to prevent WebSocket connection issues on slower devices
// (iPad Safari had issues with double-invoked effects closing connecting WebSockets)
createRoot(document.getElementById('root')!).render(<App />);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // SW registration failed, app still works
  });
}
