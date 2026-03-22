"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, isLoggedIn, saveAuth } from "@/lib/auth";

// Set to false for production login
const DEV_SKIP_LOGIN = false;

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (DEV_SKIP_LOGIN) {
      saveAuth({
        access_token: "dev-token",
        refresh_token: "dev-refresh",
        employee_id: 1,
        employee_code: "FCT001",
        full_name: "Faruk Cengiz Tekindag",
        is_admin: true,
      });
      router.replace("/dashboard");
      return;
    }

    if (!isLoggedIn()) {
      router.replace("/login");
    } else {
      const user = getUser();
      if (user?.is_admin) {
        router.replace("/dashboard");
      } else {
        router.replace("/my-history");
      }
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
    </div>
  );
}
