"use client";
import { useState, useEffect } from "react";
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

export default function MyHistoryPage() {
  const router = useRouter();
  const user = typeof window !== "undefined" ? getUser() : null;
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(
    new Date(new Date().setDate(1)).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [emailModal, setEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailFormat, setEmailFormat] = useState<"excel" | "pdf">("excel");
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => {
    // DEV MODE: auth kontrolü atlanıyor
    fetchHistory();
  }, [fromDate, toDate]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get("/me/history", {
        params: { from_date: fromDate, to_date: toDate, limit: 200 },
      });
      setEvents(res.data.items);
      setTotal(res.data.total);
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
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
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-primary-500 text-white px-4 pt-safe pb-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Giriş/Çıkış Geçmişim</h1>
            <p className="text-blue-200 text-sm">{user?.full_name}</p>
          </div>
          <button onClick={logout} className="text-blue-200 text-sm underline">
            Çıkış
          </button>
        </div>
      </div>

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

        {/* Export buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handleExport("excel")}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold"
          >
            Excel İndir
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold"
          >
            PDF İndir
          </button>
          <button
            onClick={() => setEmailModal(true)}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold"
          >
            E-posta
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3">
        <p className="text-sm text-gray-500">
          Toplam <span className="font-bold text-gray-800">{total}</span> kayıt
        </p>
      </div>

      {/* Events list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>Bu tarih aralığında kayıt bulunamadı</p>
        </div>
      ) : (
        <div className="px-4 space-y-2 mt-2">
          {events.map((ev) => (
            <div
              key={ev.id}
              className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 border-l-4 ${
                ev.event_type === "entry" ? "border-green-500" : "border-blue-500"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${
                  ev.event_type === "entry" ? "bg-green-500" : "bg-blue-500"
                }`}
              >
                {ev.event_type === "entry" ? "→" : "←"}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">
                  {ev.event_type === "entry" ? "Giriş" : "Çıkış"}
                </p>
                <p className="text-sm text-gray-500">{ev.location_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">
                  {formatDateTime(ev.scanned_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

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
