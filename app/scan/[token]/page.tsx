"use client";
import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getScanIdentity, saveScanIdentity } from "@/lib/auth";

type State = "loading" | "identify" | "confirming" | "success" | "error";

interface ScanResult {
  event_type: "entry" | "exit";
  person_name: string;
  location_name: string;
  scanned_at: string;
  message: string;
}

interface LocationInfo {
  location_name: string;
  location_code: string;
}

export default function ScanPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>("loading");
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [pin, setPin] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const [guestCode, setGuestCode] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await axios.get(`/api/scan/${token}`);
        setLocation(res.data);

        // Check cached identity
        const cached = getScanIdentity();
        if (cached) {
          setEmployeeCode(cached.employeeCode);
          setState("identify");
        } else {
          setState("identify");
        }
      } catch {
        setError("Geçersiz veya süresi dolmuş QR kod");
        setState("error");
      }
    };
    init();
  }, [token]);

  const handleScan = async () => {
    setState("confirming");
    try {
      const body = isGuest
        ? { guest_code: guestCode, access_code: accessCode }
        : { employee_code: employeeCode, pin };

      const res = await axios.post(`/api/scan/${token}`, body);
      setResult(res.data);

      if (!isGuest) {
        saveScanIdentity(employeeCode);
      }
      setState("success");

      // Auto-fade after 5s
      setTimeout(() => {
        setState("identify");
        setPin("");
        setResult(null);
      }, 5000);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Bir hata oluştu";
      setError(msg);
      setState("error");
      setTimeout(() => {
        setState("identify");
        setError("");
        setPin("");
      }, 4000);
    }
  };

  // Loading state
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-primary-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4" />
          <p className="text-lg font-medium">QR Kod doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (state === "success" && result) {
    const isEntry = result.event_type === "entry";
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isEntry ? "bg-green-500" : "bg-blue-500"}`}>
        {(result as any).auto_exit_from && (
          <div className="bg-white/20 rounded-xl px-6 py-3 mb-4">
            <p className="text-white text-lg font-medium">
              ← {(result as any).auto_exit_from} otomatik cikis
            </p>
          </div>
        )}
        <div className="text-center text-white px-6 animate-fade-in">
          <div className="text-8xl mb-6">{isEntry ? "✓" : "←"}</div>
          <h1 className="text-4xl font-bold mb-2">{isEntry ? "GİRİŞ" : "ÇIKIŞ"}</h1>
          <p className="text-2xl font-medium mb-1">{result.person_name}</p>
          <p className="text-xl opacity-90 mb-2">{result.location_name}</p>
          <p className="text-lg opacity-80 mb-4">{result.message}</p>
          <p className="text-5xl font-bold">{result.scanned_at}</p>
          <p className="text-sm opacity-75 mt-6">5 saniye sonra kapanacak...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="min-h-screen bg-red-500 flex items-center justify-center">
        <div className="text-center text-white px-6">
          <div className="text-7xl mb-6">✗</div>
          <h1 className="text-3xl font-bold mb-3">Hata</h1>
          <p className="text-xl">{error}</p>
          <p className="text-sm opacity-75 mt-4">4 saniye sonra yenilenecek...</p>
        </div>
      </div>
    );
  }

  // Confirming state
  if (state === "confirming") {
    return (
      <div className="min-h-screen bg-primary-500 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4" />
          <p className="text-xl font-medium">Kaydediliyor...</p>
        </div>
      </div>
    );
  }

  // Identify state (main form)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-primary-500 text-white px-4 py-5 shadow-md">
        <h1 className="text-xl font-bold text-center">FCT Giriş/Çıkış</h1>
        {location && (
          <p className="text-center text-blue-200 text-sm mt-1">{location.location_name}</p>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
          {/* Toggle employee / guest */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              onClick={() => setIsGuest(false)}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                !isGuest ? "bg-primary-500 text-white shadow" : "text-gray-600"
              }`}
            >
              Çalışan
            </button>
            <button
              onClick={() => setIsGuest(true)}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                isGuest ? "bg-primary-500 text-white shadow" : "text-gray-600"
              }`}
            >
              Misafir
            </button>
          </div>

          {!isGuest ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Çalışan Kodu
                </label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                  placeholder="EMP001"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-lg text-center font-mono uppercase focus:border-primary-500 focus:outline-none"
                  autoCapitalize="characters"
                  onKeyDown={(e) => e.key === "Enter" && pinRef.current?.focus()}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  PIN
                </label>
                <input
                  ref={pinRef}
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="••••"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-2xl text-center tracking-[0.5em] focus:border-primary-500 focus:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Misafir Kodu
                </label>
                <input
                  type="text"
                  value={guestCode}
                  onChange={(e) => setGuestCode(e.target.value.toUpperCase())}
                  placeholder="GSTXXXXXX"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-lg text-center font-mono uppercase focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Erişim Kodu
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-lg text-center font-mono uppercase focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleScan}
            disabled={
              !isGuest
                ? !employeeCode.trim() || !pin.trim()
                : !guestCode.trim() || !accessCode.trim()
            }
            className="w-full mt-6 bg-primary-500 text-white py-5 rounded-xl text-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            Giriş / Çıkış Yap
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 pb-6">FCT Giriş/Çıkış Takip Sistemi</p>
    </div>
  );
}
