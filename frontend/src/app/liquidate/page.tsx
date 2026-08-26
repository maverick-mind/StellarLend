"use client";

import React, { useState } from "react";
import {
  useWallet,
  useToast,
  formatUSD,
  formatNumber,
  truncateAddress,
} from "../providers";

const INITIAL_LIQUIDATABLE_POSITIONS = [
  {
    id: 1,
    borrower: "GDXK4MFQN2OQHKLXM4QR5VQZJ7NBS3XWKUPH2Y6Q",
    collateral: 45000,
    borrowed: 42000,
    healthFactor: 0.91,
    profit: 2100,
    asset: "USDC",
  },
  {
    id: 2,
    borrower: "GBXH8WKUQ3LNZH7PJV5MQGZJFNLQDBKXMCQ2R6W7",
    collateral: 12000,
    borrowed: 11500,
    healthFactor: 0.88,
    profit: 575,
    asset: "USDC",
  },
  {
    id: 3,
    borrower: "GCJZ4GFMQ3LQNBQXK3U5QGZJFNLQDBKXMCQRZ6W7",
    collateral: 78000,
    borrowed: 72000,
    healthFactor: 0.92,
    profit: 3600,
    asset: "USDC",
  },
];

export default function LiquidatePage() {
  const { isConnected, executeTransaction } = useWallet();
  const { addToast } = useToast();
  const [positions, setPositions] = useState(INITIAL_LIQUIDATABLE_POSITIONS);
  const [liquidating, setLiquidating] = useState<number | null>(null);

  const handleLiquidate = async (positionId: number) => {
    if (!isConnected) {
      addToast("error", "Please connect your Stellar wallet first");
      return;
    }

    const pos = positions.find((p) => p.id === positionId);
    if (!pos) return;

    setLiquidating(positionId);
    const result = await executeTransaction("liquidate", pos.borrowed);
    setLiquidating(null);

    if (result.success) {
      setPositions((prev) => prev.filter((p) => p.id !== positionId));
      addToast(
        "success",
        `Liquidated loan for ${truncateAddress(pos.borrower)}! Received +$${pos.profit.toLocaleString()} USDC bonus!`,
        result.txHash
      );
    } else {
      addToast("error", result.error || "Liquidation failed");
    }
  };

  return (
    <div className="page-container" id="liquidate-page">
      <div className="page-header">
        <h1 className="page-title">Liquidations</h1>
        <p className="page-subtitle">
          Liquidate under-collateralized positions and earn an instant 5% bonus
        </p>
      </div>

      {/* Info Banner */}
      <div
        className="card-gradient"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
          padding: "20px 24px",
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>⚡</span>
        <div>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            Earn 5% Liquidation Bonus
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            When a borrower&apos;s Health Factor drops below 1.0 (exceeding 85% liquidation threshold),
            liquidators repay the debt and seize the collateral plus a 5% bonus reward.
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <div className="stat-label">Liquidatable Positions</div>
          <div className="stat-value">{positions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total At Risk</div>
          <div className="stat-value">
            {formatUSD(positions.reduce((s, p) => s + p.borrowed, 0))}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Potential Profit</div>
          <div className="stat-value" style={{ color: "var(--accent-emerald)" }}>
            {formatUSD(positions.reduce((s, p) => s + p.profit, 0))}
          </div>
        </div>
      </div>

      {/* Liquidatable Positions Table */}
      <div className="card-glass">
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "20px" }}>
          At-Risk Positions
        </h2>

        {positions.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Collateral</th>
                  <th>Debt</th>
                  <th>Health Factor</th>
                  <th>Est. Profit</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => (
                  <tr key={pos.id}>
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.85rem" }}>
                        {truncateAddress(pos.borrower, 6)}
                      </span>
                    </td>
                    <td>{formatUSD(pos.collateral)}</td>
                    <td style={{ color: "var(--accent-cyan)" }}>{formatUSD(pos.borrowed)}</td>
                    <td>
                      <span className="badge badge-danger">
                        {formatNumber(pos.healthFactor)}
                      </span>
                    </td>
                    <td style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>
                      +{formatUSD(pos.profit)}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleLiquidate(pos.id)}
                        disabled={liquidating === pos.id}
                        id={`liquidate-btn-${pos.id}`}
                      >
                        {liquidating === pos.id ? (
                          <>
                            <span className="spinner" style={{ width: 14, height: 14 }} />{" "}
                            Signing...
                          </>
                        ) : (
                          "Liquidate"
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
            <span style={{ fontSize: "2rem" }}>🎉</span>
            <p style={{ marginTop: "8px" }}>All positions are healthy! No liquidatable loans at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
