"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet, truncateAddress } from "../providers";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/lend", label: "Lend" },
  { href: "/borrow", label: "Borrow" },
  { href: "/liquidate", label: "Liquidate" },
  { href: "/governance", label: "Governance" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="nav-container" id="main-nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <span className="nav-logo-icon">⚡</span>
          StellarLend
        </Link>

        <div className={`nav-links ${mobileOpen ? "open" : ""}`}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname === item.href ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          {isConnected ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className="badge badge-success"
                style={{ fontSize: "0.75rem" }}
              >
                🟢 {truncateAddress(address || "")}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={disconnect}
                id="disconnect-wallet-btn"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={connect}
              disabled={isConnecting}
              id="connect-wallet-btn"
            >
              {isConnecting ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  Connecting...
                </>
              ) : (
                "Connect Wallet"
              )}
            </button>
          )}
        </div>

        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
          id="mobile-nav-toggle"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>
    </nav>
  );
}
