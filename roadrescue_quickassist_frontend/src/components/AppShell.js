import React, { useEffect, useMemo, useRef } from "react";

/**
 * Modern application shell:
 * - Top app bar (brand + portal switcher + mobile menu)
 * - Left sidebar navigation (collapsible/drawer on mobile)
 * - Responsive main content area
 *
 * This is purely presentational and does not introduce new routing or backend calls.
 */

// PUBLIC_INTERFACE
export function AppShell({
  brandTitle,
  brandSubtitle,
  sidebar,
  topbarExtras,
  children,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  /** Page-scroll lock for mobile drawer; keeps UX tidy on small screens. */
  useEffect(() => {
    const shouldLock = Boolean(mobileMenuOpen);
    const prev = document.body.style.overflow;
    if (shouldLock) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  return (
    <div className="rrApp">
      <TopBar
        brandTitle={brandTitle}
        brandSubtitle={brandSubtitle}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        topbarExtras={topbarExtras}
      />

      {/* Mobile backdrop */}
      <button
        type="button"
        className={`rrBackdrop ${mobileMenuOpen ? "rrBackdropOpen" : ""}`}
        aria-label="Close navigation menu"
        onClick={() => setMobileMenuOpen(false)}
      />

      <div className="rrLayout">
        <aside
          className={`rrSidebar ${mobileMenuOpen ? "rrSidebarOpen" : ""}`}
          aria-label="Sidebar navigation"
        >
          <div className="rrSidebarInner">
            {sidebar}
            <div className="rrSidebarFooter">
              <div className="rrTiny">
                UI stubs only: maps, real-time tracking, chat, payments, and auth are placeholders until services/APIs are connected.
              </div>
            </div>
          </div>
        </aside>

        <main className="rrMain" role="main">
          <div className="rrContent">{children}</div>
        </main>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function TopBar({ brandTitle, brandSubtitle, mobileMenuOpen, setMobileMenuOpen, topbarExtras }) {
  const btnRef = useRef(null);

  // Close drawer on ESC (mobile UX)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setMobileMenuOpen]);

  return (
    <header className="rrTopBar">
      <div className="rrTopBarInner">
        <div className="rrTopBarLeft">
          <button
            ref={btnRef}
            type="button"
            className="rrIconBtn rrMobileOnly"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {/* Simple hamburger/close icon (no external deps) */}
            <span className="rrHamburger" aria-hidden="true" />
          </button>

          <div className="rrBrand" aria-label="Application brand">
            <div className="rrBrandMark" aria-hidden="true">
              RR
            </div>
            <div className="rrBrandText">
              <div className="rrBrandTitle">{brandTitle}</div>
              <div className="rrBrandSub">{brandSubtitle}</div>
            </div>
          </div>
        </div>

        <div className="rrTopBarRight">{topbarExtras}</div>
      </div>
    </header>
  );
}

// PUBLIC_INTERFACE
export function Card({ title, subtitle, right, children, className = "" }) {
  return (
    <section className={`rrCard ${className}`} aria-label={title || "Card"}>
      {(title || subtitle || right) && (
        <div className="rrCardHeader">
          <div>
            {title ? <div className="rrCardTitle">{title}</div> : null}
            {subtitle ? <div className="rrSmall">{subtitle}</div> : null}
          </div>
          {right ? <div className="rrCardHeaderRight">{right}</div> : null}
        </div>
      )}
      <div className="rrCardBody">{children}</div>
    </section>
  );
}

// PUBLIC_INTERFACE
export function SectionTitle({ eyebrow, title, description, right }) {
  return (
    <div className="rrSectionHead">
      <div>
        {eyebrow ? <div className="rrEyebrow">{eyebrow}</div> : null}
        {title ? <h1 className="rrH1">{title}</h1> : null}
        {description ? <p className="rrLead">{description}</p> : null}
      </div>
      {right ? <div className="rrSectionHeadRight">{right}</div> : null}
    </div>
  );
}

// PUBLIC_INTERFACE
export function SidebarGroup({ title, children }) {
  return (
    <div className="rrNavGroup">
      <div className="rrNavGroupTitle">{title}</div>
      <div className="rrNavGroupItems">{children}</div>
    </div>
  );
}

// PUBLIC_INTERFACE
export function NavPillButton({ active, onClick, children, ariaLabel }) {
  return (
    <button
      type="button"
      className={`rrNavBtn ${active ? "rrNavBtnActive" : ""}`}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

// PUBLIC_INTERFACE
export function StatusPill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? "rrPill rrPillSuccess"
      : tone === "error"
        ? "rrPill rrPillError"
        : tone === "warning"
          ? "rrPill rrPillWarn"
          : "rrPill";
  return <span className={cls}>{children}</span>;
}

// PUBLIC_INTERFACE
export function usePortalLabel(portal) {
  return useMemo(() => {
    if (portal === "user") return "User";
    if (portal === "mechanic") return "Mechanic";
    if (portal === "admin") return "Admin";
    return "Portal";
  }, [portal]);
}
