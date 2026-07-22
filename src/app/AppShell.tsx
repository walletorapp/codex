import { Activity, Menu, Radar, Search, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

const nav = [
  { to: "/trending", label: "Trending", icon: Activity },
  { to: "/new-tokens", label: "New token radar", icon: Radar },
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside
        id="primary-sidebar"
        className={`sidebar ${open ? "sidebar--open" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            W
          </span>
          <span>
            <strong>Walletor</strong>
            <small>Token intelligence</small>
          </span>
        </div>
        <nav className="nav-list">
          <p className="eyebrow">Discover</p>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => {
                setOpen(false);
              }}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link--active" : ""}`
              }
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="phase-card">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>Discovery only</strong>
            <p>
              Wallets and trading are intentionally unavailable in this release.
            </p>
          </div>
        </div>
      </aside>

      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => {
            setOpen(false);
          }}
        />
      )}

      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => {
              setOpen((value) => !value);
            }}
            aria-expanded={open}
            aria-controls="primary-sidebar"
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            <span className="sr-only">Toggle navigation</span>
          </button>
          <div className="topbar__context">
            <span className="status-dot" aria-hidden="true" />
            <span>Solana · live market data</span>
          </div>
          <NavLink className="global-search" to="/trending">
            <Search size={15} aria-hidden="true" />
            <span>Search tokens</span>
            <kbd>/</kbd>
          </NavLink>
        </header>
        <main id="main-content" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
