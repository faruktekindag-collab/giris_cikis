"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

type TabType = "range" | "late" | "early" | "overtime";

interface Employee { id: number; full_name: string; department?: string; }

export default function ReportsPage() {
  const [tab, setTab] = useState<TabType>("range");
  const [fromDate, setFromDate] = useState(new Date(new Date().setDate(1)).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailFormat, setEmailFormat] = useState<"excel" | "pdf">("excel");
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => {
    api.get("/employees", { params: { limit: 200 } }).then((r) => setEmployees(r.data.items));
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = { from_date: fromDate, to_date: toDate };
      if (employeeId) params.employee_id = employeeId;
      if (department) params.department = department;

      const endpoint = tab === "range" ? "/reports/range" : tab === "late" ? "/reports/late-arrivals" : tab === "early" ? "/reports/early-departures" : "/reports/overtime";
      const res = await api.get(endpoint, { params });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: "excel" | "pdf") => {
    const params = new URLSearchParams({ from_date: fromDate, to_date: toDate, format });
    if (employeeId) params.set("employee_id", employeeId);
    if (department) params.set("department", department);
    window.open(`/api/reports/export?${params}`, "_blank");
  };

  const handleSendEmail = async () => {
    const emails = emailInput.split(",").map((e) => e.trim()).filter(Boolean);
    if (!emails.length) return;
    setEmailSending(true);
    try {
      await api.post("/reports/send-email", {
        emails, from_date: fromDate, to_date: toDate, format: emailFormat,
      });
      alert("E-posta gönderildi!");
      setEmailModal(false);
    } catch {
      alert("E-posta gönderilemedi");
    } finally {
      setEmailSending(false);
    }
  };

  const tabs = [
    { key: "range", label: "Genel" },
    { key: "late", label: "Geç Gelenler" },
    { key: "early", label: "Erken Çıkanlar" },
    { key: "overtime", label: "Fazla Mesai" },
  ];

  const items = data?.items || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Raporlar</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm p-1 mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as TabType)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${tab === t.key ? "bg-primary-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Başlangıç</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Bitiş</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Çalışan</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none">
              <option value="">Tümü</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Departman</label>
            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Tümü" className="w-full border rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none" />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchReport} className="bg-primary-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">
            Rapor Getir
          </button>
          <button onClick={() => handleExport("excel")} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Excel İndir
          </button>
          <button onClick={() => handleExport("pdf")} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            PDF İndir
          </button>
          <button onClick={() => setEmailModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            E-posta Gönder
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
        </div>
      ) : data ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500">
              Toplam <span className="font-bold text-gray-800">{data.total || items.length}</span> kayıt
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  {tab === "range" ? (
                    <>
                      <th className="px-4 py-3 text-left">Ad Soyad</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Departman</th>
                      <th className="px-4 py-3 text-left">Tür</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Lokasyon</th>
                      <th className="px-4 py-3 text-left">Tarih/Saat</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-left">Ad Soyad</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Departman</th>
                      <th className="px-4 py-3 text-left">Tarih</th>
                      <th className="px-4 py-3 text-left">İlk Giriş</th>
                      <th className="px-4 py-3 text-left hidden md:table-cell">Son Çıkış</th>
                      <th className="px-4 py-3 text-left">Fark</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {tab === "range" ? (
                      <>
                        <td className="px-4 py-3 font-medium">{item.person_name}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-500">{item.department || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${item.event_type === "entry" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                            {item.event_type === "entry" ? "Giriş" : "Çıkış"}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-500">{item.location_name}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDateTime(item.scanned_at)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium">{item.full_name}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-500">{item.department || "-"}</td>
                        <td className="px-4 py-3 text-gray-600">{item.date}</td>
                        <td className="px-4 py-3 text-gray-600">{item.first_entry ? new Date(item.first_entry).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-gray-600">{item.last_exit ? new Date(item.last_exit).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                        <td className="px-4 py-3">
                          {tab === "late" && item.late_minutes > 0 && (
                            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">+{item.late_minutes} dk</span>
                          )}
                          {tab === "early" && item.early_leave_minutes > 0 && (
                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">-{item.early_leave_minutes} dk</span>
                          )}
                          {tab === "overtime" && item.overtime_minutes > 0 && (
                            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">+{item.overtime_minutes} dk</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <p className="text-center py-10 text-gray-400">Kayıt bulunamadı</p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p>Filtreleri seçip "Rapor Getir" butonuna tıklayın</p>
        </div>
      )}

      {/* Email modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">E-posta ile Gönder</h3>
            <div className="mb-3">
              <label className="text-sm font-semibold text-gray-700 block mb-1">E-posta adresleri (virgülle ayırın)</label>
              <input type="text" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="ornek@sirket.com, diger@sirket.com" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-primary-500 focus:outline-none" />
            </div>
            <div className="flex gap-2 mb-4">
              {(["excel", "pdf"] as const).map((f) => (
                <button key={f} onClick={() => setEmailFormat(f)} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${emailFormat === f ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEmailModal(false)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600">İptal</button>
              <button onClick={handleSendEmail} disabled={emailSending} className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-semibold disabled:opacity-50">
                {emailSending ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
