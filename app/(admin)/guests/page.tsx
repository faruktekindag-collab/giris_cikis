"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

interface Guest {
  id: number;
  guest_code: string;
  full_name: string;
  company?: string;
  host_employee_name?: string;
  access_code: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

function isExpiringSoon(until: string) {
  const diff = new Date(until).getTime() - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
}

function isExpired(until: string) {
  return new Date(until).getTime() < Date.now();
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    company: "",
    host_employee_id: "",
    valid_from: new Date().toISOString().slice(0, 16),
    valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });
  const [createdGuest, setCreatedGuest] = useState<Guest | null>(null);
  const [employees, setEmployees] = useState<{ id: number; full_name: string }[]>([]);

  const fetchGuests = async () => {
    setLoading(true);
    try {
      const res = await api.get("/guests", { params: { limit: 100 } });
      setGuests(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
    api.get("/employees", { params: { limit: 200 } }).then((r) => setEmployees(r.data.items));
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await api.post("/guests", {
        full_name: form.full_name,
        company: form.company || undefined,
        host_employee_id: form.host_employee_id ? parseInt(form.host_employee_id) : undefined,
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: new Date(form.valid_until).toISOString(),
      });
      setCreatedGuest(res.data);
      fetchGuests();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    await api.put(`/guests/${id}`, { is_active: false });
    fetchGuests();
  };

  const activeGuests = guests.filter((g) => !isExpired(g.valid_until) && g.is_active);
  const expiredGuests = guests.filter((g) => isExpired(g.valid_until) || !g.is_active);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Misafirler</h1>
          <p className="text-gray-500 text-sm">Toplam {total} misafir</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          + Misafir Ekle
        </button>
      </div>

      {/* Active guests */}
      <h2 className="font-bold text-gray-700 mb-3">Aktif Misafirler ({activeGuests.length})</h2>
      <div className="space-y-3 mb-6">
        {activeGuests.map((g) => (
          <div key={g.id} className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${isExpiringSoon(g.valid_until) ? "border-orange-400" : "border-green-500"}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-800">{g.full_name}</p>
                {g.company && <p className="text-sm text-gray-500">{g.company}</p>}
                {g.host_employee_name && <p className="text-xs text-gray-400">Ev sahibi: {g.host_employee_name}</p>}
                <div className="mt-2 flex gap-2">
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-mono">
                    {g.guest_code}
                  </span>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-mono font-bold">
                    {g.access_code}
                  </span>
                </div>
              </div>
              <button onClick={() => handleDeactivate(g.id)} className="text-xs text-red-500 underline ml-4">
                İptal Et
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {formatDateTime(g.valid_from)} → {formatDateTime(g.valid_until)}
              {isExpiringSoon(g.valid_until) && (
                <span className="ml-2 text-orange-600 font-bold">⚠ 24s içinde dolacak</span>
              )}
            </div>
          </div>
        ))}
        {activeGuests.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">Aktif misafir yok</p>}
      </div>

      {/* Expired guests */}
      {expiredGuests.length > 0 && (
        <>
          <h2 className="font-bold text-gray-500 mb-3 text-sm">Geçmiş Misafirler ({expiredGuests.length})</h2>
          <div className="space-y-2">
            {expiredGuests.map((g) => (
              <div key={g.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200 opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-600 text-sm">{g.full_name}</p>
                    <p className="text-xs text-gray-400">{g.company}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDateTime(g.valid_until)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            {createdGuest ? (
              <div>
                <h3 className="text-lg font-bold text-green-700 mb-4">✓ Misafir Oluşturuldu!</h3>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <p className="font-bold text-gray-800 text-lg">{createdGuest.full_name}</p>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Misafir Kodu</p>
                      <p className="font-mono font-bold text-xl text-gray-800">{createdGuest.guest_code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Erişim Kodu</p>
                      <p className="font-mono font-bold text-2xl text-blue-700 tracking-widest">{createdGuest.access_code}</p>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Geçerli: {formatDateTime(createdGuest.valid_from)} - {formatDateTime(createdGuest.valid_until)}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">Bu kodu misafire iletin. QR tarama sayfasında "Misafir" seçeneği ile kullanılır.</p>
                <button
                  onClick={() => { setShowModal(false); setCreatedGuest(null); setForm({ full_name: "", company: "", host_employee_id: "", valid_from: new Date().toISOString().slice(0, 16), valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16) }); }}
                  className="w-full bg-primary-500 text-white py-3 rounded-xl font-bold"
                >
                  Tamam
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold">Misafir Ekle</h3>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">✕</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Ad Soyad *</label>
                    <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Firma</label>
                    <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Ev Sahibi Çalışan</label>
                    <select value={form.host_employee_id} onChange={(e) => setForm({ ...form, host_employee_id: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none text-sm">
                      <option value="">Seçiniz...</option>
                      {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Giriş Başlangıcı *</label>
                    <input type="datetime-local" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Giriş Bitişi *</label>
                    <input type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none text-sm" />
                  </div>
                  <button onClick={handleCreate} disabled={!form.full_name || saving} className="w-full bg-primary-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 mt-2">
                    {saving ? "Oluşturuluyor..." : "Misafir Oluştur"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
