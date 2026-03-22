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
  const [showIOSGuide, setShowIOSGuide] = useState(false);

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

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt (Chrome/Edge/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);

      // Show banner after 3 seconds
      setTimeout(() => {
        const dismissed = localStorage.getItem("pwa-banner-dismissed");
        if (!dismissed) {
          setShowBanner(true);
        }
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if iOS Safari (doesn't have beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setTimeout(() => {
        const dismissed = localStorage.getItem("pwa-banner-dismissed");
        if (!dismissed) {
          setShowIOSGuide(true);
          setShowBanner(true);
        }
      }, 3000);
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
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="bg-white border-t-2 border-primary-500 shadow-2xl rounded-t-2xl mx-2 mb-0 p-4">
        <div className="flex items-start gap-3">
          {/* App Icon */}
          <div className="w-14 h-14 bg-[#1E3A5F] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white font-bold text-lg">FCT</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-base">FCT Takip Uygulamasi</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {showIOSGuide
                ? 'Ana ekrana eklemek icin: Paylas simgesi → "Ana Ekrana Ekle"'
                : "Ana ekrana ekleyerek hizli erisim saglayin"}
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 text-xl p-1"
          >
            x
          </button>
        </div>

        {!showIOSGuide && (
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
              Yukle
            </button>
          </div>
        )}

        {showIOSGuide && (
          <div className="mt-3 bg-blue-50 rounded-xl p-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="text-center">
                <span className="text-2xl">1.</span>
                <p className="text-xs text-gray-500">Alt bardaki</p>
                <span className="text-2xl">&#x2B06;&#xFE0E;</span>
              </div>
              <span className="text-gray-300 text-xl">→</span>
              <div className="text-center">
                <span className="text-2xl">2.</span>
                <p className="text-xs text-gray-500">Menuden</p>
                <span className="text-lg font-bold">+</span>
              </div>
              <span className="text-gray-300 text-xl">→</span>
              <div className="text-center">
                <span className="text-2xl">3.</span>
                <p className="text-xs text-gray-500">Onayla</p>
                <span className="text-lg">Ana Ekran</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
