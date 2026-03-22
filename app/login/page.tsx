"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { saveAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!code || !pin) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/auth/login", {
        employee_code: code.toUpperCase(),
        pin,
      });
      saveAuth(res.data);
      if (res.data.is_admin) {
        router.push("/dashboard");
      } else {
        router.push("/my-history");
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-500 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="bg-white/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🏢</span>
          </div>
          <h1 className="text-3xl font-bold text-white">FCT Takip</h1>
          <p className="text-blue-200 mt-1">Giriş/Çıkış Sistemi</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-gray-800 mb-5">Giriş Yap</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Çalışan Kodu
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="EMP001"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-mono uppercase focus:border-primary-500 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 8))}
                placeholder="••••"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-xl text-center tracking-widest focus:border-primary-500 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || !code || !pin}
            className="w-full mt-5 bg-primary-500 text-white py-4 rounded-xl text-lg font-bold disabled:opacity-40 active:scale-95 transition-transform"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </div>
      </div>
    </div>
  );
}
