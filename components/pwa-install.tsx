"use client";
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("SW registered:", reg.scope);
        })
        .catch((err) => {
          console.log("SW registration failed:", err);
        });
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS navigator.standalone (Safari PWA)
    if ((navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt (Chrome/Edge/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if iOS Safari
    const iosCheck = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (iosCheck) {
      setIsIOS(true);
      // Always show on iOS since there's no beforeinstallprompt
      const dismissed = localStorage.getItem("pwa-ios-dismissed");
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      // Show again after 24 hours
      if (Date.now() - dismissedTime > 24 * 60 * 60 * 1000) {
        setTimeout(() => setShowBanner(true), 2000);
      }
    }

    // If not iOS and no prompt received, show banner after 5s anyway
    if (!iosCheck) {
      setTimeout(() => {
        const dismissed = localStorage.getItem("pwa-banner-dismissed");
        const dismissedTime = dismissed ? parseInt(dismissed) : 0;
        if (Date.now() - dismissedTime > 24 * 60 * 60 * 1000) {
          setShowBanner(true);
        }
      }, 5000);
    }

    // Detect app installed
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowBanner(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(isIOS ? "pwa-ios-dismissed" : "pwa-banner-dismissed", Date.now().toString());
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] animate-slide-up">
      <div className="bg-white border-t-2 border-primary-500 shadow-2xl rounded-t-2xl mx-2 mb-0 p-4">
        <div className="flex items-start gap-3">
          {/* App Icon */}
          <div className="w-14 h-14 bg-[#1E3A5F] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white font-bold text-lg">FCT</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-base">FCT Takip Uygulamasi</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {isIOS
                ? 'Ana ekrana eklemek icin asagidaki adimlari takip edin'
                : "Ana ekrana ekleyerek hizli erisim saglayin"}
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 text-xl p-1 -mt-1"
          >
            x
          </button>
        </div>

        {/* Android/Chrome - Install button */}
        {!isIOS && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-500 border-2 border-gray-200 rounded-xl"
            >
              Daha Sonra
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-2.5 text-sm font-bold text-white bg-primary-500 rounded-xl shadow-md active:scale-95 transition-transform"
            >
              Ana Ekrana Ekle
            </button>
          </div>
        )}

        {/* iOS Guide */}
        {isIOS && (
          <div className="mt-3 bg-blue-50 rounded-xl p-4">
            <div className="flex items-center justify-around text-center">
              <div>
                <div className="text-3xl mb-1">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                </div>
                <p className="text-xs text-blue-700 font-semibold">1. Paylas</p>
              </div>
              <div className="text-blue-300 text-2xl">→</div>
              <div>
                <div className="text-3xl mb-1">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                </div>
                <p className="text-xs text-blue-700 font-semibold">2. Ana Ekrana Ekle</p>
              </div>
              <div className="text-blue-300 text-2xl">→</div>
              <div>
                <div className="text-3xl mb-1">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-xs text-green-700 font-semibold">3. Ekle</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
