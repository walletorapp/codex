import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ChevronDown, Menu, Search, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { WalletorLogo } from "../components/WalletorLogo";

const primaryNav = [{ to: "/swap", label: "Swap" }];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="dex-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="dex-header">
        <button
          className="dex-mobile-toggle"
          onClick={() => {
            setMobileOpen((value) => !value);
          }}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
        <nav
          className={`dex-nav ${mobileOpen ? "dex-nav--open" : ""}`}
          aria-label="Primary navigation"
        >
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                setMobileOpen(false);
              }}
            >
              {item.label}
            </NavLink>
          ))}
          <details className="tools-menu">
            <summary>
              Tools <ChevronDown size={15} />
            </summary>
            <div>
              <NavLink
                to="/trending"
                onClick={() => {
                  setMobileOpen(false);
                }}
              >
                Trending tokens
              </NavLink>
              <NavLink
                to="/new-tokens"
                onClick={() => {
                  setMobileOpen(false);
                }}
              >
                New tokens
              </NavLink>
            </div>
          </details>
        </nav>

        <NavLink to="/swap" className="dex-brand" aria-label="Walletor home">
          <WalletorLogo />
          <span className="dex-brand__name">
            <strong>Walletor</strong>
            <small>SOLANA DEX</small>
          </span>
        </NavLink>

        <div className="dex-actions">
          <NavLink to="/trending" className="dex-search">
            <Search size={19} />
            <span>Explore tokens</span>
          </NavLink>
          <WalletMultiButton className="header-wallet-button">
            <WalletCards size={19} /> Connect
          </WalletMultiButton>
        </div>
      </header>
      <div className="demo-banner">
        <span /> NON-CUSTODIAL · LIVE JUPITER ROUTING · WALLET APPROVAL REQUIRED
      </div>
      <main id="main-content" className="dex-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
