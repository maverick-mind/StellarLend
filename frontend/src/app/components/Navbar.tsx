"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet, truncateAddress, formatNumber, useToast } from "../providers";

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
  const {
    address,
    isConnected,
    isConnecting,
    walletType,
    xlmBalance,
    tokenBalance,
    isFunding,
    connectFreighter,
    connectBrowserWallet,
    disconnect,
    fundWithFriendbot,
  } = useWallet();

  const { addToast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      addToast("info", "Address copied to clipboard!");
    }
  };

  const handleFriendbot = async () => {
    await fundWithFriendbot();
    addToast("success", "Funded account with +10,000 Testnet XLM from Friendbot!");
  };

  return (
    <>
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
              <div style={{ position: "relative" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(124, 58, 237, 0.15)",
                    borderColor: "var(--primary-400)",
                  }}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  id="wallet-dropdown-btn"
                >
                  <span style={{ color: "var(--accent-emerald)" }}>●</span>
                  <span style={{ fontFamily: "monospace" }}>{truncateAddress(address || "")}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", borderLeft: "1px solid var(--border-secondary)", paddingLeft: "6px" }}>
                    {formatNumber(xlmBalance, 0)} XLM
                  </span>
                  <span style={{ fontSize: "0.7rem" }}>▼</span>
                </button>

                {/* Wallet Details Dropdown */}
                {dropdownOpen && (
                  <div
                    className="card"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "44px",
                      width: "300px",
                      zIndex: 150,
                      padding: "16px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-primary)",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                      borderRadius: "14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Connected Wallet
                      </span>
                      <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>
                        {walletType === "freighter" ? "Freighter" : "Testnet Key"}
                      </span>
                    </div>

                    <div
                      style={{
                        background: "rgba(10, 10, 26, 0.6)",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        marginBottom: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {truncateAddress(address || "", 8)}
                      </span>
                      <button
                        onClick={handleCopyAddress}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary-300)",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                        title="Copy Address"
                      >
                        📋
                      </button>
                    </div>

                    {/* Balances */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "14px", fontSize: "0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Stellar XLM</span>
                        <span style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
                          {formatNumber(xlmBalance, 2)} XLM
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Testnet USDC</span>
                        <span style={{ fontWeight: 600, color: "var(--accent-emerald)" }}>
                          ${formatNumber(tokenBalance, 0)} USDC
                        </span>
                      </div>
                    </div>

                    {/* Friendbot Funding Button */}
                    <button
                      className="btn btn-secondary btn-sm btn-full"
                      style={{ marginBottom: "8px", fontSize: "0.8rem" }}
                      onClick={handleFriendbot}
                      disabled={isFunding}
                    >
                      {isFunding ? "Funding..." : "⚡ Request 10,000 XLM (Friendbot)"}
                    </button>

                    {/* StellarExpert Explorer Link */}
                    <a
                      href={`https://stellar.expert/explorer/testnet/account/${address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-full"
                      style={{
                        marginBottom: "8px",
                        fontSize: "0.8rem",
                        background: "rgba(6, 182, 212, 0.1)",
                        color: "var(--accent-cyan)",
                        border: "1px solid rgba(6, 182, 212, 0.2)",
                        textDecoration: "none",
                      }}
                    >
                      🔍 View on StellarExpert ↗
                    </a>

                    <button
                      className="btn btn-danger btn-sm btn-full"
                      style={{ fontSize: "0.8rem" }}
                      onClick={() => {
                        disconnect();
                        setDropdownOpen(false);
                      }}
                      id="disconnect-wallet-btn"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setWalletModalOpen(true)}
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

      {/* Connect Wallet Selection Modal */}
      {walletModalOpen && (
        <div className="modal-overlay" onClick={() => setWalletModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "8px" }}>
              Connect Stellar Wallet
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
              Select a method to interact with Stellar Soroban testnet contracts.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              {/* Option 1: Freighter Wallet Extension */}
              <button
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px",
                  cursor: "pointer",
                  textAlign: "left",
                  background: "rgba(124, 58, 237, 0.1)",
                  borderColor: "var(--primary-500)",
                }}
                onClick={async () => {
                  setWalletModalOpen(false);
                  await connectFreighter();
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "1.8rem" }}>🚀</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>Freighter Wallet</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Browser extension for Stellar dApps
                    </div>
                  </div>
                </div>
                <span style={{ color: "var(--primary-300)", fontSize: "1.2rem" }}>→</span>
              </button>

              {/* Option 2: In-Browser Testnet Keypair */}
              <button
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px",
                  cursor: "pointer",
                  textAlign: "left",
                  background: "rgba(6, 182, 212, 0.08)",
                  borderColor: "var(--accent-cyan)",
                }}
                onClick={async () => {
                  setWalletModalOpen(false);
                  await connectBrowserWallet();
                  addToast("success", "Connected using active Stellar Testnet Keypair!");
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "1.8rem" }}>🔑</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>Instant Testnet Account</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Pre-funded with 10,000 Testnet XLM (No extension needed)
                    </div>
                  </div>
                </div>
                <span style={{ color: "var(--accent-cyan)", fontSize: "1.2rem" }}>→</span>
              </button>
            </div>

            <div style={{ textAlign: "center" }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setWalletModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
