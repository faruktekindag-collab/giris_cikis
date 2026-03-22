"use client";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { formatTime } from "@/lib/utils";

interface DailyItem {
  employee_code: string;
  full_name: string;
  department?: string;
  first_entry?: string;
  last_exit?: string;
  late_minutes?: number;
  early_leave_minutes?: number;
}

interface InsidePerson {
  person_type: "employee" | "guest";
  person_id: number;
  person_name: string;
  person_code: string;
  department?: string;
  location_name: string;
  location_id: number;
  entry_time: string;
}

interface InsideData {
  total_inside: number;
  people: InsidePerson[];
  by_location: Record<string, InsidePerson[]>;
}

export default function DashboardPage() {
  const [daily, setDaily] = useState<{ items: DailyItem[]; total_employees: number } | null>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [insideData, setInsideData] = useState<InsideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [insideView, setInsideView] = useState<"list" | "location">("list");
  const [insideFilter, setInsideFilter] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const fetchData = useCallback(async () => {
    try {
      const [dailyRes, eventsRes, insideRes] = await Promise.allSettled([
        api.get("/reports/daily", { params: { target_date: today } }),
        api.get("/reports/range", {
          params: { from_date: today, to_date: today, limit: 20 },
        }),
        api.get("/reports/currently-inside"),
      ]);

      if (dailyRes.status === "fulfilled") setDaily(dailyRes.value.data);
      if (eventsRes.status === "fulfilled") setRecentEvents(eventsRes.value.data.items);
      if (insideRes.status === "fulfilled") setInsideData(insideRes.value.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchData();
    // Her 15 saniyede bir guncelle (real-time)
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const presentCount = insideData?.total_inside ?? daily?.items.filter((i) => i.first_entry && !i.last_exit).length ?? 0;
  const lateCount = daily?.items.filter((i) => (i.late_minutes ?? 0) > 0).length ?? 0;

  // Inside filtreleme
  const filteredInside = insideData?.people.filter((p) => {
    if (!insideFilter) return true;
    const q = insideFilter.toLowerCase();
    return (
      p.person_name.toLowerCase().includes(q) ||
      p.person_code.toLowerCase().includes(q) ||
      (p.department?.toLowerCase().includes(q) ?? false) ||
      p.location_name.toLowerCase().includes(q)
    );
  }) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm">
          {new Date().toLocaleDateString("tr-TR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Su An Iceride" value={presentCount} color="green" icon="🏢" pulse />
        <StatCard title="Bugun Gelen" value={daily?.total_employees ?? 0} color="blue" icon="✅" />
        <StatCard title="Gec Gelen" value={lateCount} color="orange" icon="⏰" />
        <StatCard title="Toplam Kayit" value={recentEvents.length} color="purple" icon="📋" />
      </div>

      {/* SU AN ICERIDE PANELI */}
      <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="bg-green-500 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <h2 className="font-bold text-lg">Su An Iceride ({presentCount} kisi)</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setInsideView("list")}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                insideView === "list" ? "bg-white text-green-700" : "bg-green-600 text-white"
              }`}
            >
              Liste
            </button>
            <button
              onClick={() => setInsideView("location")}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                insideView === "location" ? "bg-white text-green-700" : "bg-green-600 text-white"
              }`}
            >
              Lokasyona Gore
            </button>
          </div>
        </div>

        {/* Arama */}
        <div className="px-5 py-3 border-b bg-gray-50">
          <input
            type="text"
            value={insideFilter}
            onChange={(e) => setInsideFilter(e.target.value)}
            placeholder="Ara... (isim, kod, departman, lokasyon)"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        {presentCount === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🏠</p>
            <p>Su an iceride kimse yok</p>
          </div>
        ) : insideView === "list" ? (
          /* LISTE GORUNUMU */
          <div className="max-h-96 overflow-y-auto divide-y">
            {filteredInside.map((p, i) => (
              <div key={`${p.person_type}-${p.person_id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  p.person_type === "employee" ? "bg-green-500" : "bg-amber-500"
                }`}>
                  {p.person_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 truncate">{p.person_name}</p>
                    {p.person_type === "guest" && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">MİSAFİR</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-mono">{p.person_code}</span>
                    {p.department && <span>· {p.department}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Giris</p>
                  <p className="text-sm font-bold text-green-600">{formatTime(p.entry_time)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg">📍</span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{p.location_name}</span>
                </div>
              </div>
            ))}
            {filteredInside.length === 0 && insideFilter && (
              <div className="text-center py-8 text-gray-400 text-sm">
                &quot;{insideFilter}&quot; icin sonuc bulunamadi
              </div>
            )}
          </div>
        ) : (
          /* LOKASYONA GORE GORUNUM */
          <div className="max-h-96 overflow-y-auto p-5 space-y-4">
            {insideData && Object.entries(insideData.by_location).map(([locName, people]) => {
              const filtered = people.filter((p) => {
                if (!insideFilter) return true;
                const q = insideFilter.toLowerCase();
                return p.person_name.toLowerCase().includes(q) || p.person_code.toLowerCase().includes(q);
              });
              if (filtered.length === 0 && insideFilter) return null;
              return (
                <div key={locName} className="border-2 border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      <span className="font-bold text-gray-800">{locName}</span>
                    </div>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                      {filtered.length} kisi
                    </span>
                  </div>
                  <div className="divide-y">
                    {filtered.map((p) => (
                      <div key={`${p.person_type}-${p.person_id}`} className="flex items-center gap-3 px-4 py-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          p.person_type === "employee" ? "bg-green-500" : "bg-amber-500"
                        }`}>
                          {p.person_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">
                            {p.person_name}
                            {p.person_type === "guest" && (
                              <span className="ml-1 text-xs text-amber-600">(Misafir)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">{p.department || p.person_code}</p>
                        </div>
                        <span className="text-xs font-bold text-green-600">{formatTime(p.entry_time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Auto-refresh bilgisi */}
        <div className="px-5 py-2 bg-gray-50 border-t text-xs text-gray-400 flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Canli - Her 15 saniyede otomatik guncellenir
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent events */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-700 mb-4">Son Hareketler</h2>
          {recentEvents.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">Bugun henuz hareket yok</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm text-white ${
                      ev.event_type === "entry" ? "bg-green-500" : "bg-blue-500"
                    }`}
                  >
                    {ev.event_type === "entry" ? "→" : "←"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ev.person_name}</p>
                    <p className="text-xs text-gray-400">{ev.location_name}</p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTime(ev.scanned_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Late arrivals */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-700 mb-4">Bugun Gec Gelenler</h2>
          {daily?.items.filter((i) => (i.late_minutes ?? 0) > 0).length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">Gec gelen yok 🎉</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {daily?.items
                .filter((i) => (i.late_minutes ?? 0) > 0)
                .sort((a, b) => (b.late_minutes ?? 0) - (a.late_minutes ?? 0))
                .map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{item.full_name}</p>
                      <p className="text-xs text-gray-400">{item.department}</p>
                    </div>
                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-lg">
                      +{item.late_minutes} dk
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  color,
  icon,
  pulse,
}: {
  title: string;
  value: number;
  color: string;
  icon: string;
  pulse?: boolean;
}) {
  const colors: Record<string, string> = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    orange: "bg-orange-50 text-orange-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]} relative`}>
      {pulse && value > 0 && (
        <span className="absolute top-3 right-3 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
      )}
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-1">{title}</p>
    </div>
  );
}
