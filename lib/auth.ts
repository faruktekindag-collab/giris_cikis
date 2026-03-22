export interface AuthUser {
  employee_id: number;
  employee_code: string;
  full_name: string;
  is_admin: boolean;
}

export function saveAuth(data: {
  access_token: string;
  refresh_token: string;
  employee_id: number;
  employee_code: string;
  full_name: string;
  is_admin: boolean;
}) {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem(
    "user",
    JSON.stringify({
      employee_id: data.employee_id,
      employee_code: data.employee_code,
      full_name: data.full_name,
      is_admin: data.is_admin,
    })
  );
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem("access_token");
}

// Scan cache (8 hours)
export function saveScanIdentity(employeeCode: string) {
  const expires = Date.now() + 8 * 60 * 60 * 1000;
  localStorage.setItem("scan_identity", JSON.stringify({ employeeCode, expires }));
}

export function getScanIdentity(): { employeeCode: string } | null {
  const raw = localStorage.getItem("scan_identity");
  if (!raw) return null;
  try {
    const { employeeCode, expires } = JSON.parse(raw);
    if (Date.now() > expires) {
      localStorage.removeItem("scan_identity");
      return null;
    }
    return { employeeCode };
  } catch {
    return null;
  }
}
