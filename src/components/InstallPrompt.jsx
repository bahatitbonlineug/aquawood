import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone, Monitor } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem('aquawood-install-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after a delay
      setTimeout(() => setShow(true), 3000);
      return;
    }

    // Android / Desktop — listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setShow(false); setInstalled(true); });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('aquawood-install-dismissed', Date.now().toString());
  };

  if (!show || installed) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[9999] animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699fd59568d76f4dc3bcc93b/a9193cd52_logo.jpg"
            alt="AQUAWOOD"
            className="h-12 w-12 rounded-xl object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Install AQUAWOOD</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isIOS
                ? 'Tap the Share button then "Add to Home Screen"'
                : 'Install for offline access, faster loading & home screen shortcut'}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <Smartphone className="h-3 w-3 text-muted-foreground" />
              <Monitor className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Android · iOS · Desktop</span>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        {!isIOS && (
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="flex-1 gap-2 h-8 text-xs" onClick={handleInstall}>
              <Download className="h-3.5 w-3.5" />
              Install App
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}