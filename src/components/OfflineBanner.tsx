import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const goOffline = () => { setOffline(true); setRestored(false); };
    const goOnline = () => { setOffline(false); setRestored(true); setTimeout(() => setRestored(false), 3000); };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  if (offline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200] bg-[#7c2d12] text-[#fca5a5] px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" /> No internet connection — changes may not save.
      </div>
    );
  }
  if (restored) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200] bg-[#14532d] text-[#86efac] px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 animate-in fade-in">
        <Wifi className="h-4 w-4" /> ✓ Connection restored
      </div>
    );
  }
  return null;
}
