"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getUser, clearAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

interface Event {
  id: number;
  event_type: "entry" | "exit";
  location_name: string;
  scanned_at: string;
}

type Tab = "scan" | "history" | "reports";
type Filter = "all" | "entry" | "exit" | "late" | "early_leave" | "overtime";

const WORK_START = "09:00";
const WORK_END = "18:00";

function getTimeStr(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function isLateEntry(iso: string) {
  const t = getTimeStr(iso);
  return t > WORK_START;
}

function isEarlyExit(iso: string) {
  const t = getTimeStr(iso);
  return t < WORK_END;
}

function isOvertime(iso: string) {
  const t = getTimeStr(iso);
  return t > WORK_END;
}

export default function MyHistoryPage() {
  const router = useRouter();
  const user = typeof window !== "undefined" ? getUser() : null;
  const [tab, setTab] = useState<Tab>("scan");
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(
    new Date(new Date().setDate(1)).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState<Filter>("all");

  // QR Scanner states
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<any>(null);

  // Email modal
  const [emailModal, setEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailFormat, setEmailFormat] = useState<"excel" | "pdf">("excel");
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => {
    if (tab === "history" || tab === "reports") {
      fetchHistory();
    }
  }, [fromDate, toDate, tab]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get("/me/history", {
        params: { from_date: fromDate, to_date: toDate, limit: 500 },
      });
      setEvents(res.data.items);
      setTotal(res.data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // ─── QR Scanner ────────────────────────────────────────
  const startCamera = async () => {
    try {
      setScanResult(null);
      setScanError("");
      setScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import("html5-qrcode");

      // Use the library's scanner
      const scanner = new Html5Qrcode("qr-reader-element");
      scannerRef.current = scanner;

      // Stop the manual stream since Html5Qrcode manages its own
      stopCamera();

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          // QR code scanned!
          await scanner.stop();
          scannerRef.current = null;
          setScanning(false);
          handleQRScanned(decodedText);
        },
        () => {
          // ignore scan failures
        }
      );
    } catch (err: any) {
      setScanError("Kamera erişimi reddedildi. Lütfen kamera iznini verin.");
      setScanning(false);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (scannerRef.current) {
      try {
        scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleQRScanned = async (url: string) => {
    setScanLoading(true);
    setScanError("");
    try {
      // URL format: https://giris.wygtr-internal.com/scan/TOKEN
      let token = url;
      const scanMatch = url.match(/\/scan\/(.+)$/);
      if (scanMatch) {
        token = scanMatch[1];
      }

      // Post scan with user's credentials
      if (!user) {
        setScanError("Giriş yapmanız gerekiyor");
        return;
      }

      const res = await api.post(`/scan/${token}`, {
        employee_code: user.employee_code,
        pin: "auto", // Auto-auth for logged-in users
      });

      setScanResult(res.data);

      // Refresh history after 2s
      setTimeout(() => fetchHistory(), 2000);
    } catch (err: any) {
      setScanError(err.response?.data?.detail || "QR kod okunamadı");
    } finally {
      setScanLoading(false);
    }
  };

  // ─── Filtered events ────────────────────────────────────
  const filteredEvents = events.filter((ev) => {
    switch (filter) {
      case "entry":
        return ev.event_type === "entry";
      case "exit":
        return ev.event_type === "exit";
      case "late":
        return ev.event_type === "entry" && isLateEntry(ev.scanned_at);
      case "early_leave":
        return ev.event_type === "exit" && isEarlyExit(ev.scanned_at);
      case "overtime":
        return ev.event_type === "exit" && isOvertime(ev.scanned_at);
      default:
        return true;
    }
  });

  // ─── Report summary stats ─────────────────────────────
  const stats = {
    totalEntries: events.filter((e) => e.event_type === "entry").length,
    totalExits: events.filter((e) => e.event_type === "exit").length,
    lateArrivals: events.filter((e) => e.event_type === "entry" && isLateEntry(e.scanned_at)).length,
    earlyDepartures: events.filter((e) => e.event_type === "exit" && isEarlyExit(e.scanned_at)).length,
    overtimeExits: events.filter((e) => e.event_type === "exit" && isOvertime(e.scanned_at)).length,
  };

  const handleExport = (format: "excel" | "pdf") => {
    const url = `/api/me/history/export?from_date=${fromDate}&to_date=${toDate}&format=${format}`;
    window.open(url, "_blank");
  };

  const handleSendEmail = async () => {
    const emails = emailInput.split(",").map((e) => e.trim()).filter(Boolean);
    if (!emails.length) return;
    setEmailSending(true);
    try {
      await api.post("/me/history/send-email", {
        emails,
        from_date: fromDate,
        to_date: toDate,
        format: emailFormat,
      });
      alert("E-posta gönderildi!");
      setEmailModal(false);
    } catch {
      alert("E-posta gönderilemedi");
    } finally {
      setEmailSending(false);
    }
  };

  const logout = () => {
    stopCamera();
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-primary-500 text-white px-4 pt-safe pb-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">FCT Takip</h1>
            <p className="text-blue-200 text-sm">{user?.full_name}</p>
          </div>
          <button onClick={logout} className="text-blue-200 text-sm underline">
            Çıkış
          </button>
        </div>
      </div>

      {/* ─── TAB: QR TARA ─────────────────────────────────── */}
      {tab === "scan" && (
        <div className="px-4 py-6">
          {/* Scan Result */}
          {scanResult && (
            <div
              className={`mb-6 rounded-2xl p-6 text-center text-white ${
                scanResult.event_type === "entry" ? "bg-green-500" : "bg-blue-500"
              }`}
            >
              <div className="text-6xl mb-3">
                {scanResult.event_type === "entry" ? "✓" : "←"}
              </div>
              <h2 className="text-3xl font-bold mb-1">
                {scanResult.event_type === "entry" ? "GİRİŞ" : "ÇIKIŞ"}
              </h2>
              <p className="text-xl">{scanResult.person_name}</p>
              <p className="text-lg opacity-90">{scanResult.location_name}</p>
              <p className="text-3xl font-bold mt-2">{scanResult.scanned_at}</p>
            </div>
          )}

          {/* Scan Error */}
          {scanError && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center">
              <p className="text-red-600 font-semibold">{scanError}</p>
            </div>
          )}

          {/* Scan Loading */}
          {scanLoading && (
            <div className="mb-6 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mx-auto mb-2" />
              <p className="text-gray-500">Kaydediliyor...</p>
            </div>
          )}

          {/* QR Reader Element (html5-qrcode mounts here) */}
          <div id="qr-reader-element" className={scanning ? "mb-4 rounded-2xl overflow-hidden" : "hidden"} />

          {/* Hidden video element */}
          <video ref={videoRef} className="hidden" playsInline muted />

          {/* Scan Button */}
          {!scanning ? (
            <button
              onClick={startCamera}
              className="w-full bg-primary-500 text-white py-6 rounded-2xl text-xl font-bold active:scale-95 transition-transform shadow-lg"
            >
              <span className="text-4xl block mb-2">📷</span>
              QR Kod Tara
              <span className="block text-sm font-normal opacity-80 mt-1">
                Giriş veya Çıkış kaydet
              </span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="w-full bg-red-500 text-white py-4 rounded-2xl text-lg font-bold"
            >
              Taramayı İptal Et
            </button>
          )}

          {/* Quick info */}
          <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-700 mb-3">Nasıl Çalışır?</h3>
            <div className="space-y-3 text-sm text-gray-500">
              <div className="flex gap-3">
                <span className="text-lg">1️⃣</span>
                <p>"QR Kod Tara" butonuna basın</p>
              </div>
              <div className="flex gap-3">
                <span className="text-lg">2️⃣</span>
                <p>Kamerayı duvardaki QR koda tutun</p>
              </div>
              <div className="flex gap-3">
                <span className="text-lg">3️⃣</span>
                <p>Otomatik olarak giriş veya çıkış kaydedilir</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: GEÇMİŞ ──────────────────────────────────── */}
      {tab === "history" && (
        <div>
          {/* Date filters */}
          <div className="bg-white px-4 py-3 shadow-sm">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Başlangıç</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Bitiş</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {([
                { key: "all", label: "Tümü" },
                { key: "entry", label: "Girişler" },
                { key: "exit", label: "Çıkışlar" },
                { key: "late", label: "Geç Girişler" },
                { key: "early_leave", label: "Erken Çıkışlar" },
                { key: "overtime", label: "Mesai" },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    filter === f.key
                      ? "bg-primary-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Export buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleExport("excel")}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-semibold"
              >
                Excel
              </button>
              <button
                onClick={() => handleExport("pdf")}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-semibold"
              >
                PDF
              </button>
              <button
                onClick={() => setEmailModal(true)}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold"
              >
                E-posta
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="px-4 py-3">
            <p className="text-sm text-gray-500">
              {filter === "all" ? "Toplam" : "Filtreli"}{" "}
              <span className="font-bold text-gray-800">{filteredEvents.length}</span> kayıt
            </p>
          </div>

          {/* Events list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p>Kayıt bulunamadı</p>
            </div>
          ) : (
            <div className="px-4 space-y-2">
              {filteredEvents.map((ev) => {
                const late = ev.event_type === "entry" && isLateEntry(ev.scanned_at);
                const early = ev.event_type === "exit" && isEarlyExit(ev.scanned_at);
                const ot = ev.event_type === "exit" && isOvertime(ev.scanned_at);
                return (
                  <div
                    key={ev.id}
                    className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 border-l-4 ${
                      ev.event_type === "entry"
                        ? late
                          ? "border-orange-500"
                          : "border-green-500"
                        : early
                        ? "border-red-500"
                        : ot
                        ? "border-purple-500"
                        : "border-blue-500"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${
                        ev.event_type === "entry"
                          ? late
                            ? "bg-orange-500"
                            : "bg-green-500"
                          : early
                          ? "bg-red-500"
                          : ot
                          ? "bg-purple-500"
                          : "bg-blue-500"
                      }`}
                    >
                      {ev.event_type === "entry" ? "→" : "←"}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        {ev.event_type === "entry" ? "Giriş" : "Çıkış"}
                        {late && (
                          <span className="text-orange-500 text-xs ml-2 font-medium">GEÇ</span>
                        )}
                        {early && (
                          <span className="text-red-500 text-xs ml-2 font-medium">ERKEN</span>
                        )}
                        {ot && (
                          <span className="text-purple-500 text-xs ml-2 font-medium">MESAİ</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">{ev.location_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">
                        {formatDateTime(ev.scanned_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: RAPORLAR ─────────────────────────────────── */}
      {tab === "reports" && (
        <div className="px-4 py-4">
          {/* Date range */}
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Başlangıç</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Bitiş</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
            </div>
          ) : (
            <>
              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div
                  className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center cursor-pointer active:scale-95 transition-transform"
                  onClick={() => { setTab("history"); setFilter("entry"); }}
                >
                  <p className="text-3xl font-bold text-green-600">{stats.totalEntries}</p>
                  <p className="text-sm text-green-700 mt-1">Toplam Giriş</p>
                </div>
                <div
                  className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center cursor-pointer active:scale-95 transition-transform"
                  onClick={() => { setTab("history"); setFilter("exit"); }}
                >
                  <p className="text-3xl font-bold text-blue-600">{stats.totalExits}</p>
                  <p className="text-sm text-blue-700 mt-1">Toplam Çıkış</p>
                </div>
                <div
                  className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center cursor-pointer active:scale-95 transition-transform"
                  onClick={() => { setTab("history"); setFilter("late"); }}
                >
                  <p className="text-3xl font-bold text-orange-600">{stats.lateArrivals}</p>
                  <p className="text-sm text-orange-700 mt-1">Geç Giriş</p>
                  <p className="text-xs text-orange-400 mt-0.5">{WORK_START} sonrası</p>
                </div>
                <div
                  className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center cursor-pointer active:scale-95 transition-transform"
                  onClick={() => { setTab("history"); setFilter("early_leave"); }}
                >
                  <p className="text-3xl font-bold text-red-600">{stats.earlyDepartures}</p>
                  <p className="text-sm text-red-700 mt-1">Erken Çıkış</p>
                  <p className="text-xs text-red-400 mt-0.5">{WORK_END} öncesi</p>
                </div>
              </div>

              <div
                className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center cursor-pointer active:scale-95 transition-transform mb-4"
                onClick={() => { setTab("history"); setFilter("overtime"); }}
              >
                <p className="text-3xl font-bold text-purple-600">{stats.overtimeExits}</p>
                <p className="text-sm text-purple-700 mt-1">Mesai (Geç Çıkış)</p>
                <p className="text-xs text-purple-400 mt-0.5">{WORK_END} sonrası</p>
              </div>

              {/* Work schedule info */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-3">Çalışma Saatleri</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Mesai Başlangıç</p>
                    <p className="font-bold text-gray-700">{WORK_START}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Öğle Arası</p>
                    <p className="font-bold text-gray-700">12:00 - 13:30</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Mesai Bitiş</p>
                    <p className="font-bold text-gray-700">{WORK_END}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs">Toplam Kayıt</p>
                    <p className="font-bold text-gray-700">{total}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Bottom Tab Bar ────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
        <div className="flex">
          <button
            onClick={() => setTab("scan")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 ${
              tab === "scan" ? "text-primary-500" : "text-gray-400"
            }`}
          >
            <span className="text-2xl">📷</span>
            <span className="text-xs font-semibold">QR Tara</span>
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 ${
              tab === "history" ? "text-primary-500" : "text-gray-400"
            }`}
          >
            <span className="text-2xl">📋</span>
            <span className="text-xs font-semibold">Geçmişim</span>
          </button>
          <button
            onClick={() => setTab("reports")}
            className={`flex-1 py-3 flex flex-col items-center gap-1 ${
              tab === "reports" ? "text-primary-500" : "text-gray-400"
            }`}
          >
            <span className="text-2xl">📊</span>
            <span className="text-xs font-semibold">Raporlar</span>
          </button>
        </div>
      </div>

      {/* Email modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-6">
            <h3 className="text-lg font-bold mb-4">E-posta ile Gönder</h3>
            <div className="mb-3">
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                E-posta adresleri (virgülle ayırın)
              </label>
              <input
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="ornek@sirket.com, diger@sirket.com"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 mb-4">
              {(["excel", "pdf"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setEmailFormat(f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                    emailFormat === f
                      ? "bg-primary-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEmailModal(false)}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600"
              >
                İptal
              </button>
              <button
                onClick={handleSendEmail}
                disabled={emailSending}
                className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {emailSending ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
