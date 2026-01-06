import React, { useEffect, useMemo, useState } from "react";
import "./theme.css";
import {
  AppShell,
  Card,
  NavPillButton,
  SectionTitle,
  SidebarGroup,
  StatusPill,
  usePortalLabel,
} from "./components/AppShell";

/**
 * RoadRescue QuickAssist — React Frontend (UI scaffold)
 * - No backend calls are made; all data is mocked/stubbed.
 * - Environment variables are referenced only for display/diagnostics:
 *   REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_KEY.
 */

// Business theme palette (must match theme.css variables)
const THEME = {
  background: "#F3F4F6",
  surface: "#FFFFFF",
  primary: "#1F2937",
  accent: "#2563EB",
  text: "#111827",
  muted: "#6B7280",
  success: "#059669",
  error: "#DC2626",
  warning: "#D97706",
};

const PORTALS = {
  USER: "user",
  MECHANIC: "mechanic",
  ADMIN: "admin",
};

const ASSISTANCE_STATUSES = ["Draft", "Requested", "Dispatched", "En Route", "Arrived", "In Service", "Completed"];

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
   * Keep the original data-theme attribute (template behavior), but visual look is controlled
   * by theme.css (business theme).
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
  const portalLabel = usePortalLabel(activePortal);

  // Mobile-only sidebar drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    const base =
      {
        "Flat Tire": 85,
        "Battery Jump": 65,
        Lockout: 75,
        "Fuel Delivery": 90,
        "Tow Needed": 160,
        "Engine Trouble": 140,
        Other: 110,
      }[issueType] ?? 110;

    // Add a small range
    const low = clamp(base - 15, 40, 999);
    const high = clamp(base + 35, 60, 1299);

    return {
      disclaimer: "AI estimate placeholder — final pricing depends on distance, parts, and on-site assessment.",
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
          timeline: [...prev.timeline, { at: nowIso(), status: "Dispatched", note: "Mechanic assigned and dispatched." }],
          chat: [...prev.chat, { from: "mechanic", at: nowIso(), text: "Hi! I'm on my way. Can you confirm you're in a safe spot?" }],
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
        chat: [...prev.chat, { from: "system", at: nowIso(), text: "Payment flow initiated (stub). No charge was made." }],
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
      return {
        ...prev,
        status: newStatus,
        timeline: [...prev.timeline, { at: nowIso(), status: newStatus, note: "Mechanic updated status (simulated)." }],
      };
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

  const portalTone = activePortal === PORTALS.ADMIN ? "warning" : activePortal === PORTALS.MECHANIC ? "success" : "neutral";

  const Sidebar = () => (
    <div className="rrSidebarStack">
      <SidebarGroup title="Portals">
        <NavPillButton
          active={activePortal === PORTALS.USER}
          onClick={() => {
            setActivePortal(PORTALS.USER);
            setMobileMenuOpen(false);
          }}
          ariaLabel="Switch to User portal"
        >
          User
        </NavPillButton>
        <NavPillButton
          active={activePortal === PORTALS.MECHANIC}
          onClick={() => {
            setActivePortal(PORTALS.MECHANIC);
            setMobileMenuOpen(false);
          }}
          ariaLabel="Switch to Mechanic portal"
        >
          Mechanic
        </NavPillButton>
        <NavPillButton
          active={activePortal === PORTALS.ADMIN}
          onClick={() => {
            setActivePortal(PORTALS.ADMIN);
            setMobileMenuOpen(false);
          }}
          ariaLabel="Switch to Admin portal"
        >
          Admin
        </NavPillButton>
      </SidebarGroup>

      <div className="rrDivider" />

      <SidebarGroup title="Session">
        <div className="rrRowBetween rrGap2">
          <div className="rrSmall">Active portal</div>
          <StatusPill tone={portalTone}>{portalLabel}</StatusPill>
        </div>

        <div className="rrRowBetween rrGap2" style={{ marginTop: 8 }}>
          <div className="rrSmall">Auth</div>
          <StatusPill tone={isAuthedForPortal ? "success" : "neutral"}>{isAuthedForPortal ? "Signed in" : "Signed out"}</StatusPill>
        </div>

        <div className="rrTiny" style={{ marginTop: 10 }}>
          Supabase env (reference only): <strong>{envInfo.supabaseUrl ? "URL set" : "URL not set"}</strong> ·{" "}
          <strong>{envInfo.supabaseKeyPresent ? "KEY present" : "KEY missing"}</strong>
        </div>
      </SidebarGroup>
    </div>
  );

  const AuthCard = () => (
    <Card
      title="Authentication (stub)"
      right={isAuthedForPortal ? <StatusPill tone="success">Signed in</StatusPill> : <StatusPill tone="neutral">Signed out</StatusPill>}
    >
      {isAuthedForPortal ? (
        <div className="rrStack" style={{ gap: 12 }}>
          <div className="rrStack" style={{ gap: 6 }}>
            <div style={{ fontWeight: 900, color: THEME.text }}>
              {authUser.name}{" "}
              <span className="rrSmall" style={{ fontWeight: 700 }}>
                ({authUser.email})
              </span>
            </div>
            <div className="rrSmall">
              Role: <strong style={{ color: THEME.primary }}>{authUser.role}</strong>
            </div>
          </div>
          <button type="button" className="btn btnSecondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      ) : (
        <form onSubmit={handleAuthSubmit} className="rrStack" style={{ gap: 12 }}>
          <div className="rrSegment">
            <button
              type="button"
              className={`rrSegmentBtn${authMode === "login" ? " rrSegmentBtnActive" : ""}`}
              onClick={() => setAuthMode("login")}
              aria-pressed={authMode === "login"}
            >
              Login
            </button>
            <button
              type="button"
              className={`rrSegmentBtn${authMode === "register" ? " rrSegmentBtnActive" : ""}`}
              onClick={() => setAuthMode("register")}
              aria-pressed={authMode === "register"}
            >
              Register
            </button>
          </div>

          {authMode === "register" ? (
            <div>
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                value={authForm.name}
                onChange={(e) => setAuthForm((f) => ({ ...f, name: e.target.value }))}
                className="input"
                placeholder="e.g., Taylor Morgan"
                autoComplete="name"
              />
            </div>
          ) : null}

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              value={authForm.email}
              onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))}
              className="input"
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              value={authForm.password}
              onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))}
              className="input"
              placeholder="••••••••"
              autoComplete={authMode === "register" ? "new-password" : "current-password"}
              type="password"
            />
          </div>

          <button type="submit" className="btn btnPrimary">
            {authMode === "register" ? "Create account" : "Login"}
          </button>
        </form>
      )}
    </Card>
  );

  const MapPlaceholder = ({ title, subtitle }) => (
    <div className="rrStack" style={{ gap: 10 }}>
      <div className="rrRowBetween rrGap2" style={{ alignItems: "baseline" }}>
        <div className="rrSmall" style={{ fontWeight: 900, color: THEME.primary }}>
          {title}
        </div>
        {subtitle ? <div className="rrSmall">{subtitle}</div> : null}
      </div>
      <div className="mapBox" aria-label="Map placeholder">
        Map placeholder
        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: THEME.muted }}>
          Integrate maps + live tracking when services are available.
        </div>
      </div>
    </div>
  );

  const EstimateCard = () => {
    const est = activeRequest?.estimate;
    if (!activeRequest) return null;

    return (
      <Card
        title="AI cost estimate (placeholder)"
        right={<StatusPill tone="neutral">Estimated range</StatusPill>}
        subtitle={`Generated ${new Date(est.generatedAt).toLocaleTimeString()}`}
      >
        <div className="rrRowBetween rrGap2" style={{ alignItems: "center" }}>
          <div className="rrSmall">Range</div>
          <strong style={{ fontSize: 16, color: THEME.text }}>
            {formatMoney(est.range.low)} – {formatMoney(est.range.high)}
          </strong>
        </div>

        <div className="rrDivider" />

        <div className="rrStack" style={{ gap: 10 }}>
          {est.lineItems.map((li) => (
            <div key={li.label} className="rrRowBetween rrGap2">
              <div style={{ fontWeight: 700, color: THEME.muted }}>{li.label}</div>
              <div style={{ fontWeight: 900, color: THEME.primary }}>{formatMoney(li.amount)}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12 }} className="rrSmall">
          {est.disclaimer}
        </div>
      </Card>
    );
  };

  const ChatCard = () => {
    const [draft, setDraft] = useState("");
    if (!activeRequest) return null;

    const headerLabel = activePortal === PORTALS.MECHANIC ? "Comms with customer (stub)" : "Chat with mechanic (stub)";
    return (
      <Card title={headerLabel} subtitle="Messages are stored only in memory for this session">
        <div className="panel" style={{ maxHeight: 240, overflow: "auto" }}>
          {activeRequest.chat.map((m, idx) => (
            <div key={`${m.at}-${idx}`} style={{ marginBottom: 12 }}>
              <div className="rrRowBetween rrGap2">
                <div style={{ fontWeight: 900, color: THEME.primary, fontSize: 12 }}>
                  {m.from === "user" ? "You" : m.from === "mechanic" ? "Mechanic" : "System"}
                </div>
                <div className="rrSmall" style={{ fontSize: 11 }}>
                  {new Date(m.at).toLocaleTimeString()}
                </div>
              </div>
              <div style={{ fontWeight: 600, color: THEME.text, fontSize: 13 }}>{m.text}</div>
            </div>
          ))}
        </div>

        <div className="rrStack" style={{ marginTop: 14, gap: 10 }}>
          <label className="label" htmlFor="chatDraft">
            Message
          </label>
          <input
            id="chatDraft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="input"
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
            className="btn btnPrimary"
            onClick={() => {
              sendChatMessage(draft);
              setDraft("");
            }}
          >
            Send message
          </button>
        </div>
      </Card>
    );
  };

  const PaymentsCard = () => {
    if (!activeRequest) return null;

    return (
      <Card
        title="Payments (CTA)"
        right={<StatusPill tone={activeRequest.payment.status === "initiated" ? "success" : "neutral"}>{activeRequest.payment.status}</StatusPill>}
      >
        <div className="rrRowBetween rrGap2" style={{ alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, color: THEME.text }}>Payment status</div>
            <div className="rrSmall">
              {activeRequest.payment.status === "unpaid"
                ? "No payment initiated."
                : activeRequest.payment.status === "initiated"
                  ? `Initiated at ${new Date(activeRequest.payment.lastActionAt).toLocaleTimeString()}`
                  : "Paid (stub)."}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }} className="rrStack">
          <button type="button" className="btn btnSuccess" onClick={markPaymentInitiated}>
            Pay & confirm service (stub)
          </button>
          <div className="rrSmall">Payment provider integration will be connected later.</div>
        </div>
      </Card>
    );
  };

  const ReviewCard = () => {
    const [rating, setRating] = useState(0);
    const [comments, setComments] = useState("");

    if (!activeRequest) return null;

    const completed = activeRequest.status === "Completed";
    const already = activeRequest.review.submitted;

    return (
      <Card title="Post-service review" subtitle="Shown after service is completed">
        {!completed ? (
          <div className="rrSmall">
            Review becomes available after service is marked <strong>Completed</strong>.
          </div>
        ) : already ? (
          <div className="rrStack" style={{ gap: 8 }}>
            <StatusPill tone="success">Review submitted</StatusPill>
            <div style={{ marginTop: 6, fontWeight: 900 }}>
              Rating: <span style={{ color: THEME.primary }}>{activeRequest.review.rating}/5</span>
            </div>
            <div className="rrSmall">{activeRequest.review.comments || "—"}</div>
          </div>
        ) : (
          <div className="rrStack" style={{ gap: 12 }}>
            <div>
              <label className="label" htmlFor="rating">
                Rating (1–5)
              </label>
              <select id="rating" className="select" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                <option value={0}>Select…</option>
                <option value={1}>1 - Poor</option>
                <option value={2}>2 - Fair</option>
                <option value={3}>3 - Good</option>
                <option value={4}>4 - Great</option>
                <option value={5}>5 - Excellent</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="comments">
                Comments
              </label>
              <textarea
                id="comments"
                className="textarea"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Quick feedback…"
              />
            </div>

            <button type="button" className="btn btnPrimary" onClick={() => submitReview(rating || 5, comments)} disabled={rating === 0}>
              Submit review
            </button>
          </div>
        )}
      </Card>
    );
  };

  const UserPortal = () => {
    return (
      <div className="rrStack">
        <SectionTitle
          eyebrow="User Portal"
          title="Request roadside assistance"
          description="Share your location, vehicle details, get an estimate, track in real time, chat, pay, and leave a review (all demo stubs)."
          right={<StatusPill tone={activeRequest ? "neutral" : "warning"}>{activeRequest ? "Active request" : "No request"}</StatusPill>}
        />

        <div className="rrGrid2">
          <div className="rrStack">
            <AuthCard />

            <Card title="Request breakdown assistance" subtitle="Creates an in-memory request only (no backend yet)">
              {!isAuthedForPortal ? (
                <div className="rrSmall">Login or register to request assistance (stub — no real auth yet).</div>
              ) : (
                <form onSubmit={createAssistanceRequest} className="rrStack" style={{ gap: 12 }}>
                  <div className="formRow3">
                    <div>
                      <label className="label" htmlFor="year">
                        Vehicle year
                      </label>
                      <input
                        id="year"
                        className="input"
                        inputMode="numeric"
                        placeholder="e.g., 2019"
                        value={requestForm.vehicleYear}
                        onChange={(e) => setRequestForm((f) => ({ ...f, vehicleYear: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="make">
                        Make
                      </label>
                      <input
                        id="make"
                        className="input"
                        placeholder="e.g., Ford"
                        value={requestForm.vehicleMake}
                        onChange={(e) => setRequestForm((f) => ({ ...f, vehicleMake: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="model">
                        Model
                      </label>
                      <input
                        id="model"
                        className="input"
                        placeholder="e.g., Focus"
                        value={requestForm.vehicleModel}
                        onChange={(e) => setRequestForm((f) => ({ ...f, vehicleModel: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="issue">
                      Issue type
                    </label>
                    <select
                      id="issue"
                      className="select"
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

                  <div>
                    <label className="label" htmlFor="phone">
                      Contact phone
                    </label>
                    <input
                      id="phone"
                      className="input"
                      placeholder="e.g., +1 555 0100"
                      inputMode="tel"
                      value={requestForm.contactPhone}
                      onChange={(e) => setRequestForm((f) => ({ ...f, contactPhone: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="notes">
                      Notes (optional)
                    </label>
                    <textarea
                      id="notes"
                      className="textarea"
                      placeholder="Describe what happened…"
                      value={requestForm.notes}
                      onChange={(e) => setRequestForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>

                  <div className="rrDivider" />

                  <div className="rrSegment" aria-label="Location input mode">
                    <button
                      type="button"
                      className={`rrSegmentBtn${requestForm.locationMode === "auto" ? " rrSegmentBtnActive" : ""}`}
                      onClick={() => setRequestForm((f) => ({ ...f, locationMode: "auto" }))}
                      aria-pressed={requestForm.locationMode === "auto"}
                    >
                      Live location
                    </button>
                    <button
                      type="button"
                      className={`rrSegmentBtn${requestForm.locationMode === "manual" ? " rrSegmentBtnActive" : ""}`}
                      onClick={() => setRequestForm((f) => ({ ...f, locationMode: "manual" }))}
                      aria-pressed={requestForm.locationMode === "manual"}
                    >
                      Manual address
                    </button>
                  </div>

                  {requestForm.locationMode === "auto" ? (
                    <div className="rrStack" style={{ gap: 10 }}>
                      <button type="button" className="btn btnSecondary" onClick={requestLiveLocation}>
                        {locationState.status === "requesting" ? "Getting location…" : "Use my current location"}
                      </button>

                      <div className="rrSmall">
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
                    <div className="rrStack" style={{ gap: 10 }}>
                      <label className="label" htmlFor="address">
                        Address / landmark
                      </label>
                      <input
                        id="address"
                        className="input"
                        placeholder="e.g., 5th Ave near Central Park"
                        value={requestForm.manualAddress}
                        onChange={(e) => setRequestForm((f) => ({ ...f, manualAddress: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="rrStack" style={{ gap: 8 }}>
                    <button type="submit" className="btn btnPrimary">
                      Request help now
                    </button>
                    <div className="rrSmall">Large action button for emergencies. This will create a mock request in-app only.</div>
                  </div>
                </form>
              )}
            </Card>
          </div>

          <div className="rrStack">
            <Card
              title="Real-time tracking (placeholder)"
              right={
                activeRequest ? (
                  <StatusPill tone={activeRequest.status === "Completed" ? "success" : "neutral"}>{activeRequest.status}</StatusPill>
                ) : (
                  <StatusPill tone="warning">No active request</StatusPill>
                )
              }
              subtitle="Real-time updates will be wired later"
            >
              {activeRequest ? (
                <div className="rrStack" style={{ gap: 12 }}>
                  <div className="rrStack" style={{ gap: 4 }}>
                    <div style={{ fontWeight: 900, color: THEME.text }}>{activeRequest.issueType}</div>
                    <div className="rrSmall">{activeRequest.vehicle}</div>
                    <div className="rrSmall">
                      Request ID: <strong>{activeRequest.id}</strong> · Created {new Date(activeRequest.createdAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <MapPlaceholder
                    title="Map (you + mechanic)"
                    subtitle={activeRequest.mechanic.assigned ? `ETA ~ ${activeRequest.mechanic.etaMins} min` : "Assigning mechanic…"}
                  />

                  <div className="rrStack" style={{ gap: 6 }}>
                    <div style={{ fontWeight: 900, color: THEME.primary }}>Assigned mechanic</div>
                    <div className="rrSmall">
                      {activeRequest.mechanic.assigned ? (
                        <>
                          <strong>{activeRequest.mechanic.name}</strong> · {activeRequest.mechanic.vehicle}
                        </>
                      ) : (
                        "Pending assignment…"
                      )}
                    </div>
                  </div>

                  <button type="button" className="btn btnSecondary" onClick={advanceTrackingStatus}>
                    Simulate status update
                  </button>

                  <div className="rrSmall">This is a UI placeholder. Real-time updates will use WebSocket/push once connected.</div>
                </div>
              ) : (
                <div className="rrSmall">Submit a request to see tracking, map placeholder, and status indicators.</div>
              )}
            </Card>

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
      <div className="rrStack">
        <SectionTitle
          eyebrow="Mechanic Portal"
          title="Manage assigned jobs"
          description="Update statuses, verify service handoff, and communicate with customers (all stubs for now)."
          right={<StatusPill tone="success">Ops</StatusPill>}
        />

        <div className="rrGrid2">
          <div className="rrStack">
            <AuthCard />

            <Card title="Job management" subtitle="Status updates also nudge the user tracking panel (demo behavior)">
              {!isAuthedForPortal ? (
                <div className="rrSmall">Login to view jobs (stub).</div>
              ) : (
                <div className="rrStack" style={{ gap: 12 }}>
                  {mechanicJobs.map((job) => (
                    <MechanicJobCard key={job.id} job={job} onUpdateStatus={mechanicUpdateJobStatus} onVerify={mechanicVerifyJob} />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="rrStack">
            <Card title="Navigation / map (placeholder)" subtitle="Turn-by-turn navigation will be integrated later">
              <MapPlaceholder title="Route to customer" subtitle="Routing + traffic data not connected." />
              <div style={{ marginTop: 16 }} className="rrStack">
                <button
                  type="button"
                  className="btn btnPrimary"
                  onClick={() => sendChatMessage("ETA update: I'm 10 minutes away.")}
                  disabled={!activeRequest}
                >
                  Send quick ETA update to customer (stub)
                </button>
                <div className="rrSmall">Chat button activates once there is an active request in the app session.</div>
              </div>
            </Card>

            <ChatCard />
          </div>
        </div>
      </div>
    );
  };

  const AdminPortal = () => {
    return (
      <div className="rrStack">
        <SectionTitle
          eyebrow="Admin"
          title="Platform monitoring"
          description="Mock analytics and operational health indicators for layout and interaction testing."
          right={<StatusPill tone="warning">Dashboard</StatusPill>}
        />

        <div className="rrStack">
          <Card
            title="Live monitoring (stub)"
            subtitle={`Updated ${new Date(adminMetrics.lastUpdatedAt).toLocaleTimeString()}`}
            right={<StatusPill tone="neutral">No backend</StatusPill>}
          >
            <div className="rrStack">
              <button type="button" className="btn btnPrimary" onClick={refreshAdminMetrics}>
                Refresh metrics
              </button>
              <div className="rrSmall">No backend is connected. This simulates live data for layout and interaction testing.</div>
            </div>
          </Card>

          <div className="rrGrid3">
            <MetricCard label="Active requests" value={String(adminMetrics.activeRequests)} tone="neutral" />
            <MetricCard label="Active mechanics" value={String(adminMetrics.activeMechanics)} tone="neutral" />
            <MetricCard label="Avg ETA" value={`${adminMetrics.avgEtaMins} min`} tone="neutral" />
            <MetricCard label="Completed today" value={String(adminMetrics.completedToday)} tone="success" />
            <MetricCard label="Revenue today" value={formatMoney(adminMetrics.revenueToday)} tone="success" />
            <MetricCard label="Satisfaction" value={`${adminMetrics.satisfaction}/5`} tone="success" />
            <MetricCard label="Incidents" value={String(adminMetrics.incidents)} tone={adminMetrics.incidents > 0 ? "error" : "success"} />
          </div>

          <Card title="Operations map (placeholder)" subtitle="Cluster view / heatmap placeholder">
            <MapPlaceholder title="Active requests + mechanics" subtitle="Map integration not configured." />
          </Card>
        </div>
      </div>
    );
  };

  const topbarExtras = (
    <div className="rrTopBarExtras">
      <StatusPill tone={portalTone}>{portalLabel}</StatusPill>
      {isAuthedForPortal ? <StatusPill tone="success">Signed in</StatusPill> : <StatusPill tone="neutral">Guest</StatusPill>}
    </div>
  );

  return (
    <AppShell
      brandTitle="RoadRescue QuickAssist"
      brandSubtitle="Emergency roadside assistance — multi-portal UI scaffold"
      sidebar={<Sidebar />}
      topbarExtras={topbarExtras}
      mobileMenuOpen={mobileMenuOpen}
      setMobileMenuOpen={setMobileMenuOpen}
    >
      {activePortal === PORTALS.USER ? <UserPortal /> : null}
      {activePortal === PORTALS.MECHANIC ? <MechanicPortal /> : null}
      {activePortal === PORTALS.ADMIN ? <AdminPortal /> : null}
    </AppShell>
  );
}

// PUBLIC_INTERFACE
function MetricCard({ label, value, tone }) {
  const pillTone = tone === "success" ? "success" : tone === "error" ? "error" : tone === "warning" ? "warning" : "neutral";
  return (
    <Card
      title={label}
      right={<StatusPill tone={pillTone}>{tone}</StatusPill>}
      subtitle="Analytics placeholder"
      className="rrMetricCard"
    >
      <div style={{ fontSize: 26, fontWeight: 950, color: THEME.text }}>{value}</div>
    </Card>
  );
}

// PUBLIC_INTERFACE
function MechanicJobCard({ job, onUpdateStatus, onVerify }) {
  const [codeAttempt, setCodeAttempt] = useState("");

  return (
    <div className="panel rrPanelTight">
      <div className="rrRowBetween rrGap2" style={{ alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950, color: THEME.text }}>{job.id}</div>
          <div className="rrSmall">
            {job.customerName} · {job.vehicle}
          </div>
        </div>
        <StatusPill tone={job.status === "Completed" ? "success" : "neutral"}>{job.status}</StatusPill>
      </div>

      <div style={{ marginTop: 14 }} className="rrStack" aria-label={`${job.id} details`}>
        <div style={{ fontWeight: 900, color: THEME.primary, fontSize: 13 }}>{job.issueType}</div>
        <div className="rrSmall">
          Location: <strong>{job.location}</strong>
        </div>
        <div className="rrSmall">
          ETA: <strong>{job.etaMins} min</strong> · Updated {new Date(job.updatedAt).toLocaleTimeString()}
        </div>
      </div>

      <div className="rrDivider" />

      <div className="rrStack" style={{ gap: 12 }}>
        <div>
          <label className="label" htmlFor={`status-${job.id}`}>
            Update status
          </label>
          <select id={`status-${job.id}`} className="select" value={job.status} onChange={(e) => onUpdateStatus(job.id, e.target.value)}>
            {ASSISTANCE_STATUSES.filter((s) => s !== "Draft").map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="rrInsetCard">
          <div className="rrRowBetween rrGap2" style={{ alignItems: "center" }}>
            <div style={{ fontWeight: 950, color: THEME.primary }}>Verification</div>
            <StatusPill tone={job.verification.verified ? "success" : "warning"}>
              {job.verification.verified ? "verified" : "pending"}
            </StatusPill>
          </div>

          <div style={{ marginTop: 8 }} className="rrSmall">
            {job.verification.required ? "Ask the customer for their verification code before completing service." : "Verification not required."}
          </div>

          <div style={{ marginTop: 14 }} className="rrStack" style={{ gap: 10 }}>
            <label className="label" htmlFor={`code-${job.id}`}>
              Enter code (demo code: {job.verification.code})
            </label>
            <input
              id={`code-${job.id}`}
              className="input"
              value={codeAttempt}
              onChange={(e) => setCodeAttempt(e.target.value)}
              inputMode="numeric"
              placeholder="e.g., 482913"
            />
            <button type="button" className="btn btnSecondary" onClick={() => onVerify(job.id, codeAttempt)}>
              Verify
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
