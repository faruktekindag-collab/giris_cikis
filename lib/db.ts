import fs from "fs";
import path from "path";
import crypto from "crypto";

// ─── Types ───────────────────────────────────────────────
export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  department: string;
  pin: string; // plaintext for dev
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Guest {
  id: number;
  guest_code: string;
  full_name: string;
  company: string;
  host_employee_id: number | null;
  access_code: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
  created_by: number | null;
}

export interface Location {
  id: number;
  location_code: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface QRCode {
  id: number;
  location_id: number;
  token: string;
  is_active: boolean;
  created_at: string;
  deactivated_at: string | null;
}

export interface ScanEvent {
  id: number;
  employee_id: number | null;
  guest_id: number | null;
  location_id: number;
  qr_code_id: number | null;
  event_type: "entry" | "exit";
  scanned_at: string;
  ip_address: string;
  user_agent: string;
}

export interface WorkSchedule {
  work_start: string; // "09:00"
  lunch_start: string; // "12:00"
  lunch_end: string; // "13:30"
  work_end: string; // "18:00"
}

interface DB {
  employees: Employee[];
  guests: Guest[];
  locations: Location[];
  qr_codes: QRCode[];
  scan_events: ScanEvent[];
  work_schedule: WorkSchedule;
  _counters: { employee: number; guest: number; location: number; qr: number; event: number };
}

// ─── File path ───────────────────────────────────────────
const DB_PATH = path.join(process.cwd(), "data", "db.json");

// ─── Seed Data ───────────────────────────────────────────
function createSeedData(): DB {
  const now = new Date().toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const employees: Employee[] = [
    { id: 1, employee_code: "FCT001", full_name: "Faruk Cengiz Tekindag", email: "faruk@fct.com", department: "Yonetim", pin: "1234", is_active: true, is_admin: true, created_at: now },
    { id: 2, employee_code: "EMP001", full_name: "Ahmet Yilmaz", email: "ahmet@fct.com", department: "Bilgi Teknolojileri", pin: "1234", is_active: true, is_admin: false, created_at: now },
    { id: 3, employee_code: "EMP002", full_name: "Ayse Demir", email: "ayse@fct.com", department: "Insan Kaynaklari", pin: "1234", is_active: true, is_admin: false, created_at: now },
    { id: 4, employee_code: "EMP003", full_name: "Mehmet Kaya", email: "mehmet@fct.com", department: "Finans", pin: "1234", is_active: true, is_admin: false, created_at: now },
    { id: 5, employee_code: "EMP004", full_name: "Zeynep Ozturk", email: "zeynep@fct.com", department: "Pazarlama", pin: "1234", is_active: true, is_admin: false, created_at: now },
    { id: 6, employee_code: "EMP005", full_name: "Ali Celik", email: "ali@fct.com", department: "Operasyon", pin: "1234", is_active: true, is_admin: false, created_at: now },
    { id: 7, employee_code: "EMP006", full_name: "Fatma Sahin", email: "fatma@fct.com", department: "Muhasebe", pin: "1234", is_active: true, is_admin: false, created_at: now },
    { id: 8, employee_code: "EMP007", full_name: "Mustafa Arslan", email: "mustafa@fct.com", department: "Bilgi Teknolojileri", pin: "1234", is_active: true, is_admin: false, created_at: now },
  ];

  // Sabit token'lar - Vercel serverless'da her invocation'da ayni kalsin
  const qrToken1 = "fct-ana-giris-qr-token-2026-stable-key-do-not-change";
  const qrToken2 = "fct-arka-kapi-qr-token-2026-stable-key-do-not-change";
  const qrToken3 = "fct-otopark-qr-token-2026-stable-key-do-not-change";

  const locations: Location[] = [
    { id: 1, location_code: "ANA-GIRIS", name: "Ana Giris Kapisi", description: "Bina ana giris kapisi", is_active: true, created_at: now },
    { id: 2, location_code: "ARKA-KAPI", name: "Arka Kapi", description: "Bina arka giris kapisi", is_active: true, created_at: now },
    { id: 3, location_code: "OTOPARK", name: "Otopark Girisi", description: "Otopark bariyeri", is_active: true, created_at: now },
  ];

  const qr_codes: QRCode[] = [
    { id: 1, location_id: 1, token: qrToken1, is_active: true, created_at: now, deactivated_at: null },
    { id: 2, location_id: 2, token: qrToken2, is_active: true, created_at: now, deactivated_at: null },
    { id: 3, location_id: 3, token: qrToken3, is_active: true, created_at: now, deactivated_at: null },
  ];

  // Bos baslat - gercek veri sadece QR taramayla olusacak
  const scan_events: ScanEvent[] = [];
  const eventId = 0;

  const guests: Guest[] = [
    {
      id: 1,
      guest_code: "GST001ABC",
      full_name: "Burak Erdem",
      company: "ABC Teknoloji",
      host_employee_id: 1,
      access_code: "MISAFIR01",
      valid_from: `${today}T08:00:00.000Z`,
      valid_until: `${today}T18:00:00.000Z`,
      is_active: true,
      created_at: now,
      created_by: 1,
    },
  ];

  return {
    employees,
    guests,
    locations,
    qr_codes,
    scan_events,
    work_schedule: {
      work_start: "09:00",
      lunch_start: "12:00",
      lunch_end: "13:30",
      work_end: "18:00",
    },
    _counters: { employee: 8, guest: 1, location: 3, qr: 3, event: eventId },
  };
}

// ─── Database Operations ─────────────────────────────────
let _cache: DB | null = null;

export function getDB(): DB {
  if (_cache) return _cache;

  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      _cache = JSON.parse(raw) as DB;
      return _cache;
    }
  } catch {
    // corrupted file or read-only filesystem (Vercel)
  }

  // Create fresh DB with seed data
  _cache = createSeedData();

  // Try to persist (will fail on Vercel read-only filesystem - that's OK)
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(_cache, null, 2));
  } catch {
    // Read-only filesystem (Vercel serverless) - use in-memory only
  }

  return _cache;
}

export function saveDB(db: DB) {
  _cache = db;

  // Try to persist (will fail on Vercel read-only filesystem - that's OK)
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch {
    // Read-only filesystem - data lives in memory only for this invocation
  }
}

export function nextId(db: DB, table: keyof DB["_counters"]): number {
  db._counters[table]++;
  return db._counters[table];
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateGuestCode(): string {
  return "GST" + crypto.randomBytes(3).toString("hex").toUpperCase();
}

export function generateAccessCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// ─── Reset DB (for testing) ──────────────────────────────
export function resetDB(): DB {
  _cache = createSeedData();
  saveDB(_cache);
  return _cache;
}
