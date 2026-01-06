import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

/**
 * RoadRescue QuickAssist — React Frontend (single-file UI scaffold)
 * - No backend calls are made; all data is mocked/stubbed.
 * - Environment variables are referenced only for display/diagnostics:
 *   REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_KEY.
 */

// Executive Gray theme palette (from style guide)
const THEME = {
  primary: "#374151",
  secondary: "#9CA3AF",
  success: "#059669",
  error: "#DC2626",
  background: "#F9FAFB",
  surface: "#FFFFFF",
  text: "#111827",
};

const PORTALS = {
  USER: "user",
  MECHANIC: "mechanic",
  ADMIN: "admin",
};

const ASSISTANCE_STATUSES = [
  "Draft",
  "Requested",
  "Dispatched",
  "En Route",
  "Arrived",
  "In Service",
  "Completed",
];

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function formatMoney(amount) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function nowIso() {
  return new Date().toISOString();
}

// PUBLIC_INTERFACE
function App() {
  /**
   * NOTE: Template App.css supports light/dark via data-theme; we keep it on "light"
   * but apply Executive Gray palette via inline styles for this screen.
   */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  const envInfo = useMemo(() => {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
    return {
      supabaseUrl: supabaseUrl ? `${supabaseUrl}` : "",
      supabaseKeyPresent: Boolean(supabaseKey),
    };
  }, []);

  const [activePortal, setActivePortal] = useState(PORTALS.USER);

  // Auth stub (no real persistence)
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [authUser, setAuthUser] = useState(null); // { role, email, name }
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });

  // User assistance request state (mock)
  const [requestForm, setRequestForm] = useState({
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    issueType: "Flat Tire",
    notes: "",
    contactPhone: "",
    locationMode: "auto", // auto | manual
    manualAddress: "",
  });

  const [locationState, setLocationState] = useState({
    status: "idle", // idle | requesting | granted | denied | error
    coords: null, // { lat, lng }
    addressHint: "",
    updatedAt: null,
    message: "",
  });

  const [activeRequest, setActiveRequest] = useState(null);
  // activeRequest: { id, status, createdAt, vehicle, issueType, notes, location, estimate, mechanic, timeline, chat }

  // Mechanic side mock job list
  const [mechanicJobs, setMechanicJobs] = useState(() => [
    {
      id: "JOB-1204",
      status: "Dispatched",
      customerName: "A. Rivera",
      vehicle: "2017 Toyota Corolla",
      issueType: "Battery Jump",
      location: "Near Elm St & 3rd Ave",
      etaMins: 12,
      verification: { required: true, verified: false, code: "482913" },
      updatedAt: nowIso(),
    },
    {
      id: "JOB-1205",
      status: "En Route",
      customerName: "M. Chen",
      vehicle: "2020 Honda Civic",
      issueType: "Tow Needed",
      location: "I-85 Exit 14 (shoulder)",
      etaMins: 18,
      verification: { required: true, verified: true, code: "119204" },
      updatedAt: nowIso(),
    },
  ]);

  // Admin mock metrics
  const [adminMetrics, setAdminMetrics] = useState(() => ({
    activeRequests: 3,
    activeMechanics: 7,
    avgEtaMins: 14,
    completedToday: 18,
    revenueToday: 1325.5,
    satisfaction: 4.6,
    incidents: 0,
    lastUpdatedAt: nowIso(),
  }));

  const canUseGeolocation = typeof navigator !== "undefined" && "geolocation" in navigator;

  // ----- Actions (stubs) -----

  // PUBLIC_INTERFACE
  const handleAuthSubmit = (e) => {
    /** Auth stub: sets an in-memory user. */
    e.preventDefault();
    const role = activePortal; // tie auth to current portal
    const email = authForm.email.trim();
    const name = authForm.name.trim() || (email ? email.split("@")[0] : "User");
    if (!email) return;

    setAuthUser({ role, email, name });
    setAuthForm({ name: "", email: "", password: "" });
  };

  // PUBLIC_INTERFACE
  const handleLogout = () => {
    /** Clears auth stub state. */
    setAuthUser(null);
    setActiveRequest(null);
  };

  // PUBLIC_INTERFACE
  const requestLiveLocation = () => {
    /** Requests device location (best-effort) and stores coords in state. */
    if (!canUseGeolocation) {
      setLocationState({
        status: "error",
        coords: null,
        addressHint: "",
        updatedAt: nowIso(),
        message: "Geolocation not available in this browser.",
      });
      return;
    }

    setLocationState((s) => ({ ...s, status: "requesting", message: "" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setLocationState({
          status: "granted",
          coords,
          addressHint: "GPS location captured (address lookup not configured).",
          updatedAt: nowIso(),
          message: "",
        });
      },
      (err) => {
        const msg = err?.message || "Location permission denied.";
        setLocationState({
          status: "denied",
          coords: null,
          addressHint: "",
          updatedAt: nowIso(),
          message: msg,
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
    );
  };

  const buildEstimatePlaceholder = (issueType) => {
    // Simple deterministic placeholder model; keeps UI consistent for demos.
    const base = {
      "Flat Tire": 85,
      "Battery Jump": 65,
      "Lockout": 75,
      "Fuel Delivery": 90,
      "Tow Needed": 160,
      "Engine Trouble": 140,
      "Other": 110,
    }[issueType] ?? 110;

    // Add a small range
    const low = clamp(base - 15, 40, 999);
    const high = clamp(base + 35, 60, 1299);

    return {
      disclaimer:
        "AI estimate placeholder — final pricing depends on distance, parts, and on-site assessment.",
      range: { low, high },
      lineItems: [
        { label: "Dispatch + arrival", amount: clamp(base * 0.55, 25, 500) },
        { label: "Service labor (est.)", amount: clamp(base * 0.45, 25, 800) },
      ],
      generatedAt: nowIso(),
    };
  };

  // PUBLIC_INTERFACE
  const createAssistanceRequest = (e) => {
    /** Creates a mock assistance request (in-memory). */
    e.preventDefault();

    const vehicle = `${requestForm.vehicleYear || "—"} ${requestForm.vehicleMake || "—"} ${
      requestForm.vehicleModel || "—"
    }`.trim();

    const location =
      requestForm.locationMode === "manual"
        ? { mode: "manual", address: requestForm.manualAddress || "—" }
        : { mode: "auto", coords: locationState.coords, hint: locationState.addressHint };

    const estimate = buildEstimatePlaceholder(requestForm.issueType);

    const newRequest = {
      id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "Requested",
      createdAt: nowIso(),
      vehicle,
      issueType: requestForm.issueType,
      notes: requestForm.notes,
      contactPhone: requestForm.contactPhone,
      location,
      estimate,
      mechanic: {
        assigned: false,
        name: "—",
        etaMins: null,
        vehicle: "—",
        verified: false,
      },
      timeline: [{ at: nowIso(), status: "Requested", note: "Request submitted." }],
      chat: [{ from: "system", at: nowIso(), text: "We received your request. Assigning a mechanic..." }],
      payment: { status: "unpaid", lastActionAt: null },
      review: { submitted: false, rating: 0, comments: "" },
    };

    // Simulate dispatch after a short delay (pure UI)
    setActiveRequest(newRequest);

    // Reset form lightly (keep vehicle details to reduce typing in emergencies)
    setRequestForm((f) => ({ ...f, notes: "" }));

    // Simulate assignment & status changes
    window.setTimeout(() => {
      setActiveRequest((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "Dispatched",
          mechanic: { ...prev.mechanic, assigned: true, name: "Jordan (Mechanic)", etaMins: 14, vehicle: "Service Van #12" },
          timeline: [
            ...prev.timeline,
            { at: nowIso(), status: "Dispatched", note: "Mechanic assigned and dispatched." },
          ],
          chat: [
            ...prev.chat,
            { from: "mechanic", at: nowIso(), text: "Hi! I'm on my way. Can you confirm you're in a safe spot?" },
          ],
        };
      });
    }, 1200);

    window.setTimeout(() => {
      setActiveRequest((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "En Route",
          timeline: [...prev.timeline, { at: nowIso(), status: "En Route", note: "Mechanic is en route." }],
        };
      });
    }, 2600);
  };

  // PUBLIC_INTERFACE
  const advanceTrackingStatus = () => {
    /** UI-only: cycles request status forward to simulate real-time tracking updates. */
    setActiveRequest((prev) => {
      if (!prev) return prev;
      const idx = ASSISTANCE_STATUSES.indexOf(prev.status);
      const nextStatus = ASSISTANCE_STATUSES[clamp(idx + 1, 0, ASSISTANCE_STATUSES.length - 1)];
      if (nextStatus === prev.status) return prev;

      return {
        ...prev,
        status: nextStatus,
        timeline: [...prev.timeline, { at: nowIso(), status: nextStatus, note: "Status updated (simulated)." }],
      };
    });
  };

  // PUBLIC_INTERFACE
  const sendChatMessage = (text) => {
    /** Chat stub for both user and mechanic portals. */
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    setActiveRequest((prev) => {
      if (!prev) return prev;
      const from = activePortal === PORTALS.MECHANIC ? "mechanic" : "user";
      return { ...prev, chat: [...prev.chat, { from, at: nowIso(), text: trimmed }] };
    });
  };

  // PUBLIC_INTERFACE
  const markPaymentInitiated = () => {
    /** Payments CTA stub; no actual payment integration. */
    setActiveRequest((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        payment: { status: "initiated", lastActionAt: nowIso() },
        chat: [
          ...prev.chat,
          { from: "system", at: nowIso(), text: "Payment flow initiated (stub). No charge was made." },
        ],
      };
    });
  };

  // PUBLIC_INTERFACE
  const submitReview = (rating, comments) => {
    /** Post-service review stub. */
    setActiveRequest((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        review: { submitted: true, rating, comments },
        chat: [...prev.chat, { from: "system", at: nowIso(), text: "Thanks for your feedback!" }],
      };
    });
  };

  // Mechanic actions
  // PUBLIC_INTERFACE
  const mechanicUpdateJobStatus = (jobId, newStatus) => {
    /** Updates a mechanic job status (mock). */
    setMechanicJobs((jobs) =>
      jobs.map((j) =>
        j.id === jobId ? { ...j, status: newStatus, updatedAt: nowIso(), etaMins: Math.max(0, (j.etaMins ?? 0) - 3) } : j
      )
    );

    // Also sync activeRequest if it "matches" in spirit (demo convenience)
    setActiveRequest((prev) => {
      if (!prev) return prev;
      // We don't have a real linkage; just update if user has an active request and mechanic portal is interacting.
      return { ...prev, status: newStatus, timeline: [...prev.timeline, { at: nowIso(), status: newStatus, note: "Mechanic updated status (simulated)." }] };
    });
  };

  // PUBLIC_INTERFACE
  const mechanicVerifyJob = (jobId, codeAttempt) => {
    /** Verification stub: compares input with job.verification.code. */
    setMechanicJobs((jobs) =>
      jobs.map((j) => {
        if (j.id !== jobId) return j;
        const ok = String(codeAttempt || "").trim() === String(j.verification.code);
        return {
          ...j,
          verification: { ...j.verification, verified: ok },
          updatedAt: nowIso(),
        };
      })
    );
  };

  // Admin refresh stub
  // PUBLIC_INTERFACE
  const refreshAdminMetrics = () => {
    /** Randomly tweaks metrics to simulate live analytics. */
    setAdminMetrics((m) => {
      const drift = (v, d) => Math.max(0, v + (Math.random() * d * 2 - d));
      return {
        ...m,
        activeRequests: Math.round(drift(m.activeRequests, 2)),
        activeMechanics: Math.round(drift(m.activeMechanics, 2)),
        avgEtaMins: Math.round(drift(m.avgEtaMins, 3)),
        completedToday: Math.round(drift(m.completedToday, 4)),
        revenueToday: Number(drift(m.revenueToday, 150).toFixed(2)),
        satisfaction: Number(clamp(drift(m.satisfaction, 0.15), 3.5, 5).toFixed(1)),
        incidents: Math.round(clamp(drift(m.incidents, 1), 0, 3)),
        lastUpdatedAt: nowIso(),
      };
    });
  };

  const isAuthedForPortal = authUser && authUser.role === activePortal;

  // ----- Styles (inline; do not require App.css changes) -----
  const styles = useMemo(() => {
    const shadow = "0 10px 30px rgba(17, 24, 39, 0.08)";
    const subtleShadow = "0 6px 18px rgba(17, 24, 39, 0.08)";
    const border = `1px solid rgba(17, 24, 39, 0.08)`;

    const btnBase = {
      width: "100%",
      padding: "14px 14px",
      borderRadius: 12,
      border,
      fontWeight: 700,
      fontSize: 16,
      cursor: "pointer",
    };

    return {
      page: {
        minHeight: "100vh",
        background: THEME.background,
        color: THEME.text,
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      },
      topBar: {
        position: "sticky",
        top: 0,
        zIndex: 5,
        background: THEME.surface,
        borderBottom: border,
      },
      topBarInner: {
        maxWidth: 1100,
        margin: "0 auto",
        padding: "14px 14px",
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
      },
      brand: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        lineHeight: 1.1,
      },
      brandTitle: { margin: 0, fontSize: 16, fontWeight: 800, color: THEME.primary, letterSpacing: 0.2 },
      brandSub: { margin: 0, fontSize: 12, color: "rgba(17, 24, 39, 0.65)", fontWeight: 600 },

      tabs: { display: "flex", gap: 8, alignItems: "center" },
      tabBtn: (active) => ({
        padding: "10px 12px",
        borderRadius: 999,
        border,
        background: active ? THEME.primary : THEME.surface,
        color: active ? "#fff" : THEME.primary,
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }),

      container: { maxWidth: 1100, margin: "0 auto", padding: "16px 14px 28px" },
      hero: {
        background: `linear-gradient(135deg, rgba(55, 65, 81, 0.10), rgba(156, 163, 175, 0.12))`,
        borderRadius: 16,
        border,
        padding: 16,
        boxShadow: subtleShadow,
      },
      heroTitle: { margin: 0, fontSize: 20, fontWeight: 900, color: THEME.text },
      heroDesc: { margin: "8px 0 0", color: "rgba(17, 24, 39, 0.7)", fontWeight: 600, fontSize: 13 },

      grid: {
        display: "grid",
        gap: 12,
        marginTop: 14,
        gridTemplateColumns: "1fr",
      },
      card: {
        background: THEME.surface,
        borderRadius: 16,
        border,
        padding: 14,
        boxShadow: shadow,
        textAlign: "left",
      },
      cardTitle: { margin: "0 0 10px", fontSize: 14, fontWeight: 900, color: THEME.primary, letterSpacing: 0.3 },

      label: { display: "block", fontSize: 12, fontWeight: 800, color: "rgba(17, 24, 39, 0.72)", marginBottom: 6 },
      input: {
        width: "100%",
        padding: "12px 12px",
        borderRadius: 12,
        border,
        outline: "none",
        fontSize: 14,
        background: THEME.surface,
        color: THEME.text,
      },
      select: {
        width: "100%",
        padding: "12px 12px",
        borderRadius: 12,
        border,
        outline: "none",
        fontSize: 14,
        background: THEME.surface,
        color: THEME.text,
      },
      textarea: {
        width: "100%",
        padding: "12px 12px",
        borderRadius: 12,
        border,
        outline: "none",
        fontSize: 14,
        background: THEME.surface,
        color: THEME.text,
        minHeight: 88,
        resize: "vertical",
      },
      row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
      row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
      help: { marginTop: 8, fontSize: 12, color: "rgba(17, 24, 39, 0.65)", fontWeight: 600 },

      btnPrimary: { ...btnBase, background: THEME.primary, color: "#fff" },
      btnSecondary: { ...btnBase, background: THEME.surface, color: THEME.primary },
      btnSuccess: { ...btnBase, background: THEME.success, color: "#fff", border: `1px solid rgba(5,150,105,0.3)` },
      btnDanger: { ...btnBase, background: THEME.error, color: "#fff", border: `1px solid rgba(220,38,38,0.3)` },

      pill: (tone) => ({
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        border,
        background:
          tone === "success"
            ? "rgba(5,150,105,0.08)"
            : tone === "error"
              ? "rgba(220,38,38,0.08)"
              : "rgba(55,65,81,0.06)",
        color: tone === "success" ? THEME.success : tone === "error" ? THEME.error : THEME.primary,
        fontWeight: 900,
        fontSize: 12,
      }),

      mapBox: {
        height: 180,
        borderRadius: 14,
        border,
        background:
          "linear-gradient(135deg, rgba(55,65,81,0.08), rgba(156,163,175,0.10))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(17, 24, 39, 0.7)",
        fontWeight: 800,
        textAlign: "center",
        padding: 12,
      },

      small: { fontSize: 12, color: "rgba(17, 24, 39, 0.65)", fontWeight: 600 },
      divider: { height: 1, background: "rgba(17, 24, 39, 0.08)", margin: "12px 0" },
      footerNote: {
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 14px 20px",
        color: "rgba(17, 24, 39, 0.62)",
        fontSize: 12,
        fontWeight: 600,
      },
    };
  }, []);

  // Mobile-first: use CSS media query through inline conditional? We'll keep layout simple:
  // On wide screens, use 2-column/3-column by checking viewport width (JS only, minimal).
  const [isWide, setIsWide] = useState(false);
  useEffect(() => {
    const update = () => setIsWide(window.innerWidth >= 920);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const gridStyle = useMemo(() => {
    if (isWide) return { ...styles.grid, gridTemplateColumns: "1.05fr 0.95fr" };
    return styles.grid;
  }, [isWide, styles.grid]);

  const adminGridStyle = useMemo(() => {
    if (isWide) return { ...styles.grid, gridTemplateColumns: "1fr 1fr 1fr" };
    return styles.grid;
  }, [isWide, styles.grid]);

  // ----- Subcomponents (inline for App.js-only change) -----

  const PortalTabs = () => (
    <div style={styles.tabs} role="tablist" aria-label="Portal navigation">
      <button
        type="button"
        style={styles.tabBtn(activePortal === PORTALS.USER)}
        onClick={() => setActivePortal(PORTALS.USER)}
        role="tab"
        aria-selected={activePortal === PORTALS.USER}
      >
        User
      </button>
      <button
        type="button"
        style={styles.tabBtn(activePortal === PORTALS.MECHANIC)}
        onClick={() => setActivePortal(PORTALS.MECHANIC)}
        role="tab"
        aria-selected={activePortal === PORTALS.MECHANIC}
      >
        Mechanic
      </button>
      <button
        type="button"
        style={styles.tabBtn(activePortal === PORTALS.ADMIN)}
        onClick={() => setActivePortal(PORTALS.ADMIN)}
        role="tab"
        aria-selected={activePortal === PORTALS.ADMIN}
      >
        Admin
      </button>
    </div>
  );

  const AuthCard = () => (
    <section style={styles.card} aria-label="Authentication">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <h2 style={styles.cardTitle}>Register / Login (stub)</h2>
        {isAuthedForPortal ? (
          <span style={styles.pill("success")}>Signed in</span>
        ) : (
          <span style={styles.pill("neutral")}>Signed out</span>
        )}
      </div>

      {isAuthedForPortal ? (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontWeight: 900, color: THEME.text }}>
              {authUser.name} <span style={{ color: "rgba(17,24,39,0.6)", fontWeight: 800 }}>({authUser.email})</span>
            </div>
            <div style={styles.small}>
              Role: <strong style={{ color: THEME.primary }}>{authUser.role}</strong>
            </div>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <button type="button" style={styles.btnSecondary} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleAuthSubmit}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button
              type="button"
              style={styles.tabBtn(authMode === "login")}
              onClick={() => setAuthMode("login")}
              aria-pressed={authMode === "login"}
            >
              Login
            </button>
            <button
              type="button"
              style={styles.tabBtn(authMode === "register")}
              onClick={() => setAuthMode("register")}
              aria-pressed={authMode === "register"}
            >
              Register
            </button>
          </div>

          {authMode === "register" ? (
            <div style={{ marginBottom: 10 }}>
              <label style={styles.label} htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                value={authForm.name}
                onChange={(e) => setAuthForm((f) => ({ ...f, name: e.target.value }))}
                style={styles.input}
                placeholder="e.g., Taylor Morgan"
                autoComplete="name"
              />
            </div>
          ) : null}

          <div style={{ marginBottom: 10 }}>
            <label style={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              value={authForm.email}
              onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))}
              style={styles.input}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              value={authForm.password}
              onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))}
              style={styles.input}
              placeholder="••••••••"
              autoComplete={authMode === "register" ? "new-password" : "current-password"}
              type="password"
            />
          </div>

          <button type="submit" style={styles.btnPrimary}>
            {authMode === "register" ? "Create account" : "Login"}
          </button>

          <div style={styles.help}>
            Supabase env (reference only):{" "}
            <strong>{envInfo.supabaseUrl ? "URL set" : "URL not set"}</strong> ·{" "}
            <strong>{envInfo.supabaseKeyPresent ? "KEY present" : "KEY missing"}</strong>
          </div>
        </form>
      )}
    </section>
  );

  const MapPlaceholder = ({ title, subtitle }) => (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontWeight: 900, color: THEME.primary, fontSize: 13 }}>{title}</div>
        {subtitle ? <div style={styles.small}>{subtitle}</div> : null}
      </div>
      <div style={styles.mapBox} aria-label="Map placeholder">
        Map placeholder
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "rgba(17,24,39,0.65)" }}>
          Integrate maps + live tracking when services are available.
        </div>
      </div>
    </div>
  );

  const EstimateCard = () => {
    const est = activeRequest?.estimate;
    if (!activeRequest) return null;
    return (
      <section style={styles.card} aria-label="AI estimate">
        <h2 style={styles.cardTitle}>AI cost estimate (placeholder)</h2>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <span style={styles.pill("neutral")}>Estimated range</span>
          <strong style={{ fontSize: 16, color: THEME.text }}>
            {formatMoney(est.range.low)} – {formatMoney(est.range.high)}
          </strong>
        </div>
        <div style={styles.divider} />
        <div style={{ display: "grid", gap: 8 }}>
          {est.lineItems.map((li) => (
            <div key={li.label} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 800, color: "rgba(17,24,39,0.75)" }}>{li.label}</div>
              <div style={{ fontWeight: 900, color: THEME.primary }}>{formatMoney(li.amount)}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, ...styles.small }}>{est.disclaimer}</div>
      </section>
    );
  };

  const ChatCard = () => {
    const [draft, setDraft] = useState("");
    if (!activeRequest) return null;

    const headerLabel = activePortal === PORTALS.MECHANIC ? "Comms with customer (stub)" : "Chat with mechanic (stub)";
    return (
      <section style={styles.card} aria-label="Chat and communications">
        <h2 style={styles.cardTitle}>{headerLabel}</h2>
        <div
          style={{
            border: "1px solid rgba(17, 24, 39, 0.10)",
            borderRadius: 14,
            padding: 10,
            background: "rgba(55,65,81,0.03)",
            maxHeight: 220,
            overflow: "auto",
          }}
        >
          {activeRequest.chat.map((m, idx) => (
            <div key={`${m.at}-${idx}`} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 900, color: THEME.primary, fontSize: 12 }}>
                  {m.from === "user" ? "You" : m.from === "mechanic" ? "Mechanic" : "System"}
                </div>
                <div style={{ ...styles.small, fontSize: 11 }}>{new Date(m.at).toLocaleTimeString()}</div>
              </div>
              <div style={{ fontWeight: 700, color: "rgba(17,24,39,0.85)", fontSize: 13 }}>{m.text}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          <label style={styles.label} htmlFor="chatDraft">
            Message
          </label>
          <input
            id="chatDraft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={styles.input}
            placeholder="Type a quick update…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendChatMessage(draft);
                setDraft("");
              }
            }}
          />
          <button
            type="button"
            style={styles.btnPrimary}
            onClick={() => {
              sendChatMessage(draft);
              setDraft("");
            }}
          >
            Send message
          </button>
        </div>
      </section>
    );
  };

  const PaymentsCard = () => {
    if (!activeRequest) return null;
    return (
      <section style={styles.card} aria-label="Payments">
        <h2 style={styles.cardTitle}>Payments (CTA)</h2>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, color: THEME.text }}>Payment status</div>
            <div style={styles.small}>
              {activeRequest.payment.status === "unpaid"
                ? "No payment initiated."
                : activeRequest.payment.status === "initiated"
                  ? `Initiated at ${new Date(activeRequest.payment.lastActionAt).toLocaleTimeString()}`
                  : "Paid (stub)."}
            </div>
          </div>
          <span
            style={styles.pill(activeRequest.payment.status === "initiated" ? "success" : "neutral")}
          >
            {activeRequest.payment.status}
          </span>
        </div>
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <button type="button" style={styles.btnSuccess} onClick={markPaymentInitiated}>
            Pay & confirm service (stub)
          </button>
          <div style={styles.small}>Payment provider integration will be connected later.</div>
        </div>
      </section>
    );
  };

  const ReviewCard = () => {
    const [rating, setRating] = useState(0);
    const [comments, setComments] = useState("");

    if (!activeRequest) return null;

    const completed = activeRequest.status === "Completed";
    const already = activeRequest.review.submitted;

    return (
      <section style={styles.card} aria-label="Post service reviews">
        <h2 style={styles.cardTitle}>Post-service review</h2>

        {!completed ? (
          <div style={styles.small}>
            Review becomes available after service is marked <strong>Completed</strong>.
          </div>
        ) : already ? (
          <div>
            <div style={styles.pill("success")}>Review submitted</div>
            <div style={{ marginTop: 10, fontWeight: 900 }}>
              Rating: <span style={{ color: THEME.primary }}>{activeRequest.review.rating}/5</span>
            </div>
            <div style={{ marginTop: 6, ...styles.small }}>{activeRequest.review.comments || "—"}</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={styles.label} htmlFor="rating">
                Rating (1–5)
              </label>
              <select
                id="rating"
                style={styles.select}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                <option value={0}>Select…</option>
                <option value={1}>1 - Poor</option>
                <option value={2}>2 - Fair</option>
                <option value={3}>3 - Good</option>
                <option value={4}>4 - Great</option>
                <option value={5}>5 - Excellent</option>
              </select>
            </div>

            <div>
              <label style={styles.label} htmlFor="comments">
                Comments
              </label>
              <textarea
                id="comments"
                style={styles.textarea}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Quick feedback…"
              />
            </div>

            <button
              type="button"
              style={styles.btnPrimary}
              onClick={() => submitReview(rating || 5, comments)}
              disabled={rating === 0}
            >
              Submit review
            </button>
          </div>
        )}
      </section>
    );
  };

  const UserPortal = () => {
    return (
      <div>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>RoadRescue QuickAssist</h1>
          <p style={styles.heroDesc}>
            Request roadside help fast. Share your location, vehicle details, get an estimate, track in real time, chat, pay, and leave a review.
          </p>
        </div>

        <div style={gridStyle}>
          <div style={{ display: "grid", gap: 12 }}>
            <AuthCard />

            <section style={styles.card} aria-label="Request breakdown assistance">
              <h2 style={styles.cardTitle}>Request breakdown assistance</h2>

              {!isAuthedForPortal ? (
                <div style={styles.small}>
                  Login or register to request assistance (stub — no real auth yet).
                </div>
              ) : (
                <form onSubmit={createAssistanceRequest}>
                  <div style={styles.row3}>
                    <div>
                      <label style={styles.label} htmlFor="year">
                        Vehicle year
                      </label>
                      <input
                        id="year"
                        style={styles.input}
                        inputMode="numeric"
                        placeholder="e.g., 2019"
                        value={requestForm.vehicleYear}
                        onChange={(e) => setRequestForm((f) => ({ ...f, vehicleYear: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={styles.label} htmlFor="make">
                        Make
                      </label>
                      <input
                        id="make"
                        style={styles.input}
                        placeholder="e.g., Ford"
                        value={requestForm.vehicleMake}
                        onChange={(e) => setRequestForm((f) => ({ ...f, vehicleMake: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={styles.label} htmlFor="model">
                        Model
                      </label>
                      <input
                        id="model"
                        style={styles.input}
                        placeholder="e.g., Focus"
                        value={requestForm.vehicleModel}
                        onChange={(e) => setRequestForm((f) => ({ ...f, vehicleModel: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label style={styles.label} htmlFor="issue">
                      Issue type
                    </label>
                    <select
                      id="issue"
                      style={styles.select}
                      value={requestForm.issueType}
                      onChange={(e) => setRequestForm((f) => ({ ...f, issueType: e.target.value }))}
                    >
                      <option>Flat Tire</option>
                      <option>Battery Jump</option>
                      <option>Lockout</option>
                      <option>Fuel Delivery</option>
                      <option>Tow Needed</option>
                      <option>Engine Trouble</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label style={styles.label} htmlFor="phone">
                      Contact phone
                    </label>
                    <input
                      id="phone"
                      style={styles.input}
                      placeholder="e.g., +1 555 0100"
                      inputMode="tel"
                      value={requestForm.contactPhone}
                      onChange={(e) => setRequestForm((f) => ({ ...f, contactPhone: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label style={styles.label} htmlFor="notes">
                      Notes (optional)
                    </label>
                    <textarea
                      id="notes"
                      style={styles.textarea}
                      placeholder="Describe what happened…"
                      value={requestForm.notes}
                      onChange={(e) => setRequestForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>

                  <div style={styles.divider} />

                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <button
                      type="button"
                      style={styles.tabBtn(requestForm.locationMode === "auto")}
                      onClick={() => setRequestForm((f) => ({ ...f, locationMode: "auto" }))}
                      aria-pressed={requestForm.locationMode === "auto"}
                    >
                      Live location
                    </button>
                    <button
                      type="button"
                      style={styles.tabBtn(requestForm.locationMode === "manual")}
                      onClick={() => setRequestForm((f) => ({ ...f, locationMode: "manual" }))}
                      aria-pressed={requestForm.locationMode === "manual"}
                    >
                      Manual address
                    </button>
                  </div>

                  {requestForm.locationMode === "auto" ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <button type="button" style={styles.btnSecondary} onClick={requestLiveLocation}>
                        {locationState.status === "requesting" ? "Getting location…" : "Use my current location"}
                      </button>

                      <div style={styles.small}>
                        {locationState.status === "granted" && locationState.coords
                          ? `Location: ${locationState.coords.lat}, ${locationState.coords.lng}`
                          : locationState.status === "denied"
                            ? `Location denied: ${locationState.message}`
                            : locationState.status === "error"
                              ? `Error: ${locationState.message}`
                              : canUseGeolocation
                                ? "Tip: allow location for faster dispatch."
                                : "Geolocation unsupported."}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={styles.label} htmlFor="address">
                        Address / landmark
                      </label>
                      <input
                        id="address"
                        style={styles.input}
                        placeholder="e.g., 5th Ave near Central Park"
                        value={requestForm.manualAddress}
                        onChange={(e) => setRequestForm((f) => ({ ...f, manualAddress: e.target.value }))}
                      />
                    </div>
                  )}

                  <div style={{ marginTop: 12 }}>
                    <button type="submit" style={styles.btnPrimary}>
                      Request help now
                    </button>
                    <div style={styles.help}>
                      Large action button for emergencies. This will create a mock request in-app only.
                    </div>
                  </div>
                </form>
              )}
            </section>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <section style={styles.card} aria-label="Real-time tracking">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <h2 style={styles.cardTitle}>Real-time tracking (placeholder)</h2>
                {activeRequest ? (
                  <span style={styles.pill(activeRequest.status === "Completed" ? "success" : "neutral")}>
                    {activeRequest.status}
                  </span>
                ) : (
                  <span style={styles.pill("neutral")}>No active request</span>
                )}
              </div>

              {activeRequest ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ fontWeight: 900, color: THEME.text }}>{activeRequest.issueType}</div>
                    <div style={styles.small}>{activeRequest.vehicle}</div>
                    <div style={styles.small}>
                      Request ID: <strong>{activeRequest.id}</strong> · Created{" "}
                      {new Date(activeRequest.createdAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <MapPlaceholder
                    title="Map (you + mechanic)"
                    subtitle={activeRequest.mechanic.assigned ? `ETA ~ ${activeRequest.mechanic.etaMins} min` : "Assigning mechanic…"}
                  />

                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontWeight: 900, color: THEME.primary }}>Assigned mechanic</div>
                    <div style={styles.small}>
                      {activeRequest.mechanic.assigned ? (
                        <>
                          <strong>{activeRequest.mechanic.name}</strong> · {activeRequest.mechanic.vehicle}
                        </>
                      ) : (
                        "Pending assignment…"
                      )}
                    </div>
                  </div>

                  <button type="button" style={styles.btnSecondary} onClick={advanceTrackingStatus}>
                    Simulate status update
                  </button>

                  <div style={{ ...styles.small, marginTop: 2 }}>
                    This is a UI placeholder. Real-time updates will use WebSocket/push once connected.
                  </div>
                </div>
              ) : (
                <div style={styles.small}>
                  Submit a request to see tracking, map placeholder, and status indicators.
                </div>
              )}
            </section>

            <EstimateCard />
            <PaymentsCard />
            <ChatCard />
            <ReviewCard />
          </div>
        </div>
      </div>
    );
  };

  const MechanicPortal = () => {
    return (
      <div>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Mechanic Portal</h1>
          <p style={styles.heroDesc}>
            Manage assigned jobs, update statuses, verify service handoff, and communicate with customers (all stubs for now).
          </p>
        </div>

        <div style={gridStyle}>
          <div style={{ display: "grid", gap: 12 }}>
            <AuthCard />

            <section style={styles.card} aria-label="Job management">
              <h2 style={styles.cardTitle}>Job management</h2>

              {!isAuthedForPortal ? (
                <div style={styles.small}>Login to view jobs (stub).</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {mechanicJobs.map((job) => (
                    <MechanicJobCard
                      key={job.id}
                      job={job}
                      onUpdateStatus={mechanicUpdateJobStatus}
                      onVerify={mechanicVerifyJob}
                      styles={styles}
                    />
                  ))}
                  <div style={styles.small}>
                    Tip: Status updates here also nudge the user tracking panel (demo behavior).
                  </div>
                </div>
              )}
            </section>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <section style={styles.card} aria-label="Navigation and map">
              <h2 style={styles.cardTitle}>Navigation / map (placeholder)</h2>
              <MapPlaceholder title="Route to customer" subtitle="Turn-by-turn navigation will be integrated later." />
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <button type="button" style={styles.btnPrimary} onClick={() => sendChatMessage("ETA update: I'm 10 minutes away.")} disabled={!activeRequest}>
                  Send quick ETA update to customer (stub)
                </button>
                <div style={styles.small}>
                  Chat button activates once there is an active request in the app session.
                </div>
              </div>
            </section>

            <ChatCard />
          </div>
        </div>
      </div>
    );
  };

  const AdminPortal = () => {
    return (
      <div>
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Admin Dashboard</h1>
          <p style={styles.heroDesc}>
            Monitor platform activity, view simple analytics, and track operational health (mock data).
          </p>
        </div>

        <div style={{ ...styles.container, paddingTop: 14 }}>
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            <section style={styles.card} aria-label="Admin controls">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <h2 style={styles.cardTitle}>Live monitoring (stub)</h2>
                <span style={styles.pill("neutral")}>Updated {new Date(adminMetrics.lastUpdatedAt).toLocaleTimeString()}</span>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <button type="button" style={styles.btnPrimary} onClick={refreshAdminMetrics}>
                  Refresh metrics
                </button>
                <div style={styles.small}>
                  No backend is connected. This simulates live data for layout and interaction testing.
                </div>
              </div>
            </section>

            <div style={adminGridStyle}>
              <MetricCard label="Active requests" value={String(adminMetrics.activeRequests)} tone="neutral" styles={styles} />
              <MetricCard label="Active mechanics" value={String(adminMetrics.activeMechanics)} tone="neutral" styles={styles} />
              <MetricCard label="Avg ETA" value={`${adminMetrics.avgEtaMins} min`} tone="neutral" styles={styles} />
              <MetricCard label="Completed today" value={String(adminMetrics.completedToday)} tone="success" styles={styles} />
              <MetricCard label="Revenue today" value={formatMoney(adminMetrics.revenueToday)} tone="success" styles={styles} />
              <MetricCard label="Satisfaction" value={`${adminMetrics.satisfaction}/5`} tone="success" styles={styles} />
              <MetricCard label="Incidents" value={String(adminMetrics.incidents)} tone={adminMetrics.incidents > 0 ? "error" : "success"} styles={styles} />
            </div>

            <section style={styles.card} aria-label="Admin map placeholder">
              <h2 style={styles.cardTitle}>Operations map (placeholder)</h2>
              <MapPlaceholder title="Active requests + mechanics" subtitle="Cluster view / heatmap placeholder." />
            </section>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <header style={styles.topBar}>
        <div style={styles.topBarInner}>
          <div style={styles.brand}>
            <p style={styles.brandTitle}>RoadRescue QuickAssist</p>
            <p style={styles.brandSub}>Emergency roadside assistance — multi-portal UI scaffold</p>
          </div>
          <PortalTabs />
        </div>
      </header>

      <main style={styles.container}>
        {activePortal === PORTALS.USER ? <UserPortal /> : null}
        {activePortal === PORTALS.MECHANIC ? <MechanicPortal /> : null}
        {activePortal === PORTALS.ADMIN ? <AdminPortal /> : null}
      </main>

      <footer style={styles.footerNote}>
        UI stubs only: maps, real-time tracking, chat, payments, and auth are placeholders until services/APIs are connected.
      </footer>
    </div>
  );
}

function MetricCard({ label, value, tone, styles }) {
  return (
    <section style={styles.card} aria-label={label}>
      <h2 style={styles.cardTitle}>{label}</h2>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontSize: 22, fontWeight: 950, color: THEME.text }}>{value}</div>
        <span style={styles.pill(tone)}>{tone}</span>
      </div>
      <div style={{ marginTop: 8, ...styles.small }}>Analytics placeholder</div>
    </section>
  );
}

function MechanicJobCard({ job, onUpdateStatus, onVerify, styles }) {
  const [codeAttempt, setCodeAttempt] = useState("");

  return (
    <div
      style={{
        border: "1px solid rgba(17, 24, 39, 0.10)",
        borderRadius: 16,
        padding: 12,
        background: "rgba(55,65,81,0.03)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950, color: THEME.text }}>{job.id}</div>
          <div style={styles.small}>
            {job.customerName} · {job.vehicle}
          </div>
        </div>
        <span style={styles.pill(job.status === "Completed" ? "success" : "neutral")}>{job.status}</span>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
        <div style={{ fontWeight: 900, color: THEME.primary, fontSize: 13 }}>{job.issueType}</div>
        <div style={styles.small}>
          Location: <strong>{job.location}</strong>
        </div>
        <div style={styles.small}>
          ETA: <strong>{job.etaMins} min</strong> · Updated {new Date(job.updatedAt).toLocaleTimeString()}
        </div>
      </div>

      <div style={styles.divider} />

      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <label style={styles.label} htmlFor={`status-${job.id}`}>
            Update status
          </label>
          <select
            id={`status-${job.id}`}
            style={styles.select}
            value={job.status}
            onChange={(e) => onUpdateStatus(job.id, e.target.value)}
          >
            {ASSISTANCE_STATUSES.filter((s) => s !== "Draft").map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            border: "1px solid rgba(17,24,39,0.10)",
            borderRadius: 14,
            padding: 10,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 950, color: THEME.primary }}>Verification</div>
            <span style={styles.pill(job.verification.verified ? "success" : "neutral")}>
              {job.verification.verified ? "verified" : "pending"}
            </span>
          </div>

          <div style={{ marginTop: 6, ...styles.small }}>
            {job.verification.required
              ? "Ask the customer for their verification code before completing service."
              : "Verification not required."}
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <label style={styles.label} htmlFor={`code-${job.id}`}>
              Enter code (demo code: {job.verification.code})
            </label>
            <input
              id={`code-${job.id}`}
              style={styles.input}
              value={codeAttempt}
              onChange={(e) => setCodeAttempt(e.target.value)}
              inputMode="numeric"
              placeholder="e.g., 482913"
            />
            <button
              type="button"
              style={styles.btnSecondary}
              onClick={() => onVerify(job.id, codeAttempt)}
            >
              Verify
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
