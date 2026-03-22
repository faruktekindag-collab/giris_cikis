import { NextRequest, NextResponse } from "next/server";
import { getDB, saveDB, nextId, generateToken, generateGuestCode, generateAccessCode } from "@/lib/db";
import type { ScanEvent } from "@/lib/db";
import QRCode from "qrcode";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function err(msg: string, status = 400) {
  return NextResponse.json({ detail: msg }, { status });
}

function getParams(req: NextRequest) {
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}

// ─── ROUTER ──────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const p = params.path; // e.g. ["employees"] or ["locations","1","qrcodes"]
  const q = getParams(req);

  // GET /api/employees
  if (p[0] === "employees" && p.length === 1) {
    return handleGetEmployees(q);
  }

  // GET /api/guests
  if (p[0] === "guests" && p.length === 1) {
    return handleGetGuests(q);
  }

  // GET /api/guests/:id
  if (p[0] === "guests" && p.length === 2) {
    return handleGetGuest(parseInt(p[1]));
  }

  // GET /api/locations
  if (p[0] === "locations" && p.length === 1) {
    return handleGetLocations();
  }

  // GET /api/locations/:id/qrcodes
  if (p[0] === "locations" && p.length === 3 && p[2] === "qrcodes") {
    return handleGetQRCodes(parseInt(p[1]));
  }

  // GET /api/qrcodes/:id/image
  if (p[0] === "qrcodes" && p.length === 3 && p[2] === "image") {
    return handleGetQRImage(parseInt(p[1]), req);
  }

  // GET /api/scan/:token
  if (p[0] === "scan" && p.length === 2) {
    return handleGetScan(p[1]);
  }

  // GET /api/reports/daily
  if (p[0] === "reports" && p[1] === "daily") {
    return handleDailyReport(q);
  }

  // GET /api/reports/range
  if (p[0] === "reports" && p[1] === "range") {
    return handleRangeReport(q);
  }

  // GET /api/reports/currently-inside
  if (p[0] === "reports" && p[1] === "currently-inside") {
    return handleCurrentlyInside();
  }

  // GET /api/reports/late-arrivals
  if (p[0] === "reports" && p[1] === "late-arrivals") {
    return handleLateArrivals(q);
  }

  // GET /api/reports/early-departures
  if (p[0] === "reports" && p[1] === "early-departures") {
    return handleEarlyDepartures(q);
  }

  // GET /api/reports/overtime
  if (p[0] === "reports" && p[1] === "overtime") {
    return handleOvertime(q);
  }

  // GET /api/me/history
  if (p[0] === "me" && p[1] === "history") {
    return handleMyHistory(q);
  }

  // GET /api/guests/:id/history
  if (p[0] === "guests" && p.length === 3 && p[2] === "history") {
    return handleGuestHistory(parseInt(p[1]), q);
  }

  return err("Not found", 404);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const p = params.path;

  // POST /api/auth/login
  if (p[0] === "auth" && p[1] === "login") {
    return handleLogin(await req.json());
  }

  // POST /api/auth/refresh
  if (p[0] === "auth" && p[1] === "refresh") {
    return json({ access_token: "dev-token-refreshed", refresh_token: "dev-refresh-new" });
  }

  // POST /api/employees
  if (p[0] === "employees" && p.length === 1) {
    return handleCreateEmployee(await req.json());
  }

  // POST /api/guests
  if (p[0] === "guests" && p.length === 1) {
    return handleCreateGuest(await req.json());
  }

  // POST /api/locations
  if (p[0] === "locations" && p.length === 1) {
    return handleCreateLocation(await req.json());
  }

  // POST /api/locations/:id/qrcodes
  if (p[0] === "locations" && p.length === 3 && p[2] === "qrcodes") {
    return handleCreateQR(parseInt(p[1]));
  }

  // POST /api/qrcodes/:id/deactivate
  if (p[0] === "qrcodes" && p.length === 3 && p[2] === "deactivate") {
    return handleDeactivateQR(parseInt(p[1]));
  }

  // POST /api/scan/:token
  if (p[0] === "scan" && p.length === 2) {
    return handlePostScan(p[1], await req.json());
  }

  return err("Not found", 404);
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  const p = params.path;

  // PUT /api/employees/:id
  if (p[0] === "employees" && p.length === 2) {
    return handleUpdateEmployee(parseInt(p[1]), await req.json());
  }

  // PUT /api/employees/:id/pin
  if (p[0] === "employees" && p.length === 3 && p[2] === "pin") {
    return handleResetPin(parseInt(p[1]), await req.json());
  }

  // PUT /api/guests/:id
  if (p[0] === "guests" && p.length === 2) {
    return handleUpdateGuest(parseInt(p[1]), await req.json());
  }

  // PUT /api/locations/:id
  if (p[0] === "locations" && p.length === 2) {
    return handleUpdateLocation(parseInt(p[1]), await req.json());
  }

  return err("Not found", 404);
}

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════
function handleLogin(body: any) {
  const db = getDB();
  const emp = db.employees.find(
    (e) => e.employee_code === body.employee_code && e.pin === body.pin && e.is_active
  );
  if (!emp) return err("Gecersiz kullanici kodu veya PIN", 401);

  return json({
    access_token: "dev-token-" + emp.id,
    refresh_token: "dev-refresh-" + emp.id,
    employee_id: emp.id,
    employee_code: emp.employee_code,
    full_name: emp.full_name,
    is_admin: emp.is_admin,
  });
}

// ═══════════════════════════════════════════════════════════
// EMPLOYEES
// ═══════════════════════════════════════════════════════════
function handleGetEmployees(q: any) {
  const db = getDB();
  let items = [...db.employees];
  if (q.search) {
    const s = q.search.toLowerCase();
    items = items.filter(
      (e) => e.full_name.toLowerCase().includes(s) || e.employee_code.toLowerCase().includes(s)
    );
  }
  const limit = parseInt(q.limit || "100");
  // Remove pin from response
  const safe = items.slice(0, limit).map(({ pin, ...rest }) => rest);
  return json({ total: items.length, items: safe });
}

function handleCreateEmployee(body: any) {
  const db = getDB();
  if (db.employees.find((e) => e.employee_code === body.employee_code)) {
    return err("Bu calisan kodu zaten mevcut");
  }
  const emp = {
    id: nextId(db, "employee"),
    employee_code: body.employee_code,
    full_name: body.full_name,
    email: body.email || "",
    department: body.department || "",
    pin: body.pin,
    is_active: true,
    is_admin: body.is_admin || false,
    created_at: new Date().toISOString(),
  };
  db.employees.push(emp);
  saveDB(db);
  return json(emp, 201);
}

function handleUpdateEmployee(id: number, body: any) {
  const db = getDB();
  const idx = db.employees.findIndex((e) => e.id === id);
  if (idx === -1) return err("Calisan bulunamadi", 404);
  db.employees[idx] = { ...db.employees[idx], ...body };
  saveDB(db);
  return json(db.employees[idx]);
}

function handleResetPin(id: number, body: any) {
  const db = getDB();
  const idx = db.employees.findIndex((e) => e.id === id);
  if (idx === -1) return err("Calisan bulunamadi", 404);
  db.employees[idx].pin = body.new_pin;
  saveDB(db);
  return json({ success: true });
}

// ═══════════════════════════════════════════════════════════
// GUESTS
// ═══════════════════════════════════════════════════════════
function handleGetGuests(q: any) {
  const db = getDB();
  const limit = parseInt(q.limit || "100");
  const items = db.guests.map((g) => {
    const host = db.employees.find((e) => e.id === g.host_employee_id);
    return { ...g, host_employee_name: host?.full_name || null };
  });
  return json({ total: items.length, items: items.slice(0, limit) });
}

function handleGetGuest(id: number) {
  const db = getDB();
  const g = db.guests.find((g) => g.id === id);
  if (!g) return err("Misafir bulunamadi", 404);
  return json(g);
}

function handleCreateGuest(body: any) {
  const db = getDB();
  const guest = {
    id: nextId(db, "guest"),
    guest_code: generateGuestCode(),
    full_name: body.full_name,
    company: body.company || "",
    host_employee_id: body.host_employee_id || null,
    access_code: generateAccessCode(),
    valid_from: body.valid_from || new Date().toISOString(),
    valid_until: body.valid_until || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
    created_by: body.created_by || 1,
  };
  db.guests.push(guest);
  saveDB(db);

  const host = db.employees.find((e) => e.id === guest.host_employee_id);
  return json({ ...guest, host_employee_name: host?.full_name || null }, 201);
}

function handleUpdateGuest(id: number, body: any) {
  const db = getDB();
  const idx = db.guests.findIndex((g) => g.id === id);
  if (idx === -1) return err("Misafir bulunamadi", 404);
  db.guests[idx] = { ...db.guests[idx], ...body };
  saveDB(db);
  return json(db.guests[idx]);
}

function handleGuestHistory(guestId: number, q: any) {
  const db = getDB();
  const events = db.scan_events
    .filter((e) => e.guest_id === guestId)
    .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());
  return json({ total: events.length, items: events });
}

// ═══════════════════════════════════════════════════════════
// LOCATIONS
// ═══════════════════════════════════════════════════════════
function handleGetLocations() {
  const db = getDB();
  return json(
    db.locations.map((loc) => ({
      ...loc,
      active_qr_count: db.qr_codes.filter((q) => q.location_id === loc.id && q.is_active).length,
    }))
  );
}

function handleCreateLocation(body: any) {
  const db = getDB();
  if (db.locations.find((l) => l.location_code === body.location_code)) {
    return err("Bu lokasyon kodu zaten mevcut");
  }
  const loc = {
    id: nextId(db, "location"),
    location_code: body.location_code,
    name: body.name,
    description: body.description || "",
    is_active: true,
    created_at: new Date().toISOString(),
  };
  db.locations.push(loc);
  saveDB(db);
  return json(loc, 201);
}

function handleUpdateLocation(id: number, body: any) {
  const db = getDB();
  const idx = db.locations.findIndex((l) => l.id === id);
  if (idx === -1) return err("Lokasyon bulunamadi", 404);
  db.locations[idx] = { ...db.locations[idx], ...body };
  saveDB(db);
  return json(db.locations[idx]);
}

// ═══════════════════════════════════════════════════════════
// QR CODES
// ═══════════════════════════════════════════════════════════
function handleGetQRCodes(locationId: number) {
  const db = getDB();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return json(
    db.qr_codes
      .filter((q) => q.location_id === locationId)
      .map((q) => ({
        ...q,
        scan_url: `${baseUrl}/scan/${q.token}`,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  );
}

function handleCreateQR(locationId: number) {
  const db = getDB();
  const loc = db.locations.find((l) => l.id === locationId);
  if (!loc) return err("Lokasyon bulunamadi", 404);

  // Deactivate old QRs
  db.qr_codes.forEach((q) => {
    if (q.location_id === locationId && q.is_active) {
      q.is_active = false;
      q.deactivated_at = new Date().toISOString();
    }
  });

  const qr = {
    id: nextId(db, "qr"),
    location_id: locationId,
    token: generateToken(),
    is_active: true,
    created_at: new Date().toISOString(),
    deactivated_at: null,
  };
  db.qr_codes.push(qr);
  saveDB(db);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return json({ ...qr, scan_url: `${baseUrl}/scan/${qr.token}` }, 201);
}

function handleDeactivateQR(qrId: number) {
  const db = getDB();
  const idx = db.qr_codes.findIndex((q) => q.id === qrId);
  if (idx === -1) return err("QR bulunamadi", 404);
  db.qr_codes[idx].is_active = false;
  db.qr_codes[idx].deactivated_at = new Date().toISOString();
  saveDB(db);
  return json({ success: true });
}

async function handleGetQRImage(qrId: number, req: NextRequest) {
  const db = getDB();
  const qr = db.qr_codes.find((q) => q.id === qrId);
  if (!qr) return err("QR bulunamadi", 404);

  const loc = db.locations.find((l) => l.id === qr.location_id);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const scanUrl = `${baseUrl}/scan/${qr.token}`;

  try {
    const buffer = await QRCode.toBuffer(scanUrl, {
      type: "png",
      width: 400,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#1e40af", light: "#ffffff" },
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="qr-${loc?.location_code || qrId}.png"`,
      },
    });
  } catch {
    return err("QR olusturulamadi", 500);
  }
}

// ═══════════════════════════════════════════════════════════
// SCAN
// ═══════════════════════════════════════════════════════════
function handleGetScan(token: string) {
  const db = getDB();
  const qr = db.qr_codes.find((q) => q.token === token && q.is_active);
  if (!qr) return err("Gecersiz veya suresi dolmus QR kod", 404);

  const loc = db.locations.find((l) => l.id === qr.location_id);
  return json({
    location_id: qr.location_id,
    location_name: loc?.name || "",
    location_code: loc?.location_code || "",
  });
}

function handlePostScan(token: string, body: any) {
  const db = getDB();
  const qr = db.qr_codes.find((q) => q.token === token && q.is_active);
  if (!qr) return err("Gecersiz veya suresi dolmus QR kod", 404);

  const loc = db.locations.find((l) => l.id === qr.location_id);
  const now = new Date();
  let personName = "";
  let employeeId: number | null = null;
  let guestId: number | null = null;

  if (body.employee_code) {
    // Employee scan
    const emp = db.employees.find(
      (e) => e.employee_code === body.employee_code && e.pin === body.pin && e.is_active
    );
    if (!emp) return err("Gecersiz calisan kodu veya PIN", 401);
    personName = emp.full_name;
    employeeId = emp.id;
  } else if (body.guest_code) {
    // Guest scan
    const guest = db.guests.find(
      (g) =>
        g.guest_code === body.guest_code &&
        g.access_code === body.access_code &&
        g.is_active
    );
    if (!guest) return err("Gecersiz misafir kodu veya erisim kodu", 401);

    // Check time window
    const vf = new Date(guest.valid_from).getTime();
    const vu = new Date(guest.valid_until).getTime();
    if (now.getTime() < vf || now.getTime() > vu) {
      return err("Misafir erisim suresi gecmis veya henuz baslamadi", 403);
    }
    personName = guest.full_name;
    guestId = guest.id;
  } else {
    return err("Calisan kodu veya misafir kodu gerekli", 400);
  }

  // Determine entry or exit
  const today = now.toISOString().slice(0, 10);
  const todayEvents = db.scan_events.filter(
    (e) =>
      e.scanned_at.startsWith(today) &&
      ((employeeId && e.employee_id === employeeId) || (guestId && e.guest_id === guestId))
  );

  const lastEvent = todayEvents.sort(
    (a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
  )[0];

  const eventType: "entry" | "exit" =
    !lastEvent || lastEvent.event_type === "exit" ? "entry" : "exit";

  // Debounce check (2 min)
  if (lastEvent) {
    const diff = now.getTime() - new Date(lastEvent.scanned_at).getTime();
    if (diff < 2 * 60 * 1000) {
      return err("Cok kisa surede tekrar tarama yapilamaz (2 dk bekleyin)", 429);
    }
  }

  const event: ScanEvent = {
    id: nextId(db, "event"),
    employee_id: employeeId,
    guest_id: guestId,
    location_id: qr.location_id,
    qr_code_id: qr.id,
    event_type: eventType,
    scanned_at: now.toISOString(),
    ip_address: "web",
    user_agent: "Browser",
  };

  db.scan_events.push(event);
  saveDB(db);

  const timeStr = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  return json({
    event_type: eventType,
    person_name: personName,
    location_name: loc?.name || "",
    scanned_at: timeStr,
    message: eventType === "entry" ? "Giris basarili" : "Cikis basarili",
  });
}

// ═══════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════
function enrichEvent(ev: ScanEvent, db: ReturnType<typeof getDB>) {
  const emp = ev.employee_id ? db.employees.find((e) => e.id === ev.employee_id) : null;
  const guest = ev.guest_id ? db.guests.find((g) => g.id === ev.guest_id) : null;
  const loc = db.locations.find((l) => l.id === ev.location_id);

  return {
    id: ev.id,
    person_name: emp?.full_name || guest?.full_name || "Bilinmiyor",
    person_code: emp?.employee_code || guest?.guest_code || "",
    department: emp?.department || null,
    person_type: emp ? "employee" : guest ? "guest" : "unknown",
    location_name: loc?.name || "",
    event_type: ev.event_type,
    scanned_at: ev.scanned_at,
  };
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function handleDailyReport(q: any) {
  const db = getDB();
  const targetDate = q.target_date || new Date().toISOString().slice(0, 10);
  const schedule = db.work_schedule;

  const dayEvents = db.scan_events.filter((e) => e.scanned_at.startsWith(targetDate) && e.employee_id);

  // Group by employee
  const byEmployee: Record<number, ScanEvent[]> = {};
  dayEvents.forEach((ev) => {
    if (!ev.employee_id) return;
    if (!byEmployee[ev.employee_id]) byEmployee[ev.employee_id] = [];
    byEmployee[ev.employee_id].push(ev);
  });

  const workStartMin = parseTime(schedule.work_start);
  const workEndMin = parseTime(schedule.work_end);

  const items = Object.entries(byEmployee).map(([eid, events]) => {
    const emp = db.employees.find((e) => e.id === parseInt(eid));
    const entries = events.filter((e) => e.event_type === "entry").map((e) => new Date(e.scanned_at));
    const exits = events.filter((e) => e.event_type === "exit").map((e) => new Date(e.scanned_at));

    const firstEntry = entries.length ? new Date(Math.min(...entries.map((d) => d.getTime()))) : null;
    const lastExit = exits.length ? new Date(Math.max(...exits.map((d) => d.getTime()))) : null;

    let late_minutes = 0;
    let early_leave_minutes = 0;
    let overtime_minutes = 0;

    if (firstEntry) {
      const entryMin = firstEntry.getUTCHours() * 60 + firstEntry.getUTCMinutes();
      late_minutes = Math.max(0, entryMin - workStartMin);
    }

    if (lastExit) {
      const exitMin = lastExit.getUTCHours() * 60 + lastExit.getUTCMinutes();
      early_leave_minutes = Math.max(0, workEndMin - exitMin);
      overtime_minutes = Math.max(0, exitMin - workEndMin);
    }

    return {
      employee_id: parseInt(eid),
      employee_code: emp?.employee_code || "",
      full_name: emp?.full_name || "",
      department: emp?.department || "",
      first_entry: firstEntry?.toISOString() || null,
      last_exit: lastExit?.toISOString() || null,
      late_minutes,
      early_leave_minutes,
      overtime_minutes,
    };
  });

  return json({
    date: targetDate,
    total_employees: items.length,
    items,
    schedule: {
      work_start: schedule.work_start,
      lunch_start: schedule.lunch_start,
      lunch_end: schedule.lunch_end,
      work_end: schedule.work_end,
    },
  });
}

function handleRangeReport(q: any) {
  const db = getDB();
  const fromDate = q.from_date || new Date().toISOString().slice(0, 10);
  const toDate = q.to_date || new Date().toISOString().slice(0, 10);
  const limit = parseInt(q.limit || "200");
  const skip = parseInt(q.skip || "0");

  let events = db.scan_events.filter((e) => {
    const d = e.scanned_at.slice(0, 10);
    return d >= fromDate && d <= toDate;
  });

  if (q.employee_id) {
    events = events.filter((e) => e.employee_id === parseInt(q.employee_id));
  }
  if (q.event_type) {
    events = events.filter((e) => e.event_type === q.event_type);
  }
  if (q.department) {
    events = events.filter((e) => {
      if (!e.employee_id) return false;
      const emp = db.employees.find((emp) => emp.id === e.employee_id);
      return emp?.department === q.department;
    });
  }

  events.sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());
  const total = events.length;
  const items = events.slice(skip, skip + limit).map((e) => enrichEvent(e, db));

  return json({ total, items });
}

function handleCurrentlyInside() {
  const db = getDB();
  const today = new Date().toISOString().slice(0, 10);

  const todayEvents = db.scan_events
    .filter((e) => e.scanned_at.startsWith(today))
    .sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime());

  // Last event per person
  const personLast: Record<string, ScanEvent> = {};
  todayEvents.forEach((ev) => {
    const key = ev.employee_id ? `emp-${ev.employee_id}` : `guest-${ev.guest_id}`;
    personLast[key] = ev;
  });

  const people: any[] = [];
  Object.values(personLast).forEach((ev) => {
    if (ev.event_type !== "entry") return;

    const loc = db.locations.find((l) => l.id === ev.location_id);

    if (ev.employee_id) {
      const emp = db.employees.find((e) => e.id === ev.employee_id);
      if (!emp) return;
      people.push({
        person_type: "employee",
        person_id: emp.id,
        person_name: emp.full_name,
        person_code: emp.employee_code,
        department: emp.department,
        location_name: loc?.name || "",
        location_id: ev.location_id,
        entry_time: ev.scanned_at,
      });
    } else if (ev.guest_id) {
      const guest = db.guests.find((g) => g.id === ev.guest_id);
      if (!guest) return;
      people.push({
        person_type: "guest",
        person_id: guest.id,
        person_name: guest.full_name,
        person_code: guest.guest_code,
        department: null,
        location_name: loc?.name || "",
        location_id: ev.location_id,
        entry_time: ev.scanned_at,
      });
    }
  });

  // By location
  const by_location: Record<string, any[]> = {};
  people.forEach((p) => {
    const loc = p.location_name || "Bilinmeyen";
    if (!by_location[loc]) by_location[loc] = [];
    by_location[loc].push(p);
  });

  return json({
    total_inside: people.length,
    people: people.sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime()),
    by_location,
  });
}

function handleLateArrivals(q: any) {
  const db = getDB();
  const fromDate = q.from_date || new Date().toISOString().slice(0, 10);
  const toDate = q.to_date || new Date().toISOString().slice(0, 10);
  const workStartMin = parseTime(db.work_schedule.work_start);

  const items: any[] = [];
  let current = new Date(fromDate);
  const end = new Date(toDate);

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const dayEvents = db.scan_events.filter(
      (e) => e.scanned_at.startsWith(dateStr) && e.employee_id && e.event_type === "entry"
    );

    // First entry per employee
    const firstEntries: Record<number, ScanEvent> = {};
    dayEvents.forEach((ev) => {
      if (!ev.employee_id) return;
      if (!firstEntries[ev.employee_id] || new Date(ev.scanned_at) < new Date(firstEntries[ev.employee_id].scanned_at)) {
        firstEntries[ev.employee_id] = ev;
      }
    });

    Object.entries(firstEntries).forEach(([eid, ev]) => {
      const entryTime = new Date(ev.scanned_at);
      const entryMin = entryTime.getUTCHours() * 60 + entryTime.getUTCMinutes();
      const lateMin = entryMin - workStartMin;
      if (lateMin > 0) {
        const emp = db.employees.find((e) => e.id === parseInt(eid));
        if (q.department && emp?.department !== q.department) return;
        items.push({
          employee_id: parseInt(eid),
          employee_code: emp?.employee_code || "",
          full_name: emp?.full_name || "",
          department: emp?.department || "",
          date: dateStr,
          first_entry: ev.scanned_at,
          last_exit: null,
          late_minutes: lateMin,
        });
      }
    });

    current.setDate(current.getDate() + 1);
  }

  return json({ total: items.length, items });
}

function handleEarlyDepartures(q: any) {
  const db = getDB();
  const fromDate = q.from_date || new Date().toISOString().slice(0, 10);
  const toDate = q.to_date || new Date().toISOString().slice(0, 10);
  const workEndMin = parseTime(db.work_schedule.work_end);

  const items: any[] = [];
  let current = new Date(fromDate);
  const end = new Date(toDate);

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const dayEvents = db.scan_events.filter(
      (e) => e.scanned_at.startsWith(dateStr) && e.employee_id && e.event_type === "exit"
    );

    const lastExits: Record<number, ScanEvent> = {};
    dayEvents.forEach((ev) => {
      if (!ev.employee_id) return;
      if (!lastExits[ev.employee_id] || new Date(ev.scanned_at) > new Date(lastExits[ev.employee_id].scanned_at)) {
        lastExits[ev.employee_id] = ev;
      }
    });

    Object.entries(lastExits).forEach(([eid, ev]) => {
      const exitTime = new Date(ev.scanned_at);
      const exitMin = exitTime.getUTCHours() * 60 + exitTime.getUTCMinutes();
      const earlyMin = workEndMin - exitMin;
      if (earlyMin > 0) {
        const emp = db.employees.find((e) => e.id === parseInt(eid));
        if (q.department && emp?.department !== q.department) return;
        items.push({
          employee_id: parseInt(eid),
          employee_code: emp?.employee_code || "",
          full_name: emp?.full_name || "",
          department: emp?.department || "",
          date: dateStr,
          first_entry: null,
          last_exit: ev.scanned_at,
          early_leave_minutes: earlyMin,
        });
      }
    });

    current.setDate(current.getDate() + 1);
  }

  return json({ total: items.length, items });
}

function handleOvertime(q: any) {
  const db = getDB();
  const fromDate = q.from_date || new Date().toISOString().slice(0, 10);
  const toDate = q.to_date || new Date().toISOString().slice(0, 10);
  const workEndMin = parseTime(db.work_schedule.work_end);

  const items: any[] = [];
  let current = new Date(fromDate);
  const end = new Date(toDate);

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const dayEvents = db.scan_events.filter(
      (e) => e.scanned_at.startsWith(dateStr) && e.employee_id && e.event_type === "exit"
    );

    const lastExits: Record<number, ScanEvent> = {};
    dayEvents.forEach((ev) => {
      if (!ev.employee_id) return;
      if (!lastExits[ev.employee_id] || new Date(ev.scanned_at) > new Date(lastExits[ev.employee_id].scanned_at)) {
        lastExits[ev.employee_id] = ev;
      }
    });

    Object.entries(lastExits).forEach(([eid, ev]) => {
      const exitTime = new Date(ev.scanned_at);
      const exitMin = exitTime.getUTCHours() * 60 + exitTime.getUTCMinutes();
      const overMin = exitMin - workEndMin;
      if (overMin > 0) {
        const emp = db.employees.find((e) => e.id === parseInt(eid));
        if (q.department && emp?.department !== q.department) return;
        items.push({
          employee_id: parseInt(eid),
          employee_code: emp?.employee_code || "",
          full_name: emp?.full_name || "",
          department: emp?.department || "",
          date: dateStr,
          last_exit: ev.scanned_at,
          overtime_minutes: overMin,
        });
      }
    });

    current.setDate(current.getDate() + 1);
  }

  return json({ total: items.length, items });
}

function handleMyHistory(q: any) {
  const db = getDB();
  // For dev mode, return admin (id=1) history
  const fromDate = q.from_date || new Date(new Date().setDate(1)).toISOString().slice(0, 10);
  const toDate = q.to_date || new Date().toISOString().slice(0, 10);
  const limit = parseInt(q.limit || "200");

  const events = db.scan_events
    .filter((e) => {
      const d = e.scanned_at.slice(0, 10);
      return e.employee_id === 1 && d >= fromDate && d <= toDate;
    })
    .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())
    .slice(0, limit)
    .map((e) => {
      const loc = db.locations.find((l) => l.id === e.location_id);
      return {
        id: e.id,
        event_type: e.event_type,
        location_name: loc?.name || "",
        scanned_at: e.scanned_at,
      };
    });

  return json({ total: events.length, items: events });
}
