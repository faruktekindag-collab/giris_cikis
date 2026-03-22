"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";

interface Location {
  id: number;
  location_code: string;
  name: string;
  description?: string;
  is_active: boolean;
  active_qr_count: number;
}

interface QRCode {
  id: number;
  token: string;
  is_active: boolean;
  created_at: string;
  scan_url: string;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ location_code: "", name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [qrModal, setQrModal] = useState<{ location: Location; qrcodes: QRCode[] } | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/locations");
      setLocations(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLocations(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.post("/locations", form);
      setShowModal(false);
      setForm({ location_code: "", name: "", description: "" });
      fetchLocations();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Hata");
    } finally {
      setSaving(false);
    }
  };

  const openQRModal = async (loc: Location) => {
    const res = await api.get(`/locations/${loc.id}/qrcodes`);
    setQrModal({ location: loc, qrcodes: res.data });
  };

  const generateNewQR = async (locationId: number) => {
    setGeneratingQR(true);
    try {
      await api.post(`/locations/${locationId}/qrcodes`);
      const loc = locations.find((l) => l.id === locationId)!;
      await openQRModal(loc);
      fetchLocations();
    } finally {
      setGeneratingQR(false);
    }
  };

  const downloadQR = (qrId: number) => {
    window.open(`/api/qrcodes/${qrId}/image`, "_blank");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lokasyonlar & QR Kodlar</h1>
          <p className="text-gray-500 text-sm">Kapılar ve QR kod yönetimi</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Lokasyon Ekle
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{loc.location_code}</span>
                  <h3 className="font-bold text-gray-800 mt-1 text-lg">{loc.name}</h3>
                  {loc.description && <p className="text-sm text-gray-500 mt-0.5">{loc.description}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${loc.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {loc.is_active ? "Aktif" : "Pasif"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {loc.active_qr_count > 0 ? (
                    <span className="text-green-600 font-semibold">✓ {loc.active_qr_count} aktif QR</span>
                  ) : (
                    <span className="text-red-500">QR kod yok</span>
                  )}
                </span>
                <button
                  onClick={() => openQRModal(loc)}
                  className="bg-primary-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold"
                >
                  QR Yönet
                </button>
              </div>
            </div>
          ))}

          {locations.length === 0 && (
            <div className="col-span-3 text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">📍</p>
              <p>Henüz lokasyon eklenmemiş</p>
            </div>
          )}
        </div>
      )}

      {/* Create Location Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Lokasyon Ekle</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Lokasyon Kodu *</label>
                <input type="text" value={form.location_code} onChange={(e) => setForm({ ...form, location_code: e.target.value.toUpperCase() })} placeholder="ANA-GIRIS" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none font-mono uppercase" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Adı *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ana Giriş Kapısı" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Açıklama</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="İsteğe bağlı" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none" />
              </div>
              <button onClick={handleCreate} disabled={!form.location_code || !form.name || saving} className="w-full bg-primary-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 mt-2">
                {saving ? "Kaydediliyor..." : "Lokasyon Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold">{qrModal.location.name}</h3>
                <p className="text-sm text-gray-500">QR Kod Yönetimi</p>
              </div>
              <button onClick={() => setQrModal(null)} className="text-gray-400 text-2xl">✕</button>
            </div>

            <button
              onClick={() => generateNewQR(qrModal.location.id)}
              disabled={generatingQR}
              className="w-full bg-primary-500 text-white py-3 rounded-xl font-bold mb-5 disabled:opacity-50"
            >
              {generatingQR ? "Oluşturuluyor..." : "🔄 Yeni QR Oluştur"}
            </button>

            {qrModal.qrcodes.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Henüz QR kod yok. Yukarıdan oluşturun.</p>
            ) : (
              <div className="space-y-3">
                {qrModal.qrcodes.map((qr) => (
                  <div key={qr.id} className={`rounded-xl p-4 border-2 ${qr.is_active ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50 opacity-60"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${qr.is_active ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                          {qr.is_active ? "AKTİF" : "DEVRE DIŞI"}
                        </span>
                        <p className="font-mono text-xs text-gray-500 mt-1 break-all">{qr.scan_url}</p>
                      </div>
                      {qr.is_active && (
                        <button
                          onClick={() => downloadQR(qr.id)}
                          className="ml-3 bg-primary-500 text-white px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap"
                        >
                          PNG İndir
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
