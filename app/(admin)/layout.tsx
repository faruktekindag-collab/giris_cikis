"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser, clearAuth } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/employees", label: "Çalışanlar", icon: "👥" },
  { href: "/guests", label: "Misafirler", icon: "🪪" },
  { href: "/locations", label: "Lokasyonlar", icon: "📍" },
  { href: "/reports", label: "Raporlar", icon: "📈" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ full_name: string } | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u || !u.is_admin) {
      router.replace("/login");
      return;
    }
    setUser(u);
  }, [router]);

  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-primary-500 text-white fixed h-full z-20">
        <div className="p-6 border-b border-primary-600">
          <h1 className="text-xl font-bold">FCT Takip</h1>
          <p className="text-blue-200 text-sm mt-1">{user?.full_name}</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-white/20 text-white"
                  : "text-blue-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-primary-600">
          <button
            onClick={logout}
            className="w-full text-left text-sm text-blue-200 hover:text-white py-2 px-2"
          >
            🚪 Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-primary-500 text-white px-4 py-3 flex items-center justify-between z-20 shadow-md">
        <h1 className="font-bold text-lg">FCT Takip</h1>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-white text-2xl"
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-10 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="bg-primary-500 w-72 h-full text-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-blue-200 mb-6 text-sm">{user?.full_name}</p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 py-4 text-base font-medium border-b border-primary-600 last:border-0"
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <button onClick={logout} className="mt-6 text-blue-200 text-sm">
              🚪 Çıkış Yap
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
