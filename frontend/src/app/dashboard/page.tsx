"use client";

import React from "react";
import {
  useWallet,
  formatUSD,
  formatPercent,
  formatNumber,
  MOCK_POOL_STATE,
  MOCK_USER_POSITION,
  MOCK_EVENTS,
  truncateAddress,
} from "../providers";

export default function DashboardPage() {
  const { isConnected, address } = useWallet();

  return (
    <div className="page-container" id="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {isConnected
            ? `Welcome back, ${truncateAddress(address || "")}`
            : "Connect your wallet to view your positions"}
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
                  <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                    {formatUSD(MOCK_USER_POSITION.deposited)}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Borrowed</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                    {formatUSD(MOCK_USER_POSITION.borrowed)}
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
                      MOCK_USER_POSITION.healthFactor > 1.5
                        ? "badge-success"
                        : MOCK_USER_POSITION.healthFactor > 1.1
                        ? "badge-warning"
                        : "badge-danger"
                    }`}
                  >
                    {formatNumber(MOCK_USER_POSITION.healthFactor)}
                  </span>
                </div>
                <div className="health-bar">
                  <div
                    className={`health-bar-fill ${
                      MOCK_USER_POSITION.healthFactor > 1.5
                        ? "healthy"
                        : MOCK_USER_POSITION.healthFactor > 1.1
                        ? "warning"
                        : "danger"
                    }`}
                    style={{
                      width: `${Math.min((MOCK_USER_POSITION.healthFactor / 2) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="stat-card" style={{ padding: "14px" }}>
                  <div className="stat-label" style={{ fontSize: "0.7rem" }}>Borrow Limit</div>
                  <div style={{ fontWeight: 600 }}>{formatUSD(MOCK_USER_POSITION.borrowLimit)}</div>
                </div>
                <div className="stat-card" style={{ padding: "14px" }}>
                  <div className="stat-label" style={{ fontSize: "0.7rem" }}>Net APY</div>
                  <div style={{ fontWeight: 600, color: "var(--accent-emerald)" }}>
                    +{formatPercent(MOCK_USER_POSITION.netAPY)}
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
              <p>Connect your wallet to view your position</p>
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
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Live Activity</h2>
            <span className="badge badge-info">
              <span className="pulse" style={{ display: "inline-block" }}>●</span> Real-time
            </span>
          </div>

          <div className="event-stream" id="event-stream">
            {MOCK_EVENTS.map((event) => (
              <div className="event-item" key={event.id}>
                <div className={`event-dot ${event.type}`} />
                <div className="event-content">
                  <div className="event-title">
                    {event.type === "deposit" && "📥 Deposit"}
                    {event.type === "borrow" && "💰 Borrow"}
                    {event.type === "repay" && "↩️ Repay"}
                    {event.type === "liquidate" && "⚡ Liquidation"}
                  </div>
                  <div className="event-detail">
                    {event.user} • {formatNumber(event.amount, 0)} {event.token}
                  </div>
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
