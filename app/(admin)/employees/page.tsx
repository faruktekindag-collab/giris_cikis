"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";

interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  email?: string;
  department?: string;
  is_active: boolean;
  is_admin: boolean;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [form, setForm] = useState({ employee_code: "", full_name: "", email: "", department: "", pin: "", is_admin: false });
  const [saving, setSaving] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [pinModal, setPinModal] = useState<{ id: number; name: string } | null>(null);
  const [newPin, setNewPin] = useState("");

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get("/employees", { params: { search: search || undefined, limit: 100 } });
      setEmployees(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, [search]);

  const handleCreate = async () => {
    if (!form.employee_code || !form.full_name || !form.pin) return;
    setSaving(true);
    try {
      await api.post("/employees", form);
      setShowModal(false);
      setForm({ employee_code: "", full_name: "", email: "", department: "", pin: "", is_admin: false });
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", importFile);
    try {
      const res = await api.post("/employees/bulk", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setImportResult(res.data);
      fetchEmployees();
    } catch {
      alert("İçe aktarma başarısız");
    } finally {
      setImporting(false);
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    await api.put(`/employees/${emp.id}`, { is_active: !emp.is_active });
    fetchEmployees();
  };

  const handlePinReset = async () => {
    if (!pinModal || !newPin) return;
    try {
      await api.put(`/employees/${pinModal.id}/pin`, { new_pin: newPin });
      alert("PIN güncellendi");
      setPinModal(null);
      setNewPin("");
    } catch {
      alert("Hata oluştu");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Çalışanlar</h1>
          <p className="text-gray-500 text-sm">Toplam {total} çalışan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImportModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Excel İçe Aktar
          </button>
          <button onClick={() => setShowModal(true)} className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            + Çalışan Ekle
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ad veya kod ile ara..."
          className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-primary-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Kod</th>
                  <th className="px-4 py-3 text-left">Ad Soyad</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Departman</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">E-posta</th>
                  <th className="px-4 py-3 text-left">Durum</th>
                  <th className="px-4 py-3 text-left">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold">{emp.employee_code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{emp.full_name}</p>
                      {emp.is_admin && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Admin</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">{emp.department || "-"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500">{emp.email || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${emp.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {emp.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleToggleActive(emp)} className="text-xs text-gray-500 hover:text-gray-800 underline">
                          {emp.is_active ? "Pasif Et" : "Aktif Et"}
                        </button>
                        <button onClick={() => setPinModal({ id: emp.id, name: emp.full_name })} className="text-xs text-blue-600 hover:text-blue-800 underline">
                          PIN
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {employees.length === 0 && (
              <p className="text-center py-10 text-gray-400">Çalışan bulunamadı</p>
            )}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showModal && (
        <Modal title="Çalışan Ekle" onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            <Input label="Çalışan Kodu *" value={form.employee_code} onChange={(v) => setForm({ ...form, employee_code: v.toUpperCase() })} placeholder="EMP001" />
            <Input label="Ad Soyad *" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <Input label="E-posta" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <Input label="Departman" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            <Input label="PIN *" value={form.pin} onChange={(v) => setForm({ ...form, pin: v.replace(/\D/g, "").slice(0, 8) })} type="password" placeholder="4-8 rakam" inputMode="numeric" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_admin} onChange={(e) => setForm({ ...form, is_admin: e.target.checked })} className="w-4 h-4" />
              <span className="text-sm font-semibold text-gray-700">Yönetici yetkisi ver</span>
            </label>
            <button onClick={handleCreate} disabled={saving} className="w-full bg-primary-500 text-white py-3 rounded-xl font-bold mt-2 disabled:opacity-50">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </Modal>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <Modal title="Excel İçe Aktar" onClose={() => { setShowImportModal(false); setImportResult(null); }}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Excel dosyasında şu sütunlar bulunmalıdır:<br />
              <code className="bg-gray-100 px-1 rounded">employee_code</code>, <code className="bg-gray-100 px-1 rounded">full_name</code>, <code className="bg-gray-100 px-1 rounded">email</code>, <code className="bg-gray-100 px-1 rounded">department</code>, <code className="bg-gray-100 px-1 rounded">pin</code>
            </p>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4" />
            <button onClick={handleImport} disabled={!importFile || importing} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold disabled:opacity-50">
              {importing ? "Aktarılıyor..." : "İçe Aktar"}
            </button>
            {importResult && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-green-700 font-semibold">✓ {importResult.success_count} çalışan eklendi</p>
                {importResult.error_count > 0 && (
                  <p className="text-red-600 mt-1">✗ {importResult.error_count} satırda hata</p>
                )}
                {importResult.errors?.map((e: any, i: number) => (
                  <p key={i} className="text-xs text-red-500">Satır {e.row}: {e.error}</p>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* PIN Reset Modal */}
      {pinModal && (
        <Modal title={`PIN Sıfırla - ${pinModal.name}`} onClose={() => { setPinModal(null); setNewPin(""); }}>
          <div className="space-y-3">
            <Input label="Yeni PIN" value={newPin} onChange={(v) => setNewPin(v.replace(/\D/g, "").slice(0, 8))} type="password" inputMode="numeric" placeholder="Yeni PIN girin" />
            <button onClick={handlePinReset} disabled={!newPin} className="w-full bg-primary-500 text-white py-3 rounded-xl font-bold disabled:opacity-50">
              PIN Güncelle
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, inputMode }: any) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-primary-500 focus:outline-none text-sm"
      />
    </div>
  );
}
