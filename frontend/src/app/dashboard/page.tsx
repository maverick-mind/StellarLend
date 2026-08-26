"use client";

import React from "react";
import {
  useWallet,
  formatUSD,
  formatPercent,
  formatNumber,
  MOCK_POOL_STATE,
  truncateAddress,
} from "../providers";

export default function DashboardPage() {
  const { isConnected, address, userPosition, events, tokenBalance, xlmBalance } = useWallet();

  return (
    <div className="page-container" id="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {isConnected
            ? `Connected: ${truncateAddress(address || "", 8)} • ${formatNumber(xlmBalance, 2)} XLM Available`
            : "Connect your Stellar wallet to view and manage your positions"}
        </p>
      </div>

      {/* Protocol Stats */}
      <div className="stat-grid" style={{ marginBottom: "32px" }}>
        <div className="stat-card">
          <div className="stat-label">Total Value Locked</div>
          <div className="stat-value">{formatUSD(MOCK_POOL_STATE.totalDeposits)}</div>
          <div className="stat-change positive">↑ 12.4% this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Borrowed</div>
          <div className="stat-value">{formatUSD(MOCK_POOL_STATE.totalBorrows)}</div>
          <div className="stat-change positive">↑ 8.2% this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Utilization Rate</div>
          <div className="stat-value">{formatPercent(MOCK_POOL_STATE.utilizationRate)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Protocol Reserves</div>
          <div className="stat-value">{formatUSD(MOCK_POOL_STATE.totalReserves)}</div>
        </div>
      </div>

      <div className="two-col-layout">
        {/* User Position */}
        <div className="card-glass">
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "20px" }}>
            Your Position
          </h2>

          {isConnected ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Deposited</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                    {formatUSD(userPosition.deposited)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Borrowed</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                    {formatUSD(userPosition.borrowed)}
                  </div>
                </div>
              </div>

              {/* Health Factor */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Health Factor
                  </span>
                  <span
                    className={`badge ${
                      userPosition.healthFactor > 1.5
                        ? "badge-success"
                        : userPosition.healthFactor > 1.1
                        ? "badge-warning"
                        : "badge-danger"
                    }`}
                  >
                    {userPosition.healthFactor >= 999 ? "∞ Max" : formatNumber(userPosition.healthFactor)}
                  </span>
                </div>
                <div className="health-bar">
                  <div
                    className={`health-bar-fill ${
                      userPosition.healthFactor > 1.5
                        ? "healthy"
                        : userPosition.healthFactor > 1.1
                        ? "warning"
                        : "danger"
                    }`}
                    style={{
                      width: `${Math.min((userPosition.healthFactor / 2) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="stat-card" style={{ padding: "14px" }}>
                  <div className="stat-label" style={{ fontSize: "0.7rem" }}>Borrow Limit</div>
                  <div style={{ fontWeight: 600 }}>{formatUSD(userPosition.borrowLimit)}</div>
                </div>
                <div className="stat-card" style={{ padding: "14px" }}>
                  <div className="stat-label" style={{ fontSize: "0.7rem" }}>Wallet Available</div>
                  <div style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
                    {formatUSD(tokenBalance)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🔒</div>
              <p>Connect your Stellar wallet to view your position</p>
            </div>
          )}
        </div>

        {/* Event Stream */}
        <div className="card-glass">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Live Activity Stream</h2>
            <span className="badge badge-info">
              <span className="pulse" style={{ display: "inline-block" }}>●</span> Real-time
            </span>
          </div>

          <div className="event-stream" id="event-stream">
            {events.map((event) => (
              <div className="event-item" key={event.id}>
                <div className={`event-dot ${event.type}`} />
                <div className="event-content">
                  <div className="event-title">
                    {event.type === "deposit" && "📥 Deposit to Pool"}
                    {event.type === "borrow" && "💰 Borrow from Pool"}
                    {event.type === "repay" && "↩️ Debt Repayment"}
                    {event.type === "withdraw" && "📤 Collateral Withdrawal"}
                    {event.type === "liquidate" && "⚡ Position Liquidated"}
                    {event.type === "stake" && "🗳️ Governance Staked"}
                    {event.type === "vote" && "🗳️ Governance Vote Cast"}
                  </div>
                  <div className="event-detail">
                    {event.user} • {formatNumber(event.amount, 0)} {event.token}
                  </div>
                  {event.txHash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--accent-cyan)",
                        textDecoration: "underline",
                        display: "inline-block",
                        marginTop: "2px",
                      }}
                    >
                      Tx: {event.txHash.slice(0, 8)}...{event.txHash.slice(-6)} ↗
                    </a>
                  )}
                </div>
                <span className="event-time">{event.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interest Rate Info */}
      <div className="card-glass" style={{ marginTop: "24px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "20px" }}>
          Interest Rate Model
        </h2>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Base Rate</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>2.00%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Borrow APR</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
              {formatPercent(MOCK_POOL_STATE.borrowRate)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Supply APY</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
              {formatPercent(MOCK_POOL_STATE.supplyRate)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Optimal Utilization</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>80.00%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
